import { useId, useState } from "react";
import "./estilos/fila.css";

export type GrupoFila = { chave: string; codigo: string; atividade: string; processos: { processo: string; chaves: string[]; marca: string; quando: string }[] };
export function FilaAtividades({ grupos, onConsultar, onDispensar }: { grupos: GrupoFila[]; onConsultar: (pergunta: string) => void; onDispensar: (chaves: string[]) => void }) {
  const [limite, setLimite] = useState(5);
  const id = useId();
  const linhas = grupos.flatMap(g => g.processos.map(p => ({...p,codigo:g.codigo,atividade:g.atividade,chave:g.chave})));
  return <section className="fila-atividades" aria-labelledby={`${id}-titulo`}>
    <header className="fila-topo"><div><h3 id={`${id}-titulo`}>Sua fila <span>{linhas.length} {linhas.length===1 ? "pendência" : "pendências"}</span></h3><p>Selecione um processo para consultar a atividade.</p></div><button className="fila-dispensar" type="button" onClick={()=>onDispensar(linhas.flatMap(l=>l.chaves))}>Dispensar</button></header>
    <table id={`${id}-itens`}><thead><tr><th scope="col">Atividade</th><th scope="col">Processo</th><th scope="col">Situação</th><th scope="col">Previsão</th></tr></thead>
      <tbody>{linhas.slice(0,limite).map(l=><tr key={`${l.chave}|${l.processo}`}>
        <td className="fila-atividade"><span className="fila-codigo">{l.codigo || "—"}</span><strong>{l.atividade}</strong></td>
        <td data-label="Processo"><button className="fila-processo" type="button" disabled={l.processo==="Sem processo"} aria-label={`Consultar ${l.atividade} no processo ${l.processo}`} onClick={()=>onConsultar(`Qual o andamento da atividade ${l.codigo || l.atividade} no processo ${l.processo}?`)}>{l.processo}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></td>
        <td data-label="Situação"><span className={`fila-situacao ${l.marca==="Atrasada" ? "atrasada" : l.marca==="Hoje" ? "hoje" : "neutra"}`}>{l.marca || "Sem previsão"}</span></td>
        <td data-label="Previsão" className="fila-previsao">{l.quando || "—"}</td>
      </tr>)}</tbody>
    </table>
    <footer><span aria-live="polite">Exibindo {Math.min(limite,linhas.length)} de {linhas.length}</span>{limite<linhas.length ? <button type="button" aria-controls={`${id}-itens`} onClick={()=>setLimite(n=>n+5)}>Ver mais <span>+{Math.min(5,linhas.length-limite)}</span></button> : <span>Todas as pendências exibidas</span>}</footer>
  </section>;
}
