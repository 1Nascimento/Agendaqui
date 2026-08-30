import { Prisma } from "@prisma/client";

export type ServicoRecord = {
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
  nome: string;
  preco: string;
  duracao: number;
};

export interface ServicoRepository {
  findById(id: string): Promise<ServicoRecord | null>;
  findByNome(nome: string): Promise<ServicoRecord | null>;
  createServico(data: CriarServicoData): Promise<ServicoRecord>;
  updateServico(id: string, data: CriarServicoData): Promise<ServicoRecord>;
  deleteServico(id: string): Promise<void>;
  listServicos(): Promise<ServicoRecord[]>;
  listServicosDisponiveis(): Promise<ServicoRecord[]>;
}
