import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { AgendaquiError } from "@/server/domain/errors";
import { detalhesAgendamento, type AgendaRepository, type AgendaTransacao } from "./repository";

function repositorio(db: Prisma.TransactionClient): AgendaTransacao {
  return {
    expedientes: (funcionarioId, empresaId) => db.expedienteFuncionario.findMany({ where: { funcionarioId, empresaId }, orderBy: { diaSemana: "asc" } }),
    futuros: (funcionarioId, agora, empresaId) => db.agendamento.findMany({ where: { funcionarioId, empresaId, status: "CONFIRMADO", fim: { gt: agora } }, select: { inicio: true, fim: true } }),
    async salvarExpedientes(funcionarioId, expedientes, empresaId) {
      await db.expedienteFuncionario.deleteMany({ where: { funcionarioId, empresaId } });
      if (expedientes.length) await db.expedienteFuncionario.createMany({ data: expedientes.map((expediente) => ({ ...expediente, funcionarioId, empresaId })) });
    },
    conta: (id, empresaId) => db.conta.findUnique({ where: { id, empresaId }, select: { id: true, nome: true, email: true, perfil: true, ativo: true, empresaId: true } }),
    servicos: (ids, empresaId) => db.servico.findMany({ where: { empresaId, id: { in: ids } } }),
    agendamento: (id, empresaId) => db.agendamento.findUnique({ where: { id, empresaId }, include: detalhesAgendamento }),
    ocupacoes: (filtro) => db.agendamento.findMany({
      where: {
        empresaId: filtro.empresaId,
        id: filtro.ignorarId ? { not: filtro.ignorarId } : undefined,
        status: "CONFIRMADO",
        OR: [{ funcionarioId: filtro.funcionarioId }, { clienteId: filtro.clienteId }],
        inicio: { lt: filtro.fim }, fim: { gt: filtro.inicio }
      }, select: { inicio: true, fim: true }
    }),
    listar: (ator) => db.agendamento.findMany({
      where: { empresaId: ator.empresaId, ...(ator.perfil === "CLIENTE" ? { clienteId: ator.id } : ator.perfil === "FUNCIONARIO" ? { funcionarioId: ator.id } : {}) },
      include: detalhesAgendamento, orderBy: { inicio: "desc" }
    }),
    criar: (data) => db.agendamento.create({
      data: {
        empresaId: data.empresaId,
        clienteId: data.clienteId, funcionarioId: data.funcionarioId, inicio: data.inicio, fim: data.fim,
        servicos: { create: data.servicos },
        eventos: { create: { atorId: data.atorId, tipo: "CONFIRMADO", inicio: data.inicio, fim: data.fim } }
      }, include: detalhesAgendamento
    }),
    remarcar: (atual, periodo, atorId) => db.agendamento.update({
      where: { id: atual.id, versao: atual.versao, empresaId: atual.empresaId },
      data: { ...periodo, versao: { increment: 1 }, eventos: { create: { atorId, tipo: "REMARCADO", ...periodo, inicioAnterior: atual.inicio, fimAnterior: atual.fim } } },
      include: detalhesAgendamento
    }),
    cancelar: (atual, atorId) => db.agendamento.update({
      where: { id: atual.id, versao: atual.versao, empresaId: atual.empresaId },
      data: { status: "CANCELADO", versao: { increment: 1 }, eventos: { create: { atorId, tipo: "CANCELADO", inicio: atual.inicio, fim: atual.fim } } },
      include: detalhesAgendamento
    })
  };
}

export const prismaAgendaRepository: AgendaRepository = {
  ...repositorio(prisma),
  async transacao(executar) {
    // Leitura de conflitos + gravação atômicas. Uma disputa refaz todas as validações.
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await prisma.$transaction((tx) => executar(repositorio(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          if (tentativa < 2) continue;
          throw new AgendaquiError("AGENDA_EM_ATUALIZACAO", "A agenda foi atualizada por outra pessoa. Consulte os horários novamente.", 409);
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new AgendaquiError("AGENDAMENTO_ALTERADO", "Este agendamento foi alterado. Atualize a página.", 409);
        throw error;
      }
    }
    throw new Error("Não foi possível atualizar a agenda.");
  }
};
