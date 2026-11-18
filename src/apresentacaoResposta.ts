const ASSUNTOS = /^(?:comiss[oõ]es|comiss[aã]o|taxas?|processos?|atividades?|clientes?|prazos?|pend[eê]ncias?|monitoramentos?|hist[oó]rico|altera[cç][oõ]es|propostas?|faturas?|acompanhamentos?|resumo|resultado|fila|painel|campos livres|gatilhos|projeto)\b/i;
const SEM_RESULTADOS = /^(?:nenhum(?:a)?s?\s+(?:comiss|process|registro|resultado|atividade|cliente|prazo|taxa|altera|pend[eê]ncia|fatura|proposta|monitor|acompanhamento)|n[aã]o (?:foram encontrados|foi encontrad[oa]|h[aá])\b)/i;

export function apresentarResposta(texto: string) {
  const linhas = texto.replace(/\r/g, "").trim().split("\n");
  const primeira = linhas[0] || "";
  let titulo = "", contexto = "";
  // Legacy tools return an unmarked subject on the first line. Recognize
  // report subjects, never arbitrary prose, SQL, field values or code blocks.
  if (linhas.length > 1 && ASSUNTOS.test(primeira) && primeira.length <= 200 && !/[|`*#]|[.!?]$/.test(primeira) && !/:\s*\S/.test(primeira)) {
    titulo = linhas.shift()!.replace(/:$/, "");
    const periodo = titulo.match(/\s+(?:entre|de)\s+(\d{2}\/\d{2}\/\d{4})\s+(?:e|a|at[eé])\s+(\d{2}\/\d{2}\/\d{4})$/i);
    if (periodo) { contexto = `${periodo[1]} a ${periodo[2]}`; titulo = titulo.slice(0,periodo.index).trim(); }
  }
  let conteudo = linhas.join("\n").trim();
  const vazio = SEM_RESULTADOS.test(conteudo) && !/\n\s*(?:[-*]|\||```)/.test(conteudo);
  // Markdown treats a lone newline as a space. Distinct facts must stay apart.
  if (!/```|^\s*(?:#{1,6}\s|[-*>]\s|\d+\.\s|\|)/m.test(conteudo)) conteudo = conteudo.replace(/([^\n])\n(?=[^\n])/g,"$1\n\n");
  return { titulo, contexto, conteudo, vazio };
}
