import { useId, useMemo, useState, type ReactNode } from "react";
import { formatarDatasNoTexto } from "./datas";
import { LOTE_RESULTADOS, colunaNumerica, colunasDaResposta, tituloDaColuna, valorDaCelula, type LinhaConsulta } from "./respostaConsulta";

export function ResultadosConsulta({ linhas, calculos = "", titulo = "Resultado da consulta", sub = "", aviso = "", renderizarCelula }: { linhas: LinhaConsulta[]; calculos?: string; titulo?: string; sub?: string; aviso?: string; renderizarCelula?: (coluna: string, indice: number) => ReactNode | undefined }) {
  const [limite, setLimite] = useState(LOTE_RESULTADOS);
  const id = useId();
  const colunas = useMemo(() => colunasDaResposta(linhas), [linhas]);
  const numericas = useMemo(() => new Set(colunas.filter(c => colunaNumerica(c, linhas))), [colunas, linhas]);
  const visiveis = linhas.slice(0,limite);
  const totais = calculos.split("\n").filter(l => l.trim().startsWith("- ")).map(l => l.trim().slice(2));
  return <section className="resultado-consulta" aria-labelledby={`${id}-titulo`}>
    <header className="resultado-cabecalho">
      <h3 id={`${id}-titulo`}>{titulo || "Resultado da consulta"}</h3>
      <span>{linhas.length.toLocaleString("pt-BR")} {linhas.length === 1 ? "registro" : "registros"}</span>
    </header>
    {sub && <p className="resposta-contexto">{sub}</p>}
    {totais.length > 0 && <ul className="resultado-totais">{totais.map((t,i) => <li key={i}>{t}</li>)}</ul>}
    <div className="resultado-tabela" role="region" aria-label="Resultados; role para ver todas as colunas" tabIndex={0}>
      <table id={`${id}-tabela`}>
        <thead><tr>{colunas.map(c => <th key={c} scope="col" className={numericas.has(c) ? "numero" : undefined}>{tituloDaColuna(c)}</th>)}</tr></thead>
        <tbody>{visiveis.map((l,i) => <tr key={i}>{colunas.map(c => <td key={c} className={`${numericas.has(c) ? "numero" : ""}${l[c] == null || l[c] === "" ? " vazio" : ""}`}>{renderizarCelula?.(c,i) ?? formatarDatasNoTexto(valorDaCelula(l[c],c,numericas.has(c)))}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <footer className="resultado-rodape">
      <span aria-live="polite">Exibindo {visiveis.length.toLocaleString("pt-BR")} de {linhas.length.toLocaleString("pt-BR")}</span>
      {limite < linhas.length ? <button type="button" aria-controls={`${id}-tabela`} onClick={() => setLimite(n => n+LOTE_RESULTADOS)}>Ver mais <span>+{Math.min(LOTE_RESULTADOS,linhas.length-limite)}</span></button> : <span>Todos os registros exibidos</span>}
    </footer>
    {aviso && <p className="resposta-contexto">{aviso}</p>}
  </section>;
}
