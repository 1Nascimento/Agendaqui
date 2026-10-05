import Link from "next/link";
import { Mensagem } from "@/components/Mensagem";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ContasTable } from "@/components/admin/ContasTable";
import { ContaPublica } from "@/server/domain/perfis";

type AdminContasViewProps = {
  contas: ContaPublica[];
  active: "todos" | "clientes" | "funcionarios" | "administradores";
  erro?: string | string[];
  sucesso?: string | string[];
  busca?: string;
  status?: string;
};

export function AdminContasView({ contas, active, erro, sucesso, busca = "", status = "" }: AdminContasViewProps) {
  const texto = busca.trim().toLocaleLowerCase("pt-BR").slice(0, 200);
  const filtradas = contas.filter((c) => (!texto || `${c.nome} ${c.email} ${c.telefone}`.toLocaleLowerCase("pt-BR").includes(texto)) && (status === "ativas" ? c.ativo : status === "inativas" ? !c.ativo : true));
  return (
    <section className="panel">
      <div className="section-title">
        <h2>{active === "clientes" ? "Clientes cadastrados" : "Contas"}</h2>
      </div>
      <Mensagem erro={erro} sucesso={sucesso} />
      <div className="actions toolbar-gap">
        <AdminTabs active={active} />
        <Link className="button" href="/admin/funcionarios/novo">Novo Funcionário</Link>
        <Link className="button secondary" href="/admin/administradores/novo">Novo Administrador</Link>
      </div>
      <form className="actions toolbar-gap"><div className="field"><label htmlFor="contas-busca">Nome, e-mail ou telefone</label><input id="contas-busca" name="q" defaultValue={busca} maxLength={200} placeholder="Buscar conta" /></div><div className="field"><label htmlFor="contas-status">Status</label><select id="contas-status" name="status" defaultValue={status}><option value="">Todos</option><option value="ativas">Ativas</option><option value="inativas">Inativas</option></select></div><button className="button secondary" type="submit">Filtrar</button><Link className="nav-link" href={active === "todos" ? "/admin/contas" : `/admin/${active}`}>Limpar filtros</Link></form>
      <p className="muted toolbar-gap">{filtradas.length} conta(s) encontrada(s).</p>
      <ContasTable contas={filtradas} />
    </section>
  );
}
