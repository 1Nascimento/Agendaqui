import { AppShell } from "@/components/AppShell";
import { AdminContasView } from "@/components/admin/AdminContasView";
import { listarContas } from "@/server/contas/service";
import { prismaContaRepository } from "@/server/contas/prisma-repository";
import { exigirPerfil } from "@/server/auth/guards";

type AdminFuncionariosPageProps = {
  searchParams?: Promise<{
    erro?: string;
    sucesso?: string;
  }>;
};

export default async function AdminFuncionariosPage({ searchParams }: AdminFuncionariosPageProps) {
  const conta = await exigirPerfil(["ADMINISTRADOR"]);
  const params = await searchParams;
  const contas = await listarContas(conta, prismaContaRepository, { perfil: "FUNCIONARIO" });

  return (
    <AppShell conta={conta} active="admin">
      <AdminContasView contas={contas} active="funcionarios" erro={params?.erro} sucesso={params?.sucesso} />
    </AppShell>
  );
}
