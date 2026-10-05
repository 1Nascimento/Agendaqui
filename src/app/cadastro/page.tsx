import Link from "next/link";
import { cadastrarClienteAction } from "@/app/actions/auth";
import { CadastroContaForm } from "@/components/CadastroContaForm";
import { Mensagem } from "@/components/Mensagem";
import { redirecionarSeAutenticado } from "@/server/auth/guards";

type CadastroPageProps = {
  searchParams?: Promise<{
    erro?: string;
    empresa?: string;
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
        </div>
        <Mensagem erro={params?.erro} />
        <CadastroContaForm action={cadastrarClienteAction} submitLabel="Criar conta" />
        <div className="links">
          <Link href="/login">Já tenho conta</Link>
          <Link href="/cadastro-empresa">Cadastrar minha empresa</Link>
        </div>
      </section>
    </main>
  );
}
