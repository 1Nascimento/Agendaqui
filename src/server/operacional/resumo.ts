import type { AgendamentoRecord } from "@/server/agendamentos/repository";

export const formasPagamento = { DINHEIRO: "Dinheiro", PIX: "Pix", CARTAO_CREDITO: "Cartão de crédito", CARTAO_DEBITO: "Cartão de débito" };
export const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const centavos = (valor: { toString(): string }) => Math.round(Number(valor.toString()) * 100);

export function resumoPagamento(a: Pick<AgendamentoRecord, "servicos" | "pagamentos" | "status">) {
  const total = a.servicos.reduce((soma, s) => soma + centavos(s.preco), 0);
  const recebido = a.pagamentos.filter((p) => !p.estornadoEm).reduce((soma, p) => soma + centavos(p.valor), 0);
  const saldo = a.status === "REALIZADO" ? Math.max(0, total - recebido) : 0;
  const situacao = a.status !== "REALIZADO" ? "Não cobrável" : saldo === 0 ? "Pago" : recebido > 0 ? "Parcial" : "Pendente";
  return { total, recebido, saldo, situacao };
}

export function situacaoAtendimento(a: Pick<AgendamentoRecord, "status" | "inicio" | "fim">, agora: Date) {
  if (a.status === "REALIZADO") return "Realizado";
  if (a.status === "NAO_COMPARECEU") return "Não compareceu";
  if (a.status === "CANCELADO") return "Cancelado";
  return a.fim <= agora ? "Aguardando baixa" : a.inicio <= agora ? "Em andamento" : "Confirmado";
}
