import { prisma } from "@/server/db/prisma";
import { ContaRepository } from "@/server/contas/repository";
import { Prisma } from "@prisma/client";
import { AgendaquiError } from "@/server/domain/errors";

const includeEmpresa = { empresa: { select: { id: true, nome: true, slug: true } } };

export const prismaContaRepository: ContaRepository = {
  async findByEmail(email) {
    // A identidade de login continua global; operações administrativas usam empresaId.
    return prisma.conta.findUnique({ where: { email }, include: includeEmpresa });
  },

  async findById(id, empresaId) {
    return prisma.conta.findFirst({ where: { id, empresaId }, include: includeEmpresa });
  },

  async createConta(data) {
    try { return await prisma.conta.create({ data, include: includeEmpresa }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AgendaquiError("EMAIL_DUPLICADO", "Este e-mail já está cadastrado.", 409);
      throw error;
    }
  },

  async updateConta(id, data, empresaId) {
    try { return await prisma.conta.update({
      where: { id, empresaId: empresaId ?? undefined, ...(empresaId === null ? { perfil: "CLIENTE" } : {}) },
      data,
      include: includeEmpresa
    }); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AgendaquiError("EMAIL_DUPLICADO", "Este e-mail já está cadastrado.", 409);
      throw error;
    }
  },

  async listContas(filtro) {
    return prisma.conta.findMany({
      where: { perfil: filtro.perfil, OR: [{ empresaId: filtro.empresaId }, { perfil: "CLIENTE", agendamentosCliente: { some: { empresaId: filtro.empresaId } } }] },
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

  async redefinirSenhaAtomica(tokenId, senhaHash, agora) {
    return prisma.$transaction(async (tx) => {
      const token = await tx.tokenRecuperacaoSenha.findUnique({ where: { id: tokenId } });
      if (!token) return false;
      // Serializa redefinições para a mesma conta, inclusive com tokens diferentes.
      const contas = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Conta" WHERE "id" = ${token.contaId} AND "ativo" = true FOR UPDATE`;
      if (!contas.length) return false;
      const consumo = await tx.tokenRecuperacaoSenha.updateMany({ where: { id: tokenId, utilizadoEm: null, expiraEm: { gt: agora } }, data: { utilizadoEm: agora } });
      if (consumo.count !== 1) return false;
      await tx.conta.update({ where: { id: token.contaId }, data: { senhaHash } });
      await tx.tokenRecuperacaoSenha.updateMany({ where: { contaId: token.contaId, utilizadoEm: null }, data: { utilizadoEm: agora } });
      await tx.sessaoConta.updateMany({ where: { contaId: token.contaId, revogadaEm: null }, data: { revogadaEm: agora } });
      return true;
    });
  }
};
