import type { ContaAutenticada } from "@/server/domain/perfis";
import { AgendaquiError } from "@/server/domain/errors";
import { exigirEmpresaDoAtor } from "@/server/empresas/contexto";
import { dataLocal, horaLocal, type Expediente } from "./calendario";
import type { AgendaRepository } from "./repository";

export const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export async function salvarExpediente(ator: ContaAutenticada, funcionarioId: string, input: Expediente[], repo: AgendaRepository, agora = new Date()) {
  const empresaId = exigirEmpresaDoAtor(ator);
  if (!ator.ativo || (ator.perfil !== "ADMINISTRADOR" && !(ator.perfil === "FUNCIONARIO" && ator.id === funcionarioId))) throw new AgendaquiError("ACESSO_NEGADO", "Você não pode alterar este expediente.", 403);
  if (!Array.isArray(input) || input.length > 7 || new Set(input.map((dia) => dia.diaSemana)).size !== input.length || input.some((dia) =>
    !Number.isInteger(dia.diaSemana) || dia.diaSemana < 0 || dia.diaSemana > 6 || !Number.isInteger(dia.inicioMinuto) || !Number.isInteger(dia.fimMinuto) || dia.inicioMinuto < 0 || dia.fimMinuto > 1439 || dia.inicioMinuto >= dia.fimMinuto
  )) throw new AgendaquiError("EXPEDIENTE_INVALIDO", "Informe dias e horários válidos, com o término após o início.");

  return repo.transacao(async (tx) => {
    const funcionario = await tx.conta(funcionarioId, empresaId);
    if (!funcionario?.ativo || funcionario.perfil !== "FUNCIONARIO" || funcionario.empresaId !== empresaId) throw new AgendaquiError("FUNCIONARIO_INVALIDO", "Selecione um funcionário ativo.");
    const futuros = await tx.futuros(funcionarioId, agora, empresaId);
    for (const agendamento of futuros) {
      const diaSemana = new Date(`${dataLocal(agendamento.inicio)}T12:00:00Z`).getUTCDay();
      const expediente = input.find((dia) => dia.diaSemana === diaSemana);
      const [hora, minuto] = horaLocal(agendamento.inicio).split(":").map(Number);
      const inicio = hora * 60 + minuto;
      const duracao = (agendamento.fim.getTime() - agendamento.inicio.getTime()) / 60_000;
      if (!expediente || inicio < expediente.inicioMinuto || inicio + duracao > expediente.fimMinuto) throw new AgendaquiError("EXPEDIENTE_COM_AGENDAMENTOS", "Há atendimentos confirmados fora do novo expediente. Remarque ou cancele esses atendimentos antes de alterar os horários.", 409);
    }
    await tx.salvarExpedientes(funcionarioId, input, empresaId);
  });
}
