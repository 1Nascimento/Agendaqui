import Link from "next/link";
import { criarAdministradorAction } from "@/app/actions/contas";
import { AppShell } from "@/components/AppShell";
import { CadastroContaForm } from "@/components/CadastroContaForm";
import { Mensagem } from "@/components/Mensagem";
import { exigirPerfil } from "@/server/auth/guards";

type NovoAdministradorPageProps = {
  searchParams?: Promise<{
    erro?: string;
  }>;
};

export default async function NovoAdministradorPage({ searchParams }: NovoAdministradorPageProps) {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const params = await searchParams;

  return (
    <AppShell conta={conta} active="admin">
      <section className="panel">
        <div className="section-title">
          <h2>Novo Administrador</h2>
          <p>Cadastro restrito a Administradores.</p>
        </div>
        <div className="block-gap">
          <Mensagem erro={params?.erro} />
          <CadastroContaForm action={criarAdministradorAction} submitLabel="Criar Administrador" />
        </div>
        <div className="links">
          <Link href="/admin/administradores">Voltar</Link>
        </div>
      </section>
    </AppShell>
  );
}
