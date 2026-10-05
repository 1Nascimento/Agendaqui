import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Usa um banco exclusivo; nunca migra, limpa ou semeia o banco configurado no .env.
const banco = `agendaqui_teste_${randomBytes(8).toString("hex")}`;
const original = new URL(process.env.DATABASE_URL);
const temporaria = new URL(original);
temporaria.pathname = `/${banco}`;
const env = { ...process.env, DATABASE_URL: temporaria.toString(), APP_URL: "http://localhost:3107", ADMIN_SEED_EMAIL: "admin@instalacao.example", ADMIN_SEED_NOME: "Administrador Teste", ADMIN_SEED_TELEFONE: "65999999999", ADMIN_SEED_SENHA: "InstalacaoTeste123" };
const manutencao = new PrismaClient({ datasources: { db: { url: original.toString() } } });
const prisma = new PrismaClient({ datasources: { db: { url: temporaria.toString() } } });
let criado = false;
let servidor;
let logServidor = "";

function comando(arquivo, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [arquivo, ...args], { env, stdio: ["ignore", "pipe", "pipe"] });
    let saida = "";
    child.stdout.on("data", (data) => { saida += data; });
    child.stderr.on("data", (data) => { saida += data; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Comando falhou (${code}): ${saida}`)));
  });
}
const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decodificar = (valor) => valor.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function navegador() {
  let cookie = "";
  async function requisicao(caminho, init = {}) {
    const resposta = await fetch(`${env.APP_URL}${caminho}`, { ...init, redirect: "manual", headers: { Cookie: cookie, Origin: env.APP_URL, ...init.headers } });
    const recebidos = resposta.headers.getSetCookie();
    if (recebidos.length) cookie = recebidos.map((item) => item.split(";")[0]).join("; ");
    return resposta;
  }
  return { requisicao, async enviar(caminho, identificador, campos) {
    const pagina = await requisicao(caminho);
    assert.equal(pagina.status, 200, `Página ${caminho}`);
    const html = await pagina.text();
    const formulario = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map((item) => item[0]).find((item) => item.includes(identificador));
    assert.ok(formulario, `Formulário ${identificador} não encontrado em ${caminho}`);
    const form = new FormData();
    for (const input of formulario.matchAll(/<input\b[^>]*>/g)) {
      const atributos = Object.fromEntries([...input[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map((item) => [item[1], decodificar(item[2])]));
      if (atributos.type === "hidden" && atributos.name) form.append(atributos.name, atributos.value ?? "");
    }
    for (const [nome, valor] of Object.entries(campos)) {
      form.delete(nome);
      for (const item of Array.isArray(valor) ? valor : [valor]) form.append(nome, String(item));
    }
    const resposta = await requisicao(caminho, { method: "POST", body: form });
    const destino = resposta.headers.get("location") ?? "";
    assert.ok(!destino.includes("erro="), `Erro em ${caminho}: ${decodeURIComponent(destino)}`);
    assert.ok([200, 303].includes(resposta.status), `POST ${caminho}: ${resposta.status}`);
    if (resposta.status === 200) assert.ok(!(await resposta.text()).includes('class="message error"'), `Erro ao enviar ${caminho}`);
    return destino;
  } };
}

try {
  await manutencao.$executeRawUnsafe(`CREATE DATABASE "${banco}"`);
  criado = true;
  console.info("Banco temporário vazio criado. Aplicando todas as migrações...");
  await comando("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
  await comando("prisma/seed.mjs");
  const primeiro = await prisma.conta.findUniqueOrThrow({ where: { email: env.ADMIN_SEED_EMAIL } });
  await comando("prisma/seed.mjs");
  assert.equal((await prisma.conta.findUniqueOrThrow({ where: { email: env.ADMIN_SEED_EMAIL } })).senhaHash, primeiro.senhaHash, "Repetir o setup deve preservar a senha");
  servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3107"], { env, stdio: ["ignore", "pipe", "pipe"] });
  servidor.stdout.on("data", (data) => { logServidor += data; });
  servidor.stderr.on("data", (data) => { logServidor += data; });
  let pronto = false;
  for (let i = 0; i < 60; i++) {
    if (servidor.exitCode !== null) throw new Error(`Servidor encerrou: ${logServidor}`);
    try { pronto = (await fetch(`${env.APP_URL}/login`)).status === 200; } catch { /* Inicialização. */ }
    if (pronto) break;
    await pausa(500);
  }
  assert.ok(pronto, `Servidor não iniciou: ${logServidor}`);
  const senha = "InstalacaoTeste123";
  const cadastro = { nome: "Teste", telefone: "65999999999", senha, confirmarSenha: senha };
  const admin = navegador();
  await admin.enviar("/cadastro-empresa", "nomeEmpresa", { ...cadastro, nomeEmpresa: "Empresa de Teste", email: "empresa@instalacao.example" });
  const contaAdmin = await prisma.conta.findUniqueOrThrow({ where: { email: "empresa@instalacao.example" }, include: { empresa: true } });
  assert.equal(await admin.enviar("/login", 'name="senha"', { email: contaAdmin.email, senha }), "/admin");
  await admin.enviar("/admin/funcionarios/novo", 'name="confirmarSenha"', { ...cadastro, nome: "Funcionário Teste", email: "funcionario@instalacao.example" });
  await admin.enviar("/admin/servicos/novo", 'name="duracao"', { nome: "Corte Teste", preco: "35,00", duracao: 30 });
  const funcionario = await prisma.conta.findUniqueOrThrow({ where: { email: "funcionario@instalacao.example" } });
  const servico = await prisma.servico.findFirstOrThrow({ where: { empresaId: contaAdmin.empresaId } });
  const expediente = { funcionarioId: funcionario.id, dias: [0, 1, 2, 3, 4, 5, 6] };
  for (let dia = 0; dia < 7; dia++) { expediente[`inicio_${dia}`] = "09:00"; expediente[`fim_${dia}`] = "18:00"; }
  await admin.enviar(`/funcionario/expediente?funcionarioId=${funcionario.id}`, "Salvar expediente", expediente);
  assert.equal(await prisma.expedienteFuncionario.count({ where: { funcionarioId: funcionario.id } }), 7);
  const staff = navegador();
  assert.equal(await staff.enviar("/login", 'name="senha"', { email: funcionario.email, senha }), "/funcionario");
  await staff.enviar("/funcionario/expediente", "Salvar expediente", expediente);
  const cliente = navegador();
  await cliente.enviar("/cadastro", 'name="confirmarSenha"', { ...cadastro, nome: "Cliente Teste", email: "cliente@instalacao.example" });
  const contaCliente = await prisma.conta.findUniqueOrThrow({ where: { email: "cliente@instalacao.example" } });
  assert.equal(contaCliente.empresaId, null);
  assert.equal(await cliente.enviar("/login", 'name="senha"', { email: contaCliente.email, senha }), "/cliente");
  assert.ok(!(await (await admin.requisicao("/admin/clientes")).text()).includes("cliente@instalacao.example"));
  const busca = await cliente.requisicao("/empresas?q=empresa%20de%20teste");
  assert.equal(busca.status, 200);
  assert.ok((await busca.text()).includes("Empresa de Teste"));
  assert.ok((await (await cliente.requisicao("/empresas?q=nome-inexistente")).text()).includes("Nenhuma empresa encontrada"));
  const amanha = new Date(Date.now() + 86400000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const caminho = `/agendamentos/novo?empresa=${contaAdmin.empresaId}`;
  await cliente.enviar(caminho, 'name="funcionarioId"', { funcionarioId: funcionario.id, servicoIds: [servico.id], data: amanha, horario: "09:00" });
  const agendamento = await prisma.agendamento.findFirstOrThrow({ where: { clienteId: contaCliente.id } });
  assert.equal(agendamento.status, "CONFIRMADO");
  assert.equal(agendamento.funcionarioId, funcionario.id);
  assert.equal((await cliente.requisicao(`/agendamentos/${agendamento.id}`)).status, 200);
  assert.ok((await (await admin.requisicao("/admin/clientes")).text()).includes("cliente@instalacao.example"));
  assert.equal((await admin.requisicao(`/admin/contas/${contaCliente.id}/editar`)).status, 307);
  const outraEmpresa = navegador();
  await outraEmpresa.enviar("/cadastro-empresa", "nomeEmpresa", { ...cadastro, nomeEmpresa: "Segunda Empresa", email: "outra@instalacao.example" });
  const outroAdmin = await prisma.conta.findUniqueOrThrow({ where: { email: "outra@instalacao.example" } });
  await outraEmpresa.enviar("/login", 'name="senha"', { email: outroAdmin.email, senha });
  assert.ok(!(await (await outraEmpresa.requisicao("/admin/clientes")).text()).includes("cliente@instalacao.example"));
  assert.equal((await outraEmpresa.requisicao(`/agendamentos/${agendamento.id}`)).status, 404);
  await outraEmpresa.enviar("/admin/funcionarios/novo", 'name="confirmarSenha"', { ...cadastro, nome: "Segundo Funcionário", email: "outrofuncionario@instalacao.example" });
  await outraEmpresa.enviar("/admin/servicos/novo", 'name="duracao"', { nome: "Segundo Corte", preco: "40,00", duracao: 30 });
  const outroFuncionario = await prisma.conta.findUniqueOrThrow({ where: { email: "outrofuncionario@instalacao.example" } });
  const outroServico = await prisma.servico.findFirstOrThrow({ where: { empresaId: outroAdmin.empresaId } });
  await outraEmpresa.enviar(`/funcionario/expediente?funcionarioId=${outroFuncionario.id}`, "Salvar expediente", { ...expediente, funcionarioId: outroFuncionario.id });
  await cliente.enviar(`/agendamentos/novo?empresa=${outroAdmin.empresaId}`, 'name="funcionarioId"', { funcionarioId: outroFuncionario.id, servicoIds: [outroServico.id], data: amanha, horario: "10:00" });
  assert.equal(await prisma.agendamento.count({ where: { clienteId: contaCliente.id } }), 2);
  assert.ok((await (await outraEmpresa.requisicao("/admin/clientes")).text()).includes("cliente@instalacao.example"));
  const meusAgendamentos = await (await cliente.requisicao("/agendamentos")).text();
  assert.ok(meusAgendamentos.includes("Empresa de Teste") && meusAgendamentos.includes("Segunda Empresa"));
  await cliente.enviar(`/agendamentos/${agendamento.id}/remarcar`, 'name="versao"', { data: amanha, horario: "11:00" });
  assert.equal((await prisma.agendamento.findUniqueOrThrow({ where: { id: agendamento.id } })).versao, 2);
  assert.ok((await (await admin.requisicao("/admin/clientes")).text()).includes("cliente@instalacao.example"));
  console.info("OK: instalação vazia, cliente independente, busca, expediente, agendamentos em duas empresas, cadastro automático nas listas, isolamento e remarcação.");
} finally {
  if (servidor && servidor.exitCode === null) {
    const encerrado = new Promise((resolve) => servidor.once("exit", resolve));
    servidor.kill();
    await encerrado;
  }
  await prisma.$disconnect();
  if (criado) {
    await manutencao.$executeRawUnsafe(`DROP DATABASE "${banco}" WITH (FORCE)`);
    console.info("Banco temporário removido.");
  }
  await manutencao.$disconnect();
}
