type ContaBasicaFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  conta?: {
    id?: string;
    nome?: string;
    telefone?: string;
    email?: string;
  };
};

export function ContaBasicaForm({ action, submitLabel, conta }: ContaBasicaFormProps) {
  return (
    <form className="form" action={action}>
      {conta?.id ? <input type="hidden" name="id" value={conta.id} /> : null}
      <div className="grid-two">
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" defaultValue={conta?.nome} autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="telefone">Telefone</label>
          <input id="telefone" name="telefone" defaultValue={conta?.telefone} autoComplete="tel" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" defaultValue={conta?.email} autoComplete="email" required />
      </div>
      <div className="actions">
        <button className="button" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
