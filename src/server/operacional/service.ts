import type { FormaPagamento } from "@prisma/client";
import type { ContaAutenticada } from "@/server/domain/perfis";
import { AgendaquiError } from "@/server/domain/errors";
import { exigirEmpresaDoAtor } from "@/server/empresas/contexto";
import { formasPagamento, resumoPagamento } from "./resumo";
import type { OperacionalRepository, OperacionalTransacao } from "./repository";

type Identificacao = { id?: unknown; versao?: unknown };
function assertOperador(ator: ContaAutenticada, financeiro = false) {
  exigirEmpresaDoAtor(ator);
  if (ator.perfil !== "ADMINISTRADOR" && (financeiro || ator.perfil !== "FUNCIONARIO")) throw new AgendaquiError("ACESSO_NEGADO", "Você não tem permissão para esta operação.", 403);
}
async function atual(ator: ContaAutenticada, input: Identificacao, tx: OperacionalTransacao) {
  exigirEmpresaDoAtor(ator);
  if (typeof input.id !== "string" || !input.id.trim() || input.id.length > 200) throw new AgendaquiError("DADOS_INVALIDOS", "Agendamento inválido.");
  const a = await tx.agendamento(input.id, ator.empresaId);
  if (!a || a.empresaId !== ator.empresaId) throw new AgendaquiError("AGENDAMENTO_NAO_ENCONTRADO", "Agendamento não encontrado.", 404);
  if (ator.perfil === "FUNCIONARIO" && a.funcionarioId !== ator.id) throw new AgendaquiError("ACESSO_NEGADO", "Você só pode dar baixa nos seus atendimentos.", 403);
  if (!/^\d+$/.test(String(input.versao ?? "")) || String(a.versao) !== String(input.versao)) throw new AgendaquiError("AGENDAMENTO_ALTERADO", "Este agendamento foi alterado. Atualize a página e tente novamente.", 409);
  return a;
}

export async function finalizarAtendimento(ator: ContaAutenticada, input: Identificacao & { resultado?: unknown }, repo: OperacionalRepository, agora = new Date()) {
  assertOperador(ator);
  if (input.resultado !== "REALIZADO" && input.resultado !== "NAO_COMPARECEU") throw new AgendaquiError("RESULTADO_INVALIDO", "Selecione o resultado do atendimento.");
  const resultado = input.resultado;
  return repo.transacao(async (tx) => {
    const a = await atual(ator, input, tx);
    if (a.status !== "CONFIRMADO" || a.fim > agora) throw new AgendaquiError("ATENDIMENTO_NAO_FINALIZAVEL", "A baixa exige um agendamento confirmado cujo horário já terminou.");
    await tx.finalizar(a, resultado, ator.id, agora);
  });
}

export function validarValorRecebimento(valor: unknown) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(texto)) throw new AgendaquiError("VALOR_INVALIDO", "Informe um valor positivo com até duas casas decimais, sem separador de milhar.");
  const [inteiro, fracao = ""] = texto.replace(",", ".").split(".");
  const valorCentavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
  if (valorCentavos <= 0) throw new AgendaquiError("VALOR_INVALIDO", "O valor deve ser maior que zero.");
  return valorCentavos;
}

export async function registrarPagamento(ator: ContaAutenticada, input: Identificacao & { valor?: unknown; forma?: unknown }, repo: OperacionalRepository, agora = new Date()) {
  assertOperador(ator, true);
  const valor = validarValorRecebimento(input.valor);
  if (typeof input.forma !== "string" || !Object.hasOwn(formasPagamento, input.forma)) throw new AgendaquiError("FORMA_INVALIDA", "Selecione uma forma de pagamento válida.");
  const forma = input.forma as FormaPagamento;
  return repo.transacao(async (tx) => {
    const a = await atual(ator, input, tx);
    if (a.status !== "REALIZADO") throw new AgendaquiError("ATENDIMENTO_NAO_REALIZADO", "Registre o atendimento como realizado antes de receber o pagamento.");
    if (valor > resumoPagamento(a).saldo) throw new AgendaquiError("VALOR_ACIMA_SALDO", "O valor informado excede o saldo deste atendimento.");
    await tx.receber(a, { valor: (valor / 100).toFixed(2), forma, atorId: ator.id, agora });
  });
}

export async function estornarPagamento(ator: ContaAutenticada, input: Identificacao & { pagamentoId?: unknown; motivo?: unknown }, repo: OperacionalRepository, agora = new Date()) {
  assertOperador(ator, true);
  const motivo = typeof input.motivo === "string" ? input.motivo.trim() : "";
  if (motivo.length < 3 || motivo.length > 500) throw new AgendaquiError("MOTIVO_INVALIDO", "Informe um motivo de estorno entre 3 e 500 caracteres.");
  return repo.transacao(async (tx) => {
    const a = await atual(ator, input, tx);
    const p = a.pagamentos.find((p) => p.id === input.pagamentoId && p.empresaId === ator.empresaId);
    if (!p) throw new AgendaquiError("PAGAMENTO_NAO_ENCONTRADO", "Pagamento não encontrado.", 404);
    if (p.estornadoEm) throw new AgendaquiError("PAGAMENTO_ESTORNADO", "Este pagamento já foi estornado.", 409);
    await tx.estornar(a, p.id, motivo, ator.id, agora);
  });
}
