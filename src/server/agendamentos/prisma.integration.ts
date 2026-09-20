import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { gerarTokenSeguro, hashToken } from "@/server/security/tokens";
import type { ContaAutenticada } from "@/server/domain/perfis";
import { dataLocal, instante, somarDias } from "./calendario";
import { prismaAgendaRepository as repo } from "./prisma-repository";
import { cancelarAgendamento, confirmarAgendamento, consultarDisponibilidade, remarcarAgendamento } from "./service";
import { salvarExpediente } from "./expediente";

// Identificadores exclusivos; a limpeza alcança somente os registros desta execução.
const prefixo = `teste-agenda-${randomUUID()}`;
const empresaId = `${prefixo}-empresa`;
const criarAtor = (sufixo: string, perfil: ContaAutenticada["perfil"]): ContaAutenticada => ({ empresaId, id: `${prefixo}-${sufixo}`, nome: `Teste ${sufixo}`, email: `${prefixo}-${sufixo}@example.test`, ativo: true, perfil });
const cliente = criarAtor("cliente", "CLIENTE");
const outroCliente = criarAtor("outro-cliente", "CLIENTE");
const funcionario = criarAtor("funcionario", "FUNCIONARIO");
const outroFuncionario = criarAtor("outro-funcionario", "FUNCIONARIO");
const admin = criarAtor("admin", "ADMINISTRADOR");
const contas = [cliente, outroCliente, funcionario, outroFuncionario, admin];
const ids = contas.map((c) => c.id);
const servicoId = `${prefixo}-servico`;
const agora = new Date();
const data = somarDias(dataLocal(agora), 2);
const semana = Array.from({ length: 7 }, (_, diaSemana) => ({ diaSemana, inicioMinuto: 540, fimMinuto: 1080 }));
const input = { servicoIds: [servicoId], funcionarioId: funcionario.id, data, horario: "09:00" };

describe("Agenda no PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.empresa.create({ data: { id: empresaId, nome: "Empresa de teste de agenda", slug: empresaId } });
    await prisma.conta.createMany({ data: contas.map((c) => ({ ...c, telefone: "11999999999", senhaHash: "conta-temporaria-sem-login-por-senha" })) });
  });
  beforeEach(async () => {
    await prisma.agendamento.deleteMany({ where: { clienteId: { in: ids } } });
    await prisma.servico.upsert({ where: { id: servicoId }, create: { empresaId, id: servicoId, nome: "Serviço de teste", duracao: 45, preco: "42.50" }, update: { duracao: 45, preco: "42.50", ativo: true } });
    await salvarExpediente(funcionario, funcionario.id, semana, repo, agora);
    await salvarExpediente(outroFuncionario, outroFuncionario.id, semana, repo, agora);
  });
  afterAll(async () => {
    try {
      await prisma.agendamento.deleteMany({ where: { clienteId: { in: ids } } });
      await prisma.servico.deleteMany({ where: { id: servicoId } });
      await prisma.conta.deleteMany({ where: { id: { in: ids } } });
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    } finally { await prisma.$disconnect(); }
  });

  it("duas confirmações concorrentes para o mesmo funcionário reservam somente uma vaga", async () => {
    const resultados = await Promise.allSettled([confirmarAgendamento(cliente, input, repo, agora), confirmarAgendamento(outroCliente, input, repo, agora)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "HORARIO_OCUPADO" } });
    expect(await prisma.agendamento.count({ where: { funcionarioId: funcionario.id } })).toBe(1);
  });
  it("reservas concorrentes com inícios distintos também detectam sobreposição", async () => {
    const resultados = await Promise.allSettled([confirmarAgendamento(cliente, input, repo, agora), confirmarAgendamento(outroCliente, { ...input, horario: "09:15" }, repo, agora)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "HORARIO_OCUPADO" } });
  });
  it("o mesmo cliente não consegue reservar dois funcionários simultaneamente", async () => {
    const resultados = await Promise.allSettled([confirmarAgendamento(cliente, input, repo, agora), confirmarAgendamento(cliente, { ...input, funcionarioId: outroFuncionario.id }, repo, agora)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "HORARIO_OCUPADO" } });
  });
  it("remarca, cancela e persiste os três eventos sem perder os valores contratados", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    await prisma.servico.delete({ where: { id: servicoId } });
    const remarcado = await remarcarAgendamento(cliente, { id: a.id, versao: a.versao, data, horario: "10:00" }, repo, agora);
    expect(remarcado.servicos[0].servicoId).toBeNull();
    expect(remarcado.servicos[0].preco.toFixed(2)).toBe("42.50");
    expect(remarcado.fim).toEqual(instante(data, "10:45"));
    const cancelado = await cancelarAgendamento(cliente, { id: a.id, versao: remarcado.versao }, repo, agora);
    expect(cancelado.eventos.map((e) => e.tipo)).toEqual(["CONFIRMADO", "REMARCADO", "CANCELADO"]);
    expect(cancelado.versao).toBe(3);
    expect(cancelado.status).toBe("CANCELADO");
  });
  it("duas alterações concorrentes não sobrescrevem uma à outra", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    const resultados = await Promise.allSettled([remarcarAgendamento(cliente, { id: a.id, versao: 1, data, horario: "10:00" }, repo, agora), remarcarAgendamento(funcionario, { id: a.id, versao: 1, data, horario: "11:00" }, repo, agora)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "AGENDAMENTO_ALTERADO" } });
    expect((await repo.agendamento(a.id, empresaId))?.eventos).toHaveLength(2);
  });
  it("salvar expediente e reservar concorrentemente não deixa compromisso fora do expediente", async () => {
    const resultados = await Promise.allSettled([confirmarAgendamento(cliente, input, repo, agora), salvarExpediente(funcionario, funcionario.id, [], repo, agora)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const agendamentos = await repo.listar(funcionario);
    const expediente = await repo.expedientes(funcionario.id, empresaId);
    expect(agendamentos.length === 0 || expediente.length > 0).toBe(true);
  });
  it("cancelar libera a vaga na consulta de disponibilidade", async () => {
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    expect((await consultarDisponibilidade(outroCliente, input, repo, agora)).find((d) => d.data === data)?.horarios).not.toContain("09:00");
    await cancelarAgendamento(funcionario, { id: a.id, versao: 1 }, repo, agora);
    expect((await consultarDisponibilidade(outroCliente, input, repo, agora)).find((d) => d.data === data)?.horarios).toContain("09:00");
  });

  it.skipIf(!process.env.AGENDA_TEST_BASE_URL)("renderiza as rotas autenticadas e protege páginas de outros perfis", async () => {
    const base = process.env.AGENDA_TEST_BASE_URL!;
    const a = await confirmarAgendamento(cliente, input, repo, agora);
    const cookie = async (ator: ContaAutenticada) => {
      const token = gerarTokenSeguro();
      const sessao = await prisma.sessaoConta.create({ data: { contaId: ator.id, tokenHash: hashToken(token), expiraEm: new Date(Date.now() + 60_000) } });
      return `${process.env.SESSION_COOKIE_NAME || "agendaqui_session"}=${sessao.id}.${token}`;
    };
    const cookieCliente = await cookie(cliente);
    for (const [path, conteudo] of [["/agendamentos", "Meus agendamentos"], ["/agendamentos/novo", "Selecione os serviços"], [`/agendamentos/${a.id}`, "Histórico de alterações"], [`/agendamentos/${a.id}/remarcar`, "Horário atual"], ["/agendamentos?aba=historico", "Nenhum agendamento no histórico"]]) {
      const resposta = await fetch(`${base}${path}`, { headers: { cookie: cookieCliente }, redirect: "manual" });
      expect(resposta.status).toBe(200);
      expect(await resposta.text()).toContain(conteudo);
    }
    const expediente = await fetch(`${base}/funcionario/expediente`, { headers: { cookie: await cookie(funcionario) } });
    expect(expediente.status).toBe(200);
    expect(await expediente.text()).toContain("Dias e horários de trabalho");
    const agendaAdmin = await fetch(`${base}/agendamentos`, { headers: { cookie: await cookie(admin) } });
    expect(await agendaAdmin.text()).toContain("Agenda de atendimentos");
    const semSessao = await fetch(`${base}/agendamentos`, { redirect: "manual" });
    expect(semSessao.headers.get("location")).toBe("/login");
    const outro = await fetch(`${base}/agendamentos/${a.id}`, { headers: { cookie: await cookie(outroCliente) }, redirect: "manual" });
    expect(outro.headers.get("location")).toBe("/acesso-negado");
    const semPermissao = await fetch(`${base}/funcionario/expediente`, { headers: { cookie: cookieCliente }, redirect: "manual" });
    expect(semPermissao.headers.get("location")).toBe("/acesso-negado");
  });
});
