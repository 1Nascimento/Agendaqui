import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { transacaoSerializavel } from "@/server/db/transacao";
import { detalhesAgendamento, type AgendaRepository, type AgendaTransacao } from "./repository";

function repositorio(db: Prisma.TransactionClient): AgendaTransacao {
  return {
    expedientes: (funcionarioId, empresaId) => db.expedienteFuncionario.findMany({ where: { funcionarioId, empresaId }, orderBy: { diaSemana: "asc" } }),
    futuros: (funcionarioId, agora, empresaId) => db.agendamento.findMany({ where: { funcionarioId, empresaId, status: "CONFIRMADO", fim: { gt: agora } }, select: { inicio: true, fim: true } }),
    async salvarExpedientes(funcionarioId, expedientes, empresaId) {
      await db.expedienteFuncionario.deleteMany({ where: { funcionarioId, empresaId } });
      if (expedientes.length) await db.expedienteFuncionario.createMany({ data: expedientes.map((expediente) => ({ ...expediente, funcionarioId, empresaId })) });
    },
    conta: (id, empresaId) => db.conta.findFirst({ where: { id, ...(empresaId === null ? { perfil: "CLIENTE" } : { OR: [{ empresaId }, { perfil: "CLIENTE", agendamentosCliente: { some: { empresaId } } }] }) }, select: { id: true, nome: true, email: true, perfil: true, ativo: true, empresaId: true } }),
    servicos: (ids, empresaId) => db.servico.findMany({ where: { empresaId, id: { in: ids } } }),
    agendamento: (id, empresaId) => db.agendamento.findUnique({ where: { id, ...(empresaId ? { empresaId } : {}) }, include: detalhesAgendamento }),
    ocupacoes: (filtro) => db.agendamento.findMany({
      where: {
        id: filtro.ignorarId ? { not: filtro.ignorarId } : undefined,
        status: "CONFIRMADO",
        OR: [{ funcionarioId: filtro.funcionarioId, empresaId: filtro.empresaId }, { clienteId: filtro.clienteId }],
        inicio: { lt: filtro.fim }, fim: { gt: filtro.inicio }
      }, select: { inicio: true, fim: true }
    }),
    listar: (ator) => db.agendamento.findMany({
      where: ator.perfil === "CLIENTE" ? { clienteId: ator.id } : { empresaId: ator.empresaId!, ...(ator.perfil === "FUNCIONARIO" ? { funcionarioId: ator.id } : {}) },
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
    return transacaoSerializavel((tx) => executar(repositorio(tx)));
  }
};
