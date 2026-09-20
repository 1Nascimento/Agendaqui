import { randomUUID } from "node:crypto";
import { validarCadastroConta, normalizarNome, type CadastroContaInput } from "@/server/contas/validation";
import { removerSenha } from "@/server/contas/service";
import { hashPassword } from "@/server/security/password";
import { AgendaquiError } from "@/server/domain/errors";
import type { EmpresaRepository } from "./repository";

export async function cadastrarEmpresa(input: CadastroContaInput & { nomeEmpresa?: unknown }, repo: EmpresaRepository) {
  const nomeEmpresa = normalizarNome(input.nomeEmpresa);
  if (!nomeEmpresa || nomeEmpresa.length > 100) throw new AgendaquiError("NOME_EMPRESA_INVALIDO", "Informe um nome de empresa com até 100 caracteres.");
  const { senha, ...dados } = validarCadastroConta(input);
  const base = nomeEmpresa.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "empresa";
  const conta = await repo.createComAdministrador({ nome: nomeEmpresa, slug: `${base}-${randomUUID()}` }, { ...dados, senhaHash: await hashPassword(senha), ativo: true, emailVerificado: false });
  return removerSenha(conta);
}
