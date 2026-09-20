import { prisma } from "@/server/db/prisma";
import { ContaRepository } from "@/server/contas/repository";

const includeEmpresa = { empresa: { select: { id: true, nome: true, slug: true } } };

export const prismaContaRepository: ContaRepository = {
  async findByEmail(email) {
    // A identidade de login continua global; operações administrativas usam empresaId.
    return prisma.conta.findUnique({ where: { email }, include: includeEmpresa });
  },

  async findById(id, empresaId) {
    return prisma.conta.findUnique({ where: { id, empresaId }, include: includeEmpresa });
  },

  async createConta(data) {
    return prisma.conta.create({ data, include: includeEmpresa });
  },

  async updateConta(id, data, empresaId) {
    return prisma.conta.update({
      where: { id, empresaId },
      data,
      include: includeEmpresa
    });
  },

  async listContas(filtro) {
    return prisma.conta.findMany({
      where: { empresaId: filtro.empresaId, perfil: filtro.perfil },
      include: includeEmpresa,
      orderBy: [
        { perfil: "asc" },
        { nome: "asc" }
      ]
    });
  },

  async countActiveByPerfil(perfil, empresaId) {
    return prisma.conta.count({
      where: {
        empresaId,
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
      include: { conta: { include: includeEmpresa } }
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

  async revokeSessoesByContaId(contaId, revogadaEm, empresaId) {
    await prisma.sessaoConta.updateMany({
      where: {
        contaId,
        conta: { empresaId },
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
      include: { conta: { include: includeEmpresa } }
    });
  },

  async marcarTokenRecuperacaoSenhaUtilizado(id, utilizadoEm) {
    await prisma.tokenRecuperacaoSenha.update({
      where: { id },
      data: { utilizadoEm }
    });
  }
};
