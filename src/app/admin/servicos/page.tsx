import { AppShell } from "@/components/AppShell";
import { AdminServicosView } from "@/components/servicos/AdminServicosView";
import { exigirPerfil } from "@/server/auth/guards";
import { prismaServicoRepository } from "@/server/servicos/prisma-repository";
import { listarServicos } from "@/server/servicos/service";

type AdminServicosPageProps = { searchParams?: Promise<{ erro?: string; sucesso?: string }> };

export default async function AdminServicosPage({ searchParams }: AdminServicosPageProps) {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const params = await searchParams;
  const servicos = await listarServicos(conta, prismaServicoRepository);

  return <AppShell conta={conta} active="admin"><AdminServicosView servicos={servicos} erro={params?.erro} sucesso={params?.sucesso} /></AppShell>;
}
