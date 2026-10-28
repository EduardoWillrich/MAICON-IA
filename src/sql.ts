import { montarSelect, montarXpaths } from "../server/query.js";
import type { FiltrosLog } from "./types";

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sqlLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

export function montarXmlChaves(chaves: FiltrosLog["chaves"]): string {
  const itens = chaves
    .filter((c) => c.nome.trim() && c.valor.trim())
    .map(
      (c) =>
        `  <Item Nome="${xmlEscape(c.nome.trim())}" Value="${xmlEscape(c.valor.trim())}"/>`,
    )
    .join("\n");
  return `<PrimaryKeys>\n${itens}\n</PrimaryKeys>`;
}

function dataSql(valor: string): string {
  const texto = valor.trim();
  return texto ? `Convert(date, '${sqlLiteral(texto)}')` : "Null";
}

export function gerarSql(filtros: FiltrosLog): string {
  try {
    const xpaths = montarXpaths({
      tabela: filtros.tabela.trim(),
      tipo: filtros.tipo,
      chaves: filtros.chaves.map((chave) => ({ nome: chave.nome.trim(), valor: chave.valor })),
    });
    const corpo = montarSelect(xpaths).trim();
    const idUsuario = Number.isFinite(filtros.idUsuario) ? filtros.idUsuario : 0;
    return `Declare
  @IdUsuario Int = ${idUsuario},
  @Data_Inicio Date = ${dataSql(filtros.dataInicio)},
  @Data_Termino Date = ${dataSql(filtros.dataTermino)}

${corpo}
`;
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível montar o SQL.";
    return `-- ${mensagem}`;
  }
}
