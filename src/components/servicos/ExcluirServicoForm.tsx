"use client";

import { excluirServicoAction } from "@/app/actions/servicos";

type ExcluirServicoFormProps = {
  servicoId: string;
  nomeServico: string;
};

export function ExcluirServicoForm({ servicoId, nomeServico }: ExcluirServicoFormProps) {
  return (
    <form
      action={excluirServicoAction}
      onSubmit={(event) => {
        if (!window.confirm(`Confirmar exclusao do servico ${nomeServico}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={servicoId} />
      <button className="button danger small" type="submit">Excluir</button>
    </form>
  );
}
