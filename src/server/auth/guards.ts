import { redirect } from "next/navigation";
import { obterContaAtual } from "@/server/auth/session-cookie";
import { PerfilConta, rotaInicialPorPerfil } from "@/server/domain/perfis";

export async function exigirConta() {
  const conta = await obterContaAtual();

  if (!conta) {
    redirect("/login");
  }

  return conta;
}

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
