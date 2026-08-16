"use client";

import { alterarStatusContaAction } from "@/app/actions/contas";

type StatusContaFormProps = {
  contaId: string;
  ativo: boolean;
};

export function StatusContaForm({ contaId, ativo }: StatusContaFormProps) {
  return (
    <form
      action={alterarStatusContaAction}
      onSubmit={(event) => {
        const acao = ativo ? "desativar" : "reativar";

        if (!window.confirm(`Confirmar ${acao} esta conta?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={contaId} />
      <input type="hidden" name="ativo" value={ativo ? "false" : "true"} />
      <button className={`button small ${ativo ? "danger" : "secondary"}`} type="submit">
        {ativo ? "Desativar" : "Reativar"}
      </button>
    </form>
  );
}
