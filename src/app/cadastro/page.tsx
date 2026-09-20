import Link from "next/link";
import { cadastrarClienteAction } from "@/app/actions/auth";
import { CadastroContaForm } from "@/components/CadastroContaForm";
import { Mensagem } from "@/components/Mensagem";
import { redirecionarSeAutenticado } from "@/server/auth/guards";
import { prismaEmpresaRepository } from "@/server/empresas/prisma-repository";
import { EMPRESA_PADRAO_SLUG } from "@/server/empresas/contexto";

type CadastroPageProps = {
  searchParams?: Promise<{
    erro?: string;
    empresa?: string;
  }>;
};

export default async function CadastroPage({ searchParams }: CadastroPageProps) {
  await redirecionarSeAutenticado();
  const params = await searchParams;
  const slug = typeof params?.empresa === "string" ? params.empresa : EMPRESA_PADRAO_SLUG;
  const empresa = await prismaEmpresaRepository.findBySlug(slug);

  return (
    <main className="public-page">
      <section className="auth-panel">
        <div className="brand">
          <h1>Cadastro de Cliente</h1>
          {empresa && <p>{empresa.nome}</p>}
          <p>Crie sua conta para acessar a área básica do Agendaqui.</p>
        </div>
        <Mensagem erro={params?.erro} />
        {empresa ? <CadastroContaForm action={cadastrarClienteAction} submitLabel="Criar conta"><input type="hidden" name="empresaSlug" value={empresa.slug} /></CadastroContaForm> : <p className="message error">Empresa não encontrada. Verifique o link de cadastro.</p>}
        <div className="links">
          <Link href="/login">Já tenho conta</Link>
          <Link href="/cadastro-empresa">Cadastrar minha empresa</Link>
        </div>
      </section>
    </main>
  );
}
