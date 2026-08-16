import Link from "next/link";
import { obterContaAtual } from "@/server/auth/session-cookie";
import { rotaInicialPorPerfil } from "@/server/domain/perfis";

export default async function AcessoNegadoPage() {
  const conta = await obterContaAtual();
  const destino = conta ? rotaInicialPorPerfil(conta.perfil) : "/login";

  return (
    <main className="public-page">
      <section className="auth-panel">
        <div className="brand">
          <h1>Acesso negado</h1>
          <p>Seu perfil não possui permissão para acessar esta área.</p>
        </div>
        <Link className="button" href={destino}>Voltar</Link>
      </section>
    </main>
  );
}
