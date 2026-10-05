import { AgendaquiError } from "@/server/domain/errors";
import type { ContaAutenticada } from "@/server/domain/perfis";

// Identificador legado preservado para manter os links de cadastro existentes.
export const EMPRESA_PADRAO_SLUG = "barbearia-principal";
export type EmpresaResumo = { id: string; nome: string; slug: string };

export function exigirEmpresaDoAtor(ator: ContaAutenticada): asserts ator is ContaAutenticada & { empresaId: string } {
  if (!ator.ativo || typeof ator.empresaId !== "string" || !ator.empresaId.trim()) {
    throw new AgendaquiError("ACESSO_NEGADO", "Conta sem acesso a uma empresa.", 403);
  }
}

export function empresaDoAtor(ator: ContaAutenticada) {
  exigirEmpresaDoAtor(ator);
  return ator.empresaId;
}
