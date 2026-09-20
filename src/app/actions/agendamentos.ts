"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirConta, exigirPerfil } from "@/server/auth/guards";
import { campo, mensagemErroForm } from "@/server/http/form";
import { prismaAgendaRepository as repo } from "@/server/agendamentos/prisma-repository";
import { cancelarAgendamento, confirmarAgendamento, consultarDisponibilidade, consultarRemarcacao, remarcarAgendamento } from "@/server/agendamentos/service";
import { salvarExpediente } from "@/server/agendamentos/expediente";

export type EstadoAgendamento = { erro?: string; sucesso?: string };

function dados(form: FormData) {
  return { clienteId: campo(form, "clienteId"), funcionarioId: campo(form, "funcionarioId"), servicoIds: form.getAll("servicoIds"), data: campo(form, "data"), horario: campo(form, "horario") };
}

function revalidarAgenda() {
  revalidatePath("/agendamentos", "layout");
  revalidatePath("/funcionario/expediente");
}

export async function disponibilidadeAction(form: FormData) {
  const ator = await exigirConta();
  try {
    const id = campo(form, "id");
    const dias = id ? await consultarRemarcacao(ator, id, repo) : await consultarDisponibilidade(ator, dados(form), repo);
    return { dias, erro: "" };
  } catch (error) {
    return { dias: [], erro: mensagemErroForm(error) };
  }
}

export async function confirmarAgendamentoAction(_estado: EstadoAgendamento, form: FormData): Promise<EstadoAgendamento> {
  const ator = await exigirConta();
  let id: string;
  try {
    const agendamento = await confirmarAgendamento(ator, dados(form), repo);
    id = agendamento.id;
  } catch (error) {
    return { erro: mensagemErroForm(error) };
  }
  revalidarAgenda();
  redirect(`/agendamentos/${encodeURIComponent(id)}?sucesso=Agendamento+confirmado.`);
}

export async function remarcarAgendamentoAction(_estado: EstadoAgendamento, form: FormData): Promise<EstadoAgendamento> {
  const ator = await exigirConta();
  const id = campo(form, "id");
  try {
    await remarcarAgendamento(ator, { id, versao: campo(form, "versao"), data: campo(form, "data"), horario: campo(form, "horario") }, repo);
  } catch (error) {
    return { erro: mensagemErroForm(error) };
  }
  revalidarAgenda();
  redirect(`/agendamentos/${encodeURIComponent(id)}?sucesso=Agendamento+remarcado.`);
}

export async function cancelarAgendamentoAction(_estado: EstadoAgendamento, form: FormData): Promise<EstadoAgendamento> {
  const ator = await exigirConta();
  const id = campo(form, "id");
  try {
    await cancelarAgendamento(ator, { id, versao: campo(form, "versao") }, repo);
  } catch (error) {
    return { erro: mensagemErroForm(error) };
  }
  revalidarAgenda();
  redirect(`/agendamentos/${encodeURIComponent(id)}?sucesso=Agendamento+cancelado.`);
}

export async function salvarExpedienteAction(_estado: EstadoAgendamento, form: FormData): Promise<EstadoAgendamento> {
  const ator = await exigirPerfil(["FUNCIONARIO", "ADMINISTRADOR"]);
  function minutos(valor: string) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) return NaN;
    const [hora, minuto] = valor.split(":").map(Number);
    return hora * 60 + minuto;
  }
  try {
    await salvarExpediente(ator, campo(form, "funcionarioId"), form.getAll("dias").map((dia) => ({ diaSemana: Number(dia), inicioMinuto: minutos(campo(form, `inicio_${dia}`)), fimMinuto: minutos(campo(form, `fim_${dia}`)) })), repo);
  } catch (error) {
    return { erro: mensagemErroForm(error) };
  }
  revalidarAgenda();
  return { sucesso: "Expediente salvo. Os horários já estão disponíveis para agendamento." };
}
