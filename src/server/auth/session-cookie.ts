import { cookies } from "next/headers";
import { encerrarSessao, obterContaPorSessao } from "@/server/contas/service";
import { prismaContaRepository } from "@/server/contas/prisma-repository";

const DEFAULT_COOKIE_NAME = "agendaqui_session";

export type DadosSessaoCookie = {
  sessionId: string;
  token: string;
};

export function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

export function serializarSessaoCookie(data: DadosSessaoCookie) {
  return `${data.sessionId}.${data.token}`;
}

export function parseSessaoCookie(value?: string | null): DadosSessaoCookie | null {
  if (!value) {
    return null;
  }

  const separatorIndex = value.indexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const sessionId = value.slice(0, separatorIndex);
  const token = value.slice(separatorIndex + 1);

  if (!sessionId || !token) {
    return null;
  }

  return { sessionId, token };
}

export async function gravarSessaoCookie(data: DadosSessaoCookie, expiraEm: Date) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName(), serializarSessaoCookie(data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiraEm
  });
}

export async function limparSessaoCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName());
}

export async function lerSessaoCookie() {
  const cookieStore = await cookies();
  return parseSessaoCookie(cookieStore.get(sessionCookieName())?.value);
}

export async function obterContaAtual() {
  const sessaoCookie = await lerSessaoCookie();

  if (!sessaoCookie) {
    return null;
  }

  return obterContaPorSessao(sessaoCookie.sessionId, sessaoCookie.token, prismaContaRepository);
}

export async function encerrarSessaoAtual() {
  const sessaoCookie = await lerSessaoCookie();
  await encerrarSessao(sessaoCookie?.sessionId ?? null, prismaContaRepository);
  await limparSessaoCookie();
}
