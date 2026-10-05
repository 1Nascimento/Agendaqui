import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ServicosTable } from "@/components/servicos/ServicosTable";
import { exigirConta } from "@/server/auth/guards";
import { prismaServicoRepository } from "@/server/servicos/prisma-repository";
import { listarServicosDisponiveis } from "@/server/servicos/service";
import { redirect } from "next/navigation";

export default async function ServicosPage() {
  const conta = await exigirConta();
  if (conta.perfil === "CLIENTE") redirect("/empresas");
  const servicos = await listarServicosDisponiveis(conta, prismaServicoRepository);

  return (
    <AppShell conta={conta} active="servicos">
      <section className="panel">
        <div className="section-title"><h2>Servicos disponiveis</h2></div>
        <div className="block-gap"><ServicosTable servicos={servicos} /></div>
        <div className="actions block-gap"><Link className="button" href="/agendamentos/novo">Agendar atendimento</Link></div>
      </section>
    </AppShell>
  );
}
