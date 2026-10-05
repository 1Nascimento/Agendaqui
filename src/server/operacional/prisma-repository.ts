import { Prisma } from "@prisma/client";
import { detalhesAgendamento } from "@/server/agendamentos/repository";
import { transacaoSerializavel } from "@/server/db/transacao";
import type { OperacionalRepository, OperacionalTransacao } from "./repository";

function repositorio(db: Prisma.TransactionClient): OperacionalTransacao {
  const versao = (a: { id: string; empresaId: string; versao: number }) => ({ id: a.id, empresaId: a.empresaId, versao: a.versao });
  return {
    agendamento: (id, empresaId) => db.agendamento.findUnique({ where: { id, empresaId }, include: detalhesAgendamento }),
    async finalizar(a, status, atorId, agora) {
      await db.agendamento.update({ where: versao(a), data: { status, versao: { increment: 1 }, eventos: { create: { tipo: status, atorId, inicio: a.inicio, fim: a.fim, createdAt: agora } } } });
    },
    async receber(a, data) {
      await db.agendamento.update({ where: versao(a), data: { versao: { increment: 1 } } });
      await db.pagamento.create({ data: { agendamentoId: a.id, empresaId: a.empresaId, valor: data.valor, forma: data.forma, registradoPorId: data.atorId, createdAt: data.agora } });
    },
    async estornar(a, pagamentoId, motivo, atorId, agora) {
      await db.agendamento.update({ where: versao(a), data: { versao: { increment: 1 } } });
      await db.pagamento.update({ where: { id: pagamentoId, empresaId: a.empresaId, agendamentoId: a.id, estornadoEm: null }, data: { estornadoEm: agora, estornadoPorId: atorId, motivoEstorno: motivo } });
    }
  };
}

export const prismaOperacionalRepository: OperacionalRepository = {
  async transacao(executar) {
    return transacaoSerializavel((tx) => executar(repositorio(tx)));
  }
};
