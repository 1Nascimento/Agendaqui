"use server";

import { redirect } from "next/navigation";
import { autenticarConta, cadastrarClientePublico, redefinirSenha, solicitarRecuperacaoSenha } from "@/server/contas/service";
import { prismaContaRepository } from "@/server/contas/prisma-repository";
import { criarEnviadorRecuperacaoSenha } from "@/server/email/recuperacao-senha";
import { campo, mensagemErroForm, urlComMensagem } from "@/server/http/form";
import { gravarSessaoCookie, encerrarSessaoAtual } from "@/server/auth/session-cookie";
import { rotaInicialPorPerfil } from "@/server/domain/perfis";

function appUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

function validadeTokenRecuperacaoMinutos() {
  const value = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES || "60");
  return Number.isFinite(value) && value > 0 ? value : 60;
}

export async function loginAction(formData: FormData) {
  let destino = "/login";

  try {
    const resultado = await autenticarConta(
      {
        email: campo(formData, "email"),
        senha: campo(formData, "senha")
      },
      prismaContaRepository
    );

    await gravarSessaoCookie(
      {
        sessionId: resultado.sessao.id,
        token: resultado.sessao.token
      },
      resultado.sessao.expiraEm
    );

    destino = rotaInicialPorPerfil(resultado.conta.perfil);
  } catch (error) {
    destino = urlComMensagem("/login", "erro", mensagemErroForm(error));
  }

  redirect(destino);
}

export async function logoutAction() {
  await encerrarSessaoAtual();
  redirect("/login?sucesso=Sessao encerrada.");
}

export async function cadastrarClienteAction(formData: FormData) {
  try {
    await cadastrarClientePublico(
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
    redirect(urlComMensagem("/cadastro", "erro", mensagemErroForm(error)));
  }

  redirect("/login?sucesso=Conta de Cliente criada. Entre com seu e-mail e senha.");
}

export async function solicitarRecuperacaoSenhaAction(formData: FormData) {
  try {
    await solicitarRecuperacaoSenha(
      campo(formData, "email"),
      prismaContaRepository,
      criarEnviadorRecuperacaoSenha(),
      {
        appUrl: appUrl(),
        validadeMinutos: validadeTokenRecuperacaoMinutos()
      }
    );
  } catch (error) {
    redirect(urlComMensagem("/esqueci-senha", "erro", mensagemErroForm(error)));
  }

  redirect("/esqueci-senha?sucesso=Se o e-mail estiver cadastrado, enviaremos um link de redefinicao.");
}

export async function redefinirSenhaAction(formData: FormData) {
  try {
    await redefinirSenha(
      {
        token: campo(formData, "token"),
        senha: campo(formData, "senha"),
        confirmarSenha: campo(formData, "confirmarSenha")
      },
      prismaContaRepository
    );
  } catch (error) {
    const token = encodeURIComponent(campo(formData, "token"));
    redirect(`/redefinir-senha?token=${token}&erro=${encodeURIComponent(mensagemErroForm(error))}`);
  }

  redirect("/login?sucesso=Senha redefinida. Entre com a nova senha.");
}
