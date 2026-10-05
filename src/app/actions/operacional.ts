"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/server/auth/guards";
import { campo, mensagemErroForm, urlComMensagem } from "@/server/http/form";
import { prismaOperacionalRepository as repo } from "@/server/operacional/prisma-repository";
import { estornarPagamento, finalizarAtendimento, registrarPagamento } from "@/server/operacional/service";

export type EstadoOperacional = { erro?: string };
export async function operacionalAction(_estado: EstadoOperacional, form: FormData): Promise<EstadoOperacional> {
  const ator = await exigirPerfil(["ADMINISTRADOR", "FUNCIONARIO"]);
  const id = campo(form, "id");
  const input = { id, versao: campo(form, "versao") };
  let mensagem: string;
  try {
    switch (campo(form, "operacao")) {
      case "finalizar":
        await finalizarAtendimento(ator, { ...input, resultado: campo(form, "resultado") }, repo);
        mensagem = "Resultado do atendimento registrado."; break;
      case "receber":
        await registrarPagamento(ator, { ...input, valor: campo(form, "valor"), forma: campo(form, "forma") }, repo);
        mensagem = "Pagamento registrado."; break;
      case "estornar":
        await estornarPagamento(ator, { ...input, pagamentoId: campo(form, "pagamentoId"), motivo: campo(form, "motivo") }, repo);
        mensagem = "Estorno registrado."; break;
      default: return { erro: "Operação inválida." };
    }
  } catch (error) { return { erro: mensagemErroForm(error) }; }
  revalidatePath("/agendamentos", "layout");
  revalidatePath("/admin", "layout");
  redirect(urlComMensagem(`/agendamentos/${encodeURIComponent(id)}`, "sucesso", mensagem));
}
