import { setTimeout } from "node:timers/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { AgendaquiError } from "@/server/domain/errors";

export async function transacaoSerializavel<T>(executar: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try { return await prisma.$transaction(executar, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034" && tentativa < 4) {
          // Pequeno atraso evita que transações em disputa repitam a colisão.
          await setTimeout(20 * 2 ** tentativa + Math.floor(Math.random() * 20));
          continue;
        }
        if (error.code === "P2034" || error.code === "P2025") throw new AgendaquiError("AGENDAMENTO_ALTERADO", "Este agendamento foi alterado. Atualize a página e tente novamente.", 409);
      }
      throw error;
    }
  }
  throw new Error("Não foi possível concluir a operação.");
}
