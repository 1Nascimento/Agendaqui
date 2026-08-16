import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { listarContas } from "@/server/contas/service";
import { prismaContaRepository } from "@/server/contas/prisma-repository";
import { exigirPerfil } from "@/server/auth/guards";

export default async function AdminPage() {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const contas = await listarContas(conta, prismaContaRepository);
  const clientes = contas.filter((item) => item.perfil === "CLIENTE").length;
  const funcionarios = contas.filter((item) => item.perfil === "FUNCIONARIO").length;
  const administradores = contas.filter((item) => item.perfil === "ADMINISTRADOR").length;

  return (
    <AppShell conta={conta} active="admin">
      <section className="panel">
        <div className="section-title">
          <h2>Administração</h2>
          <p>Gerenciamento funcional do Módulo 1.</p>
        </div>
        <div className="summary-grid block-gap">
          <Link className="summary-item" href="/admin/clientes">
            <span>Clientes</span>
            <strong>{clientes}</strong>
          </Link>
          <Link className="summary-item" href="/admin/funcionarios">
            <span>Funcionários</span>
            <strong>{funcionarios}</strong>
          </Link>
          <Link className="summary-item" href="/admin/administradores">
            <span>Administradores</span>
            <strong>{administradores}</strong>
          </Link>
        </div>
        <div className="actions block-gap">
          <Link className="button" href="/admin/contas">Contas</Link>
          <Link className="button secondary" href="/admin/funcionarios/novo">Novo Funcionário</Link>
          <Link className="button secondary" href="/admin/administradores/novo">Novo Administrador</Link>
        </div>
      </section>
    </AppShell>
  );
}
