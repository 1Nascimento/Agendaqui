import Link from "next/link";

type AdminTabsProps = {
  active: "todos" | "clientes" | "funcionarios" | "administradores";
};

export function AdminTabs({ active }: AdminTabsProps) {
  const tabs = [
    { href: "/admin/contas", label: "Todas", key: "todos" },
    { href: "/admin/clientes", label: "Clientes", key: "clientes" },
    { href: "/admin/funcionarios", label: "Funcionários", key: "funcionarios" },
    { href: "/admin/administradores", label: "Administradores", key: "administradores" }
  ] as const;

  return (
    <nav className="tabs" aria-label="Filtros de contas">
      {tabs.map((tab) => (
        <Link className={`tab ${active === tab.key ? "active" : ""}`} href={tab.href} key={tab.key}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
