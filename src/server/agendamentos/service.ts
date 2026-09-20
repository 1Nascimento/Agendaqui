import { AgendaquiError } from "@/server/domain/errors";
import { exigirEmpresaDoAtor } from "@/server/empresas/contexto";
import type { ContaAutenticada } from "@/server/domain/perfis";
import { calcularDisponibilidade, limitesConsulta, validarHorario } from "./calendario";
import type { AgendaLeitura, AgendaRepository, AgendamentoRecord } from "./repository";

export type AgendamentoInput = { servicoIds?: unknown; clienteId?: unknown; funcionarioId?: unknown; data?: unknown; horario?: unknown };
export type RemarcacaoInput = { id?: unknown; versao?: unknown; data?: unknown; horario?: unknown };

function idValido(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new AgendaquiError("DADOS_INVALIDOS", "Selecione os dados do agendamento.");
  return value;
}

function assertAtivo(ator: ContaAutenticada) {
  exigirEmpresaDoAtor(ator);
  if (!ator.ativo) throw new AgendaquiError("ACESSO_NEGADO", "Acesso negado.", 403);
}

function assertAcesso(ator: ContaAutenticada, agendamento: AgendamentoRecord) {
  assertAtivo(ator);
  if (agendamento.empresaId !== ator.empresaId) throw new AgendaquiError("ACESSO_NEGADO", "Acesso negado.", 403);
  if (ator.perfil === "ADMINISTRADOR" || (ator.perfil === "CLIENTE" && agendamento.clienteId === ator.id) || (ator.perfil === "FUNCIONARIO" && agendamento.funcionarioId === ator.id)) return;
  throw new AgendaquiError("ACESSO_NEGADO", "Você não tem acesso a este agendamento.", 403);
}

export async function obterAgendamento(ator: ContaAutenticada, id: unknown, repo: AgendaLeitura) {
  assertAtivo(ator);
  const agendamento = await repo.agendamento(idValido(id), ator.empresaId);
  if (!agendamento) throw new AgendaquiError("AGENDAMENTO_NAO_ENCONTRADO", "Agendamento não encontrado.", 404);
  assertAcesso(ator, agendamento);
  return agendamento;
}

function assertAlteravel(agendamento: AgendamentoRecord, agora: Date, versao?: unknown) {
  if (agendamento.status !== "CONFIRMADO" || agendamento.inicio <= agora) throw new AgendaquiError("AGENDAMENTO_ENCERRADO", "Somente agendamentos confirmados e ainda não iniciados podem ser alterados.");
  if (versao !== undefined && String(agendamento.versao) !== String(versao)) throw new AgendaquiError("AGENDAMENTO_ALTERADO", "Este agendamento foi alterado. Atualize a página e tente novamente.", 409);
}

async function validarParticipantes(clienteId: string, funcionarioId: string, repo: AgendaLeitura, empresaId: string) {
  const [cliente, funcionario] = await Promise.all([repo.conta(clienteId, empresaId), repo.conta(funcionarioId, empresaId)]);
  if (!cliente?.ativo || cliente.perfil !== "CLIENTE" || cliente.empresaId !== empresaId) throw new AgendaquiError("CLIENTE_INVALIDO", "Selecione um cliente ativo.");
  if (!funcionario?.ativo || funcionario.perfil !== "FUNCIONARIO" || funcionario.empresaId !== empresaId) throw new AgendaquiError("FUNCIONARIO_INVALIDO", "Selecione um funcionário ativo.");
}

async function preparar(ator: ContaAutenticada, input: AgendamentoInput, repo: AgendaLeitura) {
  assertAtivo(ator);
  const clienteId = ator.perfil === "CLIENTE" ? ator.id : idValido(input.clienteId);
  const funcionarioId = idValido(input.funcionarioId);
  if (ator.perfil === "FUNCIONARIO" && funcionarioId !== ator.id) throw new AgendaquiError("ACESSO_NEGADO", "Funcionários podem agendar apenas na própria agenda.", 403);
  await validarParticipantes(clienteId, funcionarioId, repo, ator.empresaId);
  if (!Array.isArray(input.servicoIds) || !input.servicoIds.length || input.servicoIds.length > 20) throw new AgendaquiError("SERVICOS_INVALIDOS", "Selecione de 1 a 20 serviços.");
  const ids = input.servicoIds.map(idValido);
  if (new Set(ids).size !== ids.length) throw new AgendaquiError("SERVICOS_INVALIDOS", "Não repita o mesmo serviço.");
  const servicos = await repo.servicos(ids, ator.empresaId);
  if (servicos.length !== ids.length || servicos.some((s) => !s.ativo || s.empresaId !== ator.empresaId)) throw new AgendaquiError("SERVICOS_INVALIDOS", "Um dos serviços não está mais disponível. Atualize a seleção.");
  return { empresaId: ator.empresaId, clienteId, funcionarioId, servicos, duracao: servicos.reduce((total, s) => total + s.duracao, 0) };
}

export async function consultarDisponibilidade(ator: ContaAutenticada, input: AgendamentoInput, repo: AgendaRepository, agora = new Date()) {
  const dados = await preparar(ator, input, repo);
  const ocupacoes = await repo.ocupacoes({ ...dados, ...limitesConsulta(agora) });
  return calcularDisponibilidade(dados.duracao, ocupacoes, agora, await repo.expedientes(dados.funcionarioId, ator.empresaId));
}

export async function consultarRemarcacao(ator: ContaAutenticada, id: unknown, repo: AgendaRepository, agora = new Date()) {
  const atual = await obterAgendamento(ator, id, repo);
  assertAlteravel(atual, agora);
  await validarParticipantes(atual.clienteId, atual.funcionarioId, repo, ator.empresaId);
  const ocupacoes = await repo.ocupacoes({ ...atual, ...limitesConsulta(agora), ignorarId: atual.id });
  return calcularDisponibilidade(atual.servicos.reduce((total, s) => total + s.duracao, 0), ocupacoes, agora, await repo.expedientes(atual.funcionarioId, ator.empresaId));
}

export async function confirmarAgendamento(ator: ContaAutenticada, input: AgendamentoInput, repo: AgendaRepository, agora = new Date()) {
  return repo.transacao(async (tx) => {
    const dados = await preparar(ator, input, tx);
    const periodo = validarHorario(input.data, input.horario, dados.duracao, agora, await tx.expedientes(dados.funcionarioId, ator.empresaId));
    const conflitos = await tx.ocupacoes({ ...dados, ...periodo });
    if (conflitos.length) throw new AgendaquiError("HORARIO_OCUPADO", "Este horário não está mais disponível para o cliente ou funcionário. Escolha outro.", 409);
    return tx.criar({ ...dados, ...periodo, atorId: ator.id, servicos: dados.servicos.map((s) => ({ servicoId: s.id, nome: s.nome, preco: s.preco.toFixed(2), duracao: s.duracao })) });
  });
}

export async function remarcarAgendamento(ator: ContaAutenticada, input: RemarcacaoInput, repo: AgendaRepository, agora = new Date()) {
  return repo.transacao(async (tx) => {
    const atual = await obterAgendamento(ator, input.id, tx);
    assertAlteravel(atual, agora, input.versao ?? "");
    await validarParticipantes(atual.clienteId, atual.funcionarioId, tx, ator.empresaId);
    const periodo = validarHorario(input.data, input.horario, atual.servicos.reduce((total, s) => total + s.duracao, 0), agora, await tx.expedientes(atual.funcionarioId, ator.empresaId));
    if (periodo.inicio.getTime() === atual.inicio.getTime()) throw new AgendaquiError("MESMO_HORARIO", "Selecione um horário diferente do atual.");
    const conflitos = await tx.ocupacoes({ ...atual, ...periodo, ignorarId: atual.id });
    if (conflitos.length) throw new AgendaquiError("HORARIO_OCUPADO", "Este horário não está mais disponível. Escolha outro.", 409);
    return tx.remarcar(atual, periodo, ator.id);
  });
}

export async function cancelarAgendamento(ator: ContaAutenticada, input: Pick<RemarcacaoInput, "id" | "versao">, repo: AgendaRepository, agora = new Date()) {
  return repo.transacao(async (tx) => {
    const atual = await obterAgendamento(ator, input.id, tx);
    assertAlteravel(atual, agora, input.versao ?? "");
    return tx.cancelar(atual, ator.id);
  });
}

export async function listarAgendamentos(ator: ContaAutenticada, repo: AgendaRepository) {
  assertAtivo(ator);
  return repo.listar(ator);
}
