import Link from "next/link";
import { criarFuncionarioAction } from "@/app/actions/contas";
import { AppShell } from "@/components/AppShell";
import { CadastroContaForm } from "@/components/CadastroContaForm";
import { Mensagem } from "@/components/Mensagem";
import { exigirPerfil } from "@/server/auth/guards";

type NovoFuncionarioPageProps = {
  searchParams?: Promise<{
    erro?: string;
  }>;
};

export default async function NovoFuncionarioPage({ searchParams }: NovoFuncionarioPageProps) {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const params = await searchParams;

  return (
    <AppShell conta={conta} active="admin">
      <section className="panel">
        <div className="section-title">
          <h2>Novo Funcionário</h2>
          <p>Cadastro restrito a Administradores.</p>
        </div>
        <div className="block-gap">
          <Mensagem erro={params?.erro} />
          <CadastroContaForm action={criarFuncionarioAction} submitLabel="Criar Funcionário" />
        </div>
        <div className="links">
          <Link href="/admin/funcionarios">Voltar</Link>
        </div>
      </section>
    </AppShell>
  );
}
