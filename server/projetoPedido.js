const RECLAMA = /n[aã]o (?:esta|está|t[aá]) exibindo todas|temos mais de \d+|faltam (?:atividades|tarefas)|lista (?:incompleta|cortada)|n[aã]o (?:s[aã]o|est[aã]o) todas as (?:atividades|tarefas)/i;
const PEDE = /projeto de tarefas|atividades? do projeto|tarefas? do (?:projeto|modal)|sequ[eê]ncia do projeto/i;

function modalDoTexto(texto) {
  const sigla = String(texto ?? "").match(/\b(IM|IA|EM|EA)\b/i)?.[1]?.toUpperCase();
  if (sigla) return sigla;
  if (/importa\S*\s+mar[ií]tim/i.test(texto)) return "IM";
  if (/exporta\S*\s+mar[ií]tim/i.test(texto)) return "EM";
  if (/importa\S*\s+a[eé]re/i.test(texto)) return "IA";
  if (/exporta\S*\s+a[eé]re/i.test(texto)) return "EA";
  return "";
}

export function pedidoProjetoTarefas(texto) {
  const frase = String(texto ?? "");
  if (!PEDE.test(frase) && !RECLAMA.test(frase)) return null;
  const numero = frase.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2}(?:\s+teste)?)\b/i)?.[1] || "";
  if (numero) return { numero: numero.replace(/\s+teste$/i, " teste").replace(/^([a-z]{1,4}\d{2,6}-\d{2})/i, (trecho) => trecho.toUpperCase()) };
  const modalidade = modalDoTexto(frase);
  return modalidade ? { modalidade } : null;
}

export function pedidoProjetoDaConversa(mensagens) {
  const lista = Array.isArray(mensagens) ? mensagens : [];
  const ultimo = String(lista.filter((item) => item?.role === "user").at(-1)?.content ?? "");
  const direto = pedidoProjetoTarefas(ultimo);
  if (direto) return direto;
  if (!RECLAMA.test(ultimo)) return null;
  const anterior = String(lista.filter((item) => item?.role === "assistant").at(-1)?.content ?? "");
  const modalidade = modalDoTexto(anterior);
  return modalidade ? { modalidade } : null;
}
