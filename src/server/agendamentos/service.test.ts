import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import type { ContaAutenticada } from "@/server/domain/perfis";
import type { ServicoRecord } from "@/server/servicos/repository";
import { calcularDisponibilidade, instante, sobrepoe, validarHorario, type Expediente, type Ocupacao } from "./calendario";
import type { AgendaRepository, AgendaTransacao, AgendamentoRecord, FiltroOcupacao, NovoAgendamento } from "./repository";
import { cancelarAgendamento, confirmarAgendamento, consultarDisponibilidade, consultarRemarcacao, listarAgendamentos, obterAgendamento, remarcarAgendamento } from "./service";
import { salvarExpediente } from "./expediente";

const agora = new Date("2026-09-21T08:00:00-03:00"); // segunda-feira
const cliente: ContaAutenticada = { empresaId: "empresa_padrao", id: "cliente", nome: "Cliente", email: "cliente@example.test", perfil: "CLIENTE", ativo: true };
const outroCliente = { ...cliente, id: "outro-cliente" };
const funcionario: ContaAutenticada = { ...cliente, id: "funcionario", perfil: "FUNCIONARIO" };
const outroFuncionario = { ...funcionario, id: "outro-funcionario" };
const admin: ContaAutenticada = { ...cliente, id: "admin", perfil: "ADMINISTRADOR" };
const expediente = [1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, inicioMinuto: 540, fimMinuto: 1080 }));
const input = { funcionarioId: funcionario.id, servicoIds: ["corte", "barba"], data: "2026-09-21", horario: "09:00" };

class MemoryAgenda implements AgendaRepository, AgendaTransacao {
  contas = [cliente, outroCliente, funcionario, outroFuncionario, admin].map((c) => ({ ...c }));
  catalogo: ServicoRecord[] = [
    { empresaId: "empresa_padrao", id: "corte", nome: "Corte", preco: new Prisma.Decimal("45.50"), duracao: 45, ativo: true, descricao: null, createdAt: agora, updatedAt: agora },
    { empresaId: "empresa_padrao", id: "barba", nome: "Barba", preco: new Prisma.Decimal("25.00"), duracao: 30, ativo: true, descricao: null, createdAt: agora, updatedAt: agora }
  ];
  registros: AgendamentoRecord[] = [];
  horarios = new Map([[funcionario.id, expediente.map((e) => ({ ...e }))], [outroFuncionario.id, expediente.map((e) => ({ ...e }))]]);
  async conta(id: string, empresaId: string) { return this.contas.find((c) => c.id === id && c.empresaId === empresaId) ?? null; }
  async servicos(ids: string[], empresaId: string) { return this.catalogo.filter((s) => ids.includes(s.id) && s.empresaId === empresaId); }
  async agendamento(id: string, empresaId: string) { return this.registros.find((a) => a.id === id && a.empresaId === empresaId) ?? null; }
  async expedientes(id: string, empresaId: string) { return await this.conta(id, empresaId) ? this.horarios.get(id) ?? [] : []; }
  async futuros(id: string, data: Date, empresaId: string) { return this.registros.filter((a) => a.empresaId === empresaId && a.funcionarioId === id && a.status === "CONFIRMADO" && a.fim > data); }
  async salvarExpedientes(id: string, dias: Expediente[], empresaId: string) { if (!await this.conta(id, empresaId)) throw new Error("Funcionário inválido"); this.horarios.set(id, dias); }
  async ocupacoes(f: FiltroOcupacao) { return this.registros.filter((a) => a.empresaId === f.empresaId && a.id !== f.ignorarId && a.status === "CONFIRMADO" && (a.clienteId === f.clienteId || a.funcionarioId === f.funcionarioId) && sobrepoe(a, f)); }
  async listar(ator: ContaAutenticada) { return this.registros.filter((a) => a.empresaId === ator.empresaId && (ator.perfil === "ADMINISTRADOR" || (ator.perfil === "CLIENTE" ? a.clienteId === ator.id : a.funcionarioId === ator.id))); }
  async transacao<T>(executar: (tx: AgendaTransacao) => Promise<T>) { return executar(this); }
  async criar(data: NovoAgendamento) {
    const { atorId, servicos, ...periodo } = data;
    const id = `agenda-${this.registros.length}`;
    const a: AgendamentoRecord = { ...periodo, id, status: "CONFIRMADO", versao: 1, createdAt: agora, updatedAt: agora,
      cliente: { id: data.clienteId, nome: "Cliente" }, funcionario: { id: data.funcionarioId, nome: "Funcionário" },
      servicos: servicos.map((s, index) => ({ ...s, preco: new Prisma.Decimal(s.preco), id: `item-${index}`, agendamentoId: id })),
      eventos: [{ id: `evento-${id}`, agendamentoId: id, atorId, ator: { nome: "Ator" }, tipo: "CONFIRMADO", inicio: data.inicio, fim: data.fim, inicioAnterior: null, fimAnterior: null, createdAt: agora }]
    };
    this.registros.push(a); return a;
  }
  async remarcar(atual: AgendamentoRecord, periodo: Ocupacao, atorId: string) {
    atual.eventos.push({ id: `evento-${atual.eventos.length}`, agendamentoId: atual.id, atorId, ator: { nome: "Ator" }, tipo: "REMARCADO", ...periodo, inicioAnterior: atual.inicio, fimAnterior: atual.fim, createdAt: agora });
    Object.assign(atual, periodo, { versao: atual.versao + 1 }); return atual;
  }
  async cancelar(atual: AgendamentoRecord, atorId: string) {
    atual.status = "CANCELADO"; atual.versao++;
    atual.eventos.push({ id: `evento-${atual.eventos.length}`, agendamentoId: atual.id, atorId, ator: { nome: "Ator" }, tipo: "CANCELADO", inicio: atual.inicio, fim: atual.fim, inicioAnterior: null, fimAnterior: null, createdAt: agora });
    return atual;
  }
}

describe("Módulo 3 — agendamentos", () => {
  let repo: MemoryAgenda;
  beforeEach(() => { repo = new MemoryAgenda(); });

  it("confirma vários serviços somando duração e preservando preço e nome", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    expect(a.inicio).toEqual(instante("2026-09-21", "09:00"));
    expect(a.fim).toEqual(instante("2026-09-21", "10:15"));
    expect(a.servicos.map((s) => s.preco.toFixed(2))).toEqual(["45.50", "25.00"]);
    repo.catalogo[0].nome = "Novo nome"; repo.catalogo[0].preco = new Prisma.Decimal(80);
    expect(a.servicos[0].nome).toBe("Corte");
    expect(a.eventos[0].tipo).toBe("CONFIRMADO");
  });
  it("cliente agenda sempre para si, mesmo enviando outro cliente", async () => {
    expect((await confirmarAgendamento(cliente, { ...input, clienteId: outroCliente.id }, repo, agora)).clienteId).toBe(cliente.id);
  });
  it("administrador e funcionário podem agendar para cliente ativo", async () => {
    await expect(confirmarAgendamento(admin, { ...input, clienteId: cliente.id }, repo, agora)).resolves.toBeDefined();
    await expect(confirmarAgendamento(funcionario, { ...input, clienteId: outroCliente.id, horario: "11:00" }, repo, agora)).resolves.toBeDefined();
  });
  it("funcionário não pode agendar para outro funcionário", async () => {
    await expect(confirmarAgendamento(funcionario, { ...input, clienteId: cliente.id, funcionarioId: outroFuncionario.id }, repo, agora)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });
  it("rejeita serviços vazios, repetidos, inexistentes ou inativos", async () => {
    for (const ids of [[], ["corte", "corte"], ["inexistente"]]) await expect(confirmarAgendamento(cliente, { ...input, servicoIds: ids }, repo, agora)).rejects.toMatchObject({ code: "SERVICOS_INVALIDOS" });
    repo.catalogo[0].ativo = false;
    await expect(confirmarAgendamento(cliente, input, repo, agora)).rejects.toMatchObject({ code: "SERVICOS_INVALIDOS" });
  });
  it("rejeita participantes inativos", async () => {
    repo.contas.find((c) => c.id === funcionario.id)!.ativo = false;
    await expect(confirmarAgendamento(cliente, input, repo, agora)).rejects.toMatchObject({ code: "FUNCIONARIO_INVALIDO" });
    await expect(listarAgendamentos({ ...cliente, ativo: false }, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });
  it("sem expediente não oferece datas nem aceita confirmação", async () => {
    repo.horarios.clear();
    await expect(consultarDisponibilidade(cliente, input, repo, agora)).resolves.toEqual([]);
    await expect(confirmarAgendamento(cliente, input, repo, agora)).rejects.toMatchObject({ code: "FORA_DO_EXPEDIENTE" });
  });
  it("retira da disponibilidade todos os horários sobrepostos", async () => {
    await confirmarAgendamento(cliente, input, repo, agora);
    const dias = await consultarDisponibilidade(outroCliente, { ...input, servicoIds: ["barba"] }, repo, agora);
    expect(dias[0].horarios).not.toContain("09:45");
    expect(dias[0].horarios).not.toContain("10:00");
    expect(dias[0].horarios).toContain("10:15");
    expect(dias[0].horarios).toContain("17:30");
    expect(dias[0].horarios).not.toContain("17:45");
  });
  it("rejeita sobreposição e permite horários consecutivos", async () => {
    await confirmarAgendamento(cliente, input, repo, agora);
    await expect(confirmarAgendamento(outroCliente, { ...input, horario: "10:00" }, repo, agora)).rejects.toMatchObject({ code: "HORARIO_OCUPADO" });
    await expect(confirmarAgendamento(outroCliente, { ...input, horario: "10:15" }, repo, agora)).resolves.toBeDefined();
  });
  it("impede o mesmo cliente em dois funcionários simultaneamente", async () => {
    await confirmarAgendamento(cliente, input, repo, agora);
    await expect(confirmarAgendamento(cliente, { ...input, funcionarioId: outroFuncionario.id }, repo, agora)).rejects.toMatchObject({ code: "HORARIO_OCUPADO" });
    await expect(confirmarAgendamento(outroCliente, { ...input, funcionarioId: outroFuncionario.id }, repo, agora)).resolves.toBeDefined();
  });
  it("restringe acesso e histórico ao cliente ou funcionário responsável", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await expect(obterAgendamento(outroCliente, a.id, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(obterAgendamento(outroFuncionario, a.id, repo)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(listarAgendamentos(outroCliente, repo)).resolves.toEqual([]);
    await expect(listarAgendamentos(funcionario, repo)).resolves.toHaveLength(1);
    await expect(listarAgendamentos(admin, repo)).resolves.toHaveLength(1);
  });
  it("remarca usando duração contratada e registra o horário anterior", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    repo.catalogo = []; // exclusão do catálogo não apaga as condições contratadas
    const dias = await consultarRemarcacao(cliente, a.id, repo, agora);
    expect(dias[0].horarios).toContain("09:15");
    const remarcado = await remarcarAgendamento(cliente, { id: a.id, versao: 1, data: input.data, horario: "09:15" }, repo, agora);
    expect(remarcado.fim).toEqual(instante(input.data, "10:30"));
    expect(remarcado.eventos[1].inicioAnterior).toEqual(instante(input.data, "09:00"));
    expect(remarcado.versao).toBe(2);
  });
  it("não altera o agendamento quando o novo horário está ocupado", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await confirmarAgendamento(outroCliente, { ...input, horario: "11:00" }, repo, agora);
    await expect(remarcarAgendamento(cliente, { id: a.id, versao: 1, data: input.data, horario: "11:15" }, repo, agora)).rejects.toMatchObject({ code: "HORARIO_OCUPADO" });
    expect(a.inicio).toEqual(instante(input.data, "09:00"));
    expect(a.eventos).toHaveLength(1);
  });
  it("recusa remarcação para o mesmo horário", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await expect(remarcarAgendamento(cliente, { ...input, id: a.id, versao: 1 }, repo, agora)).rejects.toMatchObject({ code: "MESMO_HORARIO" });
  });
  it("cancelamento mantém o histórico e libera o horário", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await cancelarAgendamento(cliente, { id: a.id, versao: 1 }, repo, agora);
    expect(a.status).toBe("CANCELADO");
    expect(a.eventos[1].tipo).toBe("CANCELADO");
    await expect(confirmarAgendamento(outroCliente, input, repo, agora)).resolves.toBeDefined();
    await expect(listarAgendamentos(cliente, repo)).resolves.toHaveLength(1);
  });
  it("impede alterações por outros clientes ou funcionários", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    for (const ator of [outroCliente, outroFuncionario]) {
      await expect(cancelarAgendamento(ator, { id: a.id, versao: 1 }, repo, agora)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
      await expect(consultarRemarcacao(ator, a.id, repo, agora)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
      await expect(remarcarAgendamento(ator, { ...input, id: a.id, versao: 1, horario: "11:00" }, repo, agora)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    }
  });
  it("bloqueia cancelamento com versão desatualizada", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await remarcarAgendamento(cliente, { id: a.id, versao: 1, data: input.data, horario: "11:00" }, repo, agora);
    await expect(cancelarAgendamento(cliente, { id: a.id, versao: 1 }, repo, agora)).rejects.toMatchObject({ code: "AGENDAMENTO_ALTERADO" });
  });
  it("não altera agendamentos iniciados ou cancelados", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await expect(cancelarAgendamento(cliente, { id: a.id, versao: 1 }, repo, a.inicio)).rejects.toMatchObject({ code: "AGENDAMENTO_ENCERRADO" });
    await cancelarAgendamento(admin, { id: a.id, versao: 1 }, repo, agora);
    await expect(remarcarAgendamento(cliente, { id: a.id, versao: 2, data: input.data, horario: "11:00" }, repo, agora)).rejects.toMatchObject({ code: "AGENDAMENTO_ENCERRADO" });
  });
  it("funcionário define os próprios dias e horários", async () => {
    await salvarExpediente(funcionario, funcionario.id, [{ diaSemana: 1, inicioMinuto: 780, fimMinuto: 1020 }], repo, agora);
    const dias = await consultarDisponibilidade(cliente, input, repo, agora);
    expect(dias[0].horarios[0]).toBe("13:00");
    expect(dias.every((dia) => new Date(`${dia.data}T12:00:00Z`).getUTCDay() === 1)).toBe(true);
  });
  it("impede alteração do expediente por cliente ou outro funcionário", async () => {
    for (const ator of [cliente, outroFuncionario]) await expect(salvarExpediente(ator, funcionario.id, expediente, repo, agora)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });
  it("valida dias duplicados, inválidos e intervalo invertido", async () => {
    for (const dias of [[expediente[0], expediente[0]], [{ diaSemana: 7, inicioMinuto: 540, fimMinuto: 600 }], [{ diaSemana: 1, inicioMinuto: 600, fimMinuto: 540 }]]) await expect(salvarExpediente(funcionario, funcionario.id, dias, repo, agora)).rejects.toMatchObject({ code: "EXPEDIENTE_INVALIDO" });
  });
  it("protege atendimentos confirmados ao reduzir ou fechar o expediente", async () => {
    await confirmarAgendamento(cliente, input, repo, agora);
    await expect(salvarExpediente(funcionario, funcionario.id, [], repo, agora)).rejects.toMatchObject({ code: "EXPEDIENTE_COM_AGENDAMENTOS" });
    await expect(salvarExpediente(funcionario, funcionario.id, [{ diaSemana: 1, inicioMinuto: 540, fimMinuto: 600 }], repo, agora)).rejects.toMatchObject({ code: "EXPEDIENTE_COM_AGENDAMENTOS" });
    await expect(salvarExpediente(admin, funcionario.id, expediente, repo, agora)).resolves.toBeUndefined();
  });
  it("permite fechar a agenda depois de cancelar os compromissos", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await cancelarAgendamento(cliente, { id: a.id, versao: 1 }, repo, agora);
    await salvarExpediente(funcionario, funcionario.id, [], repo, agora);
    await expect(consultarDisponibilidade(cliente, input, repo, agora)).resolves.toEqual([]);
  });
});

describe("Calendário", () => {
  it.each([
    ["2026-02-30", "09:00"], ["inválida", "09:00"], ["2026-09-21", "25:00"], ["2026-09-20", "09:00"], ["2026-09-27", "09:00"], ["2026-09-21", "17:30"], ["2026-09-21", "08:00"], ["2026-09-21", "09:01"], ["2026-12-01", "09:00"]
  ])("rejeita data/horário inválido ou indisponível: %s %s", (data, hora) => {
    expect(() => validarHorario(data, hora, 75, agora, expediente)).toThrow();
  });
  it("não oferece slots passados e respeita a duração completa", () => {
    const dias = calcularDisponibilidade(75, [], instante("2026-09-21", "09:00"), expediente);
    expect(dias[0].horarios[0]).toBe("09:15");
    expect(dias[0].horarios.at(-1)).toBe("16:45");
    expect(calcularDisponibilidade(600, [], agora, expediente)).toEqual([]);
  });
  it("usa o fuso da empresa ao cruzar a meia-noite UTC", () => {
    const dias = calcularDisponibilidade(30, [], new Date("2026-09-22T01:00:00Z"), expediente);
    expect(dias[0].data).toBe("2026-09-22");
    expect(instante("2026-09-21", "09:00").toISOString()).toBe("2026-09-21T12:00:00.000Z");
  });
});

describe("Agenda por empresa", () => {
  it("administrador de outra empresa não lista, lê, remarca nem cancela agendamentos", async () => {
    const repo = new MemoryAgenda();
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    const externo = { ...admin, empresaId: "outra" };
    await expect(listarAgendamentos(externo, repo)).resolves.toEqual([]);
    await expect(obterAgendamento(externo, a.id, repo)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await expect(remarcarAgendamento(externo, { ...input, id: a.id, versao: 1, horario: "11:00" }, repo, agora)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await expect(cancelarAgendamento(externo, { id: a.id, versao: 1 }, repo, agora)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
  });
  it("não permite funcionários ou serviços de outra empresa", async () => {
    const repo = new MemoryAgenda();
    repo.contas.find((c) => c.id === funcionario.id)!.empresaId = "outra";
    await expect(confirmarAgendamento(cliente, input, repo, agora)).rejects.toMatchObject({ code: "FUNCIONARIO_INVALIDO" });
    await expect(consultarDisponibilidade(cliente, input, repo, agora)).rejects.toMatchObject({ code: "FUNCIONARIO_INVALIDO" });
    repo.contas.find((c) => c.id === funcionario.id)!.empresaId = cliente.empresaId;
    repo.catalogo[0].empresaId = "outra";
    await expect(confirmarAgendamento(cliente, input, repo, agora)).rejects.toMatchObject({ code: "SERVICOS_INVALIDOS" });
  });
  it("administrador não altera expediente de outra empresa", async () => {
    const repo = new MemoryAgenda();
    await expect(salvarExpediente({ ...admin, empresaId: "outra" }, funcionario.id, [], repo, agora)).rejects.toMatchObject({ code: "FUNCIONARIO_INVALIDO" });
    expect(await repo.expedientes(funcionario.id, cliente.empresaId)).toEqual(expediente);
  });
});
