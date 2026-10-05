import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AgendamentoForm } from "@/components/agendamentos/AgendamentoForm";
import { exigirConta } from "@/server/auth/guards";
import { agendamentoDaPagina } from "@/server/agendamentos/page-data";

export default async function RemarcarPage({ params }: { params: Promise<{ id: string }> }) {
  const conta = await exigirConta();
  const { id } = await params;
  const a = await agendamentoDaPagina(conta, id);
  return <AppShell conta={conta} active="agendamentos"><section className="panel">
    <div className="section-title"><h2>Remarcar atendimento</h2></div>
    {a.status !== "CONFIRMADO" || a.inicio <= new Date() ? <div className="empty-state block-gap">Este agendamento não pode mais ser remarcado. <Link href={`/agendamentos/${a.id}`}>Voltar aos detalhes</Link></div> :
      <AgendamentoForm empresaId={a.empresaId} servicos={a.servicos.map((s) => ({ id: s.id, nome: s.nome, preco: s.preco.toFixed(2), duracao: s.duracao }))} funcionarios={[a.funcionario]} clientes={[a.cliente]} remarcacao={{ id: a.id, versao: a.versao, inicio: a.inicio.toISOString(), cliente: a.cliente, funcionario: a.funcionario }} />}
  </section></AppShell>;
}
