import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPerfil } from "@/server/auth/guards";
import { listarAgendamentos } from "@/server/agendamentos/service";
import { prismaAgendaRepository } from "@/server/agendamentos/prisma-repository";
import { periodoDashboard } from "@/server/operacional/filtros";
import { calcularDashboard } from "@/server/operacional/dashboard";
import { resumoFinanceiroMensal } from "@/server/operacional/financeiro";
import { moeda } from "@/server/operacional/resumo";
import { dataLocal, formatarDataHora } from "@/server/agendamentos/calendario";

export default async function AdminPage() {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const agenda = await listarAgendamentos(conta, prismaAgendaRepository);
  const agora = new Date();
  const resumo = calcularDashboard(agenda, periodoDashboard({}, agora), agora);
  const financeiro = resumoFinanceiroMensal(agenda, agora);
  const atalhos = [
    { href: "/admin/clientes", nome: "Clientes" },
    { href: "/admin/funcionarios", nome: "Funcionários" },
    { href: "/admin/servicos", nome: "Serviços" },
    { href: "/admin/contas", nome: "Contas" }
  ];

  return (
    <AppShell conta={conta} active="admin">
      <section className="panel">
        <div className="dashboard-heading">
          <h2>Dashboard administrativo</h2>
          <Link className="button" href="/agendamentos/novo">Novo agendamento</Link>
        </div>
        <div className="dashboard-overview block-gap">
          <Link className="summary-item" href={`/agendamentos?aba=todos&data=${dataLocal(agora)}&status=CONFIRMADO`}>
            <span>Atendimentos hoje</span><strong>{resumo.hoje}</strong>
          </Link>
          <Link className="summary-item" href="/agendamentos?aba=baixa">
            <span>Para finalizar</span><strong>{resumo.aguardandoBaixa}</strong>
          </Link>
          <Link className="summary-item" href="/admin/pagamentos">
            <span>Entrou no mês</span><strong>{moeda(financeiro.entrouNoMes)}</strong>
          </Link>
          <Link className="summary-item" href="/admin/pagamentos">
            <span>A receber</span><strong>{moeda(financeiro.aReceber)}</strong>
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="dashboard-heading">
          <h2>Próximos atendimentos</h2>
          <Link className="nav-link" href="/agendamentos">Ver agenda</Link>
        </div>
        <div className="block-gap">
          {!resumo.proximos.length ? <div className="empty-state">Nenhum atendimento agendado.</div> :
            <div className="table-wrap">
              <table className="dashboard-agenda">
                <thead><tr><th>Horário</th><th>Cliente</th><th>Funcionário</th><th>Ação</th></tr></thead>
                <tbody>{resumo.proximos.map((a) => (
                  <tr key={a.id}>
                    <td>{formatarDataHora(a.inicio)}</td>
                    <td>{a.cliente.nome}</td>
                    <td>{a.funcionario.nome}</td>
                    <td><Link className="button secondary small" href={`/agendamentos/${a.id}`}>Abrir</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          }
        </div>
      </section>

      <section className="panel">
        <div className="section-title"><h2>Gerenciar</h2></div>
        <nav className="dashboard-shortcuts block-gap" aria-label="Gerenciamento">
          {atalhos.map((item) => <Link className="nav-link" key={item.href} href={item.href}>{item.nome}</Link>)}
        </nav>
      </section>
    </AppShell>
  );
}
