import { notFound, redirect } from "next/navigation";
import { isAgendaquiError } from "@/server/domain/errors";
import type { ContaAutenticada } from "@/server/domain/perfis";
import { prismaAgendaRepository } from "./prisma-repository";
import { obterAgendamento } from "./service";

export async function agendamentoDaPagina(ator: ContaAutenticada, id: string) {
  try { return await obterAgendamento(ator, id, prismaAgendaRepository); }
  catch (error) {
    if (isAgendaquiError(error) && error.status === 404) notFound();
    if (isAgendaquiError(error) && error.status === 403) redirect("/acesso-negado");
    throw error;
  }
}
