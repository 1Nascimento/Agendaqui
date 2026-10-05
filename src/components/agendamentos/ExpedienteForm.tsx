"use client";

import { useActionState, useState } from "react";
import { salvarExpedienteAction } from "@/app/actions/agendamentos";
import { DIAS_SEMANA } from "@/server/agendamentos/expediente";
import type { Expediente } from "@/server/agendamentos/calendario";

function hora(minutos: number) { return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`; }

export function ExpedienteForm({ funcionarioId, expedientes }: { funcionarioId: string; expedientes: Expediente[] }) {
  const [estado, action, pendente] = useActionState(salvarExpedienteAction, {});
  const [dias, setDias] = useState(expedientes.map((dia) => dia.diaSemana));
  return <form action={action} className="form block-gap">
    <input type="hidden" name="funcionarioId" value={funcionarioId} />
    {estado.erro && <p role="alert" className="message error">{estado.erro}</p>}
    {estado.sucesso && <p role="status" className="message success">{estado.sucesso}</p>}
    <fieldset disabled={pendente} className="agenda-fieldset">
      <legend>Dias e horários de trabalho</legend>
      {[1, 2, 3, 4, 5, 6, 0].map((diaSemana) => {
        const expediente = expedientes.find((dia) => dia.diaSemana === diaSemana);
        const ativo = dias.includes(diaSemana);
        return <div className="expediente-row" key={diaSemana}>
          <label className="weekday"><input type="checkbox" name="dias" value={diaSemana} checked={ativo} onChange={(event) => setDias(event.target.checked ? [...dias, diaSemana] : dias.filter((dia) => dia !== diaSemana))} />{DIAS_SEMANA[diaSemana]}</label>
          <div className="field"><label htmlFor={`inicio_${diaSemana}`}>Início</label><input id={`inicio_${diaSemana}`} name={`inicio_${diaSemana}`} type="time" defaultValue={hora(expediente?.inicioMinuto ?? 540)} disabled={!ativo} required={ativo} /></div>
          <div className="field"><label htmlFor={`fim_${diaSemana}`}>Término</label><input id={`fim_${diaSemana}`} name={`fim_${diaSemana}`} type="time" defaultValue={hora(expediente?.fimMinuto ?? 1080)} disabled={!ativo} required={ativo} /></div>
        </div>;
      })}
    </fieldset>
    <div className="actions"><button type="submit" disabled={pendente} className="button">{pendente ? "Salvando…" : "Salvar expediente"}</button></div>
  </form>;
}
