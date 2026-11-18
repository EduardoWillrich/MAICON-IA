import { useId, useState } from "react";
import { TAMANHO_LOTE_TAREFAS, type ListaProjetoTarefas, type ProjetoTarefas } from "./projetoTarefas";
import "./estilos/projetoTarefas.css";

function AtividadesProjeto({ projeto }: { projeto: ProjetoTarefas }) {
  const [limite, setLimite] = useState(TAMANHO_LOTE_TAREFAS);
  const listaId = useId();
  const total = projeto.tarefas.length;
  const visiveis = Math.min(limite, total);
  const restantes = total - visiveis;
  return <section className="projeto-tarefas-grupo" aria-label={`Projeto ${projeto.codigo} ${projeto.nome}`}>
    <header><h3><span>{projeto.codigo}</span>{projeto.nome}</h3><span>{projeto.processo ? `Processo ${projeto.processo}` : projeto.modalidade ? `Modal ${projeto.modalidade}` : ""}</span></header>
    {total ? <>
      <div className="projeto-tarefas-legenda" aria-hidden="true"><span>#</span><span>ATIVIDADE</span><span>ETAPA ANTERIOR NO FLUXO</span></div>
      <ol id={listaId} className="projeto-tarefas-lista">{projeto.tarefas.slice(0, visiveis).map((tarefa, i) => <li key={`${tarefa.id}-${i}`}>
        <span className="projeto-tarefas-indice">{String(i + 1).padStart(2, "0")}</span>
        <div className="projeto-tarefas-nome"><span>{tarefa.codigo}</span><strong>{tarefa.nome}</strong></div>
        <div className="projeto-tarefas-precedente">{tarefa.precedente ? <><span>Depois de <b>{tarefa.precedente.codigo}</b></span><p>{tarefa.precedente.nome}</p></> : <span>Sem etapa anterior vinculada</span>}</div>
      </li>)}</ol>
      <footer><span role="status" aria-live="polite">Exibindo {visiveis} de {total} atividades</span>{restantes > 0 ? <button type="button" aria-controls={listaId} onClick={() => setLimite((n) => n + TAMANHO_LOTE_TAREFAS)}>Ver mais <span>+{Math.min(TAMANHO_LOTE_TAREFAS, restantes)}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button> : <strong>Todas as atividades exibidas</strong>}</footer>
    </> : <p className="projeto-tarefas-vazio">Este projeto não tem atividades cadastradas.</p>}
  </section>;
}

export function ProjetoTarefasCard({ lista }: { lista: ListaProjetoTarefas }) {
  const total = lista.projetos.reduce((n, p) => n + p.tarefas.length, 0);
  return <section className="resposta projeto-tarefas-card" aria-label="Atividades do projeto de tarefas">
    <header className="projeto-tarefas-cabecalho"><div><span>PROJETO DE TAREFAS</span><h2>Atividades e sequência do projeto</h2><p>Veja as atividades cadastradas e a etapa anterior de cada uma.</p></div><strong>{total}<span>{total === 1 ? "atividade" : "atividades"}</span></strong></header>
    {lista.projetos.map((p, i) => <AtividadesProjeto key={`${p.codigo}-${p.nome}-${p.tarefas.length}-${i}`} projeto={p} />)}
  </section>;
}
