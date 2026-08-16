type CadastroContaFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
};

export function CadastroContaForm({ action, submitLabel }: CadastroContaFormProps) {
  return (
    <form className="form" action={action}>
      <div className="grid-two">
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="telefone">Telefone</label>
          <input id="telefone" name="telefone" autoComplete="tel" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid-two">
        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" autoComplete="new-password" required />
        </div>
        <div className="field">
          <label htmlFor="confirmarSenha">Confirmar senha</label>
          <input id="confirmarSenha" name="confirmarSenha" type="password" autoComplete="new-password" required />
        </div>
      </div>
      <div className="actions">
        <button className="button" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
