BEGIN;

CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Empresa_slug_key" ON "Empresa"("slug");
INSERT INTO "Empresa" ("id", "nome", "slug", "updatedAt")
VALUES ('empresa_padrao', 'Barbearia Principal', 'barbearia-principal', CURRENT_TIMESTAMP);

-- Primeiro adiciona colunas opcionais e associa todos os registros anteriores.
ALTER TABLE "Conta" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Servico" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Agendamento" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ExpedienteFuncionario" ADD COLUMN "empresaId" TEXT;
UPDATE "Conta" SET "empresaId" = 'empresa_padrao';
UPDATE "Servico" SET "empresaId" = 'empresa_padrao';
UPDATE "Agendamento" SET "empresaId" = 'empresa_padrao';
UPDATE "ExpedienteFuncionario" SET "empresaId" = 'empresa_padrao';

-- Somente após preencher os dados existentes, torna a empresa obrigatória.
ALTER TABLE "Conta" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Servico" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Agendamento" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ExpedienteFuncionario" ALTER COLUMN "empresaId" SET NOT NULL;
CREATE UNIQUE INDEX "Conta_id_empresaId_key" ON "Conta"("id", "empresaId");
CREATE INDEX "Conta_empresaId_perfil_ativo_idx" ON "Conta"("empresaId", "perfil", "ativo");
CREATE INDEX "Servico_empresaId_ativo_idx" ON "Servico"("empresaId", "ativo");
CREATE INDEX "Agendamento_empresaId_status_inicio_idx" ON "Agendamento"("empresaId", "status", "inicio");
CREATE INDEX "ExpedienteFuncionario_empresaId_funcionarioId_idx" ON "ExpedienteFuncionario"("empresaId", "funcionarioId");
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpedienteFuncionario" ADD CONSTRAINT "ExpedienteFuncionario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Substitui apenas as constraints; nenhuma tabela ou dado é removido.
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_clienteId_fkey";
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_funcionarioId_fkey";
ALTER TABLE "ExpedienteFuncionario" DROP CONSTRAINT "ExpedienteFuncionario_funcionarioId_fkey";
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Conta"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_funcionarioId_empresaId_fkey" FOREIGN KEY ("funcionarioId", "empresaId") REFERENCES "Conta"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExpedienteFuncionario" ADD CONSTRAINT "ExpedienteFuncionario_funcionarioId_empresaId_fkey" FOREIGN KEY ("funcionarioId", "empresaId") REFERENCES "Conta"("id", "empresaId") ON DELETE CASCADE ON UPDATE RESTRICT;
COMMIT;
