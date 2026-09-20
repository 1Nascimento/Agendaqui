import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { AgendaquiError } from "@/server/domain/errors";
import type { EmpresaRepository } from "./repository";

export const prismaEmpresaRepository: EmpresaRepository = {
  findBySlug: (slug) => prisma.empresa.findUnique({ where: { slug }, select: { id: true, nome: true, slug: true } }),
  async createComAdministrador(empresa, administrador) {
    try {
      // A criação aninhada é atômica: sem administrador, nenhuma empresa é criada.
      return await prisma.conta.create({ data: { ...administrador, perfil: "ADMINISTRADOR", empresa: { create: empresa } }, include: { empresa: { select: { id: true, nome: true, slug: true } } } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AgendaquiError("CADASTRO_DUPLICADO", "E-mail já cadastrado. Use outro e-mail ou entre na sua conta.", 409);
      throw error;
    }
  }
};
