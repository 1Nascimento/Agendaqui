import type { ContaRecord, CriarContaData } from "@/server/contas/repository";
import type { EmpresaResumo } from "./contexto";

export interface EmpresaRepository {
  findBySlug(slug: string): Promise<EmpresaResumo | null>;
  createComAdministrador(empresa: { nome: string; slug: string }, administrador: Omit<CriarContaData, "empresaId" | "perfil">): Promise<ContaRecord>;
}
