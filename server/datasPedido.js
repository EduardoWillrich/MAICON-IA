export function calendarioAtual(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const numero = (tipo) => Number(partes.find((item) => item.type === tipo)?.value);
  const hoje = new Date(Date.UTC(numero("year"), numero("month") - 1, numero("day")));
  const ontem = new Date(hoje);
  ontem.setUTCDate(ontem.getUTCDate() - 1);
  const inicioMes = new Date(Date.UTC(numero("year"), numero("month") - 1, 1));
  const dow = hoje.getUTCDay();
  const inicioSemana = new Date(hoje);
  inicioSemana.setUTCDate(inicioSemana.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  const fmt = (data) => {
    const p = (valor) => String(valor).padStart(2, "0");
    return `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
  };
  return { hoje: fmt(hoje), ontem: fmt(ontem), inicioMes: fmt(inicioMes), inicioSemana: fmt(inicioSemana) };
}

function isoDe(br) {
  const [dia, mes, ano] = String(br ?? "").split("/");
  if (!dia || !mes || !ano) return "";
  return `${ano}-${mes}-${dia}`;
}

function diaSeguinte(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + 1);
  return data.toISOString().slice(0, 10);
}

function dataCitada(texto, calendario) {
  const achado = String(texto ?? "").match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!achado) return "";
  const dia = achado[1].padStart(2, "0");
  const mes = achado[2].padStart(2, "0");
  let ano = achado[3] || String(calendario.hoje ?? "").slice(-4);
  if (ano.length === 2) ano = `20${ano}`;
  return `${dia}/${mes}/${ano}`;
}

function pedeAssunto(texto) {
  return /\b(?:abert|process|cliente|list|mostr|qual|quant|taxa|proposta|prazo|embarq|desembarq|log|fatura|comiss)/i.test(texto);
}

function diaDoPedido(texto, calendario) {
  const citado = dataCitada(texto, calendario);
  if (citado) return { rotulo: citado, iso: isoDe(citado) };
  if (/\bhoje\b/i.test(texto)) return { rotulo: calendario.hoje, iso: isoDe(calendario.hoje) };
  if (/\bontem\b/i.test(texto)) return { rotulo: calendario.ontem, iso: isoDe(calendario.ontem) };
  return null;
}

function inicioSemanaIso(hojeBr) {
  const [dia, mes, ano] = String(hojeBr ?? "").split("/").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const dow = data.getUTCDay();
  data.setUTCDate(data.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return data.toISOString().slice(0, 10);
}

const MESES = [
  ["janeiro", 1],
  ["fevereiro", 2],
  ["março", 3],
  ["marco", 3],
  ["abril", 4],
  ["maio", 5],
  ["junho", 6],
  ["julho", 7],
  ["agosto", 8],
  ["setembro", 9],
  ["outubro", 10],
  ["novembro", 11],
  ["dezembro", 12],
];

function intervaloMes(ano, mes, fimAtual) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fimCheio = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  return { inicio, fim: fimAtual && fimAtual < fimCheio ? fimAtual : fimCheio };
}

function periodoDoTexto(texto, calendario) {
  const hoje = isoDe(calendario.hoje);
  const fim = diaSeguinte(hoje);
  const [anoHoje, mesHoje] = hoje.split("-").map(Number);
  if (/\bsemana\s+passada\b/i.test(texto)) {
    const esta = inicioSemanaIso(calendario.hoje);
    const data = new Date(`${esta}T00:00:00Z`);
    data.setUTCDate(data.getUTCDate() - 7);
    const comeco = data.toISOString().slice(0, 10);
    return { rotulo: `semana passada (${comeco} a ${esta})`, inicio: comeco, fim: esta };
  }
  if (/\b(?:esta|essa|nesta|na|da)\s+semana\b/i.test(texto)) {
    const inicio = inicioSemanaIso(calendario.hoje);
    return { rotulo: `esta semana (${calendario.inicioSemana || inicio} a ${calendario.hoje})`, inicio, fim };
  }
  if (/\bm[eê]s\s+passad[oa]\b/i.test(texto)) {
    const mes = mesHoje === 1 ? 12 : mesHoje - 1;
    const ano = mesHoje === 1 ? anoHoje - 1 : anoHoje;
    const intervalo = intervaloMes(ano, mes);
    return { rotulo: `mês passado (${intervalo.inicio} a ${intervalo.fim})`, ...intervalo };
  }
  if (/\b(?:este|esse|neste|no|do|da|o)\s+m[eê]s\b/i.test(texto)) {
    const inicio = isoDe(calendario.inicioMes) || `${hoje.slice(0, 8)}01`;
    return { rotulo: `este mês (${calendario.inicioMes || inicio} a ${calendario.hoje})`, inicio, fim };
  }
  const nomeMes = MESES.find(([nome]) => new RegExp(`\\b${nome}\\b`, "i").test(texto));
  if (nomeMes) {
    const mes = nomeMes[1];
    const anoCitado = texto.match(/\b(20\d{2})\b/)?.[1];
    const ano = anoCitado ? Number(anoCitado) : mes > mesHoje ? anoHoje - 1 : anoHoje;
    const intervalo = intervaloMes(ano, mes, ano === anoHoje && mes === mesHoje ? fim : "");
    return { rotulo: `${nomeMes[0]} de ${ano}`, ...intervalo };
  }
  const dia = diaDoPedido(texto, calendario);
  if (!dia?.iso) return null;
  return { rotulo: dia.rotulo, inicio: dia.iso, fim: diaSeguinte(dia.iso) };
}

function indiceNoNivelZero(texto, palavra) {
  let profundidade = 0;
  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i];
    if (char === "(") profundidade += 1;
    else if (char === ")") profundidade = Math.max(0, profundidade - 1);
    else if (profundidade === 0 && palavra.test(texto.slice(i))) return i;
  }
  return -1;
}

function limparFiltroSolto(texto) {
  let atual = texto;
  let anterior = "";
  while (atual !== anterior) {
    anterior = atual;
    atual = atual
      .replace(/\bWHERE\s+AND\b/gi, "WHERE")
      .replace(/\bAND\s+AND\b/gi, "AND")
      .replace(/\bAND\s+(?=ORDER\s+BY|GROUP\s+BY|HAVING\b)/gi, "")
      .replace(/\bWHERE\s+(?=ORDER\s+BY|GROUP\s+BY|HAVING\b)/gi, "");
  }
  return atual;
}

const LITERAL_DATA = "'\\d{4}-\\d{2}-\\d{2}(?:[ T]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?)?'";

function pedeTipoCarga(texto) {
  return /\b(?:fcl|lcl|a[eé]re[oa]|rodovi[aá]ri[oa]|mar[ií]tim[oa]|tipo\s+de\s+carga|tipo_carga)\b/i.test(texto);
}

function semTipoCarga(sql) {
  return String(sql ?? "").replace(
    /(?:\s+and)?\s+(?:\w+\.)?tipo_carga\s*(?:=|<>|!=|in)\s*(?:\([^)]*\)|'\d+'|\d+)/gi,
    "",
  );
}

export function sqlDoPeriodo(sql, pedido, calendario) {
  const periodo = periodoDoTexto(pedido, calendario);
  if (!periodo?.inicio || !periodo?.fim) return String(sql ?? "");
  let texto = String(sql ?? "");
  const coluna =
    texto.match(new RegExp(`(\\b\\w+\\.Data(?:_\\w+)*|\\bData(?:_\\w+)*)\\s*(?:>=|<=|>|<|=)\\s*${LITERAL_DATA}`, "i"))?.[1] ||
    texto.match(/(?:convert|cast)\s*\(\s*(?:date\s*,\s*)?(\b\w+\.Data(?:_\w+)*)[^)]*\)\s*(?:>=|<=|>|<|=)/i)?.[1] ||
    texto.match(/\b(\w+\.Data_Abertura_Processo)\b/i)?.[1];
  if (!coluna) return texto;
  const nome = coluna.replace(/\./g, "\\.");
  const expr = `(?:(?:convert|cast)\\s*\\(\\s*(?:date\\s*,\\s*)?${nome}\\s*(?:as\\s+date\\s*)?\\)|${nome})`;
  texto = limparFiltroSolto(texto.replace(new RegExp(`${expr}\\s*(?:>=|<=|>|<|=)\\s*${LITERAL_DATA}`, "gi"), ""));
  if (!pedeTipoCarga(pedido)) texto = limparFiltroSolto(semTipoCarga(texto));
  const filtro = `${coluna} >= '${periodo.inicio}' AND ${coluna} < '${periodo.fim}'`;
  const onde = indiceNoNivelZero(texto, /^where\b/i);
  const ordem = indiceNoNivelZero(texto, /^(?:order|group)\s+by\b/i);
  if (onde >= 0) {
    const palavra = texto.slice(onde).match(/^where\b/i)?.[0] ?? "WHERE";
    const resto = limparFiltroSolto(texto.slice(onde + palavra.length)).replace(/^\s+/, "");
    const ligacao = resto && !/^(?:order|group)\s+by\b/i.test(resto) ? " AND " : "\n";
    return `${texto.slice(0, onde)}WHERE ${filtro}${ligacao}${resto}`;
  }
  if (ordem >= 0) return `${texto.slice(0, ordem)}WHERE ${filtro}\n${texto.slice(ordem)}`;
  return `${texto}\nWHERE ${filtro}`;
}

function pedeListaCompleta(texto) {
  return /detalha|lista completa|mostrar tudo|mostra tudo|ver tudo|todos aqui|no chat|na conversa|aqui mesmo/i.test(texto);
}

export function anotarPedido(atual, anterior, calendario) {
  const texto = String(atual ?? "").trim();
  const antes = String(anterior ?? "").trim();
  if (!texto || !calendario?.hoje) return texto;
  if (pedeListaCompleta(texto) && antes) {
    const periodo = periodoDoTexto(antes, calendario);
    const filtro = periodo ? ` Mantenha ${periodo.rotulo}, com >= '${periodo.inicio}' AND < '${periodo.fim}'.` : "";
    return `${texto}\n\nLISTA: consulte de novo a pergunta anterior. No chat, no máximo 30 linhas, e escreva o total.${filtro} Não cole a lista inteira e não diga que não consegue.`;
  }
  const correcao = texto.length <= 80 && diaDoPedido(texto, calendario) && !pedeAssunto(texto) && antes;
  const pedido = correcao ? `${antes}\n${texto}` : texto;
  const periodo = periodoDoTexto(texto, calendario);
  if (!periodo) return texto;
  return (
    `${pedido}\n\nDATA: ${periodo.rotulo}. ` +
    `No SQL use >= '${periodo.inicio}' AND < '${periodo.fim}'. ` +
    `Hoje é ${calendario.hoje} e ontem é ${calendario.ontem}. ` +
    "Não troque esse intervalo por um único dia."
  );
}
