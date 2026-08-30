import { AppShell } from "@/components/AppShell";
import { ServicosTable } from "@/components/servicos/ServicosTable";
import { exigirConta } from "@/server/auth/guards";
import { prismaServicoRepository } from "@/server/servicos/prisma-repository";
import { listarServicosDisponiveis } from "@/server/servicos/service";

export default async function ServicosPage() {
  const conta = await exigirConta();
  const servicos = await listarServicosDisponiveis(prismaServicoRepository);

  return (
    <AppShell conta={conta} active="servicos">
      <section className="panel">
        <div className="section-title"><h2>Servicos disponiveis</h2><p>Consulte os atendimentos, precos e duracoes disponiveis.</p></div>
        <div className="block-gap"><ServicosTable servicos={servicos} /></div>
      </section>
    </AppShell>
  );
}
