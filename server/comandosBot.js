import { abrirSqlite } from "./sqlite.js";

const db = abrirSqlite("conversas.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS comandos_bot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    acao TEXT NOT NULL,
    numero TEXT NOT NULL,
    codigo TEXT NOT NULL,
    campo TEXT NOT NULL,
    valor TEXT NOT NULL,
    resultado TEXT NOT NULL,
    criado TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS exigencias_bot (
    chave TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    numero TEXT NOT NULL,
    campos TEXT NOT NULL,
    atualizado TEXT NOT NULL
  );
`);

export function camposValidos(campos) {
  const lista = (Array.isArray(campos) ? campos : []).map((c) => String(c).replace(/\s+/g, " ").trim()).filter(Boolean);
  const junto = lista.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/reconectar|forcar fechamento|conexao.*(?:perdid|servidor|interrompid)|minimizar|maximizar|ctrl\+?f4|restaurar tamanho/i.test(junto)) return [];
  return lista.filter((c) => !/^(?:cuidado(?:\s+x)?|ok|sim|nao|não|cancelar|fechar|centralizar)$/i.test(c)).slice(0, 8);
}

export function camposPedidos(texto) {
  const bruto = String(texto ?? "");
  const achado = bruto.match(/pediu para preencher:\s*([\s\S]+)/i);
  if (!achado) return [];
  return camposValidos(achado[1]
    .replace(/\.\s*Diga o valor[\s\S]*$/i, "")
    .replace(/\.\s*$/, "")
    .split(";")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 1)
    .slice(0, 8));
}

export function guardarExigencia({ codigo, nome, numero, campos }) {
  const lista = Array.isArray(campos)
    ? camposValidos(campos)
    : camposPedidos(campos);
  const codigoLimpo = curto(codigo, 20);
  if (!lista.length || !codigoLimpo) return;
  const chave = curto(`${codigoLimpo} ${nome}`, 80).toLowerCase();
  db.prepare(
    `INSERT INTO exigencias_bot (chave, codigo, nome, numero, campos, atualizado)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(chave) DO UPDATE SET numero = excluded.numero, campos = excluded.campos, atualizado = excluded.atualizado`,
  ).run(chave, codigoLimpo, curto(nome, 80), curto(numero, 40), lista.join("; "), agora());
}

function textoExigencias() {
  const linhas = db
    .prepare(`SELECT codigo, nome, campos FROM exigencias_bot ORDER BY atualizado DESC LIMIT 8`)
    .all();
  if (!linhas.length) return "";
  const itens = linhas.filter((linha) => camposValidos(linha.campos.split(";")).length).map((linha) => `- ${linha.codigo} ${linha.nome}: antes de concluir, preencher ${camposValidos(linha.campos.split(";")).join("; ")}.`);
  if (!itens.length) return "";
  return `\n\nO que o HeadCargo já exigiu antes de concluir\n\n${itens.join("\n")}`;
}

export function exigenciasDoProcesso(numero, codigo) {
  return db.prepare("SELECT campos FROM exigencias_bot WHERE lower(numero)=lower(?) AND codigo=? ORDER BY atualizado DESC")
    .all(String(numero).trim(), String(codigo).trim()).flatMap((r) => camposValidos(r.campos.split(";")));
}

function agora() {
  return new Date().toISOString();
}

function curto(valor, limite) {
  return String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, limite);
}

export function registrarComandoBot({ email, acao, numero, codigo, campo, valor, resultado }) {
  db.prepare(
    `INSERT INTO comandos_bot (email, acao, numero, codigo, campo, valor, resultado, criado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    curto(email, 180).toLowerCase(),
    curto(acao, 20),
    curto(numero, 40),
    curto(codigo, 20),
    curto(campo, 80),
    curto(valor, 180),
    curto(resultado, 500),
    agora(),
  );
}

function horaDe(iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(data.getDate())}/${p(data.getMonth() + 1)} ${p(data.getHours())}:${p(data.getMinutes())}`;
}

export function textoComandosBot(limite = 12) {
  const quantidade = Math.min(30, Math.max(1, Number(limite) || 12));
  const linhas = db
    .prepare(
      `SELECT acao, numero, codigo, campo, valor, resultado, criado
       FROM comandos_bot ORDER BY id DESC LIMIT ?`,
    )
    .all(quantidade);
  if (!linhas.length) return "O bot ainda não recebeu comando nesta aba.";
  const itens = linhas.map((linha) => {
    const alvo = [linha.codigo, linha.numero].filter(Boolean).join(" de ");
    const detalhe =
      linha.acao === "preencher"
        ? `preencher ${linha.campo || "o campo"} com ${linha.valor || "o valor informado"}`
        : linha.acao;
    return `- ${horaDe(linha.criado)} ${detalhe}${alvo ? ` em ${alvo}` : ""}. ${linha.resultado}`;
  });
  return `Comandos que o bot já recebeu\n\n${itens.join("\n")}${textoExigencias()}`;
}
