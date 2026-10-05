import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPerfil } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const conta = await exigirPerfil(["CLIENTE"]);
  const params = await searchParams;
  const busca = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const empresas = await prisma.empresa.findMany({
    where: { nome: { contains: busca, mode: "insensitive" }, contas: { some: { perfil: "ADMINISTRADOR", ativo: true } } },
    select: { id: true, nome: true }, orderBy: [{ nome: "asc" }, { id: "asc" }]
  });
  return <AppShell conta={conta} active="empresas"><section className="panel">
    <div className="section-title"><h2>Empresas</h2></div>
    <form className="actions block-gap"><div className="field"><label htmlFor="busca-empresa">Nome da empresa</label><input id="busca-empresa" name="q" defaultValue={busca} maxLength={100} /></div><button className="button" type="submit">Buscar</button><Link className="nav-link" href="/empresas">Limpar</Link></form>
    <div className="block-gap">{!empresas.length ? <p className="empty-state">Nenhuma empresa encontrada.</p> : <div className="table-wrap"><table><thead><tr><th>Empresa</th><th>Agendamento</th></tr></thead><tbody>{empresas.map((empresa) => <tr key={empresa.id}><td>{empresa.nome}</td><td><Link className="button secondary small" href={`/agendamentos/novo?empresa=${encodeURIComponent(empresa.id)}`}>Selecionar</Link></td></tr>)}</tbody></table></div>}</div>
  </section></AppShell>;
}
