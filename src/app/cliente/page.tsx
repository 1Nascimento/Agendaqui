import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPerfil } from "@/server/auth/guards";

export default async function ClientePage() {
  const conta = await exigirPerfil(["CLIENTE"]);

  return (
    <AppShell conta={conta} active="cliente">
      <section className="panel">
        <div className="section-title">
          <h2>Olá, {conta.nome}</h2>
        </div>
        <div className="actions block-gap">
          <Link className="button" href="/empresas">Buscar empresa</Link>
          <Link className="button secondary" href="/agendamentos">Meus agendamentos</Link>
          <Link className="button" href="/minha-conta">Minha conta</Link>
        </div>
      </section>
    </AppShell>
  );
}
