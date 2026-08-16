import Link from "next/link";
import { cadastrarClienteAction } from "@/app/actions/auth";
import { CadastroContaForm } from "@/components/CadastroContaForm";
import { Mensagem } from "@/components/Mensagem";
import { redirecionarSeAutenticado } from "@/server/auth/guards";

type CadastroPageProps = {
  searchParams?: Promise<{
    erro?: string;
  }>;
};

export default async function CadastroPage({ searchParams }: CadastroPageProps) {
  await redirecionarSeAutenticado();
  const params = await searchParams;

  return (
    <main className="public-page">
      <section className="auth-panel">
        <div className="brand">
          <h1>Cadastro de Cliente</h1>
          <p>Crie sua conta para acessar a área básica do Agendaqui.</p>
        </div>
        <Mensagem erro={params?.erro} />
        <CadastroContaForm action={cadastrarClienteAction} submitLabel="Criar conta" />
        <div className="links">
          <Link href="/login">Já tenho conta</Link>
        </div>
      </section>
    </main>
  );
}
