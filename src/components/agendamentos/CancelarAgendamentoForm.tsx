"use client";

import { useActionState, useState } from "react";
import { cancelarAgendamentoAction } from "@/app/actions/agendamentos";

export function CancelarAgendamentoForm({ id, versao }: { id: string; versao: number }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, action, pendente] = useActionState(cancelarAgendamentoAction, {});
  return <div className="block-gap">
    {!confirmando ? <button type="button" className="button danger" onClick={() => setConfirmando(true)}>Cancelar atendimento</button> : <form action={action} className="form">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="versao" value={versao} />
      <p>Deseja cancelar este atendimento? O horário será liberado para outros clientes.</p>
      {estado.erro && <p className="message error" role="alert">{estado.erro}</p>}
      <div className="actions"><button type="submit" className="button danger" disabled={pendente}>{pendente ? "Cancelando…" : "Confirmar cancelamento"}</button><button type="button" className="button secondary" disabled={pendente} onClick={() => setConfirmando(false)}>Manter agendamento</button></div>
    </form>}
  </div>;
}
