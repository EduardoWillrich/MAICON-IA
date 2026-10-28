import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const pasta = path.join(process.cwd(), "data");
fs.mkdirSync(pasta, { recursive: true });

const abertas = new Map();

export function abrirSqlite(arquivo) {
  const caminho = path.join(pasta, arquivo);
  const existente = abertas.get(caminho);
  if (existente) return existente;
  const db = new DatabaseSync(caminho, { timeout: 8000 });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 8000");
  db.exec("PRAGMA synchronous = NORMAL");
  abertas.set(caminho, db);
  return db;
}
