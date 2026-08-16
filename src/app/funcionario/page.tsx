import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPerfil } from "@/server/auth/guards";

export default async function FuncionarioPage() {
  const conta = await exigirPerfil(["FUNCIONARIO"]);

  return (
    <AppShell conta={conta} active="funcionario">
      <section className="panel">
        <div className="section-title">
          <h2>Área do Funcionário</h2>
          <p>Conta autenticada e protegida para uso operacional básico.</p>
        </div>
        <div className="actions block-gap">
          <Link className="button" href="/minha-conta">Minha conta</Link>
        </div>
      </section>
    </AppShell>
  );
}
