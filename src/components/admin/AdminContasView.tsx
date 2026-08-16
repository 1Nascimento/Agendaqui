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
};

export function AdminContasView({ contas, active, erro, sucesso }: AdminContasViewProps) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>Contas</h2>
        <p>Gerenciamento básico de Clientes, Funcionários e Administradores.</p>
      </div>
      <Mensagem erro={erro} sucesso={sucesso} />
      <div className="actions toolbar-gap">
        <AdminTabs active={active} />
        <Link className="button" href="/admin/funcionarios/novo">Novo Funcionário</Link>
        <Link className="button secondary" href="/admin/administradores/novo">Novo Administrador</Link>
      </div>
      <ContasTable contas={contas} />
    </section>
  );
}
