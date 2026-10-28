import { abrirSqlite } from "./sqlite.js";

const db = abrirSqlite("conversas.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS conversas (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    titulo TEXT NOT NULL,
    atualizado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mensagens (
    conversa_id TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    conteudo TEXT NOT NULL,
    PRIMARY KEY (conversa_id, ordem)
  );
  CREATE INDEX IF NOT EXISTS conversas_email ON conversas (email, atualizado DESC);
  CREATE TABLE IF NOT EXISTS consultas_feitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    conversa_id TEXT NOT NULL DEFAULT '',
    origem TEXT NOT NULL,
    sql TEXT NOT NULL,
    criado TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS consultas_feitas_email ON consultas_feitas (email, criado DESC);
  CREATE INDEX IF NOT EXISTS consultas_feitas_conversa ON consultas_feitas (conversa_id, criado);
  CREATE TABLE IF NOT EXISTS chaves (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    provedor TEXT NOT NULL,
    rotulo TEXT NOT NULL,
    segredo TEXT NOT NULL,
    extra TEXT NOT NULL DEFAULT '',
    ordem INTEGER NOT NULL,
    ativa INTEGER NOT NULL DEFAULT 1
  );
`);

try {
  db.exec("ALTER TABLE conversas ADD COLUMN oculta INTEGER NOT NULL DEFAULT 0");
} catch {
  /* a coluna já existe */
}

const PROVEDORES = new Set(["openrouter", "groq", "gemini", "ollama"]);

function agora() {
  return new Date().toISOString();
}

export function listarConversas(email, termo = "") {
  const q = String(termo ?? "").trim().replace(/[%_]/g, "");
  if (!q) {
    return db
      .prepare(
        `SELECT id, titulo, atualizado
         FROM conversas
         WHERE email = ? AND oculta = 0
         ORDER BY atualizado DESC
         LIMIT 80`,
      )
      .all(email);
  }
  const like = `%${q}%`;
  return db
    .prepare(
      `SELECT DISTINCT c.id, c.titulo, c.atualizado
       FROM conversas c
       LEFT JOIN mensagens m ON m.conversa_id = c.id
       WHERE c.email = ? AND c.oculta = 0
         AND (c.titulo LIKE ? OR m.conteudo LIKE ?)
       ORDER BY c.atualizado DESC
       LIMIT 80`,
    )
    .all(email, like, like);
}

export function criarConversa(email, titulo) {
  const id = crypto.randomUUID();
  const atualizado = agora();
  db.prepare(
    `INSERT INTO conversas (id, email, titulo, atualizado) VALUES (?, ?, ?, ?)`,
  ).run(id, email, titulo.slice(0, 80) || "Nova conversa", atualizado);
  return { id, titulo, atualizado };
}

function daPessoa(id, email) {
  return db.prepare(`SELECT id, titulo, atualizado FROM conversas WHERE id = ? AND email = ?`).get(id, email);
}

export function lerConversa(id, email) {
  const conversa = daPessoa(id, email);
  if (!conversa) return null;
  const linhas = db
    .prepare(`SELECT conteudo FROM mensagens WHERE conversa_id = ? ORDER BY ordem`)
    .all(id);
  return {
    ...conversa,
    mensagens: linhas.map((linha) => JSON.parse(linha.conteudo)),
  };
}

export function salvarConversa(id, email, titulo, mensagens) {
  const conversa = daPessoa(id, email);
  if (!conversa) return null;
  const atualizado = agora();
  const lista = Array.isArray(mensagens) ? mensagens : [];
  const gravar = db.prepare(`INSERT INTO mensagens (conversa_id, ordem, conteudo) VALUES (?, ?, ?)`);
  db.exec("BEGIN");
  try {
    db.prepare(`UPDATE conversas SET titulo = ?, atualizado = ? WHERE id = ?`).run(
      String(titulo || conversa.titulo).slice(0, 80),
      atualizado,
      id,
    );
    db.prepare(`DELETE FROM mensagens WHERE conversa_id = ?`).run(id);
    lista.forEach((mensagem, ordem) => {
      gravar.run(id, ordem, JSON.stringify(mensagem));
    });
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
  return { id, titulo, atualizado };
}

export function registrarConsultaFeita({ email, conversaId, origem, sql }) {
  const texto = String(sql ?? "").trim();
  if (texto.length < 15 || !/\b(select|with)\b/i.test(texto)) return;
  db.prepare(
    `INSERT INTO consultas_feitas (email, conversa_id, origem, sql, criado) VALUES (?, ?, ?, ?, ?)`,
  ).run(
    String(email || "").slice(0, 180),
    String(conversaId || "").slice(0, 80),
    String(origem || "consulta").slice(0, 80),
    texto.slice(0, 100000),
    agora(),
  );
}

export function listarChaves(email) {
  return db
    .prepare(
      `SELECT id, provedor, rotulo, extra, ordem, ativa, segredo
       FROM chaves WHERE email = ? ORDER BY ordem, rotulo`,
    )
    .all(email)
    .map((linha) => ({
      id: linha.id,
      provedor: linha.provedor,
      rotulo: linha.rotulo,
      extra: linha.extra,
      ordem: linha.ordem,
      ativa: Boolean(linha.ativa),
      final: String(linha.segredo).slice(-4),
    }));
}

export function chavesParaUso(email) {
  return db
    .prepare(
      `SELECT provedor, segredo, extra FROM chaves
       WHERE email = ? AND ativa = 1 ORDER BY ordem, rotulo`,
    )
    .all(email)
    .map((linha) => ({ provedor: linha.provedor, chave: linha.segredo, extra: linha.extra }));
}

export function criarChave(email, dados) {
  const provedor = String(dados.provedor ?? "").trim();
  const segredo = String(dados.chave ?? "").trim();
  if (!PROVEDORES.has(provedor)) throw new Error("Provedor inválido.");
  if (segredo.length < 8) throw new Error("Informe a chave da API.");
  const id = crypto.randomUUID();
  const ordem = Number(db.prepare(`SELECT COALESCE(MAX(ordem), 0) + 1 AS n FROM chaves WHERE email = ?`).get(email).n);
  db.prepare(
    `INSERT INTO chaves (id, email, provedor, rotulo, segredo, extra, ordem, ativa)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(id, email, provedor, String(dados.rotulo || provedor).slice(0, 40), segredo, String(dados.extra || "").slice(0, 120), ordem);
  return listarChaves(email);
}

export function apagarChave(id, email) {
  const r = db.prepare(`DELETE FROM chaves WHERE id = ? AND email = ?`).run(id, email);
  return r.changes > 0;
}

export function apagarConversa(id, email) {
  if (!daPessoa(id, email)) return false;
  db.prepare(`UPDATE conversas SET oculta = 1, atualizado = ? WHERE id = ? AND email = ?`).run(agora(), id, email);
  return true;
}

export function apagarConversas(email) {
  const r = db.prepare(`UPDATE conversas SET oculta = 1, atualizado = ? WHERE email = ? AND oculta = 0`).run(agora(), email);
  return r.changes;
}
