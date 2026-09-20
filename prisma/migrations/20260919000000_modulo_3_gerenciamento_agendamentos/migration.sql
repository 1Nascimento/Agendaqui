-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('CONFIRMADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEventoAgendamento" AS ENUM ('CONFIRMADO', 'REMARCADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "ExpedienteFuncionario" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "inicioMinuto" INTEGER NOT NULL,
    "fimMinuto" INTEGER NOT NULL,

    CONSTRAINT "ExpedienteFuncionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'CONFIRMADO',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendamentoServico" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "servicoId" TEXT,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "duracao" INTEGER NOT NULL,

    CONSTRAINT "AgendamentoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoAgendamento" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "atorId" TEXT NOT NULL,
    "tipo" "TipoEventoAgendamento" NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "inicioAnterior" TIMESTAMP(3),
    "fimAnterior" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoAgendamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpedienteFuncionario_funcionarioId_diaSemana_key" ON "ExpedienteFuncionario"("funcionarioId", "diaSemana");

-- CreateIndex
CREATE INDEX "Agendamento_funcionarioId_status_inicio_fim_idx" ON "Agendamento"("funcionarioId", "status", "inicio", "fim");

-- CreateIndex
CREATE INDEX "Agendamento_clienteId_status_inicio_fim_idx" ON "Agendamento"("clienteId", "status", "inicio", "fim");

-- CreateIndex
CREATE INDEX "AgendamentoServico_agendamentoId_idx" ON "AgendamentoServico"("agendamentoId");

-- CreateIndex
CREATE INDEX "AgendamentoServico_servicoId_idx" ON "AgendamentoServico"("servicoId");

-- CreateIndex
CREATE INDEX "EventoAgendamento_agendamentoId_createdAt_idx" ON "EventoAgendamento"("agendamentoId", "createdAt");

-- CreateIndex
CREATE INDEX "EventoAgendamento_atorId_idx" ON "EventoAgendamento"("atorId");

-- AddForeignKey
ALTER TABLE "ExpedienteFuncionario" ADD CONSTRAINT "ExpedienteFuncionario_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoAgendamento" ADD CONSTRAINT "EventoAgendamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoAgendamento" ADD CONSTRAINT "EventoAgendamento_atorId_fkey" FOREIGN KEY ("atorId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
