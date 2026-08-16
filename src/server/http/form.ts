import { isAgendaquiError, mensagemErro } from "@/server/domain/errors";

export function campo(formData: FormData, nome: string) {
  const value = formData.get(nome);
  return typeof value === "string" ? value : "";
}

export function booleanCampo(formData: FormData, nome: string) {
  return campo(formData, nome) === "true";
}

export function urlComMensagem(path: string, tipo: "erro" | "sucesso", mensagem: string) {
  const params = new URLSearchParams({ [tipo]: mensagem });
  return `${path}?${params.toString()}`;
}

export function mensagemErroForm(error: unknown) {
  if (isAgendaquiError(error)) {
    return error.message;
  }

  return mensagemErro(error);
}
