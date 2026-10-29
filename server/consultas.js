import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PASTA = path.resolve("sql/consultas");

function pastaDoAssunto(sql) {
  const tabela = String(sql).match(/\bFROM\s+(?:dbo\.)?\[?([A-Za-z0-9_]+)\]?/i)?.[1]?.toLowerCase() ?? "";
  if (tabela.includes("acompanhamento")) return "acompanhamento";
  if (tabela.includes("atividade")) return "atividade";
  if (tabela.includes("fatura")) return "fatura";
  if (tabela.includes("taxa")) return "taxa";
  if (tabela.includes("financeiro")) return "financeiro";
  if (/house|master|processo/.test(tabela)) return "processo";
  if (/pessoa|cliente/.test(tabela)) return "pessoa";
  return slug(tabela.replace(/^(mov|cad|sys|aux|imp)_/, "")) || "outras";
}

function listarSql(dir = PASTA, prefixo = "") {
  if (!existsSync(dir)) return [];
  const itens = [];
  for (const nome of readdirSync(dir, { withFileTypes: true })) {
    const relativo = prefixo ? `${prefixo}/${nome.name}` : nome.name;
    if (nome.isDirectory()) itens.push(...listarSql(path.join(dir, nome.name), relativo));
    else if (nome.name.endsWith(".sql")) itens.push(relativo);
  }
  return itens.sort();
}

function slug(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 70);
}

function modelo(sql) {
  return sql
    .replace(/;\s*$/g, "")
    .replace(/N?'(?:[^']|'')*'/g, "N'?'")
    .replace(/@\w+/g, "@param")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function nomeDoArquivo(sql) {
  const aliases = [...sql.matchAll(/\bAS\s+(\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*)/gi)].map((m) =>
    m[1].replace(/[[\]]/g, ""),
  );
  const tabela = sql.match(/\bFROM\s+(?:dbo\.)?\[?([A-Za-z0-9_]+)\]?/i)?.[1] ?? "consulta";
  const ignorar = /^(id|numero_|referencia_|data_)/i;
  const assunto = aliases.find((a) => !ignorar.test(a)) || aliases[0] || "consulta";
  return `${slug(tabela)}__${slug(assunto)}`;
}

export function textoConsultasProntas() {
  const arquivos = listarSql();
  if (!arquivos.length) return "";
  const blocos = arquivos.map((arquivo) => {
    const corpo = readFileSync(path.join(PASTA, arquivo), "utf8")
      .replace(/^--.*\n/gm, "")
      .trim();
    const semExemplo = corpo.replace(/\b(?:IM|IA|EM|EA)\d{3,5}-\d{2}(?:\s+TESTE)?\b/gi, "{processo}");
    return `/* ${arquivo} */\n${semExemplo}`;
  });
  return `CONSULTAS PRONTAS (já validadas; reuse uma destas se servir à pergunta, trocando só o filtro):\n${blocos.join("\n\n")}\n`;
}

function palavrasDoPedido(termo) {
  return [...new Set(
    String(termo ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .filter((palavra) => palavra.length >= 4 && !["para", "como", "qual", "quais", "sobre", "pelo", "pela", "esse", "essa", "este", "esta", "mais", "menos", "processo", "processos", "numero", "data", "nome", "consulta"].includes(palavra)),
  )];
}

export function textoConsultasRelevantes(termo, limite = 3) {
  const palavras = palavrasDoPedido(termo);
  if (!palavras.length) return "";
  const ranqueadas = listarSql()
    .map((arquivo) => {
      const corpo = readFileSync(path.join(PASTA, arquivo), "utf8").replace(/^--.*\n/gm, "").trim();
      const base = `${arquivo}\n${corpo}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const arquivoNormal = arquivo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const pontos = palavras.reduce((total, palavra) => {
        const radical = palavra.replace(/s$/, "");
        const noArquivo = arquivoNormal.includes(palavra) || arquivoNormal.includes(radical);
        const noCorpo = base.includes(palavra) || base.includes(radical);
        return total + (noArquivo ? 5 : 0) + (noCorpo ? 1 : 0);
      }, 0);
      return { arquivo, corpo, pontos };
    })
    .filter((item) => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.arquivo.localeCompare(b.arquivo))
    .slice(0, limite);
  if (!ranqueadas.length) return "";
  const blocos = ranqueadas.map((item) => {
    const semExemplo = item.corpo.replace(/\b(?:IM|IA|EM|EA)\d{3,5}-\d{2}(?:\s+TESTE)?\b/gi, "{processo}");
    return `/* ${item.arquivo} */\n${semExemplo.slice(0, 1600)}`;
  });
  return `CONSULTAS PRONTAS RELACIONADAS AO PEDIDO:\n${blocos.join("\n\n")}\n`;
}

export function salvarConsulta(sqlTexto, origem) {
  const sql = String(sqlTexto ?? "").trim().replace(/;\s*$/, "");
  if (!/^select\b/i.test(sql)) return "";
  const pasta = path.join(PASTA, pastaDoAssunto(sql));
  mkdirSync(pasta, { recursive: true });
  const base = nomeDoArquivo(sql);
  const alvo = modelo(sql);
  for (const arquivo of listarSql()) {
    const atual = readFileSync(path.join(PASTA, arquivo), "utf8");
    const corpo = atual.replace(/^--.*\n/gm, "").trim();
    if (modelo(corpo) === alvo) return arquivo;
  }
  let nome = `${base}.sql`;
  let n = 2;
  while (existsSync(path.join(pasta, nome))) {
    nome = `${base}_${n}.sql`;
    n += 1;
  }
  const cabecalho = `-- ${origem}\n-- ${new Date().toISOString().slice(0, 10)}\n\n`;
  writeFileSync(path.join(pasta, nome), `${cabecalho}${sql};\n`);
  return `${path.basename(pasta)}/${nome}`;
}
