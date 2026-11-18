import type { ListaGatilhos } from "./gatilhos";
import "./estilos/gatilhos.css";

export function GatilhosCard({ lista }: { lista: ListaGatilhos }) {
  const total = lista.projetos.reduce((n, p) => n + p.gatilhos.length, 0);
  return <section className="resposta gatilhos-card" aria-label="Gatilhos do projeto">
    <header className="gatilhos-cabecalho">
      <div><span className="gatilhos-sobretitulo">PROJETO DE TAREFAS</span><h2>Como as atividades se conectam</h2><p>Cada linha mostra o que dispara a mudança e o que acontece na atividade de destino.</p></div>
      <strong className="gatilhos-total">{total}<span>{total === 1 ? "gatilho" : "gatilhos"}</span></strong>
    </header>
    {lista.projetos.map((projeto, pi) => <section className="gatilhos-projeto" key={`${projeto.codigo}-${pi}`} aria-label={`Projeto ${projeto.codigo} ${projeto.nome}`}>
      <header><h3><span>{projeto.codigo}</span>{projeto.nome}</h3><span>{projeto.gatilhos.length} {projeto.gatilhos.length === 1 ? "gatilho" : "gatilhos"}</span></header>
      {projeto.gatilhos.length === 0 ? <p className="gatilhos-vazio">Este projeto não tem gatilhos de situação cadastrados.</p> : <>
        <div className="gatilhos-legenda" aria-hidden="true"><span>#</span><span>ATIVIDADE DE ORIGEM · QUANDO</span><span /><span>ATIVIDADE DE DESTINO · RESULTADO</span></div>
        <ol className="gatilhos-lista">{projeto.gatilhos.map((gatilho, i) => <li className="gatilhos-item" key={`${gatilho.id}-${i}`}>
          <span className="gatilhos-indice" aria-label={`Gatilho ${i + 1}`}>{String(i + 1).padStart(2, "0")}</span>
          <div className="gatilhos-atividade"><span className="gatilhos-codigo">{gatilho.origem.codigo}</span><strong>{gatilho.origem.nome}</strong><p>Quando fica <b>{gatilho.evento}</b></p></div>
          <span className="gatilhos-seta" aria-hidden="true">→</span>
          <div className="gatilhos-atividade"><span className="gatilhos-codigo">{gatilho.destino.codigo || "Destino"}</span><strong>{gatilho.destino.nome}</strong><p>Passa para <b className={gatilho.situacao === "concluída" ? "gatilhos-concluida" : ""}>{gatilho.situacao}</b></p>{gatilho.geraAtividade ? <span className="gatilhos-nova">Gera nova atividade</span> : null}</div>
          {gatilho.observacao ? <p className="gatilhos-observacao">{gatilho.observacao}</p> : null}
        </li>)}</ol>
      </>}
    </section>)}
    <footer>{total ? `Todos os ${total} ${total === 1 ? "gatilho exibido" : "gatilhos exibidos"}.` : "Nenhum gatilho cadastrado."}</footer>
  </section>;
}
