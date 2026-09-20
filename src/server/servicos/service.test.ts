import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { ContaAutenticada } from "@/server/domain/perfis";
import { CriarServicoData, ServicoRecord, ServicoRepository } from "@/server/servicos/repository";
import { criarServico, editarServico, excluirServico, listarServicos, listarServicosDisponiveis } from "@/server/servicos/service";

class MemoryServicoRepository implements ServicoRepository {
  servicos: ServicoRecord[] = [];
  private idSeq = 1;

  async findById(id: string, empresaId: string) {
    return this.servicos.find((servico) => servico.id === id && servico.empresaId === empresaId) ?? null;
  }

  async findByNome(nome: string, empresaId: string) {
    return this.servicos.find((servico) => servico.nome === nome && servico.empresaId === empresaId) ?? null;
  }

  async createServico(data: CriarServicoData) {
    const now = new Date();
    const servico: ServicoRecord = {
      empresaId: data.empresaId,
      id: `servico_${this.idSeq++}`,
      nome: data.nome,
      preco: new Prisma.Decimal(data.preco),
      descricao: null,
      duracao: data.duracao,
      ativo: true,
      createdAt: now,
      updatedAt: now
    };

    this.servicos.push(servico);
    return servico;
  }

  async updateServico(id: string, data: Omit<CriarServicoData, "empresaId">, empresaId: string) {
    const servico = await this.findById(id, empresaId);

    if (!servico) throw new Error("Servico nao encontrado");

    Object.assign(servico, {
      ...data,
      preco: new Prisma.Decimal(data.preco),
      updatedAt: new Date()
    });
    return servico;
  }

  async deleteServico(id: string, empresaId: string) {
    this.servicos = this.servicos.filter((servico) => servico.id !== id || servico.empresaId !== empresaId);
  }

  async listServicos(empresaId: string) {
    return this.servicos.filter((s) => s.empresaId === empresaId).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async listServicosDisponiveis(empresaId: string) {
    return (await this.listServicos(empresaId)).filter((servico) => servico.ativo);
  }
}

const administrador: ContaAutenticada = {
  empresaId: "empresa_padrao",
  id: "admin_1",
  nome: "Administrador",
  email: "admin@example.com",
  perfil: "ADMINISTRADOR",
  ativo: true
};

const cliente: ContaAutenticada = { ...administrador, id: "cliente_1", perfil: "CLIENTE" };
const servicoBase = { nome: "Corte de cabelo", preco: "45,50", duracao: "45" };

describe("Modulo 2 - gerenciamento de servicos", () => {
  let repo: MemoryServicoRepository;

  beforeEach(() => {
    repo = new MemoryServicoRepository();
  });

  it("permite Administrador cadastrar servico com preco e duracao", async () => {
    await expect(criarServico(administrador, servicoBase, repo)).resolves.toMatchObject({
      nome: "Corte de cabelo",
      preco: "45.50",
      duracao: 45
    });
  });

  it("rejeita cadastro de servico por perfil sem permissao", async () => {
    await expect(criarServico(cliente, servicoBase, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("valida nome, preco e duracao", async () => {
    await expect(criarServico(administrador, { ...servicoBase, nome: " " }, repo)).rejects.toMatchObject({ code: "NOME_SERVICO_OBRIGATORIO" });
    await expect(criarServico(administrador, { ...servicoBase, preco: "0" }, repo)).rejects.toMatchObject({ code: "PRECO_INVALIDO" });
    await expect(criarServico(administrador, { ...servicoBase, duracao: "0" }, repo)).rejects.toMatchObject({ code: "DURACAO_INVALIDA" });
  });

  it("rejeita nomes de servico duplicados", async () => {
    await criarServico(administrador, servicoBase, repo);

    await expect(criarServico(administrador, servicoBase, repo)).rejects.toMatchObject({ code: "SERVICO_DUPLICADO" });
  });

  it("permite editar um servico", async () => {
    const criado = await criarServico(administrador, servicoBase, repo);

    await expect(editarServico(administrador, criado.id, { nome: "Corte premium", preco: "60", duracao: "60" }, repo)).resolves.toMatchObject({
      nome: "Corte premium",
      preco: "60.00",
      duracao: 60
    });
  });

  it("permite excluir um servico", async () => {
    const criado = await criarServico(administrador, servicoBase, repo);

    await expect(excluirServico(administrador, criado.id, repo)).resolves.toBeUndefined();
    await expect(listarServicosDisponiveis(cliente, repo)).resolves.toEqual([]);
  });

  it("lista servicos em ordem alfabetica", async () => {
    await criarServico(administrador, { nome: "Barba", preco: "30", duracao: "30" }, repo);
    await criarServico(administrador, servicoBase, repo);

    await expect(listarServicosDisponiveis(cliente, repo)).resolves.toMatchObject([
      { nome: "Barba" },
      { nome: "Corte de cabelo" }
    ]);
  });

  it("lista como disponiveis apenas servicos ativos", async () => {
    const criado = await criarServico(administrador, servicoBase, repo);
    const servico = await repo.findById(criado.id, administrador.empresaId);

    if (servico) servico.ativo = false;

    await expect(listarServicosDisponiveis(cliente, repo)).resolves.toEqual([]);
  });
});

describe("Serviços por empresa", () => {
  const outroAdmin = { ...administrador, id: "outro-admin", empresaId: "outra" };
  it("cria serviço na empresa do administrador, ignorando empresa adulterada", async () => {
    const repo = new MemoryServicoRepository();
    await expect(criarServico(administrador, { ...servicoBase, empresaId: "outra" } as typeof servicoBase, repo)).resolves.toMatchObject({ empresaId: administrador.empresaId });
  });
  it("permite nomes iguais em empresas diferentes e isola listagens", async () => {
    const repo = new MemoryServicoRepository();
    const primeiro = await criarServico(administrador, servicoBase, repo);
    const segundo = await criarServico(outroAdmin, servicoBase, repo);
    expect((await listarServicos(administrador, repo)).map((s) => s.id)).toEqual([primeiro.id]);
    expect((await listarServicosDisponiveis(outroAdmin, repo)).map((s) => s.id)).toEqual([segundo.id]);
  });
  it("não permite editar ou excluir serviço de outra empresa", async () => {
    const repo = new MemoryServicoRepository();
    const outro = await criarServico(outroAdmin, servicoBase, repo);
    await expect(editarServico(administrador, outro.id, servicoBase, repo)).rejects.toMatchObject({ code: "SERVICO_NAO_ENCONTRADO" });
    await expect(excluirServico(administrador, outro.id, repo)).rejects.toMatchObject({ code: "SERVICO_NAO_ENCONTRADO" });
    expect(repo.servicos).toHaveLength(1);
  });
  it("recusa consulta sem contexto de empresa", async () => {
    const repo = new MemoryServicoRepository();
    await expect(listarServicosDisponiveis({ ...cliente, empresaId: "" }, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });
});
