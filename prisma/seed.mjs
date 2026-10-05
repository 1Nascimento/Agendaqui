import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizarTelefone(telefone) {
  return String(telefone || "").replace(/\D/g, "");
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, 64);
  return `scrypt$16384$8$1$${salt}$${Buffer.from(key).toString("base64url")}`;
}

async function main() {
  const nome = String(process.env.ADMIN_SEED_NOME || "").trim();
  const email = normalizarEmail(process.env.ADMIN_SEED_EMAIL);
  const telefone = normalizarTelefone(process.env.ADMIN_SEED_TELEFONE);
  const senha = String(process.env.ADMIN_SEED_SENHA || "");

  if (!nome || !email || !telefone || !senha) {
    console.warn("Seed do primeiro administrador ignorado: configure ADMIN_SEED_NOME, ADMIN_SEED_EMAIL, ADMIN_SEED_TELEFONE e ADMIN_SEED_SENHA no .env.");
    return;
  }

  if (senha.length < 8) {
    throw new Error("ADMIN_SEED_SENHA deve ter pelo menos 8 caracteres.");
  }

  const contaExistente = await prisma.conta.findUnique({ where: { email } });

  const empresa = await prisma.empresa.upsert({
    where: { slug: "barbearia-principal" },
    create: { id: "empresa_padrao", nome: "Empresa Principal", slug: "barbearia-principal" },
    update: {}
  });

  // Atualiza apenas o nome inicial legado, preservando nomes personalizados e links.
  await prisma.empresa.updateMany({
    where: { id: "empresa_padrao", slug: "barbearia-principal", nome: "Barbearia Principal" },
    data: { nome: "Empresa Principal" }
  });

  if (contaExistente) {
    if (contaExistente.empresaId !== empresa.id) throw new Error("O e-mail do seed pertence a outra empresa. Nenhuma conta foi alterada.");
    if (contaExistente.perfil !== "ADMINISTRADOR") throw new Error("O e-mail do seed pertence a uma conta que não é administradora. Nenhuma conta foi alterada.");
    await prisma.conta.update({
      where: { id: contaExistente.id, empresaId: empresa.id },
      data: {
        nome,
        telefone,
        emailVerificado: true
      }
    });
    console.info(`Administrador seed atualizado sem trocar a senha: ${email}`);
    return;
  }

  await prisma.conta.create({
    data: {
      empresaId: empresa.id,
      nome,
      email,
      telefone,
      senhaHash: await hashPassword(senha),
      perfil: "ADMINISTRADOR",
      ativo: true,
      emailVerificado: true
    }
  });

  console.info(`Primeiro administrador criado: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
