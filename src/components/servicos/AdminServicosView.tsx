import Link from "next/link";
import { Mensagem } from "@/components/Mensagem";
import { ServicosTable } from "@/components/servicos/ServicosTable";
import { ServicoPublico } from "@/server/servicos/service";

type AdminServicosViewProps = {
  servicos: ServicoPublico[];
  erro?: string | string[];
  sucesso?: string | string[];
};

export function AdminServicosView({ servicos, erro, sucesso }: AdminServicosViewProps) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>Servicos</h2>
      </div>
      <Mensagem erro={erro} sucesso={sucesso} />
      <div className="actions toolbar-gap">
        <Link className="button" href="/admin/servicos/novo">Novo servico</Link>
        <Link className="button secondary" href="/servicos">Consultar servicos</Link>
      </div>
      <ServicosTable servicos={servicos} administravel />
    </section>
  );
}
