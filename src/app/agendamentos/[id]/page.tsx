import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Mensagem } from "@/components/Mensagem";
import { CancelarAgendamentoForm } from "@/components/agendamentos/CancelarAgendamentoForm";
import { exigirConta } from "@/server/auth/guards";
import { agendamentoDaPagina } from "@/server/agendamentos/page-data";
import { formatarDataHora } from "@/server/agendamentos/calendario";
import { OperacionalForm } from "@/components/agendamentos/OperacionalForm";
import { formasPagamento, resumoPagamento, situacaoAtendimento, moeda as moedaCentavos, centavos } from "@/server/operacional/resumo";

export default async function AgendamentoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sucesso?: string }> }) {
  const conta = await exigirConta();
  const { id } = await params;
  const { sucesso } = await searchParams;
  const a = await agendamentoDaPagina(conta, id);
  const agora = new Date();
  const alteravel = a.status === "CONFIRMADO" && a.inicio > agora;
  const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const eventos = { CONFIRMADO: "Confirmação", REMARCADO: "Remarcação", CANCELADO: "Cancelamento", REALIZADO: "Atendimento realizado", NAO_COMPARECEU: "Cliente não compareceu" };
  const financeiro = resumoPagamento(a);
  const operador = conta.perfil !== "CLIENTE";
  return <AppShell conta={conta} active="agendamentos">
    <section className="panel">
      <Mensagem sucesso={sucesso} />
      <div className="section-title"><h2>Detalhes do agendamento</h2></div>
      <dl className="agenda-summary block-gap">
        <div><dt>Empresa</dt><dd>{a.empresa.nome}</dd></div>
        <div><dt>Situação</dt><dd>{situacaoAtendimento(a, agora)}</dd></div>
        <div><dt>Cliente</dt><dd>{a.cliente.nome}</dd></div><div><dt>Funcionário</dt><dd>{a.funcionario.nome}</dd></div>
        <div><dt>Início</dt><dd>{formatarDataHora(a.inicio)}</dd></div><div><dt>Término previsto</dt><dd>{formatarDataHora(a.fim)}</dd></div>
        <div><dt>Serviços contratados</dt><dd>{a.servicos.map((s) => <div key={s.id}>{s.nome} · {s.duracao} min · {moeda(Number(s.preco))}</div>)}</dd></div>
        <div><dt>Valor total</dt><dd>{moeda(a.servicos.reduce((soma, s) => soma + Number(s.preco), 0))}</dd></div>
      </dl>
      <div className="actions block-gap">{alteravel && <Link className="button" href={`/agendamentos/${a.id}/remarcar`}>Remarcar horário</Link>}<Link className="button secondary" href="/agendamentos">Voltar à agenda</Link></div>
      {alteravel && <CancelarAgendamentoForm id={a.id} versao={a.versao} />}
      {operador && a.status === "CONFIRMADO" && a.fim <= agora && <OperacionalForm id={a.id} versao={a.versao} operacao="finalizar" />}
    </section>
    {(a.status === "REALIZADO" || a.pagamentos.length > 0) && <section className="panel"><div className="section-title"><h2>Pagamentos</h2></div>
      <dl className="agenda-summary block-gap"><div><dt>Situação</dt><dd>{financeiro.situacao}</dd></div><div><dt>Recebido</dt><dd>{moedaCentavos(financeiro.recebido)}</dd></div><div><dt>Saldo pendente</dt><dd>{moedaCentavos(financeiro.saldo)}</dd></div></dl>
      {conta.perfil === "ADMINISTRADOR" && a.status === "REALIZADO" && financeiro.saldo > 0 && <OperacionalForm id={a.id} versao={a.versao} operacao="receber" saldo={financeiro.saldo} />}
      {!a.pagamentos.length ? <p className="empty-state block-gap">Nenhum pagamento registrado.</p> : <ul className="payment-list">{a.pagamentos.map((p) => <li key={p.id}>
        <strong>{moedaCentavos(centavos(p.valor))} · {formasPagamento[p.forma]}</strong> <span className={`badge ${p.estornadoEm ? "warning" : "success"}`}>{p.estornadoEm ? "Estornado" : "Recebido"}</span>
        <p className="muted">{formatarDataHora(p.createdAt)} · Registrado por {p.registradoPor.nome}</p>
        {p.estornadoEm && <p>Estorno em {formatarDataHora(p.estornadoEm)} por {p.estornadoPor?.nome}. Motivo: {p.motivoEstorno}</p>}
        {conta.perfil === "ADMINISTRADOR" && !p.estornadoEm && <OperacionalForm id={a.id} versao={a.versao} operacao="estornar" pagamentoId={p.id} />}
      </li>)}</ul>}
    </section>}
    <section className="panel"><div className="section-title"><h2>Histórico de alterações</h2></div>
      <ol className="agenda-timeline">{a.eventos.map((evento) => <li key={evento.id}><strong>{eventos[evento.tipo]}</strong><p className="muted">{formatarDataHora(evento.createdAt)} · {evento.ator.nome}</p>{evento.inicioAnterior && <p>Horário anterior: {formatarDataHora(evento.inicioAnterior)}</p>}<p>Atendimento: {formatarDataHora(evento.inicio)} até {formatarDataHora(evento.fim)}</p></li>)}</ol>
    </section>
  </AppShell>;
}
