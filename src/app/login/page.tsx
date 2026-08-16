import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Mensagem } from "@/components/Mensagem";
import { redirecionarSeAutenticado } from "@/server/auth/guards";

type LoginPageProps = {
  searchParams?: Promise<{
    erro?: string;
    sucesso?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirecionarSeAutenticado();
  const params = await searchParams;

  return (
    <main className="public-page">
      <section className="auth-panel">
        <div className="brand">
          <h1>Agendaqui</h1>
          <p>Entre para acessar sua área de conta.</p>
        </div>
        <Mensagem erro={params?.erro} sucesso={params?.sucesso} />
        <form className="form" action={loginAction}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" autoComplete="current-password" required />
          </div>
          <button className="button" type="submit">Entrar</button>
        </form>
        <div className="links">
          <Link href="/esqueci-senha">Esqueceu a senha?</Link>
          <Link href="/cadastro">Cadastre-se</Link>
        </div>
      </section>
    </main>
  );
}
