import Link from "next/link";
import { ExcluirServicoForm } from "@/components/servicos/ExcluirServicoForm";
import { ServicoPublico } from "@/server/servicos/service";

type ServicosTableProps = {
  servicos: ServicoPublico[];
  administravel?: boolean;
};

function formatarPreco(preco: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(preco));
}

export function ServicosTable({ servicos, administravel = false }: ServicosTableProps) {
  if (servicos.length === 0) {
    return <div className="empty-state">Nenhum servico disponivel no momento.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Servico</th>
            <th>Preco</th>
            <th>Duracao</th>
            {administravel ? <th>Acoes</th> : null}
          </tr>
        </thead>
        <tbody>
          {servicos.map((servico) => (
            <tr key={servico.id}>
              <td>{servico.nome}</td>
              <td>{formatarPreco(servico.preco)}</td>
              <td>{servico.duracao} min</td>
              {administravel ? (
                <td>
                  <div className="actions">
                    <Link className="button secondary small" href={`/admin/servicos/${servico.id}/editar`}>Editar</Link>
                    <ExcluirServicoForm servicoId={servico.id} nomeServico={servico.nome} />
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
