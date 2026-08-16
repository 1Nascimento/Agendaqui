export const PERFIS_CONTA = ["CLIENTE", "FUNCIONARIO", "ADMINISTRADOR"] as const;

export type PerfilConta = (typeof PERFIS_CONTA)[number];

export type ContaPublica = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  perfil: PerfilConta;
  ativo: boolean;
  emailVerificado: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ContaAutenticada = Pick<ContaPublica, "id" | "nome" | "email" | "perfil" | "ativo">;

export function perfilLabel(perfil: PerfilConta) {
  const labels: Record<PerfilConta, string> = {
    CLIENTE: "Cliente",
    FUNCIONARIO: "Funcionário",
    ADMINISTRADOR: "Administrador"
  };

  return labels[perfil];
}

export function rotaInicialPorPerfil(perfil: PerfilConta) {
  const rotas: Record<PerfilConta, string> = {
    CLIENTE: "/cliente",
    FUNCIONARIO: "/funcionario",
    ADMINISTRADOR: "/admin"
  };

  return rotas[perfil];
}
