import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apresentarResposta } from "./apresentacaoResposta";
import { formatarDatasNoTexto } from "./datas";
import simboloMaicon from "./assets/maicon-symbol-white.png";

export function CabecalhoResposta() {
  return <header className="chat-resposta-autor"><span aria-hidden="true" className="chat-resposta-marca"><img src={simboloMaicon} alt="" /></span><span>Maicon <b>IA</b></span></header>;
}

export function RespostaTexto({ texto }: { texto: string }) {
  const r = apresentarResposta(texto);
  if (!r.conteudo && !r.titulo) return null;
  return <article className={`resposta-documento${r.vazio ? " resposta-sem-resultados" : ""}`}>
    {r.titulo && <header className="resposta-documento-topo"><h2>{r.titulo}</h2>{r.contexto && <p className="resposta-contexto">{r.contexto}</p>}</header>}
    <div className={r.vazio ? "resposta-estado-vazio" : "resposta-prosa"}>
      {r.vazio && <span className="resposta-estado-icone" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 10.5h5"/></svg></span>}
      <div className="resposta-prosa"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{table:({children})=><div className="chat-tabela" role="region" aria-label="Tabela de resultados" tabIndex={0}><table>{children}</table></div>}}>{formatarDatasNoTexto(r.conteudo)}</ReactMarkdown></div>
    </div>
  </article>;
}
