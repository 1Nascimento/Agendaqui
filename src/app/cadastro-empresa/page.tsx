import Link from "next/link";
import { cadastrarEmpresaAction } from "@/app/actions/auth";
import { CadastroContaForm } from "@/components/CadastroContaForm";
import { Mensagem } from "@/components/Mensagem";
import { redirecionarSeAutenticado } from "@/server/auth/guards";

export default async function CadastroEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await redirecionarSeAutenticado();
  const params = await searchParams;
  return <main className="public-page"><section className="auth-panel">
    <div className="brand"><h1>Cadastre sua empresa</h1><p>Crie a empresa e sua conta de administrador. Cada empresa terá suas próprias contas, serviços e agenda.</p></div>
    <Mensagem erro={params.erro} />
    <CadastroContaForm action={cadastrarEmpresaAction} submitLabel="Criar empresa e administrador">
      <div className="field"><label htmlFor="nomeEmpresa">Nome da empresa</label><input id="nomeEmpresa" name="nomeEmpresa" maxLength={100} required /></div>
      <p className="muted">Informe abaixo os dados do administrador.</p>
    </CadastroContaForm>
    <div className="links"><Link href="/login">Já tenho conta</Link><Link href="/cadastro">Sou cliente</Link></div>
  </section></main>;
}
