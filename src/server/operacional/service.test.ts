import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import type { ContaAutenticada } from "@/server/domain/perfis";
import type { AgendamentoRecord } from "@/server/agendamentos/repository";
import type { OperacionalRepository, OperacionalTransacao, ResultadoAtendimento } from "./repository";
import { estornarPagamento, finalizarAtendimento, registrarPagamento, validarValorRecebimento } from "./service";
import { resumoPagamento, situacaoAtendimento } from "./resumo";
import { calcularDashboard } from "./dashboard";
import { filtrarAgenda, periodoDashboard } from "./filtros";
import { resumoFinanceiroMensal } from "./financeiro";

const agora = new Date("2026-10-05T12:00:00-03:00");
const ator: ContaAutenticada = { id: "admin", empresaId: "empresa", nome: "Admin", email: "admin@example.test", perfil: "ADMINISTRADOR", ativo: true };
const funcionario: ContaAutenticada = { ...ator, id: "funcionario", perfil: "FUNCIONARIO" };
const cliente: ContaAutenticada = { ...ator, id: "cliente", perfil: "CLIENTE" };

function agendamento(): AgendamentoRecord {
  return {
    empresa: { id: "empresa", nome: "Teste", slug: "teste" }, id: "agenda", empresaId: "empresa", clienteId: "cliente", funcionarioId: "funcionario", status: "CONFIRMADO", versao: 1,
    inicio: new Date("2026-10-05T09:00:00-03:00"), fim: new Date("2026-10-05T09:45:00-03:00"), createdAt: agora, updatedAt: agora,
    cliente: { id: "cliente", nome: "Cliente" }, funcionario: { id: "funcionario", nome: "Funcionário" }, eventos: [], pagamentos: [],
    servicos: [{ id: "item", agendamentoId: "agenda", servicoId: null, nome: "Corte", duracao: 45, preco: new Prisma.Decimal("70.50") }]
  };
}
class Memoria implements OperacionalRepository, OperacionalTransacao {
  a = agendamento();
  async transacao<T>(executar: (tx: OperacionalTransacao) => Promise<T>) { return executar(this); }
  async agendamento(id: string, empresaId: string) { return this.a.id === id && this.a.empresaId === empresaId ? this.a : null; }
  async finalizar(a: AgendamentoRecord, status: ResultadoAtendimento, atorId: string, data: Date) {
    a.status = status; a.versao++;
    a.eventos.push({ id: "evento", agendamentoId: a.id, atorId, tipo: status, inicio: a.inicio, fim: a.fim, inicioAnterior: null, fimAnterior: null, createdAt: data, ator: { nome: "Operador" } });
  }
  async receber(a: AgendamentoRecord, data: Parameters<OperacionalTransacao["receber"]>[1]) {
    a.versao++;
    a.pagamentos.push({ id: `p${a.pagamentos.length}`, agendamentoId: a.id, empresaId: a.empresaId, valor: new Prisma.Decimal(data.valor), forma: data.forma, registradoPorId: data.atorId, registradoPor: { nome: "Admin" }, createdAt: data.agora, estornadoEm: null, estornadoPorId: null, estornadoPor: null, motivoEstorno: null });
  }
  async estornar(a: AgendamentoRecord, id: string, motivo: string, atorId: string, data: Date) {
    a.versao++; Object.assign(a.pagamentos.find((p) => p.id === id)!, { estornadoEm: data, estornadoPorId: atorId, estornadoPor: { nome: "Admin" }, motivoEstorno: motivo });
  }
}

describe("Módulo 4 — gerenciamento operacional", () => {
  let repo: Memoria;
  beforeEach(() => { repo = new Memoria(); });
  const input = { id: "agenda", versao: "1", resultado: "REALIZADO" };
  const receber = (valor = "70,50") => registrarPagamento(ator, { id: repo.a.id, versao: repo.a.versao, forma: "PIX", valor }, repo, agora);

  it("horário encerrado fica aguardando baixa e não gera cobrança automaticamente", () => {
    expect(situacaoAtendimento(repo.a, agora)).toBe("Aguardando baixa");
    expect(resumoPagamento(repo.a)).toMatchObject({ saldo: 0, situacao: "Não cobrável" });
  });
  it.each([ator, funcionario])("registra atendimento realizado com evento e autor: $perfil", async (operador) => {
    await finalizarAtendimento(operador, input, repo, agora);
    expect(repo.a).toMatchObject({ status: "REALIZADO", versao: 2, eventos: [{ tipo: "REALIZADO", atorId: operador.id, createdAt: agora }] });
    expect(resumoPagamento(repo.a)).toMatchObject({ saldo: 7050, situacao: "Pendente" });
  });
  it("registra falta sem cobrar serviço não realizado", async () => {
    await finalizarAtendimento(funcionario, { ...input, resultado: "NAO_COMPARECEU" }, repo, agora);
    expect(situacaoAtendimento(repo.a, agora)).toBe("Não compareceu");
    await expect(receber()).rejects.toMatchObject({ code: "ATENDIMENTO_NAO_REALIZADO" });
  });
  it.each([cliente, { ...funcionario, id: "outro" }, { ...ator, ativo: false }])("rejeita baixa por ator sem permissão: $id", async (operador) => {
    await expect(finalizarAtendimento(operador, input, repo, agora)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });
  it("isola baixa, recebimento e estorno entre empresas", async () => {
    const externo = { ...ator, empresaId: "outra" };
    await expect(finalizarAtendimento(externo, input, repo, agora)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await expect(registrarPagamento(externo, { ...input, valor: "10", forma: "PIX" }, repo)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await expect(estornarPagamento(externo, { ...input, pagamentoId: "p0", motivo: "Teste" }, repo)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
  });
  it("rejeita baixa antecipada, resultado inválido e atendimento cancelado", async () => {
    await expect(finalizarAtendimento(ator, input, repo, repo.a.inicio)).rejects.toMatchObject({ code: "ATENDIMENTO_NAO_FINALIZAVEL" });
    await expect(finalizarAtendimento(ator, { ...input, resultado: "invalido" }, repo, agora)).rejects.toMatchObject({ code: "RESULTADO_INVALIDO" });
    repo.a.status = "CANCELADO";
    await expect(finalizarAtendimento(ator, input, repo, agora)).rejects.toMatchObject({ code: "ATENDIMENTO_NAO_FINALIZAVEL" });
  });
  it("impede baixa duplicada e formulário desatualizado", async () => {
    await finalizarAtendimento(ator, input, repo, agora);
    await expect(finalizarAtendimento(ator, input, repo, agora)).rejects.toMatchObject({ code: "AGENDAMENTO_ALTERADO" });
    await expect(finalizarAtendimento(ator, { ...input, versao: 2 }, repo, agora)).rejects.toMatchObject({ code: "ATENDIMENTO_NAO_FINALIZAVEL" });
    expect(repo.a.eventos).toHaveLength(1);
  });
  it("exige atendimento realizado e administrador para receber", async () => {
    await expect(receber()).rejects.toMatchObject({ code: "ATENDIMENTO_NAO_REALIZADO" });
    await finalizarAtendimento(ator, input, repo, agora);
    for (const operador of [funcionario, cliente]) {
      await expect(registrarPagamento(operador, { ...input, versao: 2, forma: "PIX", valor: "10" }, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
      await expect(estornarPagamento(operador, { ...input, versao: 2, motivo: "Teste" }, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    }
  });
  it("soma recebimentos parciais em centavos e quita o saldo exato", async () => {
    await finalizarAtendimento(ator, input, repo, agora);
    await receber("0,10"); await receber("0.20");
    expect(resumoPagamento(repo.a)).toMatchObject({ recebido: 30, saldo: 7020, situacao: "Parcial" });
    await receber("70,20");
    expect(resumoPagamento(repo.a)).toMatchObject({ total: 7050, recebido: 7050, saldo: 0, situacao: "Pago" });
    await expect(receber("0,01")).rejects.toMatchObject({ code: "VALOR_ACIMA_SALDO" });
  });
  it("rejeita excesso, forma inválida e versão antiga sem lançar pagamento", async () => {
    await finalizarAtendimento(ator, input, repo, agora);
    await expect(receber("70,51")).rejects.toMatchObject({ code: "VALOR_ACIMA_SALDO" });
    await expect(registrarPagamento(ator, { ...input, valor: "10", forma: "PIX" }, repo)).rejects.toMatchObject({ code: "AGENDAMENTO_ALTERADO" });
    await expect(registrarPagamento(ator, { ...input, versao: 2, valor: "10", forma: "toString" }, repo)).rejects.toMatchObject({ code: "FORMA_INVALIDA" });
    expect(repo.a.pagamentos).toHaveLength(0);
  });
  it("estorno reabre saldo preservando lançamento, motivo e responsáveis", async () => {
    await finalizarAtendimento(ator, input, repo, agora); await receber();
    await estornarPagamento(ator, { id: "agenda", versao: repo.a.versao, pagamentoId: "p0", motivo: "Devolução ao cliente" }, repo, agora);
    expect(repo.a.pagamentos[0]).toMatchObject({ valor: new Prisma.Decimal("70.50"), registradoPorId: "admin", estornadoPorId: "admin", motivoEstorno: "Devolução ao cliente" });
    expect(resumoPagamento(repo.a)).toMatchObject({ saldo: 7050, recebido: 0 });
    await expect(estornarPagamento(ator, { id: "agenda", versao: repo.a.versao, pagamentoId: "p0", motivo: "Teste" }, repo)).rejects.toMatchObject({ code: "PAGAMENTO_ESTORNADO" });
    await receber(); expect(repo.a.pagamentos).toHaveLength(2);
  });
  it("rejeita estorno sem motivo ou de lançamento inexistente", async () => {
    await expect(estornarPagamento(ator, { ...input, motivo: " " }, repo)).rejects.toMatchObject({ code: "MOTIVO_INVALIDO" });
    await expect(estornarPagamento(ator, { ...input, pagamentoId: "outro", motivo: "Teste" }, repo)).rejects.toMatchObject({ code: "PAGAMENTO_NAO_ENCONTRADO" });
  });
  it.each(["0", "-1", "1.234", "1,234", "1e2", "NaN", "Infinity", "100000000", "", "1.000,00", "R$ 5", 5, null])("rejeita valor monetário inválido: %s", (valor) => {
    expect(() => validarValorRecebimento(valor)).toThrow();
  });
  it.each([["1", 100], ["0,01", 1], ["10.5", 1050], [" 70,50 ", 7050]])("aceita valor exato: %s", (valor, esperado) => {
    expect(validarValorRecebimento(valor)).toBe(esperado);
  });
  it("dashboard atribui estorno ao mês da devolução e mantém saldo global", async () => {
    repo.a.inicio = new Date("2026-09-30T21:00:00-03:00"); repo.a.fim = new Date("2026-09-30T21:45:00-03:00");
    await finalizarAtendimento(ator, input, repo, repo.a.fim);
    const setembro = new Date("2026-09-30T23:30:00-03:00");
    await registrarPagamento(ator, { id: "agenda", versao: repo.a.versao, valor: "70.50", forma: "PIX" }, repo, setembro);
    await estornarPagamento(ator, { id: "agenda", versao: repo.a.versao, pagamentoId: "p0", motivo: "Devolução" }, repo, agora);
    const outubro = calcularDashboard([repo.a], periodoDashboard({}, agora), agora);
    expect(outubro).toMatchObject({ realizados: 0, recebimentos: 0, estornos: 7050, liquido: -7050, saldoPendente: 7050 });
    const anterior = calcularDashboard([repo.a], periodoDashboard({ inicio: "2026-09-01", fim: "2026-09-30" }, agora), agora);
    expect(anterior).toMatchObject({ realizados: 1, produzido: 7050, recebimentos: 7050, estornos: 0, ticketMedio: 7050 });
    expect(anterior.funcionarios).toMatchObject([{ id: "funcionario", realizados: 1 }]);
  });
  it("dashboard vazio não divide por zero", () => { expect(calcularDashboard([], periodoDashboard({}, agora), agora)).toMatchObject({ realizados: 0, ticketMedio: 0, liquido: 0 }); });
  it("resumo mensal mantém o recebimento no mês original e desconta estorno no mês da devolução", async () => {
    repo.a.inicio = new Date("2026-09-30T21:00:00-03:00"); repo.a.fim = new Date("2026-09-30T21:45:00-03:00");
    await finalizarAtendimento(ator, input, repo, repo.a.fim);
    await registrarPagamento(ator, { id: "agenda", versao: repo.a.versao, valor: "70,50", forma: "PIX" }, repo, new Date("2026-10-01T02:30:00Z"));
    await estornarPagamento(ator, { id: "agenda", versao: repo.a.versao, pagamentoId: "p0", motivo: "Devolução" }, repo, agora);
    await receber("20");
    expect(resumoFinanceiroMensal([repo.a], agora)).toEqual({ entrouNoMes: -5050, aReceber: 5050, historico: [{ mes: "2026-09", entrou: 7050 }] });
  });
  it("resumo mensal soma centavos, ordena meses anteriores e mantém pendência de atendimento antigo", async () => {
    repo.a.inicio = new Date("2025-12-01T09:00:00-03:00"); repo.a.fim = new Date("2025-12-01T09:45:00-03:00");
    await finalizarAtendimento(ator, input, repo, repo.a.fim);
    for (const [data, valor] of [["2025-12-15T12:00:00-03:00", "10"], ["2026-01-15T12:00:00-03:00", "20"], ["2026-10-05T09:00:00-03:00", "0,10"], ["2026-10-05T09:01:00-03:00", "0,20"]]) {
      await registrarPagamento(ator, { id: "agenda", versao: repo.a.versao, valor, forma: "PIX" }, repo, new Date(data));
    }
    expect(resumoFinanceiroMensal([repo.a], agora)).toEqual({ entrouNoMes: 30, aReceber: 4020, historico: [{ mes: "2026-01", entrou: 2000 }, { mes: "2025-12", entrou: 1000 }] });
  });
  it("resumo mensal vazio mostra zeros e não cobra atendimento sem baixa", () => {
    expect(resumoFinanceiroMensal([], agora)).toEqual({ entrouNoMes: 0, aReceber: 0, historico: [] });
    expect(resumoFinanceiroMensal([repo.a], agora).aReceber).toBe(0);
  });
  it("filtra agenda usando o dia de Brasília, funcionário e baixa pendente", () => {
    repo.a.inicio = new Date("2026-10-06T01:00:00Z"); repo.a.fim = new Date("2026-10-06T02:00:00Z");
    expect(filtrarAgenda([repo.a], { data: "2026-10-05", funcionarioId: "funcionario" }, agora)).toHaveLength(1);
    expect(filtrarAgenda([repo.a], { data: "2026-10-06" }, agora)).toHaveLength(0);
    expect(filtrarAgenda([repo.a], { status: "AGUARDANDO_BAIXA" }, new Date("2026-10-06T03:00:00Z"))).toHaveLength(1);
  });
  it("valida datas e ordem do período sem quebrar a página", () => {
    expect(() => periodoDashboard({ inicio: "2026-02-30" }, agora)).toThrow();
    expect(() => periodoDashboard({ inicio: "2026-10-10", fim: "2026-10-05" }, agora)).toThrow();
    expect(periodoDashboard({}, agora)).toMatchObject({ inicio: "2026-10-01", fim: "2026-10-05" });
  });
});
