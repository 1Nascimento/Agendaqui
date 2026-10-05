import type { AgendamentoRecord } from "@/server/agendamentos/repository";
import { dataLocal } from "@/server/agendamentos/calendario";
import { centavos, resumoPagamento } from "./resumo";

export function resumoFinanceiroMensal(registros: AgendamentoRecord[], agora: Date) {
  const mesAtual = dataLocal(agora).slice(0, 7);
  const meses = new Map<string, number>();
  function registrar(data: Date, valor: number) {
    if (data > agora) return;
    const mes = dataLocal(data).slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + valor);
  }
  for (const a of registros) {
    for (const p of a.pagamentos) {
      registrar(p.createdAt, centavos(p.valor));
      if (p.estornadoEm) registrar(p.estornadoEm, -centavos(p.valor));
    }
  }
  return {
    entrouNoMes: meses.get(mesAtual) ?? 0,
    aReceber: registros.reduce((total, a) => total + resumoPagamento(a).saldo, 0),
    historico: [...meses].filter(([mes]) => mes < mesAtual).sort(([a], [b]) => b.localeCompare(a)).map(([mes, entrou]) => ({ mes, entrou }))
  };
}
