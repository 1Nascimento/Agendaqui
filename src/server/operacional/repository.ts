import type { FormaPagamento } from "@prisma/client";
import type { AgendamentoRecord } from "@/server/agendamentos/repository";

export type ResultadoAtendimento = "REALIZADO" | "NAO_COMPARECEU";
export interface OperacionalTransacao {
  agendamento(id: string, empresaId: string): Promise<AgendamentoRecord | null>;
  finalizar(atual: AgendamentoRecord, status: ResultadoAtendimento, atorId: string, agora: Date): Promise<void>;
  receber(atual: AgendamentoRecord, data: { valor: string; forma: FormaPagamento; atorId: string; agora: Date }): Promise<void>;
  estornar(atual: AgendamentoRecord, pagamentoId: string, motivo: string, atorId: string, agora: Date): Promise<void>;
}
export interface OperacionalRepository {
  transacao<T>(executar: (tx: OperacionalTransacao) => Promise<T>): Promise<T>;
}
