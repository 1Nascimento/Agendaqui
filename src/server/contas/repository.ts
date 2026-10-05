import { ContaPublica, PerfilConta } from "@/server/domain/perfis";

export type ContaRecord = ContaPublica & {
  senhaHash: string;
};

export type SessaoRecord = {
  id: string;
  contaId: string;
  tokenHash: string;
  expiraEm: Date;
  revogadaEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessaoComContaRecord = SessaoRecord & {
  conta: ContaRecord;
};

export type TokenRecuperacaoSenhaRecord = {
  id: string;
  contaId: string;
  tokenHash: string;
  expiraEm: Date;
  utilizadoEm: Date | null;
  createdAt: Date;
};

export type TokenRecuperacaoComContaRecord = TokenRecuperacaoSenhaRecord & {
  conta: ContaRecord;
};

export type CriarContaData = {
  empresaId: string | null;
  nome: string;
  telefone: string;
  email: string;
  senhaHash: string;
  perfil: PerfilConta;
  ativo?: boolean;
  emailVerificado?: boolean;
};

export interface ContaRepository {
  findByEmail(email: string): Promise<ContaRecord | null>;
  findById(id: string, empresaId: string | null): Promise<ContaRecord | null>;
  createConta(data: CriarContaData): Promise<ContaRecord>;
  updateConta(id: string, data: Partial<Pick<ContaRecord, "nome" | "telefone" | "email" | "ativo" | "senhaHash">>, empresaId: string | null): Promise<ContaRecord>;
  listContas(filtro: { empresaId: string; perfil?: PerfilConta }): Promise<ContaRecord[]>;
  countActiveByPerfil(perfil: PerfilConta, empresaId: string): Promise<number>;
  createSessao(data: { contaId: string; tokenHash: string; expiraEm: Date }): Promise<SessaoRecord>;
  findSessaoById(id: string): Promise<SessaoComContaRecord | null>;
  revokeSessao(id: string, revogadaEm: Date): Promise<void>;
  revokeSessoesByContaId(contaId: string, revogadaEm: Date, empresaId: string): Promise<void>;
  createTokenRecuperacaoSenha(data: { contaId: string; tokenHash: string; expiraEm: Date }): Promise<TokenRecuperacaoSenhaRecord>;
  findTokenRecuperacaoSenha(tokenHash: string): Promise<TokenRecuperacaoComContaRecord | null>;
  redefinirSenhaAtomica(tokenId: string, senhaHash: string, agora: Date): Promise<boolean>;
}
