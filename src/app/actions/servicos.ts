"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/server/auth/guards";
import { campo, mensagemErroForm, urlComMensagem } from "@/server/http/form";
import { prismaServicoRepository } from "@/server/servicos/prisma-repository";
import { criarServico, editarServico, excluirServico } from "@/server/servicos/service";

function dadosServico(formData: FormData) {
  return {
    nome: campo(formData, "nome"),
    preco: campo(formData, "preco"),
    duracao: campo(formData, "duracao")
  };
}

function revalidarServicos() {
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/servicos");
}

export async function criarServicoAction(formData: FormData) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);

  try {
    await criarServico(ator, dadosServico(formData), prismaServicoRepository);
  } catch (error) {
    redirect(urlComMensagem("/admin/servicos/novo", "erro", mensagemErroForm(error)));
  }

  revalidarServicos();
  redirect("/admin/servicos?sucesso=Servico criado.");
}

export async function atualizarServicoAction(formData: FormData) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);
  const id = campo(formData, "id");

  try {
    await editarServico(ator, id, dadosServico(formData), prismaServicoRepository);
  } catch (error) {
    redirect(urlComMensagem(`/admin/servicos/${encodeURIComponent(id)}/editar`, "erro", mensagemErroForm(error)));
  }

  revalidarServicos();
  redirect("/admin/servicos?sucesso=Servico atualizado.");
}

export async function excluirServicoAction(formData: FormData) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);
  const id = campo(formData, "id");

  try {
    await excluirServico(ator, id, prismaServicoRepository);
  } catch (error) {
    redirect(urlComMensagem("/admin/servicos", "erro", mensagemErroForm(error)));
  }

  revalidarServicos();
  redirect("/admin/servicos?sucesso=Servico excluido.");
}
