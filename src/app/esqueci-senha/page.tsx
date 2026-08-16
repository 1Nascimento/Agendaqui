import Link from "next/link";
import { solicitarRecuperacaoSenhaAction } from "@/app/actions/auth";
import { Mensagem } from "@/components/Mensagem";
import { redirecionarSeAutenticado } from "@/server/auth/guards";

type EsqueciSenhaPageProps = {
  searchParams?: Promise<{
    erro?: string;
    sucesso?: string;
  }>;
};

export default async function EsqueciSenhaPage({ searchParams }: EsqueciSenhaPageProps) {
  await redirecionarSeAutenticado();
  const params = await searchParams;

  return (
    <main className="public-page">
      <section className="auth-panel">
        <div className="brand">
          <h1>Esqueci minha senha</h1>
          <p>Informe seu e-mail para receber o link de redefinição.</p>
        </div>
        <Mensagem erro={params?.erro} sucesso={params?.sucesso} />
        <form className="form" action={solicitarRecuperacaoSenhaAction}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <button className="button" type="submit">Enviar link</button>
        </form>
        <div className="links">
          <Link href="/login">Voltar ao login</Link>
        </div>
      </section>
    </main>
  );
}
