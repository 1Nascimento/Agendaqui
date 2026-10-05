"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { confirmarAgendamentoAction, disponibilidadeAction, remarcarAgendamentoAction } from "@/app/actions/agendamentos";
import { AGENDA, formatarDataHora, type DiaDisponivel } from "@/server/agendamentos/calendario";

type Pessoa = { id: string; nome: string };
type Servico = { id: string; nome: string; preco: string; duracao: number };
type Props = {
  empresaId: string;
  servicos: Servico[];
  funcionarios: Pessoa[];
  clientes: Pessoa[];
  clienteAtual?: Pessoa;
  funcionarioAtualId?: string;
  remarcacao?: { id: string; versao: number; inicio: string; cliente: Pessoa; funcionario: Pessoa };
};
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AgendamentoForm({ empresaId, servicos, funcionarios, clientes, clienteAtual, funcionarioAtualId, remarcacao }: Props) {
  const [selecionados, setSelecionados] = useState<string[]>(remarcacao ? servicos.map((s) => s.id) : []);
  const [funcionarioId, setFuncionarioId] = useState(remarcacao?.funcionario.id ?? funcionarioAtualId ?? "");
  const [clienteId, setClienteId] = useState(remarcacao?.cliente.id ?? clienteAtual?.id ?? "");
  const [dias, setDias] = useState<DiaDisponivel[] | null>(null);
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [revisao, setRevisao] = useState(false);
  const [erroConsulta, setErroConsulta] = useState("");
  const [consultando, startConsulta] = useTransition();
  const [estado, action, salvando] = useActionState(remarcacao ? remarcarAgendamentoAction : confirmarAgendamentoAction, {});
  const escolhas = servicos.filter((s) => selecionados.includes(s.id));
  const duracao = escolhas.reduce((total, s) => total + s.duracao, 0);
  const total = escolhas.reduce((soma, s) => soma + Number(s.preco), 0);
  const ocupado = consultando || salvando;

  function limparConsulta() { setDias(null); setData(""); setHorario(""); setRevisao(false); setErroConsulta(""); }
  function consultar() {
    setErroConsulta(""); setRevisao(false); setData(""); setHorario(""); setDias(null);
    const form = new FormData();
    form.set("empresaId", empresaId);
    if (remarcacao) form.set("id", remarcacao.id);
    form.set("clienteId", clienteId); form.set("funcionarioId", funcionarioId);
    selecionados.forEach((id) => form.append("servicoIds", id));
    startConsulta(async () => {
      try {
        const resultado = await disponibilidadeAction(form);
        setDias(resultado.dias); setErroConsulta(resultado.erro);
      } catch { setErroConsulta("Não foi possível consultar os horários. Tente novamente."); }
    });
  }

  return (
    <form className="form block-gap" action={action} onSubmit={(event) => { if (!revisao || ocupado) event.preventDefault(); }}>
      <input type="hidden" name="empresaId" value={empresaId} />
      {remarcacao && <><input type="hidden" name="id" value={remarcacao.id} /><input type="hidden" name="versao" value={remarcacao.versao} /></>}
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="funcionarioId" value={funcionarioId} />
      {selecionados.map((id) => <input key={id} type="hidden" name="servicoIds" value={id} />)}
      <input type="hidden" name="data" value={data} /><input type="hidden" name="horario" value={horario} />
      {estado.erro && <p className="message error" role="alert">{estado.erro}</p>}
      {remarcacao && <p className="message">Horário atual: <strong>{formatarDataHora(remarcacao.inicio)}</strong></p>}
      {!revisao ? <>
        {!remarcacao && <>
          <fieldset className="agenda-fieldset" disabled={ocupado}>
            <legend>1. Selecione os serviços</legend>
            <div className="service-options">
              {servicos.map((servico) => <label className={`service-option ${selecionados.includes(servico.id) ? "selected" : ""}`} key={servico.id}>
                <input type="checkbox" checked={selecionados.includes(servico.id)} onChange={(event) => { setSelecionados(event.target.checked ? [...selecionados, servico.id] : selecionados.filter((id) => id !== servico.id)); limparConsulta(); }} />
                <span><strong>{servico.nome}</strong><span className="muted">{servico.duracao} min · {moeda(Number(servico.preco))}</span></span>
              </label>)}
            </div>
          </fieldset>
          <div className="grid-two">
            {!clienteAtual && <div className="field"><label htmlFor="agenda-cliente">Cliente</label><select id="agenda-cliente" value={clienteId} disabled={ocupado} onChange={(event) => { setClienteId(event.target.value); limparConsulta(); }}><option value="">Selecione o cliente</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select></div>}
            <div className="field"><label htmlFor="agenda-funcionario">Funcionário</label><select id="agenda-funcionario" value={funcionarioId} disabled={ocupado || Boolean(funcionarioAtualId)} onChange={(event) => { setFuncionarioId(event.target.value); limparConsulta(); }}><option value="">Selecione o funcionário</option>{funcionarios.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}</select></div>
          </div>
        </>}
        <p className="muted">{escolhas.length} serviço(s) · {duracao} min · <strong>{moeda(total)}</strong></p>
        <div className="actions"><button type="button" className="button secondary" disabled={ocupado || !selecionados.length || !clienteId || !funcionarioId} onClick={consultar}>{consultando ? "Consultando horários…" : dias ? "Atualizar disponibilidade" : "Consultar datas e horários"}</button></div>
        {erroConsulta && <p className="message error" role="alert">{erroConsulta}</p>}
        {dias && !erroConsulta && <section aria-live="polite" className="form">
          <h3>2. Escolha a data e o horário</h3>
          {!dias.length ? <div className="empty-state">Não há horários que comportem os serviços selecionados nos próximos {AGENDA.diasAntecedencia} dias. Tente outro funcionário ou outros serviços. O funcionário precisa ter um expediente cadastrado.</div> : <>
            <div className="field"><label htmlFor="agenda-data">Datas disponíveis</label><select id="agenda-data" value={data} onChange={(event) => { setData(event.target.value); setHorario(""); }}><option value="">Selecione uma data</option>{dias.map((dia) => <option key={dia.data} value={dia.data}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${dia.data}T12:00:00Z`))}</option>)}</select></div>
            {data && <fieldset className="agenda-fieldset"><legend>Horários livres</legend><div className="time-options">{dias.find((dia) => dia.data === data)?.horarios.map((hora) => <label key={hora} className={`time-option ${horario === hora ? "selected" : ""}`}><input type="radio" name="horaEscolhida" value={hora} checked={horario === hora} onChange={() => setHorario(hora)} />{hora}</label>)}</div></fieldset>}
            <div className="actions"><button className="button" type="button" disabled={!data || !horario || ocupado} onClick={() => setRevisao(true)}>Revisar agendamento</button></div>
          </>}
        </section>}
      </> : <section className="form">
        <h3>3. Confira os dados antes de confirmar</h3>
        <dl className="agenda-summary">
          <div><dt>Cliente</dt><dd>{remarcacao?.cliente.nome ?? clienteAtual?.nome ?? clientes.find((c) => c.id === clienteId)?.nome}</dd></div>
          <div><dt>Funcionário</dt><dd>{remarcacao?.funcionario.nome ?? funcionarios.find((f) => f.id === funcionarioId)?.nome}</dd></div>
          <div><dt>Data e horário</dt><dd>{formatarDataHora(`${data}T${horario}:00${AGENDA.offset}`)} (Brasília)</dd></div>
          <div><dt>Serviços</dt><dd>{escolhas.map((s) => s.nome).join(", ")}</dd></div>
          <div><dt>Duração e valor total</dt><dd>{duracao} min · {moeda(total)}</dd></div>
        </dl>
        <div className="actions"><button className="button" type="submit" disabled={salvando}>{salvando ? "Salvando…" : remarcacao ? "Confirmar remarcação" : "Confirmar agendamento"}</button><button type="button" className="button secondary" disabled={salvando} onClick={() => setRevisao(false)}>Voltar e ajustar</button></div>
      </section>}
      <div><Link className="nav-link" href={remarcacao ? `/agendamentos/${remarcacao.id}` : "/agendamentos"}>Voltar à agenda</Link></div>
    </form>
  );
}
