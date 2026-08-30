import { prisma } from "@/server/db/prisma";
import { ServicoRepository } from "@/server/servicos/repository";

export const prismaServicoRepository: ServicoRepository = {
  async findById(id) {
    return prisma.servico.findUnique({ where: { id } });
  },

  async findByNome(nome) {
    return prisma.servico.findFirst({ where: { nome } });
  },

  async createServico(data) {
    return prisma.servico.create({ data });
  },

  async updateServico(id, data) {
    return prisma.servico.update({
      where: { id },
      data
    });
  },

  async deleteServico(id) {
    await prisma.servico.delete({ where: { id } });
  },

  async listServicos() {
    return prisma.servico.findMany({ orderBy: { nome: "asc" } });
  },

  async listServicosDisponiveis() {
    return prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" }
    });
  }
};
