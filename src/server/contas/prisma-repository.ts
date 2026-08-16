import { prisma } from "@/server/db/prisma";
import { ContaRepository } from "@/server/contas/repository";

export const prismaContaRepository: ContaRepository = {
  async findByEmail(email) {
    return prisma.conta.findUnique({ where: { email } });
  },

  async findById(id) {
    return prisma.conta.findUnique({ where: { id } });
  },

  async createConta(data) {
    return prisma.conta.create({ data });
  },

  async updateConta(id, data) {
    return prisma.conta.update({
      where: { id },
      data
    });
  },

  async listContas(filtro) {
    return prisma.conta.findMany({
      where: filtro?.perfil ? { perfil: filtro.perfil } : undefined,
      orderBy: [
        { perfil: "asc" },
        { nome: "asc" }
      ]
    });
  },

  async countActiveByPerfil(perfil) {
    return prisma.conta.count({
      where: {
        perfil,
        ativo: true
      }
    });
  },

  async createSessao(data) {
    return prisma.sessaoConta.create({ data });
  },

  async findSessaoById(id) {
    return prisma.sessaoConta.findUnique({
      where: { id },
      include: { conta: true }
    });
  },

  async revokeSessao(id, revogadaEm) {
    await prisma.sessaoConta.updateMany({
      where: {
        id,
        revogadaEm: null
      },
      data: { revogadaEm }
    });
  },

  async revokeSessoesByContaId(contaId, revogadaEm) {
    await prisma.sessaoConta.updateMany({
      where: {
        contaId,
        revogadaEm: null
      },
      data: { revogadaEm }
    });
  },

  async createTokenRecuperacaoSenha(data) {
    return prisma.tokenRecuperacaoSenha.create({ data });
  },

  async findTokenRecuperacaoSenha(tokenHash) {
    return prisma.tokenRecuperacaoSenha.findUnique({
      where: { tokenHash },
      include: { conta: true }
    });
  },

  async marcarTokenRecuperacaoSenhaUtilizado(id, utilizadoEm) {
    await prisma.tokenRecuperacaoSenha.update({
      where: { id },
      data: { utilizadoEm }
    });
  }
};
