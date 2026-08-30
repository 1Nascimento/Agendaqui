type ServicoFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  servico?: {
    id?: string;
    nome?: string;
    preco?: string;
    duracao?: number;
  };
};

export function ServicoForm({ action, submitLabel, servico }: ServicoFormProps) {
  return (
    <form className="form" action={action}>
      {servico?.id ? <input type="hidden" name="id" value={servico.id} /> : null}
      <div className="field">
        <label htmlFor="nome">Nome do servico</label>
        <input id="nome" name="nome" defaultValue={servico?.nome} maxLength={100} required />
      </div>
      <div className="grid-two">
        <div className="field">
          <label htmlFor="preco">Preco (R$)</label>
          <input id="preco" name="preco" type="text" inputMode="decimal" defaultValue={servico?.preco} placeholder="0,00" required />
        </div>
        <div className="field">
          <label htmlFor="duracao">Duracao (minutos)</label>
          <input id="duracao" name="duracao" type="number" min="1" max="1440" step="1" defaultValue={servico?.duracao} required />
        </div>
      </div>
      <div className="actions">
        <button className="button" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
