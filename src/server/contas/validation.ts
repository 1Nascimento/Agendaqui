import { AgendaquiError } from "@/server/domain/errors";
import { PerfilConta } from "@/server/domain/perfis";

export type CadastroContaInput = {
  nome?: unknown;
  telefone?: unknown;
  email?: unknown;
  senha?: unknown;
  confirmarSenha?: unknown;
};

export type DadosBasicosContaInput = {
  nome?: unknown;
  telefone?: unknown;
  email?: unknown;
};

export function stringCampo(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizarNome(nome: unknown) {
  return stringCampo(nome).trim().replace(/\s+/g, " ");
}

export function normalizarEmail(email: unknown) {
  return stringCampo(email).trim().toLowerCase();
}

export function normalizarTelefone(telefone: unknown) {
  return stringCampo(telefone).replace(/\D/g, "");
}

export function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validarTelefone(telefone: string) {
  return /^\d{10,13}$/.test(telefone);
}

export function validarForcaSenha(senha: string) {
  return senha.length >= 8 && /[a-z]/.test(senha) && /[A-Z]/.test(senha) && /\d/.test(senha);
}

export function validarCadastroConta(input: CadastroContaInput) {
  const nome = normalizarNome(input.nome);
  const telefone = normalizarTelefone(input.telefone);
  const email = normalizarEmail(input.email);
  const senha = stringCampo(input.senha);
  const confirmarSenha = stringCampo(input.confirmarSenha);

  if (!nome) {
    throw new AgendaquiError("NOME_OBRIGATORIO", "Informe o nome.");
  }

  if (!telefone) {
    throw new AgendaquiError("TELEFONE_OBRIGATORIO", "Informe o telefone.");
  }

  if (!validarTelefone(telefone)) {
    throw new AgendaquiError("TELEFONE_INVALIDO", "Informe um telefone valido com DDD.");
  }

  if (!email) {
    throw new AgendaquiError("EMAIL_OBRIGATORIO", "Informe o e-mail.");
  }

  if (!validarEmail(email)) {
    throw new AgendaquiError("EMAIL_INVALIDO", "Informe um e-mail valido.");
  }

  if (!senha) {
    throw new AgendaquiError("SENHA_OBRIGATORIA", "Informe a senha.");
  }

  if (!validarForcaSenha(senha)) {
    throw new AgendaquiError("SENHA_FRACA", "A senha deve ter pelo menos 8 caracteres, letra maiuscula, letra minuscula e numero.");
  }

  if (senha !== confirmarSenha) {
    throw new AgendaquiError("SENHAS_DIFERENTES", "A senha e a confirmacao precisam ser iguais.");
  }

  return { nome, telefone, email, senha };
}

export function validarDadosBasicosConta(input: DadosBasicosContaInput) {
  const nome = normalizarNome(input.nome);
  const telefone = normalizarTelefone(input.telefone);
  const email = normalizarEmail(input.email);

  if (!nome) {
    throw new AgendaquiError("NOME_OBRIGATORIO", "Informe o nome.");
  }

  if (!telefone) {
    throw new AgendaquiError("TELEFONE_OBRIGATORIO", "Informe o telefone.");
  }

  if (!validarTelefone(telefone)) {
    throw new AgendaquiError("TELEFONE_INVALIDO", "Informe um telefone valido com DDD.");
  }

  if (!email) {
    throw new AgendaquiError("EMAIL_OBRIGATORIO", "Informe o e-mail.");
  }

  if (!validarEmail(email)) {
    throw new AgendaquiError("EMAIL_INVALIDO", "Informe um e-mail valido.");
  }

  return { nome, telefone, email };
}

export function validarPerfilFiltro(perfil: unknown): PerfilConta | undefined {
  if (perfil === "CLIENTE" || perfil === "FUNCIONARIO" || perfil === "ADMINISTRADOR") {
    return perfil;
  }

  return undefined;
}

export function validarLogin(input: { email?: unknown; senha?: unknown }) {
  const email = normalizarEmail(input.email);
  const senha = stringCampo(input.senha);

  if (!email || !senha) {
    throw new AgendaquiError("CREDENCIAIS_INVALIDAS", "E-mail ou senha invalidos.", 401);
  }

  if (!validarEmail(email)) {
    throw new AgendaquiError("EMAIL_INVALIDO", "Informe um e-mail valido.");
  }

  return { email, senha };
}

export function validarEmailRecuperacao(emailInput: unknown) {
  const email = normalizarEmail(emailInput);

  if (!email) {
    throw new AgendaquiError("EMAIL_OBRIGATORIO", "Informe o e-mail.");
  }

  if (!validarEmail(email)) {
    throw new AgendaquiError("EMAIL_INVALIDO", "Informe um e-mail valido.");
  }

  return email;
}

export function validarNovaSenha(input: { senha?: unknown; confirmarSenha?: unknown }) {
  const senha = stringCampo(input.senha);
  const confirmarSenha = stringCampo(input.confirmarSenha);

  if (!senha) {
    throw new AgendaquiError("SENHA_OBRIGATORIA", "Informe a nova senha.");
  }

  if (!validarForcaSenha(senha)) {
    throw new AgendaquiError("SENHA_FRACA", "A senha deve ter pelo menos 8 caracteres, letra maiuscula, letra minuscula e numero.");
  }

  if (senha !== confirmarSenha) {
    throw new AgendaquiError("SENHAS_DIFERENTES", "A senha e a confirmacao precisam ser iguais.");
  }

  return senha;
}
