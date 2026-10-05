-- Não transforma agendamentos antigos em atendimentos realizados automaticamente.
ALTER TYPE "StatusAgendamento" ADD VALUE 'REALIZADO';
ALTER TYPE "StatusAgendamento" ADD VALUE 'NAO_COMPARECEU';
ALTER TYPE "TipoEventoAgendamento" ADD VALUE 'REALIZADO';
ALTER TYPE "TipoEventoAgendamento" ADD VALUE 'NAO_COMPARECEU';

CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO');
CREATE UNIQUE INDEX "Agendamento_id_empresaId_key" ON "Agendamento"("id", "empresaId");

CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estornadoEm" TIMESTAMP(3),
    "estornadoPorId" TEXT,
    "motivoEstorno" TEXT,
    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Pagamento_valor_positivo" CHECK ("valor" > 0),
    CONSTRAINT "Pagamento_estorno_completo" CHECK (
      ("estornadoEm" IS NULL AND "estornadoPorId" IS NULL AND "motivoEstorno" IS NULL) OR
      ("estornadoEm" IS NOT NULL AND "estornadoPorId" IS NOT NULL AND "motivoEstorno" IS NOT NULL AND length(trim("motivoEstorno")) BETWEEN 3 AND 500)
    )
);

CREATE INDEX "Pagamento_empresaId_createdAt_idx" ON "Pagamento"("empresaId", "createdAt");
CREATE INDEX "Pagamento_agendamentoId_idx" ON "Pagamento"("agendamentoId");
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_agendamentoId_empresaId_fkey" FOREIGN KEY ("agendamentoId", "empresaId") REFERENCES "Agendamento"("id", "empresaId") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_registradoPorId_empresaId_fkey" FOREIGN KEY ("registradoPorId", "empresaId") REFERENCES "Conta"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_estornadoPorId_empresaId_fkey" FOREIGN KEY ("estornadoPorId", "empresaId") REFERENCES "Conta"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;
