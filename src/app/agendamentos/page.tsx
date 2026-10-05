import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirConta } from "@/server/auth/guards";
import { prismaAgendaRepository } from "@/server/agendamentos/prisma-repository";
import { listarAgendamentos } from "@/server/agendamentos/service";
import { AgendaTable } from "@/components/agendamentos/AgendaTable";
import { Mensagem } from "@/components/Mensagem";
import { filtrarAgenda } from "@/server/operacional/filtros";
import { mensagemErroForm } from "@/server/http/form";
import { parametroTexto, type ParametroBusca } from "@/server/http/query";
import { prisma } from "@/server/db/prisma";

type Filtros = { aba?: ParametroBusca; funcionarioId?: ParametroBusca; data?: ParametroBusca; status?: ParametroBusca };
export default async function AgendamentosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const conta = await exigirConta();
  const params = await searchParams;
  const filtro = { aba: parametroTexto(params.aba), funcionarioId: parametroTexto(params.funcionarioId), data: parametroTexto(params.data), status: parametroTexto(params.status) };
  const aba = ["historico", "baixa", "todos"].includes(filtro.aba ?? "") ? filtro.aba : "proximos";
  const todos = await listarAgendamentos(conta, prismaAgendaRepository);
  const agora = new Date();
  let filtrados: typeof todos = [], erro: string | undefined;
  try { filtrados = filtrarAgenda(todos, { ...filtro, funcionarioId: conta.perfil === "ADMINISTRADOR" ? filtro.funcionarioId : undefined }, agora); }
  catch (error) { erro = mensagemErroForm(error); }
  const futuros = filtrados.filter((a) => a.status === "CONFIRMADO" && a.fim > agora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const anteriores = filtrados.filter((a) => a.status !== "CONFIRMADO" || a.fim <= agora);
  const baixas = filtrados.filter((a) => a.status === "CONFIRMADO" && a.fim <= agora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const agendamentos = aba === "historico" ? anteriores : aba === "baixa" ? baixas : aba === "todos" ? filtrados : futuros;
  const funcionarios = conta.perfil === "ADMINISTRADOR" ? await prisma.conta.findMany({ where: { empresaId: conta.empresaId, perfil: "FUNCIONARIO" }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }) : [];
  const linkAba = (valor: string) => `/agendamentos?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filtro).filter(([, v]) => Boolean(v))), aba: valor })}`;
  return <AppShell conta={conta} active="agendamentos"><section className="panel">
    <div className="section-title"><h2>{conta.perfil === "CLIENTE" ? "Meus agendamentos" : conta.perfil === "FUNCIONARIO" ? "Minha agenda" : "Agenda de atendimentos"}</h2></div>
    <div className="actions toolbar-gap"><Link className="button" href="/agendamentos/novo">Novo agendamento</Link>{conta.perfil !== "CLIENTE" && <Link className="button secondary" href="/funcionario/expediente">{conta.perfil === "FUNCIONARIO" ? "Meu expediente" : "Expedientes dos funcionários"}</Link>}</div>
    <form className="actions toolbar-gap">
      <input type="hidden" name="aba" value="todos" />
      <div className="field"><label htmlFor="agenda-data-filtro">Data</label><input id="agenda-data-filtro" name="data" type="date" defaultValue={filtro.data} /></div>
      {conta.perfil === "ADMINISTRADOR" && <div className="field"><label htmlFor="agenda-funcionario-filtro">Funcionário</label><select id="agenda-funcionario-filtro" name="funcionarioId" defaultValue={filtro.funcionarioId ?? ""}><option value="">Todos os funcionários</option>{funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>}
      <div className="field"><label htmlFor="agenda-status">Situação</label><select id="agenda-status" name="status" defaultValue={filtro.status ?? ""}><option value="">Todas</option><option value="CONFIRMADO">Confirmado</option><option value="AGUARDANDO_BAIXA">Aguardando baixa</option><option value="REALIZADO">Realizado</option><option value="NAO_COMPARECEU">Não compareceu</option><option value="CANCELADO">Cancelado</option></select></div>
      <button className="button secondary" type="submit">Filtrar</button><Link className="nav-link" href={`/agendamentos?aba=${aba}`}>Limpar filtros</Link>
    </form>
    <Mensagem erro={erro} />
    <nav className="tabs" aria-label="Visualização de agendamentos">
      <Link className={`tab ${aba === "proximos" ? "active" : ""}`} href={linkAba("proximos")}>Próximos ({futuros.length})</Link>
      <Link className={`tab ${aba === "historico" ? "active" : ""}`} href={linkAba("historico")}>Histórico ({anteriores.length})</Link>
      {conta.perfil !== "CLIENTE" && <Link className={`tab ${aba === "baixa" ? "active" : ""}`} href={linkAba("baixa")}>Aguardando baixa ({baixas.length})</Link>}
      <Link className={`tab ${aba === "todos" ? "active" : ""}`} href={linkAba("todos")}>Todos ({filtrados.length})</Link>
    </nav>
    <div className="block-gap">{!agendamentos.length ? <div className="empty-state">{aba === "historico" ? "Nenhum agendamento no histórico." : "Nenhum atendimento encontrado."}</div> : <AgendaTable agendamentos={agendamentos} agora={agora} cliente={conta.perfil === "CLIENTE"} financeiro={conta.perfil === "ADMINISTRADOR"} />}</div>
  </section></AppShell>;
}
