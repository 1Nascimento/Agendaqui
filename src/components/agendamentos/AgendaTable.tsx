import Link from "next/link";
import type { AgendamentoRecord } from "@/server/agendamentos/repository";
import { formatarDataHora } from "@/server/agendamentos/calendario";
import { moeda, resumoPagamento, situacaoAtendimento } from "@/server/operacional/resumo";

export function AgendaTable({ agendamentos, agora, cliente = false, financeiro = false }: { agendamentos: AgendamentoRecord[]; agora: Date; cliente?: boolean; financeiro?: boolean }) {
  if (!agendamentos.length) return <div className="empty-state">Nenhum atendimento encontrado.</div>;
  return <div className="table-wrap"><table>
    <thead><tr><th>Data e horário</th>{cliente ? <th>Empresa</th> : <th>Cliente</th>}<th>Funcionário</th><th>Serviços</th><th>Valor</th><th>Situação</th>{financeiro && <th>Pagamento</th>}<th>Detalhes</th></tr></thead>
    <tbody>{agendamentos.map((a) => { const resumo = resumoPagamento(a); return <tr key={a.id}>
      <td>{formatarDataHora(a.inicio)}</td><td>{cliente ? a.empresa.nome : a.cliente.nome}</td><td>{a.funcionario.nome}</td><td>{a.servicos.map((s) => s.nome).join(", ")}</td><td>{moeda(resumo.total)}</td>
      <td><span className={`badge ${a.status === "REALIZADO" ? "success" : a.status === "CANCELADO" || a.status === "NAO_COMPARECEU" || a.fim <= agora ? "warning" : ""}`}>{situacaoAtendimento(a, agora)}</span></td>
      {financeiro && <td>{a.status === "REALIZADO" ? <>{resumo.situacao}<br /><span className="muted">Saldo: {moeda(resumo.saldo)}</span></> : "—"}</td>}
      <td><Link className="button secondary small" href={`/agendamentos/${a.id}`}>Ver detalhes</Link></td>
    </tr>; })}</tbody>
  </table></div>;
}
