import { AppShell } from "@/components/AppShell";
import { AdminContasView } from "@/components/admin/AdminContasView";
import { listarContas } from "@/server/contas/service";
import { prismaContaRepository } from "@/server/contas/prisma-repository";
import { exigirPerfil } from "@/server/auth/guards";
import { parametroTexto, type ParametroBusca } from "@/server/http/query";

type AdminContasPageProps = {
  searchParams?: Promise<{
    erro?: string;
    sucesso?: string;
    q?: ParametroBusca;
    status?: ParametroBusca;
  }>;
};

export default async function AdminContasPage({ searchParams }: AdminContasPageProps) {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const params = await searchParams;
  const contas = await listarContas(conta, prismaContaRepository);

  return (
    <AppShell conta={conta} active="admin">
      <AdminContasView contas={contas} active="todos" erro={params?.erro} sucesso={params?.sucesso} busca={parametroTexto(params?.q)} status={parametroTexto(params?.status)} />
    </AppShell>
  );
}
