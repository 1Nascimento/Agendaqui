import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { ContaPublica, perfilLabel } from "@/server/domain/perfis";

type AppShellProps = {
  conta: ContaPublica;
  active?: string;
  children: React.ReactNode;
};

export function AppShell({ conta, active, children }: AppShellProps) {
  const navItems = [
    conta.perfil === "CLIENTE" ? { href: "/cliente", label: "Área do Cliente", key: "cliente" } : null,
    conta.perfil === "FUNCIONARIO" ? { href: "/funcionario", label: "Área do Funcionário", key: "funcionario" } : null,
    conta.perfil === "ADMINISTRADOR" ? { href: "/admin", label: "Administração", key: "admin" } : null,
    { href: "/minha-conta", label: "Minha conta", key: "minha-conta" }
  ].filter(Boolean) as Array<{ href: string; label: string; key: string }>;

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>Agendaqui</h1>
            <p>{conta.nome} · {perfilLabel(conta.perfil)}</p>
          </div>
          <nav aria-label="Navegação principal">
            {navItems.map((item) => (
              <Link className={`nav-link ${active === item.key ? "active" : ""}`} href={item.href} key={item.key}>
                {item.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <button className="button secondary" type="submit">Sair</button>
            </form>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
