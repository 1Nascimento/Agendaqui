import Link from "next/link";
import { StatusContaForm } from "@/components/admin/StatusContaForm";
import { ContaPublica, perfilLabel } from "@/server/domain/perfis";

type ContasTableProps = {
  contas: ContaPublica[];
};

export function ContasTable({ contas }: ContasTableProps) {
  if (contas.length === 0) {
    return <div className="empty-state">Nenhuma conta encontrada para este filtro.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Telefone</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {contas.map((conta) => (
            <tr key={conta.id}>
              <td>{conta.nome}</td>
              <td>{conta.email}</td>
              <td>{conta.telefone}</td>
              <td>{perfilLabel(conta.perfil)}</td>
              <td>
                <span className={`badge ${conta.ativo ? "success" : "warning"}`}>
                  {conta.ativo ? "Ativa" : "Inativa"}
                </span>
              </td>
              <td>
                <div className="actions">
                  <Link className="button secondary small" href={`/admin/contas/${conta.id}/editar`}>
                    Editar
                  </Link>
                  <StatusContaForm contaId={conta.id} ativo={conta.ativo} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
