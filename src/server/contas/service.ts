import { hashPassword, verifyPassword } from "@/server/security/password";
import { gerarTokenSeguro, hashToken } from "@/server/security/tokens";
import { AgendaquiError } from "@/server/domain/errors";
import { ContaAutenticada, ContaPublica, PerfilConta } from "@/server/domain/perfis";
import { CadastroContaInput, DadosBasicosContaInput, validarCadastroConta, validarDadosBasicosConta, validarEmailRecuperacao, validarLogin, validarNovaSenha } from "@/server/contas/validation";
import { ContaRecord, ContaRepository } from "@/server/contas/repository";
import { EnviadorRecuperacaoSenha } from "@/server/email/recuperacao-senha";

const TEMPO_SESSAO_DIAS = 7;

export function removerSenha(conta: ContaRecord): ContaPublica {
  const { senhaHash: _senhaHash, ...publica } = conta;
  return publica;
}

export function contaAutenticada(conta: ContaRecord | ContaPublica): ContaAutenticada {
  return {
    id: conta.id,
    nome: conta.nome,
    email: conta.email,
    perfil: conta.perfil,
    ativo: conta.ativo
  };
}

function assertAdministrador(ator: ContaAutenticada) {
  if (ator.perfil !== "ADMINISTRADOR") {
    throw new AgendaquiError("ACESSO_NEGADO", "Acesso negado.", 403);
  }
}

function assertContaAtiva(conta: ContaRecord) {
  if (!conta.ativo) {
    throw new AgendaquiError("CONTA_INATIVA", "Esta conta esta inativa.", 403);
  }
}

async function assertEmailDisponivel(repository: ContaRepository, email: string, ignorarContaId?: string) {
  const existente = await repository.findByEmail(email);

  if (existente && existente.id !== ignorarContaId) {
    throw new AgendaquiError("EMAIL_DUPLICADO", "Este e-mail ja esta cadastrado.", 409);
  }
}

export async function cadastrarClientePublico(input: CadastroContaInput, repository: ContaRepository) {
  const data = validarCadastroConta(input);
  await assertEmailDisponivel(repository, data.email);

  const conta = await repository.createConta({
    nome: data.nome,
    telefone: data.telefone,
    email: data.email,
    senhaHash: await hashPassword(data.senha),
    perfil: "CLIENTE",
    ativo: true,
    emailVerificado: false
  });

  return removerSenha(conta);
}

export async function criarContaPorAdministrador(ator: ContaAutenticada, perfil: Exclude<PerfilConta, "CLIENTE">, input: CadastroContaInput, repository: ContaRepository) {
  assertAdministrador(ator);

  if (perfil !== "FUNCIONARIO" && perfil !== "ADMINISTRADOR") {
    throw new AgendaquiError("PERFIL_INVALIDO", "Perfil invalido para cadastro administrativo.");
  }

  const data = validarCadastroConta(input);
  await assertEmailDisponivel(repository, data.email);

  const conta = await repository.createConta({
    nome: data.nome,
    telefone: data.telefone,
    email: data.email,
    senhaHash: await hashPassword(data.senha),
    perfil,
    ativo: true,
    emailVerificado: false
  });

  return removerSenha(conta);
}

export async function autenticarConta(input: { email?: unknown; senha?: unknown }, repository: ContaRepository, now = new Date()) {
  const login = validarLogin(input);
  const conta = await repository.findByEmail(login.email);

  if (!conta) {
    throw new AgendaquiError("CREDENCIAIS_INVALIDAS", "E-mail ou senha invalidos.", 401);
  }

  assertContaAtiva(conta);

  const senhaCorreta = await verifyPassword(login.senha, conta.senhaHash);

  if (!senhaCorreta) {
    throw new AgendaquiError("CREDENCIAIS_INVALIDAS", "E-mail ou senha invalidos.", 401);
  }

  const token = gerarTokenSeguro();
  const expiraEm = new Date(now.getTime() + TEMPO_SESSAO_DIAS * 24 * 60 * 60 * 1000);
  const sessao = await repository.createSessao({
    contaId: conta.id,
    tokenHash: hashToken(token),
    expiraEm
  });

  return {
    conta: removerSenha(conta),
    sessao: {
      id: sessao.id,
      token,
      expiraEm
    }
  };
}

export async function obterContaPorSessao(sessionId: string, token: string, repository: ContaRepository, now = new Date()) {
  const sessao = await repository.findSessaoById(sessionId);

  if (!sessao || sessao.revogadaEm || sessao.expiraEm <= now) {
    return null;
  }

  if (sessao.tokenHash !== hashToken(token)) {
    return null;
  }

  if (!sessao.conta.ativo) {
    await repository.revokeSessao(sessionId, now);
    return null;
  }

  return removerSenha(sessao.conta);
}

export async function encerrarSessao(sessionId: string | null, repository: ContaRepository, now = new Date()) {
  if (!sessionId) {
    return;
  }

  await repository.revokeSessao(sessionId, now);
}

export async function listarContas(ator: ContaAutenticada, repository: ContaRepository, filtro?: { perfil?: PerfilConta }) {
  assertAdministrador(ator);
  const contas = await repository.listContas(filtro);
  return contas.map(removerSenha);
}

export async function editarConta(ator: ContaAutenticada, contaId: string, input: DadosBasicosContaInput, repository: ContaRepository) {
  const podeEditar = ator.perfil === "ADMINISTRADOR" || ator.id === contaId;

  if (!podeEditar) {
    throw new AgendaquiError("ACESSO_NEGADO", "Acesso negado.", 403);
  }

  const data = validarDadosBasicosConta(input);
  await assertEmailDisponivel(repository, data.email, contaId);

  const conta = await repository.updateConta(contaId, data);
  return removerSenha(conta);
}

export async function alterarStatusConta(ator: ContaAutenticada, contaId: string, ativo: boolean, repository: ContaRepository) {
  assertAdministrador(ator);

  const alvo = await repository.findById(contaId);

  if (!alvo) {
    throw new AgendaquiError("CONTA_NAO_ENCONTRADA", "Conta nao encontrada.", 404);
  }

  if (ator.id === contaId && !ativo) {
    throw new AgendaquiError("NAO_DESATIVAR_PROPRIA_CONTA", "Voce nao pode desativar sua propria conta.");
  }

  if (alvo.perfil === "ADMINISTRADOR" && !ativo) {
    const adminsAtivos = await repository.countActiveByPerfil("ADMINISTRADOR");

    if (adminsAtivos <= 1) {
      throw new AgendaquiError("ULTIMO_ADMINISTRADOR", "Nao e possivel desativar o ultimo Administrador ativo.");
    }
  }

  const conta = await repository.updateConta(contaId, { ativo });

  if (!ativo) {
    await repository.revokeSessoesByContaId(contaId, new Date());
  }

  return removerSenha(conta);
}

export async function solicitarRecuperacaoSenha(
  emailInput: unknown,
  repository: ContaRepository,
  enviador: EnviadorRecuperacaoSenha,
  options: { appUrl: string; validadeMinutos: number; now?: Date } = { appUrl: "http://localhost:3000", validadeMinutos: 60 }
) {
  const email = validarEmailRecuperacao(emailInput);
  const conta = await repository.findByEmail(email);
  const now = options.now ?? new Date();

  if (!conta || !conta.ativo) {
    return { enviado: false };
  }

  const token = gerarTokenSeguro();
  const expiraEm = new Date(now.getTime() + options.validadeMinutos * 60 * 1000);

  await repository.createTokenRecuperacaoSenha({
    contaId: conta.id,
    tokenHash: hashToken(token),
    expiraEm
  });

  const resetUrl = new URL("/redefinir-senha", options.appUrl);
  resetUrl.searchParams.set("token", token);

  await enviador.enviar({
    to: conta.email,
    nome: conta.nome,
    resetUrl: resetUrl.toString()
  });

  return { enviado: true, resetUrl: resetUrl.toString() };
}

export async function redefinirSenha(
  input: { token?: unknown; senha?: unknown; confirmarSenha?: unknown },
  repository: ContaRepository,
  now = new Date()
) {
  const token = typeof input.token === "string" ? input.token.trim() : "";

  if (!token) {
    throw new AgendaquiError("TOKEN_INVALIDO", "Token invalido.", 400);
  }

  const registro = await repository.findTokenRecuperacaoSenha(hashToken(token));

  if (!registro) {
    throw new AgendaquiError("TOKEN_INVALIDO", "Token invalido.", 400);
  }

  if (registro.utilizadoEm) {
    throw new AgendaquiError("TOKEN_UTILIZADO", "Token ja utilizado.", 400);
  }

  if (registro.expiraEm <= now) {
    throw new AgendaquiError("TOKEN_EXPIRADO", "Token expirado.", 400);
  }

  if (!registro.conta.ativo) {
    throw new AgendaquiError("CONTA_INATIVA", "Esta conta esta inativa.", 403);
  }

  const senha = validarNovaSenha(input);
  const senhaHash = await hashPassword(senha);

  await repository.updateConta(registro.contaId, { senhaHash });
  await repository.marcarTokenRecuperacaoSenhaUtilizado(registro.id, now);
  await repository.revokeSessoesByContaId(registro.contaId, now);

  return { ok: true };
}
