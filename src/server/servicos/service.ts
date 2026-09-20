import { AgendaquiError } from "@/server/domain/errors";
import { ContaAutenticada } from "@/server/domain/perfis";
import { ServicoInput, validarServico } from "@/server/servicos/validation";
import { ServicoRecord, ServicoRepository } from "@/server/servicos/repository";
import { exigirEmpresaDoAtor } from "@/server/empresas/contexto";

export type ServicoPublico = Omit<ServicoRecord, "preco"> & {
  preco: string;
};

function assertAdministrador(ator: ContaAutenticada) {
  exigirEmpresaDoAtor(ator);
  if (ator.perfil !== "ADMINISTRADOR") {
    throw new AgendaquiError("ACESSO_NEGADO", "Acesso negado.", 403);
  }
}

function servicoPublico(servico: ServicoRecord): ServicoPublico {
  return {
    ...servico,
    preco: servico.preco.toFixed(2)
  };
}

async function assertNomeDisponivel(repository: ServicoRepository, nome: string, empresaId: string, ignorarServicoId?: string) {
  const existente = await repository.findByNome(nome, empresaId);

  if (existente && existente.id !== ignorarServicoId) {
    throw new AgendaquiError("SERVICO_DUPLICADO", "Ja existe um servico com este nome.", 409);
  }
}

export async function criarServico(ator: ContaAutenticada, input: ServicoInput, repository: ServicoRepository) {
  assertAdministrador(ator);
  const data = validarServico(input);
  await assertNomeDisponivel(repository, data.nome, ator.empresaId);

  const servico = await repository.createServico({ ...data, empresaId: ator.empresaId });
  return servicoPublico(servico);
}

export async function editarServico(ator: ContaAutenticada, servicoId: string, input: ServicoInput, repository: ServicoRepository) {
  assertAdministrador(ator);
  const existente = await repository.findById(servicoId, ator.empresaId);

  if (!existente || existente.empresaId !== ator.empresaId) {
    throw new AgendaquiError("SERVICO_NAO_ENCONTRADO", "Servico nao encontrado.", 404);
  }

  const data = validarServico(input);
  await assertNomeDisponivel(repository, data.nome, ator.empresaId, servicoId);

  const servico = await repository.updateServico(servicoId, data, ator.empresaId);
  return servicoPublico(servico);
}

export async function excluirServico(ator: ContaAutenticada, servicoId: string, repository: ServicoRepository) {
  assertAdministrador(ator);
  const existente = await repository.findById(servicoId, ator.empresaId);

  if (!existente || existente.empresaId !== ator.empresaId) {
    throw new AgendaquiError("SERVICO_NAO_ENCONTRADO", "Servico nao encontrado.", 404);
  }

  await repository.deleteServico(servicoId, ator.empresaId);
}

export async function listarServicos(ator: ContaAutenticada, repository: ServicoRepository) {
  assertAdministrador(ator);
  const servicos = await repository.listServicos(ator.empresaId);
  return servicos.map(servicoPublico);
}

export async function listarServicosDisponiveis(ator: ContaAutenticada, repository: ServicoRepository) {
  const empresaId = exigirEmpresaDoAtor(ator);
  const servicos = await repository.listServicosDisponiveis(empresaId);
  return servicos.map(servicoPublico);
}
