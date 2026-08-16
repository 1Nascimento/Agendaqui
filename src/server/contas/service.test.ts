import { beforeEach, describe, expect, it } from "vitest";
import { alterarStatusConta, autenticarConta, cadastrarClientePublico, criarContaPorAdministrador, listarContas, redefinirSenha, solicitarRecuperacaoSenha } from "@/server/contas/service";
import { hashPassword } from "@/server/security/password";
import { ContaRecord, ContaRepository, CriarContaData, SessaoComContaRecord, SessaoRecord, TokenRecuperacaoComContaRecord, TokenRecuperacaoSenhaRecord } from "@/server/contas/repository";
import { ContaAutenticada, PerfilConta } from "@/server/domain/perfis";

class MemoryContaRepository implements ContaRepository {
  contas: ContaRecord[] = [];
  sessoes: SessaoRecord[] = [];
  tokens: TokenRecuperacaoSenhaRecord[] = [];
  private idSeq = 1;

  async findByEmail(email: string) {
    return this.contas.find((conta) => conta.email === email) ?? null;
  }

  async findById(id: string) {
    return this.contas.find((conta) => conta.id === id) ?? null;
  }

  async createConta(data: CriarContaData) {
    const now = new Date();
    const conta: ContaRecord = {
      id: `conta_${this.idSeq++}`,
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      senhaHash: data.senhaHash,
      perfil: data.perfil,
      ativo: data.ativo ?? true,
      emailVerificado: data.emailVerificado ?? false,
      createdAt: now,
      updatedAt: now
    };

    this.contas.push(conta);
    return conta;
  }

  async updateConta(id: string, data: Partial<Pick<ContaRecord, "nome" | "telefone" | "email" | "ativo" | "senhaHash">>) {
    const conta = await this.findById(id);

    if (!conta) {
      throw new Error("Conta nao encontrada");
    }

    Object.assign(conta, data, { updatedAt: new Date() });
    return conta;
  }

  async listContas(filtro?: { perfil?: PerfilConta }) {
    return this.contas.filter((conta) => !filtro?.perfil || conta.perfil === filtro.perfil);
  }

  async countActiveByPerfil(perfil: PerfilConta) {
    return this.contas.filter((conta) => conta.perfil === perfil && conta.ativo).length;
  }

  async createSessao(data: { contaId: string; tokenHash: string; expiraEm: Date }) {
    const now = new Date();
    const sessao: SessaoRecord = {
      id: `sessao_${this.idSeq++}`,
      contaId: data.contaId,
      tokenHash: data.tokenHash,
      expiraEm: data.expiraEm,
      revogadaEm: null,
      createdAt: now,
      updatedAt: now
    };

    this.sessoes.push(sessao);
    return sessao;
  }

  async findSessaoById(id: string): Promise<SessaoComContaRecord | null> {
    const sessao = this.sessoes.find((item) => item.id === id);

    if (!sessao) {
      return null;
    }

    const conta = await this.findById(sessao.contaId);

    if (!conta) {
      return null;
    }

    return { ...sessao, conta };
  }

  async revokeSessao(id: string, revogadaEm: Date) {
    const sessao = this.sessoes.find((item) => item.id === id);

    if (sessao && !sessao.revogadaEm) {
      sessao.revogadaEm = revogadaEm;
    }
  }

  async revokeSessoesByContaId(contaId: string, revogadaEm: Date) {
    for (const sessao of this.sessoes) {
      if (sessao.contaId === contaId && !sessao.revogadaEm) {
        sessao.revogadaEm = revogadaEm;
      }
    }
  }

  async createTokenRecuperacaoSenha(data: { contaId: string; tokenHash: string; expiraEm: Date }) {
    const token: TokenRecuperacaoSenhaRecord = {
      id: `token_${this.idSeq++}`,
      contaId: data.contaId,
      tokenHash: data.tokenHash,
      expiraEm: data.expiraEm,
      utilizadoEm: null,
      createdAt: new Date()
    };

    this.tokens.push(token);
    return token;
  }

  async findTokenRecuperacaoSenha(tokenHash: string): Promise<TokenRecuperacaoComContaRecord | null> {
    const token = this.tokens.find((item) => item.tokenHash === tokenHash);

    if (!token) {
      return null;
    }

    const conta = await this.findById(token.contaId);

    if (!conta) {
      return null;
    }

    return { ...token, conta };
  }

  async marcarTokenRecuperacaoSenhaUtilizado(id: string, utilizadoEm: Date) {
    const token = this.tokens.find((item) => item.id === id);

    if (token) {
      token.utilizadoEm = utilizadoEm;
    }
  }
}

const cadastroBase = {
  nome: "Maria Cliente",
  telefone: "(65) 99999-9999",
  email: "maria@example.com",
  senha: "SenhaForte1",
  confirmarSenha: "SenhaForte1"
};

async function criarConta(repo: MemoryContaRepository, perfil: PerfilConta, overrides: Partial<CriarContaData> = {}) {
  return repo.createConta({
    nome: overrides.nome ?? `${perfil} Teste`,
    telefone: overrides.telefone ?? "65999999999",
    email: overrides.email ?? `${perfil.toLowerCase()}@example.com`,
    senhaHash: overrides.senhaHash ?? (await hashPassword("SenhaForte1")),
    perfil,
    ativo: overrides.ativo ?? true,
    emailVerificado: overrides.emailVerificado ?? true
  });
}

function ator(conta: ContaRecord): ContaAutenticada {
  return {
    id: conta.id,
    nome: conta.nome,
    email: conta.email,
    perfil: conta.perfil,
    ativo: conta.ativo
  };
}

function tokenFromResetUrl(resetUrl: string) {
  return new URL(resetUrl).searchParams.get("token") ?? "";
}

describe("Modulo 1 - cadastro de Cliente", () => {
  let repo: MemoryContaRepository;

  beforeEach(() => {
    repo = new MemoryContaRepository();
  });

  it("permite criar Cliente com perfil CLIENTE e sem retornar senhaHash", async () => {
    const conta = await cadastrarClientePublico(cadastroBase, repo);

    expect(conta.perfil).toBe("CLIENTE");
    expect(conta.email).toBe("maria@example.com");
    expect("senhaHash" in conta).toBe(false);
  });

  it("ignora perfil adulterado no cadastro publico", async () => {
    const inputAdulterado = { ...cadastroBase, perfil: "ADMINISTRADOR" };
    const conta = await cadastrarClientePublico(inputAdulterado, repo);

    expect(conta.perfil).toBe("CLIENTE");
  });

  it("rejeita e-mail duplicado", async () => {
    await cadastrarClientePublico(cadastroBase, repo);

    await expect(cadastrarClientePublico(cadastroBase, repo)).rejects.toMatchObject({
      code: "EMAIL_DUPLICADO"
    });
  });

  it("rejeita senhas diferentes", async () => {
    await expect(cadastrarClientePublico({ ...cadastroBase, confirmarSenha: "OutraSenha1" }, repo)).rejects.toMatchObject({
      code: "SENHAS_DIFERENTES"
    });
  });

  it("valida campos obrigatorios", async () => {
    await expect(cadastrarClientePublico({ ...cadastroBase, nome: "   " }, repo)).rejects.toMatchObject({
      code: "NOME_OBRIGATORIO"
    });
  });
});

describe("Modulo 1 - login", () => {
  let repo: MemoryContaRepository;

  beforeEach(() => {
    repo = new MemoryContaRepository();
  });

  it("permite login de Cliente, Funcionario e Administrador", async () => {
    await criarConta(repo, "CLIENTE", { email: "cliente@example.com" });
    await criarConta(repo, "FUNCIONARIO", { email: "funcionario@example.com" });
    await criarConta(repo, "ADMINISTRADOR", { email: "admin@example.com" });

    await expect(autenticarConta({ email: "cliente@example.com", senha: "SenhaForte1" }, repo)).resolves.toMatchObject({ conta: { perfil: "CLIENTE" } });
    await expect(autenticarConta({ email: "funcionario@example.com", senha: "SenhaForte1" }, repo)).resolves.toMatchObject({ conta: { perfil: "FUNCIONARIO" } });
    await expect(autenticarConta({ email: "admin@example.com", senha: "SenhaForte1" }, repo)).resolves.toMatchObject({ conta: { perfil: "ADMINISTRADOR" } });
  });

  it("rejeita senha errada e e-mail inexistente", async () => {
    await criarConta(repo, "CLIENTE", { email: "cliente@example.com" });

    await expect(autenticarConta({ email: "cliente@example.com", senha: "SenhaErrada1" }, repo)).rejects.toMatchObject({ code: "CREDENCIAIS_INVALIDAS" });
    await expect(autenticarConta({ email: "naoexiste@example.com", senha: "SenhaForte1" }, repo)).rejects.toMatchObject({ code: "CREDENCIAIS_INVALIDAS" });
  });

  it("rejeita conta inativa", async () => {
    await criarConta(repo, "CLIENTE", { email: "inativa@example.com", ativo: false });

    await expect(autenticarConta({ email: "inativa@example.com", senha: "SenhaForte1" }, repo)).rejects.toMatchObject({ code: "CONTA_INATIVA" });
  });
});

describe("Modulo 1 - permissoes", () => {
  let repo: MemoryContaRepository;

  beforeEach(() => {
    repo = new MemoryContaRepository();
  });

  it("nega administracao para Cliente e Funcionario", async () => {
    const cliente = await criarConta(repo, "CLIENTE");
    const funcionario = await criarConta(repo, "FUNCIONARIO");

    await expect(listarContas(ator(cliente), repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(listarContas(ator(funcionario), repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("nega criacao administrativa para Cliente e Funcionario", async () => {
    const cliente = await criarConta(repo, "CLIENTE");
    const funcionario = await criarConta(repo, "FUNCIONARIO");

    await expect(criarContaPorAdministrador(ator(cliente), "FUNCIONARIO", { ...cadastroBase, email: "novo-func@example.com" }, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(criarContaPorAdministrador(ator(cliente), "ADMINISTRADOR", { ...cadastroBase, email: "novo-admin@example.com" }, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(criarContaPorAdministrador(ator(funcionario), "ADMINISTRADOR", { ...cadastroBase, email: "novo-admin2@example.com" }, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("permite Administrador criar Funcionario e Administrador", async () => {
    const admin = await criarConta(repo, "ADMINISTRADOR");

    await expect(criarContaPorAdministrador(ator(admin), "FUNCIONARIO", { ...cadastroBase, email: "novo-func@example.com" }, repo)).resolves.toMatchObject({ perfil: "FUNCIONARIO" });
    await expect(criarContaPorAdministrador(ator(admin), "ADMINISTRADOR", { ...cadastroBase, email: "novo-admin@example.com" }, repo)).resolves.toMatchObject({ perfil: "ADMINISTRADOR" });
  });
});

describe("Modulo 1 - recuperacao e redefinicao de senha", () => {
  let repo: MemoryContaRepository;
  const now = new Date("2026-08-15T12:00:00.000Z");

  beforeEach(() => {
    repo = new MemoryContaRepository();
  });

  it("gera token para solicitacao valida", async () => {
    await criarConta(repo, "CLIENTE", { email: "cliente@example.com" });
    const enviados: string[] = [];

    const result = await solicitarRecuperacaoSenha("cliente@example.com", repo, {
      async enviar(data) {
        enviados.push(data.resetUrl);
      }
    }, { appUrl: "http://localhost:3000", validadeMinutos: 60, now });

    expect(result.enviado).toBe(true);
    expect(enviados).toHaveLength(1);
    expect(tokenFromResetUrl(enviados[0])).toBeTruthy();
  });

  it("permite troca com token valido, invalida senha antiga e rejeita reutilizacao", async () => {
    await criarConta(repo, "CLIENTE", { email: "cliente@example.com" });
    let resetUrl = "";

    await solicitarRecuperacaoSenha("cliente@example.com", repo, {
      async enviar(data) {
        resetUrl = data.resetUrl;
      }
    }, { appUrl: "http://localhost:3000", validadeMinutos: 60, now });

    const token = tokenFromResetUrl(resetUrl);

    await expect(redefinirSenha({ token, senha: "NovaSenha1", confirmarSenha: "NovaSenha1" }, repo, now)).resolves.toEqual({ ok: true });
    await expect(autenticarConta({ email: "cliente@example.com", senha: "SenhaForte1" }, repo)).rejects.toMatchObject({ code: "CREDENCIAIS_INVALIDAS" });
    await expect(autenticarConta({ email: "cliente@example.com", senha: "NovaSenha1" }, repo)).resolves.toMatchObject({ conta: { email: "cliente@example.com" } });
    await expect(redefinirSenha({ token, senha: "OutraSenha1", confirmarSenha: "OutraSenha1" }, repo, now)).rejects.toMatchObject({ code: "TOKEN_UTILIZADO" });
  });

  it("rejeita token invalido", async () => {
    await expect(redefinirSenha({ token: "token-invalido", senha: "NovaSenha1", confirmarSenha: "NovaSenha1" }, repo, now)).rejects.toMatchObject({ code: "TOKEN_INVALIDO" });
  });

  it("rejeita token expirado", async () => {
    await criarConta(repo, "CLIENTE", { email: "cliente@example.com" });
    let resetUrl = "";

    await solicitarRecuperacaoSenha("cliente@example.com", repo, {
      async enviar(data) {
        resetUrl = data.resetUrl;
      }
    }, { appUrl: "http://localhost:3000", validadeMinutos: 60, now });

    await expect(redefinirSenha({ token: tokenFromResetUrl(resetUrl), senha: "NovaSenha1", confirmarSenha: "NovaSenha1" }, repo, new Date("2026-08-15T14:00:00.000Z"))).rejects.toMatchObject({
      code: "TOKEN_EXPIRADO"
    });
  });
});

describe("Modulo 1 - desativacao", () => {
  let repo: MemoryContaRepository;

  beforeEach(() => {
    repo = new MemoryContaRepository();
  });

  it("permite Administrador desativar conta e bloqueia novo login", async () => {
    const admin = await criarConta(repo, "ADMINISTRADOR", { email: "admin@example.com" });
    const cliente = await criarConta(repo, "CLIENTE", { email: "cliente@example.com" });

    await expect(alterarStatusConta(ator(admin), cliente.id, false, repo)).resolves.toMatchObject({ ativo: false });
    await expect(autenticarConta({ email: "cliente@example.com", senha: "SenhaForte1" }, repo)).rejects.toMatchObject({ code: "CONTA_INATIVA" });
  });
});
