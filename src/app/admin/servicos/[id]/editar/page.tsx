import { redirect } from "next/navigation";
import { atualizarServicoAction } from "@/app/actions/servicos";
import { AppShell } from "@/components/AppShell";
import { Mensagem } from "@/components/Mensagem";
import { ServicoForm } from "@/components/ServicoForm";
import { exigirPerfil } from "@/server/auth/guards";
import { prismaServicoRepository } from "@/server/servicos/prisma-repository";

type EditarServicoPageProps = { params: Promise<{ id: string }>; searchParams?: Promise<{ erro?: string }> };

export default async function EditarServicoPage({ params, searchParams }: EditarServicoPageProps) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);
  const { id } = await params;
  const query = await searchParams;
  const servico = await prismaServicoRepository.findById(id, ator.empresaId);

  if (!servico) redirect("/admin/servicos?erro=Servico nao encontrado.");

  return (
    <AppShell conta={ator} active="admin">
      <section className="panel">
        <div className="section-title"><h2>Editar servico</h2><p>Atualize o nome, preco ou duracao do atendimento.</p></div>
        <div className="block-gap">
          <Mensagem erro={query?.erro} />
          <ServicoForm action={atualizarServicoAction} submitLabel="Salvar servico" servico={{ ...servico, preco: servico.preco.toFixed(2) }} />
        </div>
      </section>
    </AppShell>
  );
}
