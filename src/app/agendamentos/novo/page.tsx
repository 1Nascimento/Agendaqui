import { AppShell } from "@/components/AppShell";
import { AgendamentoForm } from "@/components/agendamentos/AgendamentoForm";
import { exigirConta } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function NovoAgendamentoPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const conta = await exigirConta();
  const params = await searchParams;
  const empresaId = conta.perfil === "CLIENTE" ? (typeof params.empresa === "string" ? params.empresa : null) : conta.empresaId;
  if (!empresaId) redirect("/empresas");
  const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, contas: { some: { perfil: "ADMINISTRADOR", ativo: true } } }, select: { nome: true } });
  if (!empresa) notFound();
  const [servicos, funcionarios, clientes] = await Promise.all([
    prisma.servico.findMany({ where: { empresaId, ativo: true }, orderBy: { nome: "asc" } }),
    prisma.conta.findMany({ where: { empresaId, perfil: "FUNCIONARIO", ativo: true, ...(conta.perfil === "FUNCIONARIO" ? { id: conta.id } : {}) }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    conta.perfil === "CLIENTE" ? Promise.resolve([]) : prisma.conta.findMany({ where: { agendamentosCliente: { some: { empresaId } }, perfil: "CLIENTE", ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } })
  ]);
  return <AppShell conta={conta} active="agendamentos"><section className="panel">
    <div className="section-title"><h2>Novo agendamento · {empresa.nome}</h2>{conta.perfil === "CLIENTE" && <Link className="nav-link" href="/empresas">Trocar empresa</Link>}</div>
    {!servicos.length || !funcionarios.length || (conta.perfil !== "CLIENTE" && !clientes.length) ? <p className="empty-state block-gap">Para agendar, é necessário ter serviços, funcionários e clientes ativos cadastrados. O funcionário também precisa definir seu expediente.</p> :
      <AgendamentoForm empresaId={empresaId} servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, preco: s.preco.toFixed(2), duracao: s.duracao }))} funcionarios={funcionarios} clientes={clientes} clienteAtual={conta.perfil === "CLIENTE" ? { id: conta.id, nome: conta.nome } : undefined} funcionarioAtualId={conta.perfil === "FUNCIONARIO" ? conta.id : undefined} />}
  </section></AppShell>;
}
