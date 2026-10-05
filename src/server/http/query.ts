export type ParametroBusca = string | string[] | undefined;

// O Next recebe arrays quando um parâmetro é repetido na URL.
export function parametroTexto(valor: ParametroBusca) {
  return Array.isArray(valor) ? valor[0] : valor;
}
