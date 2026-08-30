import { AgendaquiError } from "@/server/domain/errors";
import { ContaAutenticada } from "@/server/domain/perfis";
import { ServicoInput, validarServico } from "@/server/servicos/validation";
import { ServicoRecord, ServicoRepository } from "@/server/servicos/repository";

export type ServicoPublico = Omit<ServicoRecord, "preco"> & {
  preco: string;
};

function assertAdministrador(ator: ContaAutenticada) {
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

async function assertNomeDisponivel(repository: ServicoRepository, nome: string, ignorarServicoId?: string) {
  const existente = await repository.findByNome(nome);

  if (existente && existente.id !== ignorarServicoId) {
    throw new AgendaquiError("SERVICO_DUPLICADO", "Ja existe um servico com este nome.", 409);
  }
}

export async function criarServico(ator: ContaAutenticada, input: ServicoInput, repository: ServicoRepository) {
  assertAdministrador(ator);
  const data = validarServico(input);
  await assertNomeDisponivel(repository, data.nome);

  const servico = await repository.createServico(data);
  return servicoPublico(servico);
}

export async function editarServico(ator: ContaAutenticada, servicoId: string, input: ServicoInput, repository: ServicoRepository) {
  assertAdministrador(ator);
  const existente = await repository.findById(servicoId);

  if (!existente) {
    throw new AgendaquiError("SERVICO_NAO_ENCONTRADO", "Servico nao encontrado.", 404);
  }

  const data = validarServico(input);
  await assertNomeDisponivel(repository, data.nome, servicoId);

  const servico = await repository.updateServico(servicoId, data);
  return servicoPublico(servico);
}

export async function excluirServico(ator: ContaAutenticada, servicoId: string, repository: ServicoRepository) {
  assertAdministrador(ator);
  const existente = await repository.findById(servicoId);

  if (!existente) {
    throw new AgendaquiError("SERVICO_NAO_ENCONTRADO", "Servico nao encontrado.", 404);
  }

  await repository.deleteServico(servicoId);
}

export async function listarServicos(ator: ContaAutenticada, repository: ServicoRepository) {
  assertAdministrador(ator);
  const servicos = await repository.listServicos();
  return servicos.map(servicoPublico);
}

export async function listarServicosDisponiveis(repository: ServicoRepository) {
  const servicos = await repository.listServicosDisponiveis();
  return servicos.map(servicoPublico);
}
