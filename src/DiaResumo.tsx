import type { DiaPainel } from "./PainelTi";
import { useRef, useState } from "react";
import { ResultadosConsulta } from "./ResultadosConsulta";
import "./estilos/meuDia.css";

export function DiaCard({ dia, abrirHeadCargo = false }: { dia: DiaPainel; abrirHeadCargo?: boolean }) {
  const [abrindo, setAbrindo] = useState<number | null>(null);
  const [retorno, setRetorno] = useState<{ok:boolean;texto:string} | null>(null);
  const emCurso = useRef(false);
  async function abrir(id: number) {
    if (emCurso.current) return;
    emCurso.current = true; setAbrindo(id); setRetorno(null);
    try {
      const resposta = await fetch('/api/bot/abrir-atividade', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idAtividade:id})});
      const dados = await resposta.json().catch(()=>({erro:'Não consegui falar com o bot. Atualize a página e tente novamente.'}));
      setRetorno({ok:resposta.ok && dados.ok===true,texto:dados.texto || dados.erro || 'Não consegui abrir a atividade no HeadCargo.'});
    } catch { setRetorno({ok:false,texto:'Não consegui falar com o bot. Confira a conexão com o servidor local.'}); }
    finally { emCurso.current=false; setAbrindo(null); }
  }
  const calendario = dia.nome && dia.sub.startsWith(`${dia.nome} · `) ? dia.sub.slice(dia.nome.length + 3) : dia.sub;
  return <article className="meu-dia">
    <section className="meu-dia-abertura">
      <header className="meu-dia-topo"><div><h2>{dia.titulo}</h2>{dia.nome && <p>{dia.nome}</p>}</div><span className="meu-dia-calendario"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg>{calendario}</span></header>
      <dl className="meu-dia-resumo">{dia.chips.map(c=><div key={c.id} className={c.valor>0 ? `com-pendencias ${c.id}` : ""}><dt>{c.id==="atrasada" ? "Atrasadas" : c.id==="hoje" ? "Hoje" : c.id==="semana" ? "Na semana" : c.rotulo}</dt><dd>{c.valor.toLocaleString("pt-BR")}</dd></div>)}</dl>
    </section>
    {dia.vazio && <p className="meu-dia-vazio">{dia.vazio}</p>}
    {abrindo !== null && <p className="meu-dia-abertura-status" role="status">Abrindo a atividade no HeadCargo…</p>}
    {retorno && <p className={`meu-dia-abertura-status${retorno.ok ? '' : ' falhou'}`} role="status">{retorno.texto}</p>}
    <div className="meu-dia-grupos">{dia.grupos.map(g=><ResultadosConsulta key={g.id} titulo={g.titulo} linhas={g.itens.map(i=>({Atividade:i.atividade,Processo:i.processo,Cliente:i.cliente,Previsao:i.quando||"Sem previsão",Prazo:i.rel,...(i.motivo ? {Motivo:i.motivo} : {})}))} aviso={g.ocultos ? `Mais ${g.ocultos} pendências não incluídas nesta resposta. Consulte Meu dia novamente para atualizar a lista.` : ""} renderizarCelula={abrirHeadCargo ? (coluna,indice)=>{
      const item=g.itens[indice];
      if(coluna!=="Atividade" || !item.idAtividade) return undefined;
      return <button className="meu-dia-abrir" type="button" disabled={abrindo!==null} onClick={()=>void abrir(item.idAtividade!)} title={`Abrir no HeadCargo: ${item.processo}`} aria-label={`Abrir ${item.atividade} no processo ${item.processo} no HeadCargo`}>{item.atividade}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/></svg></button>;
    } : undefined}/>)}</div>
  </article>;
}
