import { redirect } from "next/navigation";
import { obterContaAtual } from "@/server/auth/session-cookie";
import { ContaPublica, PerfilConta, rotaInicialPorPerfil } from "@/server/domain/perfis";
import type { EmpresaResumo } from "@/server/empresas/contexto";

export async function exigirConta() {
  const conta = await obterContaAtual();

  if (!conta || !conta.ativo || (conta.perfil !== "CLIENTE" && (!conta.empresaId || conta.empresa?.id !== conta.empresaId))) {
    redirect("/login");
  }

  return conta;
}

export function exigirPerfil(perfisPermitidos: Exclude<PerfilConta, "CLIENTE">[]): Promise<ContaPublica & { empresaId: string; empresa: EmpresaResumo }>;
export function exigirPerfil(perfisPermitidos: PerfilConta[]): Promise<ContaPublica>;
export async function exigirPerfil(perfisPermitidos: PerfilConta[]) {
  const conta = await exigirConta();

  if (!perfisPermitidos.includes(conta.perfil)) {
    redirect("/acesso-negado");
  }

  return conta;
}

export async function redirecionarSeAutenticado() {
  const conta = await obterContaAtual();

  if (conta) {
    redirect(rotaInicialPorPerfil(conta.perfil));
  }
}
