"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { alterarStatusConta, criarContaPorAdministrador, editarConta } from "@/server/contas/service";
import { prismaContaRepository } from "@/server/contas/prisma-repository";
import { exigirConta, exigirPerfil } from "@/server/auth/guards";
import { booleanCampo, campo, mensagemErroForm, urlComMensagem } from "@/server/http/form";

export async function criarFuncionarioAction(formData: FormData) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);

  try {
    await criarContaPorAdministrador(
      ator,
      "FUNCIONARIO",
      {
        nome: campo(formData, "nome"),
        telefone: campo(formData, "telefone"),
        email: campo(formData, "email"),
        senha: campo(formData, "senha"),
        confirmarSenha: campo(formData, "confirmarSenha")
      },
      prismaContaRepository
    );
  } catch (error) {
    redirect(urlComMensagem("/admin/funcionarios/novo", "erro", mensagemErroForm(error)));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/funcionarios");
  redirect("/admin/funcionarios?sucesso=Funcionario criado.");
}

export async function criarAdministradorAction(formData: FormData) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);

  try {
    await criarContaPorAdministrador(
      ator,
      "ADMINISTRADOR",
      {
        nome: campo(formData, "nome"),
        telefone: campo(formData, "telefone"),
        email: campo(formData, "email"),
        senha: campo(formData, "senha"),
        confirmarSenha: campo(formData, "confirmarSenha")
      },
      prismaContaRepository
    );
  } catch (error) {
    redirect(urlComMensagem("/admin/administradores/novo", "erro", mensagemErroForm(error)));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/administradores");
  redirect("/admin/administradores?sucesso=Administrador criado.");
}

export async function atualizarMinhaContaAction(formData: FormData) {
  const ator = await exigirConta();

  try {
    await editarConta(
      ator,
      ator.id,
      {
        nome: campo(formData, "nome"),
        telefone: campo(formData, "telefone"),
        email: campo(formData, "email")
      },
      prismaContaRepository
    );
  } catch (error) {
    redirect(urlComMensagem("/minha-conta", "erro", mensagemErroForm(error)));
  }

  revalidatePath("/minha-conta");
  redirect("/minha-conta?sucesso=Dados atualizados.");
}

export async function atualizarContaAdminAction(formData: FormData) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);
  const id = campo(formData, "id");

  try {
    await editarConta(
      ator,
      id,
      {
        nome: campo(formData, "nome"),
        telefone: campo(formData, "telefone"),
        email: campo(formData, "email")
      },
      prismaContaRepository
    );
  } catch (error) {
    redirect(urlComMensagem(`/admin/contas/${encodeURIComponent(id)}/editar`, "erro", mensagemErroForm(error)));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/contas");
  redirect("/admin/contas?sucesso=Conta atualizada.");
}

export async function alterarStatusContaAction(formData: FormData) {
  const ator = await exigirPerfil(["ADMINISTRADOR"]);
  const id = campo(formData, "id");
  const ativo = booleanCampo(formData, "ativo");

  try {
    await alterarStatusConta(ator, id, ativo, prismaContaRepository);
  } catch (error) {
    redirect(urlComMensagem("/admin/contas", "erro", mensagemErroForm(error)));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/contas");
  redirect(urlComMensagem("/admin/contas", "sucesso", ativo ? "Conta reativada." : "Conta desativada."));
}
