import type { Prisma } from "@prisma/client";
import type { ContaAutenticada } from "@/server/domain/perfis";
import type { ServicoRecord } from "@/server/servicos/repository";
import type { Ocupacao, Expediente } from "./calendario";

export const detalhesAgendamento = {
  cliente: { select: { id: true, nome: true } },
  empresa: { select: { id: true, nome: true, slug: true } },
  funcionario: { select: { id: true, nome: true } },
  servicos: { orderBy: { nome: "asc" as const } },
  pagamentos: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }], include: { registradoPor: { select: { nome: true } }, estornadoPor: { select: { nome: true } } } },
  eventos: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }], include: { ator: { select: { nome: true } } } }
} satisfies Prisma.AgendamentoInclude;

export type AgendamentoRecord = Prisma.AgendamentoGetPayload<{ include: typeof detalhesAgendamento }>;
export type NovoAgendamento = {
  empresaId: string;
  clienteId: string;
  funcionarioId: string;
  inicio: Date;
  fim: Date;
  atorId: string;
  servicos: { servicoId: string; nome: string; preco: string; duracao: number }[];
};
export type FiltroOcupacao = Ocupacao & { empresaId: string; clienteId: string; funcionarioId: string; ignorarId?: string };

export interface AgendaLeitura {
  expedientes(funcionarioId: string, empresaId: string): Promise<Expediente[]>;
  futuros(funcionarioId: string, agora: Date, empresaId: string): Promise<Ocupacao[]>;
  conta(id: string, empresaId: string | null): Promise<ContaAutenticada | null>;
  servicos(ids: string[], empresaId: string): Promise<ServicoRecord[]>;
  agendamento(id: string, empresaId: string | null): Promise<AgendamentoRecord | null>;
  ocupacoes(filtro: FiltroOcupacao): Promise<Ocupacao[]>;
  listar(ator: ContaAutenticada): Promise<AgendamentoRecord[]>;
}

export interface AgendaTransacao extends AgendaLeitura {
  salvarExpedientes(funcionarioId: string, expedientes: Expediente[], empresaId: string): Promise<void>;
  criar(data: NovoAgendamento): Promise<AgendamentoRecord>;
  remarcar(atual: AgendamentoRecord, periodo: Ocupacao, atorId: string): Promise<AgendamentoRecord>;
  cancelar(atual: AgendamentoRecord, atorId: string): Promise<AgendamentoRecord>;
}

export interface AgendaRepository extends AgendaLeitura {
  transacao<T>(executar: (tx: AgendaTransacao) => Promise<T>): Promise<T>;
}
