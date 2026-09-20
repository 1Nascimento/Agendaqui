import { AppShell } from "@/components/AppShell";
import { AgendamentoForm } from "@/components/agendamentos/AgendamentoForm";
import { exigirConta } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export default async function NovoAgendamentoPage() {
  const conta = await exigirConta();
  const [servicos, funcionarios, clientes] = await Promise.all([
    prisma.servico.findMany({ where: { empresaId: conta.empresaId, ativo: true }, orderBy: { nome: "asc" } }),
    prisma.conta.findMany({ where: { empresaId: conta.empresaId, perfil: "FUNCIONARIO", ativo: true, ...(conta.perfil === "FUNCIONARIO" ? { id: conta.id } : {}) }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    conta.perfil === "CLIENTE" ? Promise.resolve([]) : prisma.conta.findMany({ where: { empresaId: conta.empresaId, perfil: "CLIENTE", ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } })
  ]);
  return <AppShell conta={conta} active="agendamentos"><section className="panel">
    <div className="section-title"><h2>Novo agendamento</h2><p>Escolha os serviços, consulte a disponibilidade e confirme seu atendimento.</p></div>
    {!servicos.length || !funcionarios.length || (conta.perfil !== "CLIENTE" && !clientes.length) ? <p className="empty-state block-gap">Para agendar, é necessário ter serviços, funcionários e clientes ativos cadastrados. O funcionário também precisa definir seu expediente.</p> :
      <AgendamentoForm servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, preco: s.preco.toFixed(2), duracao: s.duracao }))} funcionarios={funcionarios} clientes={clientes} clienteAtual={conta.perfil === "CLIENTE" ? { id: conta.id, nome: conta.nome } : undefined} funcionarioAtualId={conta.perfil === "FUNCIONARIO" ? conta.id : undefined} />}
  </section></AppShell>;
}
