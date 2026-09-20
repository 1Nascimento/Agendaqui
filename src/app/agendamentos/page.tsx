import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirConta } from "@/server/auth/guards";
import { prismaAgendaRepository } from "@/server/agendamentos/prisma-repository";
import { listarAgendamentos } from "@/server/agendamentos/service";
import { formatarDataHora } from "@/server/agendamentos/calendario";

export default async function AgendamentosPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const conta = await exigirConta();
  const { aba } = await searchParams;
  const historico = aba === "historico";
  const todos = await listarAgendamentos(conta, prismaAgendaRepository);
  const agora = new Date();
  const futuros = todos.filter((a) => a.status === "CONFIRMADO" && a.fim > agora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const anteriores = todos.filter((a) => a.status === "CANCELADO" || a.fim <= agora);
  const agendamentos = historico ? anteriores : futuros;
  return <AppShell conta={conta} active="agendamentos"><section className="panel">
    <div className="section-title"><h2>{conta.perfil === "CLIENTE" ? "Meus agendamentos" : conta.perfil === "FUNCIONARIO" ? "Minha agenda" : "Agenda de atendimentos"}</h2><p>Consulte seus atendimentos e acompanhe confirmações, remarcações e cancelamentos. Horários de Brasília (UTC−3).</p></div>
    <div className="actions toolbar-gap"><Link className="button" href="/agendamentos/novo">Novo agendamento</Link>{conta.perfil !== "CLIENTE" && <Link className="button secondary" href="/funcionario/expediente">{conta.perfil === "FUNCIONARIO" ? "Meu expediente" : "Expedientes dos funcionários"}</Link>}</div>
    <nav className="tabs" aria-label="Visualização de agendamentos"><Link className={`tab ${!historico ? "active" : ""}`} href="/agendamentos">Próximos ({futuros.length})</Link><Link className={`tab ${historico ? "active" : ""}`} href="/agendamentos?aba=historico">Histórico ({anteriores.length})</Link></nav>
    <div className="block-gap">{!agendamentos.length ? <div className="empty-state">{historico ? "Nenhum agendamento no histórico." : "Nenhum atendimento agendado."}</div> : <div className="table-wrap"><table>
      <thead><tr><th>Data e horário</th>{conta.perfil !== "CLIENTE" && <th>Cliente</th>}<th>Funcionário</th><th>Serviços</th><th>Valor</th><th>Situação</th><th>Detalhes</th></tr></thead>
      <tbody>{agendamentos.map((a) => <tr key={a.id}><td>{formatarDataHora(a.inicio)}</td>{conta.perfil !== "CLIENTE" && <td>{a.cliente.nome}</td>}<td>{a.funcionario.nome}</td><td>{a.servicos.map((s) => s.nome).join(", ")}</td><td>{a.servicos.reduce((soma, s) => soma + Number(s.preco), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><span className={`badge ${a.status === "CANCELADO" ? "warning" : a.fim > agora ? "success" : ""}`}>{a.status === "CANCELADO" ? "Cancelado" : a.fim <= agora ? "Encerrado" : a.inicio <= agora ? "Em andamento" : "Confirmado"}</span></td><td><Link className="button secondary small" href={`/agendamentos/${a.id}`}>Ver detalhes</Link></td></tr>)}</tbody>
    </table></div>}</div>
  </section></AppShell>;
}
