import { AgendaquiError } from "@/server/domain/errors";

export type ServicoInput = {
  nome?: unknown;
  preco?: unknown;
  duracao?: unknown;
};

export function normalizarNomeServico(nome: unknown) {
  return typeof nome === "string" ? nome.trim().replace(/\s+/g, " ") : "";
}

function normalizarPreco(preco: unknown) {
  return typeof preco === "string" ? preco.trim().replace(",", ".") : "";
}

export function validarServico(input: ServicoInput) {
  const nome = normalizarNomeServico(input.nome);
  const precoInput = normalizarPreco(input.preco);
  const duracaoInput = typeof input.duracao === "string" ? input.duracao.trim() : "";

  if (!nome) {
    throw new AgendaquiError("NOME_SERVICO_OBRIGATORIO", "Informe o nome do servico.");
  }

  if (nome.length > 100) {
    throw new AgendaquiError("NOME_SERVICO_LONGO", "O nome do servico deve ter no maximo 100 caracteres.");
  }

  if (!precoInput) {
    throw new AgendaquiError("PRECO_OBRIGATORIO", "Informe o preco do servico.");
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(precoInput)) {
    throw new AgendaquiError("PRECO_INVALIDO", "Informe um preco valido com ate duas casas decimais.");
  }

  const preco = Number(precoInput);

  if (!Number.isFinite(preco) || preco <= 0 || preco > 99999999.99) {
    throw new AgendaquiError("PRECO_INVALIDO", "Informe um preco maior que zero.");
  }

  if (!duracaoInput) {
    throw new AgendaquiError("DURACAO_OBRIGATORIA", "Informe a duracao do atendimento.");
  }

  if (!/^\d+$/.test(duracaoInput)) {
    throw new AgendaquiError("DURACAO_INVALIDA", "Informe a duracao em minutos inteiros.");
  }

  const duracao = Number(duracaoInput);

  if (!Number.isSafeInteger(duracao) || duracao <= 0 || duracao > 1440) {
    throw new AgendaquiError("DURACAO_INVALIDA", "Informe uma duracao entre 1 e 1440 minutos.");
  }

  return { nome, preco: preco.toFixed(2), duracao };
}
