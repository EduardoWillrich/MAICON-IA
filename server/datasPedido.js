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

function brDeIso(iso) {
  const [ano, mes, dia] = String(iso ?? "").split("-");
  if (!ano || !mes || !dia) return "";
  return `${dia}/${mes}/${ano}`;
}

export function ultimaSemana(hojeBr) {
  const [dia, mes, ano] = String(hojeBr ?? "").split("/").map(Number);
  const sabadoAtual = new Date(Date.UTC(ano, mes - 1, dia));
  const dow = sabadoAtual.getUTCDay();
  sabadoAtual.setUTCDate(sabadoAtual.getUTCDate() - ((dow + 1) % 7));
  const fim = sabadoAtual.toISOString().slice(0, 10);
  const inicioData = new Date(sabadoAtual);
  inicioData.setUTCDate(inicioData.getUTCDate() - 7);
  const inicio = inicioData.toISOString().slice(0, 10);
  const sexta = new Date(sabadoAtual);
  sexta.setUTCDate(sexta.getUTCDate() - 1);
  return { inicio, fim, inicioBr: brDeIso(inicio), sextaBr: brDeIso(sexta.toISOString().slice(0, 10)) };
}

export const SEM_EXCECAO =
  "(Lhs.IdStatus_Processo_Logistico IS NULL OR Lhs.IdStatus_Processo_Logistico <> 6) AND Lhs.Numero_Processo NOT LIKE '%TESTE%' AND Lhs.Numero_Processo NOT LIKE 'DEMU%'";

export const PROCESSO_REAL = `Lhs.Data_Cancelamento IS NULL AND ${SEM_EXCECAO}`;

function pediuTermo(pedido, termo) {
  const texto = String(pedido ?? "");
  if (new RegExp(`\\b(?:sem|exceto|fora|ignor\\w*|desconsider\\w*|n[aã]o)\\b[^.]{0,48}\\b${termo}`, "i").test(texto)) return false;
  return new RegExp(`\\b${termo}`, "i").test(texto);
}

function pediuCanceladas(pedido) {
  if (pediuTermo(pedido, "cancelad")) return true;
  const texto = String(pedido ?? "");
  if (/\b(?:sem|exceto|fora|ignor\w*|desconsider\w*|n[aã]o)\b[^.]{0,48}\b(?:status|situa)/i.test(texto)) return false;
  return /\b(?:situa[cç][aã]o|status|c[oó]digo)\s*(?:=|n[ºo°.]*)?\s*6\b/i.test(texto);
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
  if (/(?:^|\s)(?:semana\s+passada|semana\s+anterior|[uú]ltima\s+semana)\b/i.test(texto)) {
    const semana = ultimaSemana(calendario.hoje);
    return {
      rotulo: `última semana, sábado ${semana.inicioBr} a sexta ${semana.sextaBr}`,
      inicio: semana.inicio,
      fim: semana.fim,
    };
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

export function perguntaDeConjunto(pedido) {
  const texto = String(pedido ?? "");
  if (/\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/.test(texto)) return false;
  return /\b(?:m[eê]s|totais|todos|todas|lista|processos|lucros)\b/i.test(texto);
}

export function sqlParaExecutar(sql, pedido, previa) {
  let texto = String(sql ?? "").trim().replace(/;\s*$/, "");
  texto = texto.replace(/\btop\s+(?!1\b)\d+\s+/gi, "");
  if (previa) {
    if (!/^select\b/i.test(texto) || /\bselect\s+(distinct\s+)?top\s+1\b/i.test(texto)) return texto;
    return texto.replace(/^select\s+(distinct\s+)?/i, (trecho) => `${trecho}TOP 1 `);
  }
  if (perguntaDeConjunto(pedido)) {
    return texto
      .replace(/\bselect\s+distinct\s+top\s+\d+\s+/i, "SELECT DISTINCT ")
      .replace(/\bselect\s+top\s+\d+\s+/i, "SELECT ");
  }
  return texto;
}

const PALAVRA_SQL = /^(where|on|left|right|inner|outer|join|cross|full|group|order|having|union|with|as|select|from|and|or)$/i;

function profundidadeEm(texto, indice) {
  let profundidade = 0;
  for (let i = 0; i < indice; i += 1) {
    if (texto[i] === "(") profundidade += 1;
    else if (texto[i] === ")") profundidade = Math.max(0, profundidade - 1);
  }
  return profundidade;
}

function housesNoSql(sql) {
  const achados = [];
  const re = /\b(?:from|join)\s+(?:dbo\.)?\[?mov_Logistica_House\]?(?:\s+(?:as\s+)?([A-Za-z_]\w*))?/gi;
  let achado;
  while ((achado = re.exec(sql))) {
    const palavra = achado[1] || "";
    const alias = palavra && !PALAVRA_SQL.test(palavra) ? palavra : "mov_Logistica_House";
    achados.push({ alias, indice: achado.index, profundidade: profundidadeEm(sql, achado.index) });
  }
  const externos = achados.filter((item) => item.profundidade === 0);
  const lista = externos.length ? externos : achados.slice(0, 1);
  return [...new Map(lista.map((item) => [item.alias, item])).values()];
}

function aliasDoCliente(sql, house) {
  const re = new RegExp(
    `\\bjoin\\s+(?:dbo\\.)?\\[?cad_Pessoa\\]?\\s+(?:as\\s+)?([A-Za-z_]\\w*)\\s+on\\s+\\1\\.IdPessoa\\s*=\\s*${house}\\.IdCliente\\b`,
    "i",
  );
  return sql.match(re)?.[1] || "";
}

function inserirFiltro(sql, indice, profundidade, filtro) {
  let i = indice;
  let nivel = profundidade;
  let onde = -1;
  let corte = sql.length;
  while (i < sql.length) {
    const char = sql[i];
    if (char === "(") nivel += 1;
    else if (char === ")") {
      nivel -= 1;
      if (nivel < profundidade) {
        corte = i;
        break;
      }
    } else if (nivel === profundidade) {
      if (onde < 0 && /^where\b/i.test(sql.slice(i))) onde = i;
      else if (/^(?:order|group)\s+by\b|^having\b|^union\b/i.test(sql.slice(i))) {
        corte = i;
        break;
      }
    }
    i += 1;
  }
  if (onde >= 0 && onde < corte) {
    const palavra = sql.slice(onde).match(/^where\b/i)?.[0] ?? "WHERE";
    const resto = sql.slice(onde + palavra.length, corte).replace(/^\s+/, "");
    const ligacao = resto && !/^(?:order|group)\s+by\b|^having\b|^union\b/i.test(resto) ? " AND " : "\n";
    return `${sql.slice(0, onde)}WHERE ${filtro}${ligacao}${resto}${sql.slice(corte)}`;
  }
  const antes = sql.slice(0, corte).replace(/\s*$/, "");
  const depois = sql.slice(corte);
  return `${antes}\nWHERE ${filtro}${depois ? `\n${depois}` : ""}`;
}

export function sqlSemExcecao(sql, pedido) {
  let texto = String(sql ?? "");
  const houses = housesNoSql(texto);
  if (!houses.length) return texto;
  const house = houses[0];
  const partes = [];
  if (!pediuTermo(pedido, "testes?") && !/numero_processo\s+not\s+like\s+'%teste%'/i.test(texto)) {
    partes.push(`${house.alias}.Numero_Processo NOT LIKE '%TESTE%'`);
  }
  if (!pediuTermo(pedido, "demu") && !/numero_processo\s+not\s+like\s+'demu%'/i.test(texto)) {
    partes.push(`${house.alias}.Numero_Processo NOT LIKE 'DEMU%'`);
  }
  if (!pediuCanceladas(pedido)) {
    if (!/data_cancelamento\s+is\s+null/i.test(texto)) partes.push(`${house.alias}.Data_Cancelamento IS NULL`);
    if (!/idstatus_processo_logistico\s*(?:<>|!=)\s*6\b/i.test(texto)) {
      partes.push(`(${house.alias}.IdStatus_Processo_Logistico IS NULL OR ${house.alias}.IdStatus_Processo_Logistico <> 6)`);
    }
  }
  const cliente = aliasDoCliente(texto, house.alias);
  if (cliente && !pediuTermo(pedido, "testes?") && !new RegExp(`${cliente}\\.Nome\\s+NOT\\s+LIKE\\s+'%TESTE%'`, "i").test(texto)) {
    partes.push(`(${cliente}.Nome IS NULL OR ${cliente}.Nome NOT LIKE '%TESTE%')`);
  }
  if (!partes.length) return texto;
  return inserirFiltro(texto, house.indice, house.profundidade, partes.join(" AND "));
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
