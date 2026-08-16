import Link from "next/link";
import { redefinirSenhaAction } from "@/app/actions/auth";
import { Mensagem } from "@/components/Mensagem";
import { redirecionarSeAutenticado } from "@/server/auth/guards";

type RedefinirSenhaPageProps = {
  searchParams?: Promise<{
    token?: string;
    erro?: string;
  }>;
};

export default async function RedefinirSenhaPage({ searchParams }: RedefinirSenhaPageProps) {
  await redirecionarSeAutenticado();
  const params = await searchParams;
  const token = params?.token || "";

  return (
    <main className="public-page">
      <section className="auth-panel">
        <div className="brand">
          <h1>Redefinir senha</h1>
          <p>Crie uma nova senha para sua conta.</p>
        </div>
        <Mensagem erro={params?.erro} />
        <form className="form" action={redefinirSenhaAction}>
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="senha">Nova senha</label>
            <input id="senha" name="senha" type="password" autoComplete="new-password" required />
          </div>
          <div className="field">
            <label htmlFor="confirmarSenha">Confirmar nova senha</label>
            <input id="confirmarSenha" name="confirmarSenha" type="password" autoComplete="new-password" required />
          </div>
          <button className="button" type="submit">Salvar nova senha</button>
        </form>
        <div className="links">
          <Link href="/login">Voltar ao login</Link>
        </div>
      </section>
    </main>
  );
}
