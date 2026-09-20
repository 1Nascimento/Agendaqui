import { AgendaquiError } from "@/server/domain/errors";

// Horário local da empresa (UTC-03:00), independente do fuso do navegador/servidor.
export const AGENDA = {
  fuso: "America/Sao_Paulo",
  offset: "-03:00",
  intervalo: 15,
  diasAntecedencia: 60
};

export type Ocupacao = { inicio: Date; fim: Date };
export type Expediente = { diaSemana: number; inicioMinuto: number; fimMinuto: number };
export type DiaDisponivel = { data: string; horarios: string[] };

export function dataLocal(data: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: AGENDA.fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
}

export function horaLocal(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: AGENDA.fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(data);
}

export function formatarDataHora(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: AGENDA.fuso, dateStyle: "short", timeStyle: "short" }).format(new Date(data));
}

export function somarDias(data: string, dias: number) {
  const valor = new Date(`${data}T12:00:00Z`);
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}

function horario(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

export function instante(data: string, hora: string) {
  return new Date(`${data}T${hora}:00${AGENDA.offset}`);
}

export function limitesConsulta(agora: Date) {
  const hoje = dataLocal(agora);
  return { inicio: instante(hoje, "00:00"), fim: instante(somarDias(hoje, AGENDA.diasAntecedencia + 1), "00:00") };
}

export function validarHorario(data: unknown, hora: unknown, duracao: number, agora: Date, expedientes: Expediente[]) {
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data) || typeof hora !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    throw new AgendaquiError("HORARIO_INVALIDO", "Selecione uma data e um horário válidos.");
  }
  const inicio = instante(data, hora);
  if (!Number.isFinite(inicio.getTime()) || dataLocal(inicio) !== data) {
    throw new AgendaquiError("DATA_INVALIDA", "Selecione uma data válida.");
  }
  const minutos = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  const hoje = dataLocal(agora);
  if (inicio <= agora || data > somarDias(hoje, AGENDA.diasAntecedencia)) {
    throw new AgendaquiError("DATA_FORA_DO_PRAZO", `Escolha um horário futuro nos próximos ${AGENDA.diasAntecedencia} dias.`);
  }
  const expediente = expedientes.find((item) => item.diaSemana === diaSemana);
  if (!Number.isInteger(duracao) || duracao <= 0 || !expediente || minutos < expediente.inicioMinuto || minutos + duracao > expediente.fimMinuto || (minutos - expediente.inicioMinuto) % AGENDA.intervalo !== 0) {
    throw new AgendaquiError("FORA_DO_EXPEDIENTE", "O atendimento deve caber no expediente definido pelo funcionário.");
  }
  return { inicio, fim: new Date(inicio.getTime() + duracao * 60_000) };
}

export function sobrepoe(a: Ocupacao, b: Ocupacao) {
  return a.inicio < b.fim && a.fim > b.inicio;
}

export function calcularDisponibilidade(duracao: number, ocupacoes: Ocupacao[], agora: Date, expedientes: Expediente[]): DiaDisponivel[] {
  const dias: DiaDisponivel[] = [];
  const hoje = dataLocal(agora);
  for (let dia = 0; dia <= AGENDA.diasAntecedencia; dia++) {
    const data = somarDias(hoje, dia);
    const expediente = expedientes.find((item) => item.diaSemana === new Date(`${data}T12:00:00Z`).getUTCDay());
    if (!expediente) continue;
    const horarios: string[] = [];
    for (let minuto = expediente.inicioMinuto; minuto + duracao <= expediente.fimMinuto; minuto += AGENDA.intervalo) {
      const inicio = instante(data, horario(minuto));
      const fim = new Date(inicio.getTime() + duracao * 60_000);
      if (inicio > agora && !ocupacoes.some((ocupacao) => sobrepoe({ inicio, fim }, ocupacao))) horarios.push(horario(minuto));
    }
    if (horarios.length) dias.push({ data, horarios });
  }
  return dias;
}
