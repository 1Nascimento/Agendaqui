import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { prismaEmpresaRepository as empresas } from "./prisma-repository";
import { cadastrarEmpresa } from "./service";
import { prismaContaRepository as contas } from "@/server/contas/prisma-repository";
import { alterarStatusConta, autenticarConta, cadastrarClientePublico, criarContaPorAdministrador, editarConta, listarContas, obterContaPorSessao, redefinirSenha, solicitarRecuperacaoSenha } from "@/server/contas/service";
import { criarServico, editarServico, excluirServico, listarServicos } from "@/server/servicos/service";
import { prismaServicoRepository as servicos } from "@/server/servicos/prisma-repository";
import { prismaAgendaRepository as agenda } from "@/server/agendamentos/prisma-repository";
import { confirmarAgendamento, cancelarAgendamento, consultarDisponibilidade, obterAgendamento, remarcarAgendamento } from "@/server/agendamentos/service";
import { salvarExpediente } from "@/server/agendamentos/expediente";
import { dataLocal, somarDias } from "@/server/agendamentos/calendario";
import { gerarTokenSeguro, hashToken } from "@/server/security/tokens";
import type { ContaPublica } from "@/server/domain/perfis";

const prefixo = `multi-${randomUUID()}`;
const dados = (sufixo: string) => ({ nome: `${prefixo}-${sufixo}`, email: `${prefixo}-${sufixo}@example.test`, telefone: "11999999999", senha: "TesteForte123", confirmarSenha: "TesteForte123" });
const empresaIds: string[] = [];
let adminA: ContaPublica, adminB: ContaPublica, clienteA: ContaPublica, clienteB: ContaPublica, funcionarioA: ContaPublica, funcionarioB: ContaPublica;
let servicoA: string, servicoB: string, agendamentoB: string;
const data = somarDias(dataLocal(new Date()), 2);

describe("Isolamento multiempresa no PostgreSQL", () => {
  beforeAll(async () => {
    adminA = await cadastrarEmpresa({ ...dados("admin-a"), nomeEmpresa: `${prefixo}-empresa-a` }, empresas);
    empresaIds.push(adminA.empresaId);
    adminB = await cadastrarEmpresa({ ...dados("admin-b"), nomeEmpresa: `${prefixo}-empresa-b` }, empresas);
    empresaIds.push(adminB.empresaId);
    clienteA = await cadastrarClientePublico({ ...dados("cliente-a"), empresaSlug: adminA.empresa.slug }, contas, empresas);
    clienteB = await cadastrarClientePublico({ ...dados("cliente-b"), empresaSlug: adminB.empresa.slug }, contas, empresas);
    funcionarioA = await criarContaPorAdministrador(adminA, "FUNCIONARIO", dados("func-a"), contas);
    funcionarioB = await criarContaPorAdministrador(adminB, "FUNCIONARIO", dados("func-b"), contas);
    servicoA = (await criarServico(adminA, { nome: `${prefixo}-servico-a`, preco: "35", duracao: "30" }, servicos)).id;
    servicoB = (await criarServico(adminB, { nome: `${prefixo}-servico-b`, preco: "40", duracao: "45" }, servicos)).id;
    for (const funcionario of [funcionarioA, funcionarioB]) await salvarExpediente(funcionario, funcionario.id, Array.from({ length: 7 }, (_, diaSemana) => ({ diaSemana, inicioMinuto: 540, fimMinuto: 1080 })), agenda);
    agendamentoB = (await confirmarAgendamento(clienteB, { funcionarioId: funcionarioB.id, servicoIds: [servicoB], data, horario: "09:00" }, agenda)).id;
  });
  afterAll(async () => {
    try {
      await prisma.agendamento.deleteMany({ where: { empresaId: { in: empresaIds } } });
      await prisma.servico.deleteMany({ where: { empresaId: { in: empresaIds } } });
      await prisma.conta.deleteMany({ where: { empresaId: { in: empresaIds } } });
      await prisma.empresa.deleteMany({ where: { id: { in: empresaIds } } });
    } finally { await prisma.$disconnect(); }
  });

  it("cadastro cria empresas distintas com administradores próprios e autenticação funcional", async () => {
    expect(adminA.perfil).toBe("ADMINISTRADOR");
    expect(adminA.empresaId).not.toBe(adminB.empresaId);
    const login = await autenticarConta(dados("admin-a"), contas);
    expect(login.conta.empresaId).toBe(adminA.empresaId);
    await expect(obterContaPorSessao(login.sessao.id, login.sessao.token, contas)).resolves.toMatchObject({ empresaId: adminA.empresaId });
  });
  it("cadastro duplicado não deixa empresa órfã", async () => {
    const nomeEmpresa = `${prefixo}-tentativa-duplicada`;
    await expect(cadastrarEmpresa({ ...dados("admin-a"), nomeEmpresa }, empresas)).rejects.toMatchObject({ code: "CADASTRO_DUPLICADO" });
    expect(await prisma.empresa.count({ where: { nome: nomeEmpresa } })).toBe(0);
  });
  it("administrador acessa somente contas e serviços da própria empresa", async () => {
    expect((await listarContas(adminA, contas)).map((c) => c.id).sort()).toEqual([adminA.id, funcionarioA.id, clienteA.id].sort());
    expect((await listarServicos(adminA, servicos)).map((s) => s.id)).toEqual([servicoA]);
    expect((await servicos.findById(servicoA, adminA.empresaId))?.empresaId).toBe(adminA.empresaId);
    expect(await contas.findById(adminB.id, adminA.empresaId)).toBeNull();
    expect(await servicos.findById(servicoB, adminA.empresaId)).toBeNull();
  });
  it("edição, exclusão e desativação não atravessam empresas", async () => {
    await expect(editarConta(adminA, clienteB.id, dados("cliente-b"), contas)).rejects.toMatchObject({ code: "CONTA_NAO_ENCONTRADA" });
    await expect(alterarStatusConta(adminA, adminB.id, false, contas)).rejects.toMatchObject({ code: "CONTA_NAO_ENCONTRADA" });
    await expect(editarServico(adminA, servicoB, { nome: "Alterado", preco: "1", duracao: "1" }, servicos)).rejects.toMatchObject({ code: "SERVICO_NAO_ENCONTRADO" });
    await expect(excluirServico(adminA, servicoB, servicos)).rejects.toMatchObject({ code: "SERVICO_NAO_ENCONTRADO" });
    await expect(contas.updateConta(clienteB.id, { nome: "Tentativa direta" }, adminA.empresaId)).rejects.toMatchObject({ code: "P2025" });
    await expect(servicos.deleteServico(servicoB, adminA.empresaId)).rejects.toMatchObject({ code: "P2025" });
  });
  it("serviço novo ignora empresa adulterada e pertence ao administrador", async () => {
    const adulterado = { nome: `${prefixo}-servico-extra`, preco: "20", duracao: "20", empresaId: adminB.empresaId };
    const criado = await criarServico(adminA, adulterado, servicos);
    expect(criado.empresaId).toBe(adminA.empresaId);
    expect(await servicos.findById(criado.id, adminB.empresaId)).toBeNull();
  });
  it("agenda recusa cliente, funcionário e serviço de outra empresa", async () => {
    const base = { funcionarioId: funcionarioA.id, servicoIds: [servicoA], clienteId: clienteA.id, data, horario: "11:00" };
    await expect(confirmarAgendamento(adminA, { ...base, clienteId: clienteB.id }, agenda)).rejects.toMatchObject({ code: "CLIENTE_INVALIDO" });
    await expect(consultarDisponibilidade(adminA, { ...base, funcionarioId: funcionarioB.id }, agenda)).rejects.toMatchObject({ code: "FUNCIONARIO_INVALIDO" });
    await expect(confirmarAgendamento(adminA, { ...base, servicoIds: [servicoB] }, agenda)).rejects.toMatchObject({ code: "SERVICOS_INVALIDOS" });
    await expect(salvarExpediente(adminA, funcionarioB.id, [], agenda)).rejects.toMatchObject({ code: "FUNCIONARIO_INVALIDO" });
  });
  it("nem administrador consegue ler, remarcar ou cancelar agenda de outra empresa", async () => {
    expect(await agenda.listar(adminA)).toEqual([]);
    await expect(obterAgendamento(adminA, agendamentoB, agenda)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await expect(remarcarAgendamento(adminA, { id: agendamentoB, versao: 1, data, horario: "14:00" }, agenda)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await expect(cancelarAgendamento(adminA, { id: agendamentoB, versao: 1 }, agenda)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    expect((await agenda.agendamento(agendamentoB, adminB.empresaId))?.status).toBe("CONFIRMADO");
  });
  it("relações compostas bloqueiam participantes de outra empresa no banco", async () => {
    await expect(prisma.agendamento.create({ data: { empresaId: adminA.empresaId, clienteId: clienteA.id, funcionarioId: funcionarioB.id, inicio: new Date(), fim: new Date(Date.now() + 1800000) } })).rejects.toMatchObject({ code: "P2003" });
    await expect(prisma.expedienteFuncionario.create({ data: { empresaId: adminA.empresaId, funcionarioId: funcionarioB.id, diaSemana: 8, inicioMinuto: 540, fimMinuto: 1080 } })).rejects.toMatchObject({ code: "P2003" });
  });
  it("recuperação por token altera somente a conta vinculada e preserva sua empresa", async () => {
    let token = "";
    await solicitarRecuperacaoSenha(clienteA.email, contas, { async enviar(dadosEmail) { token = new URL(dadosEmail.resetUrl).searchParams.get("token")!; } });
    const hashAntes = (await contas.findById(clienteB.id, clienteB.empresaId))!.senhaHash;
    await redefinirSenha({ token, senha: "OutraForte123", confirmarSenha: "OutraForte123" }, contas);
    expect((await contas.findById(clienteB.id, clienteB.empresaId))!.senhaHash).toBe(hashAntes);
    const login = await autenticarConta({ email: clienteA.email, senha: "OutraForte123" }, contas);
    expect(login.conta.empresaId).toBe(adminA.empresaId);
  });

  it.skipIf(!process.env.AGENDA_TEST_BASE_URL)("URLs administrativas e seletores não expõem dados de outra empresa", async () => {
    const base = process.env.AGENDA_TEST_BASE_URL!;
    const token = gerarTokenSeguro();
    const sessao = await prisma.sessaoConta.create({ data: { contaId: adminA.id, tokenHash: hashToken(token), expiraEm: new Date(Date.now() + 60_000) } });
    const headers = { cookie: `${process.env.SESSION_COOKIE_NAME || "agendaqui_session"}=${sessao.id}.${token}` };
    for (const path of ["/admin", "/admin/contas", "/admin/clientes", "/admin/funcionarios", "/admin/administradores", "/admin/servicos", "/servicos", "/agendamentos", "/agendamentos/novo", `/funcionario/expediente?funcionarioId=${funcionarioB.id}`]) {
      const resposta = await fetch(`${base}${path}`, { headers });
      const html = await resposta.text();
      expect(resposta.status).toBe(200);
      expect(html).toContain(adminA.empresa.nome);
      expect(html).not.toContain(clienteB.nome);
      expect(html).not.toContain(funcionarioB.nome);
      expect(html).not.toContain(`${prefixo}-servico-b`);
    }
    for (const path of [`/admin/contas/${clienteB.id}/editar`, `/admin/servicos/${servicoB}/editar`]) {
      const resposta = await fetch(`${base}${path}`, { headers, redirect: "manual" });
      expect(resposta.status).toBe(307);
      expect(resposta.headers.get("location")).toContain("erro=");
    }
    for (const path of [`/agendamentos/${agendamentoB}`, `/agendamentos/${agendamentoB}/remarcar`]) expect((await fetch(`${base}${path}`, { headers })).status).toBe(404);
    const cadastro = await fetch(`${base}/cadastro?empresa=${adminB.empresa.slug}`);
    expect(await cadastro.text()).toContain(adminB.empresa.nome);
    expect((await fetch(`${base}/cadastro-empresa`)).status).toBe(200);
  });
});
