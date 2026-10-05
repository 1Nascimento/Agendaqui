import { AppShell } from "@/components/AppShell";
import { exigirPerfil } from "@/server/auth/guards";
import { listarAgendamentos } from "@/server/agendamentos/service";
import { prismaAgendaRepository } from "@/server/agendamentos/prisma-repository";
import { moeda } from "@/server/operacional/resumo";
import { resumoFinanceiroMensal } from "@/server/operacional/financeiro";

export default async function PagamentosPage() {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const registros = await listarAgendamentos(conta, prismaAgendaRepository);
  const resumo = resumoFinanceiroMensal(registros, new Date());
  const formatarMes = (mes: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(`${mes}-15T12:00:00Z`));

  return <AppShell conta={conta} active="pagamentos">
    <section className="panel">
      <div className="section-title"><h2>Pagamentos</h2></div>
      <dl className="financial-summary block-gap">
        <div><dt>Entrou no mês</dt><dd>{moeda(resumo.entrouNoMes)}</dd></div>
        <div><dt>A receber</dt><dd>{moeda(resumo.aReceber)}</dd></div>
      </dl>
    </section>
    <section className="panel">
      <div className="section-title"><h2>Meses anteriores</h2></div>
      <div className="block-gap">{!resumo.historico.length ? <div className="empty-state">Sem histórico.</div> :
        <div className="table-wrap"><table className="financial-history"><thead><tr><th>Mês</th><th>Entrou</th></tr></thead><tbody>{resumo.historico.map((item) => <tr key={item.mes}><td>{formatarMes(item.mes)}</td><td>{moeda(item.entrou)}</td></tr>)}</tbody></table></div>}
      </div>
    </section>
  </AppShell>;
}
