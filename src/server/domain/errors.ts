export class AgendaquiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AgendaquiError";
    this.code = code;
    this.status = status;
  }
}

export function isAgendaquiError(error: unknown): error is AgendaquiError {
  return error instanceof AgendaquiError;
}

export function mensagemErro(error: unknown) {
  if (isAgendaquiError(error)) {
    return error.message;
  }

  return "Ocorreu uma falha inesperada. Tente novamente em instantes.";
}
