"use client";

import { useActionState, useState } from "react";
import { operacionalAction } from "@/app/actions/operacional";
import { formasPagamento, moeda } from "@/server/operacional/resumo";

type Props = { id: string; versao: number } & (
  { operacao: "finalizar" } |
  { operacao: "receber"; saldo: number } |
  { operacao: "estornar"; pagamentoId: string }
);
export function OperacionalForm(props: Props) {
  const [estado, action, pendente] = useActionState(operacionalAction, {});
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState("REALIZADO");
  return <form action={action} className="form block-gap" onChange={() => setConfirmando(false)}>
    <input type="hidden" name="id" value={props.id} /><input type="hidden" name="versao" value={props.versao} /><input type="hidden" name="operacao" value={props.operacao} />
    {estado.erro && <p className="message error" role="alert">{estado.erro}</p>}
    <fieldset className="agenda-fieldset form" disabled={pendente}>
      <legend>{props.operacao === "finalizar" ? "Registrar resultado" : props.operacao === "receber" ? "Novo recebimento" : "Estornar recebimento"}</legend>
      {props.operacao === "finalizar" && <div className="field"><label>Resultado<select name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value)}><option value="REALIZADO">Atendimento realizado</option><option value="NAO_COMPARECEU">Cliente não compareceu</option></select></label></div>}
      {props.operacao === "receber" && <>
        <p className="muted">Saldo: <strong>{moeda(props.saldo)}</strong></p>
        <div className="grid-two"><div className="field"><label>Valor (R$)<input name="valor" type="text" inputMode="decimal" placeholder={(props.saldo / 100).toFixed(2).replace(".", ",")} required maxLength={11} /></label></div>
          <div className="field"><label>Forma de pagamento<select name="forma" required><option value="">Selecione</option>{Object.entries(formasPagamento).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label></div></div>
      </>}
      {props.operacao === "estornar" && <><input type="hidden" name="pagamentoId" value={props.pagamentoId} /><div className="field"><label>Motivo do estorno<input name="motivo" required minLength={3} maxLength={500} /></label></div></>}
      {confirmando ? <div role="status"><p>{props.operacao === "finalizar" ? `Confirmar resultado: ${resultado === "REALIZADO" ? "atendimento realizado" : "cliente não compareceu"}?` : "Confirmar o estorno integral deste recebimento?"}</p><div className="actions"><button className={`button ${props.operacao === "estornar" ? "danger" : ""}`} type="submit">{pendente ? "Salvando…" : "Confirmar registro"}</button><button className="button secondary" type="button" onClick={() => setConfirmando(false)}>Voltar</button></div></div> :
        props.operacao === "receber" ? <button className="button" type="submit">{pendente ? "Salvando…" : "Registrar recebimento"}</button> : <button className={`button ${props.operacao === "estornar" ? "danger" : ""}`} type="button" onClick={(e) => { if (e.currentTarget.form?.reportValidity()) setConfirmando(true); }}>{props.operacao === "finalizar" ? "Revisar resultado" : "Revisar estorno"}</button>}
    </fieldset>
  </form>;
}
