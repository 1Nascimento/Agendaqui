ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_clienteId_empresaId_fkey";
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Conta" ALTER COLUMN "empresaId" DROP NOT NULL;
UPDATE "Conta" SET "empresaId" = NULL WHERE "perfil" = 'CLIENTE';
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_empresa_por_perfil_check" CHECK (("perfil" = 'CLIENTE' AND "empresaId" IS NULL) OR ("perfil" <> 'CLIENTE' AND "empresaId" IS NOT NULL));
