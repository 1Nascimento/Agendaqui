import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import type { ContaAutenticada } from "@/server/domain/perfis";
import { prismaOperacionalRepository as repo } from "./prisma-repository";
import { prismaAgendaRepository as agenda } from "@/server/agendamentos/prisma-repository";
import { finalizarAtendimento, registrarPagamento, estornarPagamento } from "./service";
import { resumoPagamento } from "./resumo";
import { gerarTokenSeguro, hashToken } from "@/server/security/tokens";
import { prismaContaRepository as contas } from "@/server/contas/prisma-repository";
import { redefinirSenha } from "@/server/contas/service";
import { verifyPassword } from "@/server/security/password";

const prefixo = `teste-operacao-${randomUUID()}`;
const empresaId = `${prefixo}-empresa`;
const externoId = `${prefixo}-externa`;
const criarAtor = (nome: string, perfil: ContaAutenticada["perfil"], empresa = empresaId): ContaAutenticada => ({ id: `${prefixo}-${nome}`, empresaId: perfil === "CLIENTE" ? null : empresa, nome, email: `${prefixo}-${nome}@example.test`, perfil, ativo: true });
const admin = criarAtor("admin", "ADMINISTRADOR"), funcionario = criarAtor("funcionario", "FUNCIONARIO"), cliente = criarAtor("cliente", "CLIENTE"), externo = criarAtor("externo", "ADMINISTRADOR", externoId);
const agora = new Date();
const inicio = new Date(agora.getTime() - 3_600_000), fim = new Date(agora.getTime() - 1_800_000);
const id = `${prefixo}-agenda`;

describe("Módulo 4 no PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.empresa.createMany({ data: [{ id: empresaId, nome: "Empresa operacional temporária", slug: empresaId }, { id: externoId, nome: "Outra empresa temporária", slug: externoId }] });
    await prisma.conta.createMany({ data: [admin, funcionario, cliente, externo].map((a) => ({ ...a, telefone: "11999999999", senhaHash: "conta-temporaria-sem-login" })) });
  });
  beforeEach(async () => {
    await prisma.agendamento.deleteMany({ where: { empresaId } });
    await prisma.agendamento.create({ data: { id, empresaId, clienteId: cliente.id, funcionarioId: funcionario.id, inicio, fim, servicos: { create: { nome: "Serviço contratado", duracao: 30, preco: "70.50" } }, eventos: { create: { tipo: "CONFIRMADO", atorId: cliente.id, inicio, fim, createdAt: inicio } } } });
  });
  afterAll(async () => {
    try {
      await prisma.agendamento.deleteMany({ where: { empresaId } });
      await prisma.conta.deleteMany({ where: { id: { in: [admin.id, funcionario.id, cliente.id, externo.id] } } });
      await prisma.empresa.deleteMany({ where: { id: { in: [empresaId, externoId] } } });
    } finally { await prisma.$disconnect(); }
  });
  const finalizar = () => finalizarAtendimento(funcionario, { id, versao: 1, resultado: "REALIZADO" }, repo, agora);
  const receber = (versao = 2, valor = "70.50") => registrarPagamento(admin, { id, versao, valor, forma: "PIX" }, repo, agora);
  const ler = async () => (await agenda.agendamento(id, empresaId))!;

  it("persiste baixa, recebimentos parciais e estorno sem perder os valores contratados", async () => {
    await finalizar(); await receber(2, "20"); await receber(3, "50.50");
    let a = await ler();
    expect(resumoPagamento(a)).toMatchObject({ recebido: 7050, saldo: 0 });
    await estornarPagamento(admin, { id, versao: a.versao, pagamentoId: a.pagamentos[0].id, motivo: "Correção do recebimento" }, repo, agora);
    a = await ler();
    expect(a.versao).toBe(5); expect(a.eventos.map((e) => e.tipo)).toEqual(["CONFIRMADO", "REALIZADO"]);
    expect(a.pagamentos).toHaveLength(2);
    expect(a.pagamentos[0]).toMatchObject({ motivoEstorno: "Correção do recebimento", estornadoPorId: admin.id, registradoPorId: admin.id });
    expect(resumoPagamento(a)).toMatchObject({ total: 7050, recebido: 5050, saldo: 2000 });
  });
  it("duas baixas simultâneas registram exatamente um resultado", async () => {
    const resultados = await Promise.allSettled([finalizar(), finalizarAtendimento(admin, { id, versao: 1, resultado: "NAO_COMPARECEU" }, repo, agora)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "AGENDAMENTO_ALTERADO" } });
    expect((await ler()).eventos).toHaveLength(2);
  });
  it("recebimentos concorrentes não duplicam pagamento nem excedem saldo", async () => {
    await finalizar();
    const resultados = await Promise.allSettled([receber(), receber()]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "AGENDAMENTO_ALTERADO" } });
    const a = await ler(); expect(a.pagamentos).toHaveLength(1); expect(resumoPagamento(a).saldo).toBe(0);
  });
  it("dois estornos simultâneos preservam um único estorno e reabrem o saldo", async () => {
    await finalizar(); await receber(); const a = await ler();
    const input = { id, versao: a.versao, pagamentoId: a.pagamentos[0].id, motivo: "Devolução" };
    const resultados = await Promise.allSettled([estornarPagamento(admin, input, repo, agora), estornarPagamento(admin, input, repo, agora)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resumoPagamento(await ler()).saldo).toBe(7050);
  });
  it("outra empresa não dá baixa, recebe, estorna nem lê lançamentos", async () => {
    await expect(finalizarAtendimento(externo, { id, versao: 1, resultado: "REALIZADO" }, repo)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await finalizar(); await receber(); const a = await ler();
    await expect(registrarPagamento(externo, { id, versao: a.versao, valor: "1", forma: "PIX" }, repo)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    await expect(estornarPagamento(externo, { id, versao: a.versao, pagamentoId: a.pagamentos[0].id, motivo: "Teste" }, repo)).rejects.toMatchObject({ code: "AGENDAMENTO_NAO_ENCONTRADO" });
    expect(await agenda.agendamento(id, externoId)).toBeNull();
  });
  it("rollback não deixa pagamento órfão ou versão incrementada ao falhar", async () => {
    await finalizar();
    await expect(repo.transacao(async (tx) => { await tx.receber(await ler(), { valor: "10", forma: "PIX", atorId: externo.id, agora }); })).rejects.toMatchObject({ code: "P2003" });
    const a = await ler(); expect(a.versao).toBe(2); expect(a.pagamentos).toHaveLength(0);
  });
  it("redefinições concorrentes consomem o token uma vez e revogam todos os tokens e sessões", async () => {
    const token = gerarTokenSeguro(), outroToken = gerarTokenSeguro();
    for (const t of [token, outroToken]) await prisma.tokenRecuperacaoSenha.create({ data: { contaId: cliente.id, tokenHash: hashToken(t), expiraEm: new Date(Date.now() + 60_000) } });
    const sessao = await prisma.sessaoConta.create({ data: { contaId: cliente.id, tokenHash: hashToken(gerarTokenSeguro()), expiraEm: new Date(Date.now() + 60_000) } });
    const resultados = await Promise.allSettled([
      redefinirSenha({ token, senha: "NovaSenha123", confirmarSenha: "NovaSenha123" }, contas, agora),
      redefinirSenha({ token, senha: "OutraSenha123", confirmarSenha: "OutraSenha123" }, contas, agora)
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "TOKEN_UTILIZADO" } });
    expect(await prisma.tokenRecuperacaoSenha.count({ where: { contaId: cliente.id, utilizadoEm: null } })).toBe(0);
    expect((await prisma.sessaoConta.findUniqueOrThrow({ where: { id: sessao.id } })).revogadaEm).not.toBeNull();
    const conta = await prisma.conta.findUniqueOrThrow({ where: { id: cliente.id } });
    const senha = resultados[0].status === "fulfilled" ? "NovaSenha123" : "OutraSenha123";
    expect(await verifyPassword(senha, conta.senhaHash)).toBe(true);
  });
  it.skipIf(!process.env.AGENDA_TEST_BASE_URL)("renderiza dashboard, filtros, baixa e pagamentos e bloqueia outros perfis", async () => {
    const base = process.env.AGENDA_TEST_BASE_URL!;
    const cookie = async (a: ContaAutenticada) => {
      const token = gerarTokenSeguro(); const sessao = await prisma.sessaoConta.create({ data: { contaId: a.id, tokenHash: hashToken(token), expiraEm: new Date(Date.now() + 120_000) } });
      return `${process.env.SESSION_COOKIE_NAME || "agendaqui_session"}=${sessao.id}.${token}`;
    };
    const cookieAdmin = await cookie(admin), cookieFuncionario = await cookie(funcionario), cookieCliente = await cookie(cliente);
    for (const [path, texto] of [["/admin", "Dashboard administrativo"], ["/admin/clientes?q=cliente", "Clientes cadastrados"], ["/agendamentos?aba=baixa", "Aguardando baixa"], [`/agendamentos/${id}`, "Registrar resultado"]]) {
      const resposta = await fetch(`${base}${path}`, { headers: { cookie: cookieAdmin }, redirect: "manual" });
      expect(resposta.status).toBe(200); expect(await resposta.text()).toContain(texto);
    }
    for (const usuario of [cookieFuncionario, cookieCliente]) {
      const resposta = await fetch(`${base}/admin/pagamentos`, { headers: { cookie: usuario }, redirect: "manual" }); expect(resposta.headers.get("location")).toBe("/acesso-negado");
    }
    await finalizar(); await receber(2, "20");
    const resposta = await fetch(`${base}/admin/pagamentos`, { headers: { cookie: cookieAdmin } });
    expect(resposta.status).toBe(200); const html = await resposta.text(); expect(html).toContain("Entrou no mês"); expect(html).toContain("A receber"); expect(html).toContain("Meses anteriores"); expect(html).toContain("20,00"); expect(html).toContain("50,50");
    const detalhes = await fetch(`${base}/agendamentos/${id}`, { headers: { cookie: cookieCliente } });
    const htmlCliente = await detalhes.text(); expect(htmlCliente).toContain("Pagamentos"); expect(htmlCliente).not.toContain("Novo recebimento");
    const outraEmpresa = await fetch(`${base}/agendamentos/${id}`, { headers: { cookie: await cookie(externo) }, redirect: "manual" }); expect(outraEmpresa.status).toBe(404);
    const dashboard = await fetch(`${base}/admin`, { headers: { cookie: cookieAdmin } });
    expect(dashboard.status).toBe(200); const painel = await dashboard.text();
    for (const titulo of ["Atendimentos hoje", "Para finalizar", "Entrou no mês", "A receber", "Próximos atendimentos", "Gerenciar"]) expect(painel).toContain(titulo);
    for (const path of ["/admin/clientes?q=cliente&q=outro", "/admin/pagamentos?q=cliente&q=outro", "/agendamentos?aba=todos&aba=historico&data=2026-10-05&data=2026-10-06", "/admin?inicio=2026-10-01&inicio=2026-09-01"]) {
      expect((await fetch(`${base}${path}`, { headers: { cookie: cookieAdmin } })).status).toBe(200);
    }
  }, 60000);
  it("cadastros simultâneos com o mesmo e-mail retornam erro de duplicidade legível", async () => {
    const dados = { empresaId: null, nome: "Duplicidade temporária", email: `${prefixo}-duplicado@example.test`, telefone: "11999999999", senhaHash: "conta-sem-login", perfil: "CLIENTE" as const };
    const resultados = await Promise.allSettled([contas.createConta(dados), contas.createConta(dados)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "EMAIL_DUPLICADO" } });
  });
  it.skipIf(!process.env.AGENDA_TEST_BASE_URL)("envia os formulários reais de baixa, recebimento e estorno por HTTP", async () => {
    const base = process.env.AGENDA_TEST_BASE_URL!;
    const token = gerarTokenSeguro();
    const sessao = await prisma.sessaoConta.create({ data: { contaId: admin.id, tokenHash: hashToken(token), expiraEm: new Date(Date.now() + 120_000) } });
    const cookie = `${process.env.SESSION_COOKIE_NAME || "agendaqui_session"}=${sessao.id}.${token}`;
    const path = `${base}/agendamentos/${id}`;
    // Os próprios campos de ação renderizados pelo React são enviados como um form nativo.
    const decodificar = (valor: string) => valor.replace(/&quot;/g, '"').replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    async function formulario(titulo: string) {
      const resposta = await fetch(path, { headers: { cookie } }); expect(resposta.status).toBe(200);
      const html = await resposta.text();
      const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].find((m) => m[1].includes(titulo));
      expect(form, `Formulário ${titulo} deve existir`).toBeDefined();
      const dados = new FormData();
      for (const match of form![1].matchAll(/<input\b[^>]*>/g)) {
        const name = /\bname="([^"]*)"/.exec(match[0]); const value = /\bvalue="([^"]*)"/.exec(match[0]);
        if (name && /\btype="hidden"/.test(match[0])) dados.append(decodificar(name[1]), decodificar(value?.[1] ?? ""));
      }
      return dados;
    }
    async function enviar(dados: FormData) {
      return fetch(path, { method: "POST", headers: { cookie, origin: new URL(base).origin }, body: dados, redirect: "manual" });
    }
    const baixa = await formulario("Registrar resultado"); baixa.set("resultado", "REALIZADO");
    let resposta = await enviar(baixa); expect(resposta.status).toBe(303); expect(resposta.headers.get("location")).toContain("sucesso=");
    expect((await ler()).status).toBe("REALIZADO");
    const pagamento = await formulario("Novo recebimento"); pagamento.set("valor", "20,50"); pagamento.set("forma", "PIX");
    resposta = await enviar(pagamento); expect(resposta.status).toBe(303);
    expect(resumoPagamento(await ler())).toMatchObject({ recebido: 2050, saldo: 5000 });
    // Reenvio do mesmo formulário não pode duplicar o recebimento.
    resposta = await enviar(pagamento); expect(resposta.status).toBe(200); expect(await resposta.text()).toContain("Este agendamento foi alterado");
    expect((await ler()).pagamentos).toHaveLength(1);
    const estorno = await formulario("Estornar recebimento"); estorno.set("motivo", "Correção de teste HTTP");
    resposta = await enviar(estorno); expect(resposta.status).toBe(303);
    expect(resumoPagamento(await ler())).toMatchObject({ recebido: 0, saldo: 7050 });
    const dashboard = await fetch(`${base}/admin`, { headers: { cookie } }); expect(await dashboard.text()).toContain("70,50");
  }, 60000);
});
