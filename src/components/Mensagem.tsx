type MensagemProps = {
  erro?: string | string[];
  sucesso?: string | string[];
};

function valor(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function Mensagem({ erro, sucesso }: MensagemProps) {
  const erroTexto = valor(erro);
  const sucessoTexto = valor(sucesso);

  if (erroTexto) {
    return <div className="message error">{erroTexto}</div>;
  }

  if (sucessoTexto) {
    return <div className="message success">{sucessoTexto}</div>;
  }

  return null;
}
