import { redirect } from "next/navigation";
import { obterContaAtual } from "@/server/auth/session-cookie";
import { rotaInicialPorPerfil } from "@/server/domain/perfis";

export default async function HomePage() {
  const conta = await obterContaAtual();

  if (!conta) {
    redirect("/login");
  }

  redirect(rotaInicialPorPerfil(conta.perfil));
}
