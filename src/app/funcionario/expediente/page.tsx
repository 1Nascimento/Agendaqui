import { AppShell } from "@/components/AppShell";
import { ExpedienteForm } from "@/components/agendamentos/ExpedienteForm";
import { exigirPerfil } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export default async function ExpedientePage({ searchParams }: { searchParams: Promise<{ funcionarioId?: string }> }) {
  const conta = await exigirPerfil(["FUNCIONARIO", "ADMINISTRADOR"]);
  const { funcionarioId: selecionado } = await searchParams;
  const funcionarios = await prisma.conta.findMany({ where: { empresaId: conta.empresaId, ativo: true, perfil: "FUNCIONARIO", ...(conta.perfil === "FUNCIONARIO" ? { id: conta.id } : {}) }, select: { id: true, nome: true }, orderBy: { nome: "asc" } });
  const funcionario = funcionarios.find((f) => f.id === selecionado) ?? funcionarios[0];
  const expedientes = funcionario ? await prisma.expedienteFuncionario.findMany({ where: { empresaId: conta.empresaId, funcionarioId: funcionario.id } }) : [];
  return <AppShell conta={conta} active="agendamentos"><section className="panel">
    <div className="section-title"><h2>{conta.perfil === "FUNCIONARIO" ? "Meu expediente" : "Expedientes dos funcionários"}</h2></div>
    {conta.perfil === "ADMINISTRADOR" && funcionarios.length > 0 && <form className="actions block-gap"><div className="field"><label htmlFor="funcionarioId">Funcionário</label><select id="funcionarioId" name="funcionarioId" defaultValue={funcionario?.id}>{funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div><button className="button secondary" type="submit">Consultar expediente</button></form>}
    {funcionario ? <ExpedienteForm key={funcionario.id} funcionarioId={funcionario.id} expedientes={expedientes.map(({ diaSemana, inicioMinuto, fimMinuto }) => ({ diaSemana, inicioMinuto, fimMinuto }))} /> : <p className="empty-state block-gap">Cadastre um funcionário ativo para definir um expediente.</p>}
  </section></AppShell>;
}
