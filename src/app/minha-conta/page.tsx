import { atualizarMinhaContaAction } from "@/app/actions/contas";
import { AppShell } from "@/components/AppShell";
import { ContaBasicaForm } from "@/components/ContaBasicaForm";
import { Mensagem } from "@/components/Mensagem";
import { exigirConta } from "@/server/auth/guards";

type MinhaContaPageProps = {
  searchParams?: Promise<{
    erro?: string;
    sucesso?: string;
  }>;
};

export default async function MinhaContaPage({ searchParams }: MinhaContaPageProps) {
  const conta = await exigirConta();
  const params = await searchParams;

  return (
    <AppShell conta={conta} active="minha-conta">
      <section className="panel">
        <div className="section-title">
          <h2>Minha conta</h2>
          <p>Edite seus dados básicos permitidos.</p>
        </div>
        <div className="block-gap">
          <Mensagem erro={params?.erro} sucesso={params?.sucesso} />
          <ContaBasicaForm action={atualizarMinhaContaAction} submitLabel="Salvar alterações" conta={conta} />
        </div>
      </section>
    </AppShell>
  );
}
