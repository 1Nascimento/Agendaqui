import { redirect } from "next/navigation";
import { atualizarContaAdminAction } from "@/app/actions/contas";
import { AppShell } from "@/components/AppShell";
import { ContaBasicaForm } from "@/components/ContaBasicaForm";
import { Mensagem } from "@/components/Mensagem";
import { prismaContaRepository } from "@/server/contas/prisma-repository";
import { removerSenha } from "@/server/contas/service";
import { exigirPerfil } from "@/server/auth/guards";

type EditarContaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    erro?: string;
  }>;
};

export default async function EditarContaPage({ params, searchParams }: EditarContaPageProps) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);
  const { id } = await params;
  const query = await searchParams;
  const conta = await prismaContaRepository.findById(id);

  if (!conta) {
    redirect("/admin/contas?erro=Conta nao encontrada.");
  }

  const contaPublica = removerSenha(conta);

  return (
    <AppShell conta={ator} active="admin">
      <section className="panel">
        <div className="section-title">
          <h2>Editar conta</h2>
          <p>Altere apenas dados básicos. O perfil não é editável nesta etapa.</p>
        </div>
        <div className="block-gap">
          <Mensagem erro={query?.erro} />
          <ContaBasicaForm action={atualizarContaAdminAction} submitLabel="Salvar conta" conta={contaPublica} />
        </div>
      </section>
    </AppShell>
  );
}
