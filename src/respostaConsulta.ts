export const LOTE_RESULTADOS = 10;
export type LinhaConsulta = Record<string, unknown>;
export type ItemTabelaLegada = { hora: string; titulo: string; linhas: string[]; tag: string; tipo: string };

export function linhasDaLista(itens: ItemTabelaLegada[]): LinhaConsulta[] {
  return itens.map(item => {
    const processo = item.titulo.match(/^[A-Za-z]{1,4}\d{2,6}-\d{2}(?: teste)?$/i);
    const linha: LinhaConsulta = processo ? { Processo: item.titulo, Cliente: item.linhas[0] || "" } : { Item: item.titulo };
    const detalhes = processo ? item.linhas.slice(1) : item.linhas;
    const notas: string[] = [];
    for (const d of detalhes) {
      const viagem = d.match(/^Previsto (.+?)\s*·\s*Real (.+)$/i);
      const campo = d.match(/^([\p{L}][\p{L} _-]{1,40}):\s*(.+)$/u);
      if (viagem) { linha.Previsto = viagem[1]; linha.Real = viagem[2]; }
      else if (campo && !(campo[1] in linha)) linha[campo[1]] = campo[2];
      else notas.push(d);
    }
    if (notas.length) linha.Detalhes = notas.join(" · ");
    if (item.hora) linha.Data = item.hora;
    if (item.tag) linha.Tipo = item.tag;
    return linha;
  });
}

export function usarTabelaConsulta(linhas: LinhaConsulta[], texto: string, textoParaEnviar = false): boolean {
  return linhas.length >= 2 && !textoParaEnviar && !/```(?:tarefas|gatilhos|log|painel|dia|rota|encarte|grafico|email|modelo|sites)\b/i.test(texto);
}

const chave = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
export function colunasDaResposta(linhas: LinhaConsulta[]): string[] {
  const todas = [...new Set(linhas.flatMap(Object.keys))];
  const visiveis = todas.filter(c => !/^Id(?:[A-Z_]|$)/.test(c));
  return visiveis.length ? visiveis : todas;
}
export function tituloDaColuna(coluna: string): string {
  const nomes: Record<string, string> = { nometaxa:"Taxa", valorpagamento:"Pagamento", valorrecebimento:"Recebimento", numeroprocesso:"Processo", dataaberturaprocesso:"Abertura", referenciacliente:"Referência do cliente", previsao:"Previsão", responsavel:"Responsável", observacao:"Observação", situacao:"Situação" };
  return nomes[chave(coluna)] || coluna.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}
export function colunaNumerica(coluna: string, linhas: LinhaConsulta[]): boolean {
  if (/codigo|c[oó]digo|numero|n[uú]mero|cnpj|cpf|telefone|cep|referencia|refer[eê]ncia|moeda/i.test(coluna)) return false;
  const valores = linhas.map(l => l[coluna]).filter(v => v != null && v !== "");
  return valores.length > 0 && valores.every(v => typeof v === "number" && Number.isFinite(v) || typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v));
}
export function valorDaCelula(valor: unknown, coluna: string, numerica: boolean): string {
  if (valor == null || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (numerica) {
    const decimal = /valor|pagamento|recebimento|saldo|frete|total|comiss|lucro|pre[cç]o|custo/i.test(coluna);
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimal ? 2 : 0, maximumFractionDigits: decimal ? 2 : 6 }).format(Number(valor));
  }
  return String(valor);
}

// Suppress only duplicated rows; narrative, warnings and unrelated tables stay.
export function semDadosRepetidos(texto: string, linhas: LinhaConsulta[]): string {
  const campos = colunasDaResposta(linhas);
  const conhecidas = new Set(campos.flatMap(c => [chave(c), chave(tituloDaColuna(c))]));
  const rotulos = campos.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const campoNoInicio = rotulos.length ? new RegExp(`^\\s*(?:[-*]\\s+)?(${rotulos.join("|")}):\\s*(.*)`, "i") : null;
  const rotuloRepetido = rotulos.length ? new RegExp(`(?:${rotulos.join("|")}):`, "gi") : null;
  const porPrimeiroValor = new Map<string, LinhaConsulta[]>();
  for (const r of linhas) {
    const valor = String(r[campos[0]] ?? "").trim().toLowerCase();
    if (valor) {
      const grupo = porPrimeiroValor.get(valor);
      if (grupo) grupo.push(r); else porPrimeiroValor.set(valor, [r]);
    }
  }
  const saida: string[] = [];
  const partes = texto.split(/(```[\s\S]*?```)/g);
  for (const parte of partes) {
    if (parte.startsWith("```")) { saida.push(parte); continue; }
    const ls = parte.split("\n");
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      const item = l.match(/^\s*[-*•]\s+(.+)$/)?.[1]?.replace(/\*\*|`/g, "");
      if (item) {
        const inicio = item.split(/\s+[·—–]\s+|:\s+/)[0].trim().toLowerCase();
        const correspondencias = porPrimeiroValor.get(inicio) || [];
        let fim = i;
        while (fim+1 < ls.length && /^\s+\S/.test(ls[fim+1])) fim++;
        const grupo = [item,...ls.slice(i+1,fim+1)].join("\n").toLowerCase();
        if (correspondencias.some(r => campos.length === 1 || campos.slice(1).some(c => r[c] != null && String(r[c]).trim() && grupo.includes(String(r[c]).trim().toLowerCase())))) { i = fim; continue; }
      }
      if (l.trim().startsWith("|") && /^\s*\|?[\s:|-]+\|\s*$/.test(ls[i+1] || "")) {
        const cabecalho = l.split("|").slice(1,-1).map(chave);
        const primeiraLinha = (ls[i+2] || "").split("|").slice(1,-1).map(c => c.trim());
        const mesmaLinha = primeiraLinha.length === cabecalho.length && linhas.some(r => cabecalho.every((c,j) => {
          const campo = campos.find(k => chave(k) === c || chave(tituloDaColuna(k)) === c);
          const v = campo ? r[campo] : undefined;
          return String(v ?? "").trim() === primeiraLinha[j] || valorDaCelula(v,campo || "",typeof v === "number") === primeiraLinha[j];
        }));
        if (cabecalho.length && cabecalho.every(c => conhecidas.has(c)) && mesmaLinha) {
          i += 1;
          while (i+1 < ls.length && ls[i+1].trim().startsWith("|")) i++;
          continue;
        }
      }
      const dado = l.match(campoNoInicio || /$a/);
      if (dado) {
        const campo = campos.find(c => chave(c) === chave(dado[1]));
        const valorConhecido = campo && linhas.some(r => r[campo] != null && String(r[campo]).trim() && dado[2].toLowerCase().startsWith(String(r[campo]).trim().toLowerCase()));
        const quantidadeRotulos = rotuloRepetido ? [...l.matchAll(rotuloRepetido)].length : 0;
        if (valorConhecido && (quantidadeRotulos > 1 || linhas.some(r => String(r[campo!] ?? "").trim() === dado[2].trim()))) continue;
      }
      if (/^\s*(?:Mais \d+ registros\.|Mostrei \d+ de \d+[^\n]*|\d+ registros? encontrados?\.)\s*$/i.test(l)) continue;
      saida.push(l);
    }
  }
  const resultado = saida.join("\n").replace(/\n{3,}/g,"\n\n").trim();
  if (resultado !== texto.trim() && !resultado.includes("\n") && /^(?:Processos|Clientes|Taxas|Atividades|Prazos|Comiss[oõ]es|Propostas|Faturas)\b/i.test(resultado)) return `## ${resultado}`;
  return resultado;
}
