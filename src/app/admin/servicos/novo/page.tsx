import Link from "next/link";
import { criarServicoAction } from "@/app/actions/servicos";
import { AppShell } from "@/components/AppShell";
import { Mensagem } from "@/components/Mensagem";
import { ServicoForm } from "@/components/ServicoForm";
import { exigirPerfil } from "@/server/auth/guards";

type NovoServicoPageProps = { searchParams?: Promise<{ erro?: string }> };

export default async function NovoServicoPage({ searchParams }: NovoServicoPageProps) {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const params = await searchParams;

  return (
    <AppShell conta={conta} active="admin">
      <section className="panel">
        <div className="section-title"><h2>Novo servico</h2><p>Cadastre o preco e a duracao do atendimento.</p></div>
        <div className="block-gap"><Mensagem erro={params?.erro} /><ServicoForm action={criarServicoAction} submitLabel="Criar servico" /></div>
        <div className="links"><Link href="/admin/servicos">Voltar</Link></div>
      </section>
    </AppShell>
  );
}
