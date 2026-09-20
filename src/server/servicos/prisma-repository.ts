import { prisma } from "@/server/db/prisma";
import { ServicoRepository } from "@/server/servicos/repository";

export const prismaServicoRepository: ServicoRepository = {
  async findById(id, empresaId) {
    return prisma.servico.findUnique({ where: { id, empresaId } });
  },

  async findByNome(nome, empresaId) {
    return prisma.servico.findFirst({ where: { nome, empresaId } });
  },

  async createServico(data) {
    return prisma.servico.create({ data });
  },

  async updateServico(id, data, empresaId) {
    return prisma.servico.update({
      where: { id, empresaId },
      data
    });
  },

  async deleteServico(id, empresaId) {
    await prisma.servico.delete({ where: { id, empresaId } });
  },

  async listServicos(empresaId) {
    return prisma.servico.findMany({ where: { empresaId }, orderBy: { nome: "asc" } });
  },

  async listServicosDisponiveis(empresaId) {
    return prisma.servico.findMany({
      where: { ativo: true, empresaId },
      orderBy: { nome: "asc" }
    });
  }
};
