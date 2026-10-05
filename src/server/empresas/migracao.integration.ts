import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";

it("migra registros legados completos para a empresa padrão sem perder relações ou valores", async () => {
  const db = new PrismaClient();
  const schema = `teste_migracao_${randomUUID().replaceAll("-", "")}`;
  const rollback = new Error("Encerrar teste e desfazer somente o schema temporário");
  let validado = false;
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      async function aplicar(nome: string) {
        const sql = await readFile(`prisma/migrations/${nome}/migration.sql`, "utf8");
        for (const statement of sql.replace(/--[^\n]*/g, "").split(";").map((s) => s.trim()).filter((s) => s && !/^(BEGIN|COMMIT)$/i.test(s))) await tx.$executeRawUnsafe(statement);
      }
      await aplicar("20260815000000_modulo_1_gerenciamento_usuarios");
      await aplicar("20260830033554_modulo_2_gerenciamento_servicos");
      await aplicar("20260919000000_modulo_3_gerenciamento_agendamentos");
      await tx.$executeRawUnsafe(`INSERT INTO "Conta" ("id", "nome", "email", "telefone", "senhaHash", "perfil", "updatedAt") VALUES ('cliente', 'Cliente legado', 'cliente@teste.local', '11999999999', 'hash-legado', 'CLIENTE', NOW()), ('funcionario', 'Funcionário legado', 'func@teste.local', '11999999999', 'hash-legado', 'FUNCIONARIO', NOW()), ('admin', 'Admin legado', 'admin@teste.local', '11999999999', 'hash-legado', 'ADMINISTRADOR', NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Servico" ("id", "nome", "preco", "duracao", "updatedAt") VALUES ('servico', 'Corte legado', 35.50, 30, NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "ExpedienteFuncionario" ("id", "funcionarioId", "diaSemana", "inicioMinuto", "fimMinuto") VALUES ('expediente', 'funcionario', 1, 540, 1080)`);
      await tx.$executeRawUnsafe(`INSERT INTO "Agendamento" ("id", "clienteId", "funcionarioId", "inicio", "fim", "updatedAt") VALUES ('agendamento', 'cliente', 'funcionario', '2026-10-05 12:00', '2026-10-05 12:30', NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "AgendamentoServico" ("id", "agendamentoId", "servicoId", "nome", "preco", "duracao") VALUES ('item', 'agendamento', 'servico', 'Corte legado', 35.50, 30)`);
      await tx.$executeRawUnsafe(`INSERT INTO "EventoAgendamento" ("id", "agendamentoId", "atorId", "tipo", "inicio", "fim") VALUES ('evento', 'agendamento', 'cliente', 'CONFIRMADO', '2026-10-05 12:00', '2026-10-05 12:30')`);
      await tx.$executeRawUnsafe(`INSERT INTO "SessaoConta" ("id", "contaId", "tokenHash", "expiraEm", "updatedAt") VALUES ('sessao', 'cliente', 'token-sessao', NOW() + interval '7 days', NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "TokenRecuperacaoSenha" ("id", "contaId", "tokenHash", "expiraEm") VALUES ('token', 'cliente', 'token-recuperacao', NOW() + interval '1 hour')`);
      const tabelas = ["Conta", "Servico", "ExpedienteFuncionario", "Agendamento", "AgendamentoServico", "EventoAgendamento", "SessaoConta", "TokenRecuperacaoSenha"];
      async function retrato() {
        return Promise.all(tabelas.map((tabela) => tx.$queryRawUnsafe(`SELECT to_jsonb(t) - 'empresaId' AS dados FROM "${tabela}" t ORDER BY id`)));
      }
      const antes = await retrato();
      await aplicar("20260920000000_multiempresa");
      expect(await retrato()).toEqual(antes);
      for (const tabela of tabelas.slice(0, 4)) {
        const rows = await tx.$queryRawUnsafe<{ empresaId: string }[]>(`SELECT "empresaId" FROM "${tabela}"`);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((r) => r.empresaId === "empresa_padrao")).toBe(true);
      }
      expect(await tx.$queryRawUnsafe(`SELECT "nome", "slug" FROM "Empresa"`)).toEqual([{ nome: "Barbearia Principal", slug: "barbearia-principal" }]);
      await aplicar("20261005000000_modulo_4_gerenciamento_operacional");
      expect(await retrato()).toEqual(antes);
      expect(await tx.$queryRawUnsafe(`SELECT "status"::text AS status FROM "Agendamento"`)).toEqual([{ status: "CONFIRMADO" }]);
      expect(await tx.$queryRawUnsafe(`SELECT count(*)::int AS total FROM "Pagamento"`)).toEqual([{ total: 0 }]);
      await aplicar("20261006000000_clientes_independentes");
      expect(await retrato()).toEqual(antes);
      expect(await tx.$queryRawUnsafe(`SELECT "empresaId" FROM "Conta" WHERE "id" = 'cliente'`)).toEqual([{ empresaId: null }]);
      expect(await tx.$queryRawUnsafe(`SELECT "empresaId" FROM "Agendamento"`)).toEqual([{ empresaId: "empresa_padrao" }]);
      validado = true;
      throw rollback;
    }, { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
  expect(validado).toBe(true);
});
