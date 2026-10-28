import { DatabaseSync } from "node:sqlite";

function textoDaConsulta(resultado) {
  const limpo = String(resultado ?? "").trim();
  if (!limpo) return "";
  try {
    const dados = JSON.parse(limpo);
    if (typeof dados.texto === "string" && dados.texto.trim()) return dados.texto.trim();
    if (Array.isArray(dados.linhas) && dados.linhas.length) {
      const linhas = dados.linhas.filter((linha) => linha && typeof linha === "object");
      const colunas = Object.keys(linhas[0] ?? {}).filter((coluna) => !/^id/i.test(coluna)).slice(0, 8);
      if (!colunas.length) return limpo;
      const celula = (valor) => String(valor ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
      const cabeca = `| ${colunas.join(" | ")} |`;
      const traco = `| ${colunas.map(() => "---").join(" | ")} |`;
      const corpo = linhas.slice(0, 30).map((linha) => `| ${colunas.map((coluna) => celula(linha[coluna])).join(" | ")} |`);
      const extra = linhas.length > 30 ? `\n\nMostrei 30 de ${linhas.length}.` : "";
      return `${cabeca}\n${traco}\n${corpo.join("\n")}${extra}`;
    }
    if ("sql" in dados || "house" in dados) return "";
  } catch {
    /* texto */
  }
  return limpo;
}

function objetosDaLista(texto, marca) {
  const pos = texto.indexOf(marca);
  if (pos < 0) return [];
  const ini = texto.indexOf("[", pos);
  if (ini < 0) return [];
  const lista = [];
  let i = ini + 1;
  while (i < texto.length) {
    while (i < texto.length && /[\s,]/.test(texto[i])) i += 1;
    if (texto[i] !== "{") break;
    const fim = fimDoJson(texto, i);
    if (fim < 0) break;
    try {
      lista.push(JSON.parse(texto.slice(i, fim)));
    } catch {
      break;
    }
    i = fim;
  }
  return lista;
}

function tabelaDosRegistros(lista) {
  if (!Array.isArray(lista) || !lista.length) return "";
  return textoDaConsulta(JSON.stringify({ linhas: lista }));
}

function fimDoJson(texto, inicio) {
  let profundidade = 0;
  let textoAberto = false;
  let escape = false;
  for (let i = inicio; i < texto.length; i += 1) {
    const char = texto[i];
    if (textoAberto) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') textoAberto = false;
      continue;
    }
    if (char === '"') textoAberto = true;
    else if (char === "{") profundidade += 1;
    else if (char === "}") {
      profundidade -= 1;
      if (profundidade === 0) return i + 1;
    }
  }
  return -1;
}

function respostaSemPayload(texto) {
  const inicio = texto.indexOf("{");
  if (inicio < 0 || !/"sql"\s*:/.test(texto)) return texto;
  const antes = texto.slice(0, inicio).trim();
  if (/```/.test(antes)) return texto;
  const fim = fimDoJson(texto, inicio);
  if (fim < 0) {
    const tabela = tabelaDosRegistros(objetosDaLista(texto.slice(inicio), '"linhas"'));
    return [antes, tabela, tabela ? "" : "A consulta veio cortada. Peça um período menor para ver a lista completa."].filter(Boolean).join("\n\n");
  }
  const candidato = texto.slice(inicio, fim).trim();
  const depois = texto.slice(fim).trim();
  const limpo = textoDaConsulta(candidato);
  const util = limpo && limpo !== candidato && !/"sql"\s*:/.test(limpo) ? limpo : "";
  if (!util && !depois) {
    let house = "";
    try {
      const dados = JSON.parse(candidato);
      house = [tabelaDosRegistros(dados.house), tabelaDosRegistros(dados.master)].filter(Boolean).join("\n\n");
    } catch {
      house = "";
    }
    if (house) return [antes, house].filter(Boolean).join("\n\n");
  }
  return [antes, util, depois].filter(Boolean).join("\n\n") || antes || "Não encontrei dados para mostrar nessa consulta.";
}

function semBlocoAberto(texto) {
  const cercas = texto.match(/```/g)?.length ?? 0;
  if (cercas % 2 === 0) return texto;
  const corte = texto.lastIndexOf("```");
  const antes = texto.slice(0, corte).trimEnd();
  const resto = texto.slice(corte);
  const tipo = resto.match(/^```([a-z]*)/i)?.[1]?.toLowerCase() ?? "";
  const corpo = resto.replace(/^```[a-z]*[^\S\n]*\n?/i, "");
  if (tipo === "log" || tipo === "json" || /"rotulo"\s*:/.test(corpo)) {
    const itens = objetosDaLista(corpo, '"itens"');
    if (itens.length) {
      const titulo = corpo.match(/"titulo"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1] ?? "Log recente";
      const sub = corpo.match(/"sub"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1] ?? "";
      const bloco = "```log\n" + JSON.stringify({ titulo, sub, itens }) + "\n```";
      return antes ? `${antes}\n\n${bloco}` : bloco;
    }
  }
  if (tipo === "grafico" || tipo === "email" || tipo === "rota") {
    const fechado = `${resto.trimEnd()}\n\`\`\``;
    return antes ? `${antes}\n${fechado}` : fechado;
  }
  return antes;
}

function normalizarCartoes(texto) {
  const limpo = semBlocoAberto(texto)
    .replace(/```([a-z]*)[^\S\n]*\n?([\s\S]*?)```/gi, (bloco, linguagem, corpo) => {
      const tipo = String(linguagem).toLowerCase();
      const conteudo = String(corpo).trim();
      if (!conteudo) return "";
      if (/^(grafico|email|rota)$/.test(tipo)) return bloco;
      if (!/^(log|painel|json)$/.test(tipo) && !/^[{[]/.test(conteudo)) return bloco;
      try {
        const dados = JSON.parse(conteudo);
        if (dados?.banco) return "```painel\n" + conteudo + "\n```";
        if (Array.isArray(dados?.itens) && dados.itens.length) return "```log\n" + conteudo + "\n```";
      } catch {
        return "";
      }
      return "";
    })
    .trim();
  return /```/.test(limpo) ? limpo : limpo.replace(/^\s*\{\s*"titulo"\s*:[\s\S]*$/m, "").trim();
}

function visivel(content) {
  return normalizarCartoes(respostaSemPayload(content));
}

const db = new DatabaseSync("data/conversas.sqlite", { readOnly: true });
const rows = db.prepare("SELECT conversa_id, ordem, conteudo FROM mensagens").all();
const vazias = [];
const encolheu = [];
let assistente = 0;
for (const row of rows) {
  let msg;
  try {
    msg = JSON.parse(row.conteudo);
  } catch {
    continue;
  }
  if (msg.role !== "assistant" || !msg.content?.trim()) continue;
  assistente += 1;
  const saida = visivel(msg.content);
  if (!saida.trim() && !msg.log && !msg.relatorio) {
    vazias.push({ id: row.conversa_id, ordem: row.ordem, amostra: msg.content.slice(0, 280) });
  } else if (saida.length < msg.content.length * 0.35 && msg.content.length > 400 && !msg.log && !msg.relatorio) {
    encolheu.push({ id: row.conversa_id, ordem: row.ordem, de: msg.content.length, para: saida.length, amostra: msg.content.slice(0, 180) });
  }
}
console.log("assistente com texto", assistente);
console.log("some na tela", vazias.length);
for (const item of vazias.slice(0, 25)) console.log("---", item.id, item.ordem, item.amostra.replace(/\n/g, " | "));
console.log("encolheu forte", encolheu.length);
for (const item of encolheu.slice(0, 15)) console.log("---", item.id, item.de, "->", item.para, item.amostra.replace(/\n/g, " | "));

const ruins = db.prepare("SELECT pergunta, comentario, substr(resposta,1,200) AS resposta FROM avaliacoes WHERE nota < 0").all();
console.log("avaliacoes ruins", ruins.length);
for (const item of ruins) console.log("RUIM", item.pergunta, "|", item.comentario, "|", String(item.resposta).replace(/\n/g, " "));

const falhas = db.prepare("SELECT pergunta, motivo FROM falhas ORDER BY id DESC LIMIT 15").all();
console.log("falhas");
for (const item of falhas) console.log("FALHA", item.pergunta, "|", item.motivo);
