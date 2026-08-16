CREATE TYPE "PerfilConta" AS ENUM ('CLIENTE', 'FUNCIONARIO', 'ADMINISTRADOR');

CREATE TABLE "Conta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "PerfilConta" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SessaoConta" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoConta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TokenRecuperacaoSenha" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "utilizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecuperacaoSenha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conta_email_key" ON "Conta"("email");
CREATE INDEX "Conta_perfil_idx" ON "Conta"("perfil");
CREATE INDEX "Conta_ativo_idx" ON "Conta"("ativo");

CREATE UNIQUE INDEX "SessaoConta_tokenHash_key" ON "SessaoConta"("tokenHash");
CREATE INDEX "SessaoConta_contaId_idx" ON "SessaoConta"("contaId");
CREATE INDEX "SessaoConta_expiraEm_idx" ON "SessaoConta"("expiraEm");

CREATE UNIQUE INDEX "TokenRecuperacaoSenha_tokenHash_key" ON "TokenRecuperacaoSenha"("tokenHash");
CREATE INDEX "TokenRecuperacaoSenha_contaId_idx" ON "TokenRecuperacaoSenha"("contaId");
CREATE INDEX "TokenRecuperacaoSenha_expiraEm_idx" ON "TokenRecuperacaoSenha"("expiraEm");

ALTER TABLE "SessaoConta" ADD CONSTRAINT "SessaoConta_contaId_fkey"
FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TokenRecuperacaoSenha" ADD CONSTRAINT "TokenRecuperacaoSenha_contaId_fkey"
FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
