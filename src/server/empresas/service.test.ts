import { describe, expect, it, vi } from "vitest";
import { cadastrarEmpresa } from "./service";
import type { EmpresaRepository } from "./repository";
import { verifyPassword } from "@/server/security/password";

const input = { nomeEmpresa: "  Barbearia Nova  ", nome: "Administrador", telefone: "11999999999", email: "admin@example.test", senha: "SenhaForte1", confirmarSenha: "SenhaForte1" };

describe("Cadastro de empresa", () => {
  it("cria empresa e administrador sem aceitar perfil ou empresaId enviados", async () => {
    const createComAdministrador = vi.fn<EmpresaRepository["createComAdministrador"]>(async (empresa, administrador) => ({ ...administrador, id: "admin", perfil: "ADMINISTRADOR", empresaId: "nova", empresa: { id: "nova", ...empresa }, ativo: true, emailVerificado: false, createdAt: new Date(), updatedAt: new Date() }));
    const repo: EmpresaRepository = { createComAdministrador, findBySlug: vi.fn() };
    const adulterado = { ...input, perfil: "CLIENTE", empresaId: "empresa-existente" };
    const conta = await cadastrarEmpresa(adulterado, repo);
    expect(conta).toMatchObject({ perfil: "ADMINISTRADOR", empresaId: "nova", empresa: { nome: "Barbearia Nova" } });
    expect(conta).not.toHaveProperty("senhaHash");
    const [empresa, dados] = createComAdministrador.mock.calls[0];
    expect(empresa.slug).toMatch(/^barbearia-nova-/);
    expect(dados).not.toHaveProperty("empresaId");
    expect(dados).not.toHaveProperty("perfil");
    expect(await verifyPassword(input.senha, dados.senhaHash)).toBe(true);
  });
  it("valida nome da empresa e dados do administrador antes de gravar", async () => {
    const repo: EmpresaRepository = { createComAdministrador: vi.fn(), findBySlug: vi.fn() };
    await expect(cadastrarEmpresa({ ...input, nomeEmpresa: " " }, repo)).rejects.toMatchObject({ code: "NOME_EMPRESA_INVALIDO" });
    await expect(cadastrarEmpresa({ ...input, confirmarSenha: "diferente" }, repo)).rejects.toMatchObject({ code: "SENHAS_DIFERENTES" });
    expect(repo.createComAdministrador).not.toHaveBeenCalled();
  });
});
