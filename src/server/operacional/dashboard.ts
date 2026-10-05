import type { AgendamentoRecord } from "@/server/agendamentos/repository";
import { dataLocal } from "@/server/agendamentos/calendario";
import { centavos, resumoPagamento } from "./resumo";

export function calcularDashboard(registros: AgendamentoRecord[], periodo: { de: Date; ate: Date }, agora: Date) {
  const dentro = (data: Date) => data >= periodo.de && data < periodo.ate;
  const noPeriodo = registros.filter((a) => dentro(a.inicio));
  const realizados = noPeriodo.filter((a) => a.status === "REALIZADO");
  const pagamentos = registros.flatMap((a) => a.pagamentos);
  const recebimentos = pagamentos.filter((p) => dentro(p.createdAt)).reduce((soma, p) => soma + centavos(p.valor), 0);
  const estornos = pagamentos.filter((p) => p.estornadoEm && dentro(p.estornadoEm)).reduce((soma, p) => soma + centavos(p.valor), 0);
  const produzido = realizados.reduce((soma, a) => soma + resumoPagamento(a).total, 0);
  const porFuncionario = new Map<string, { id: string; nome: string; realizados: number; produzido: number }>();
  for (const a of realizados) {
    const item = porFuncionario.get(a.funcionarioId) ?? { id: a.funcionarioId, nome: a.funcionario.nome, realizados: 0, produzido: 0 };
    item.realizados++; item.produzido += resumoPagamento(a).total; porFuncionario.set(item.id, item);
  }
  return {
    agendados: noPeriodo.length, realizados: realizados.length,
    cancelados: noPeriodo.filter((a) => a.status === "CANCELADO").length,
    faltas: noPeriodo.filter((a) => a.status === "NAO_COMPARECEU").length,
    aguardandoBaixa: registros.filter((a) => a.status === "CONFIRMADO" && a.fim <= agora).length,
    hoje: registros.filter((a) => a.status === "CONFIRMADO" && dataLocal(a.inicio) === dataLocal(agora)).length,
    saldoPendente: registros.reduce((soma, a) => soma + resumoPagamento(a).saldo, 0),
    produzido, recebimentos, estornos, liquido: recebimentos - estornos,
    ticketMedio: realizados.length ? Math.round(produzido / realizados.length) : 0,
    funcionarios: [...porFuncionario.values()].sort((a, b) => b.realizados - a.realizados || a.nome.localeCompare(b.nome)),
    proximos: registros.filter((a) => a.status === "CONFIRMADO" && a.fim > agora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime()).slice(0, 5)
  };
}
