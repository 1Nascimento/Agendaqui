import { dataLocal, instante, somarDias } from "@/server/agendamentos/calendario";
import { AgendaquiError } from "@/server/domain/errors";
import type { AgendamentoRecord } from "@/server/agendamentos/repository";

export function validarDataFiltro(valor?: string) {
  if (!valor) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(instante(valor, "00:00").getTime()) || dataLocal(instante(valor, "00:00")) !== valor) throw new AgendaquiError("FILTRO_INVALIDO", "Informe uma data válida.");
  return valor;
}
export function periodoDashboard(input: { inicio?: string; fim?: string }, agora: Date) {
  const hoje = dataLocal(agora);
  const inicio = validarDataFiltro(input.inicio) ?? `${hoje.slice(0, 7)}-01`;
  const fim = validarDataFiltro(input.fim) ?? hoje;
  if (inicio > fim) throw new AgendaquiError("FILTRO_INVALIDO", "A data inicial deve ser anterior ou igual à final.");
  return { inicio, fim, de: instante(inicio, "00:00"), ate: instante(somarDias(fim, 1), "00:00") };
}
export function filtrarAgenda(registros: AgendamentoRecord[], filtro: { funcionarioId?: string; data?: string; status?: string }, agora: Date) {
  const data = validarDataFiltro(filtro.data);
  return registros.filter((a) => (!filtro.funcionarioId || a.funcionarioId === filtro.funcionarioId) && (!data || dataLocal(a.inicio) === data) && (!filtro.status || (filtro.status === "AGUARDANDO_BAIXA" ? a.status === "CONFIRMADO" && a.fim <= agora : a.status === filtro.status)));
}
