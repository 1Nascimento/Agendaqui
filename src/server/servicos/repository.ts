import { Prisma } from "@prisma/client";

export type ServicoRecord = {
  empresaId: string;
  id: string;
  nome: string;
  descricao: string | null;
  preco: Prisma.Decimal;
  duracao: number;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CriarServicoData = {
  empresaId: string;
  nome: string;
  preco: string;
  duracao: number;
};

export interface ServicoRepository {
  findById(id: string, empresaId: string): Promise<ServicoRecord | null>;
  findByNome(nome: string, empresaId: string): Promise<ServicoRecord | null>;
  createServico(data: CriarServicoData): Promise<ServicoRecord>;
  updateServico(id: string, data: Omit<CriarServicoData, "empresaId">, empresaId: string): Promise<ServicoRecord>;
  deleteServico(id: string, empresaId: string): Promise<void>;
  listServicos(empresaId: string): Promise<ServicoRecord[]>;
  listServicosDisponiveis(empresaId: string): Promise<ServicoRecord[]>;
}
