import fs from "node:fs";
import path from "node:path";
import { abrirSqlite } from "./sqlite.js";

const PASTA = path.resolve(process.env.MAICON_DATA_DIR || path.join(process.cwd(), "data"));
const POR_PAGINA = 50;
const COLUNA_SECRETA = /^(segredo|senha|password|secret|token|google)$/i;

export function arquivoSqlitePermitido(nome) {
  const base = path.basename(String(nome ?? ""));
  if (!base || base !== String(nome ?? "") || !/^[A-Za-z0-9_-]+\.sqlite$/.test(base)) return "";
  const caminho = path.resolve(PASTA, base);
  if (path.dirname(caminho) !== PASTA || !fs.existsSync(caminho)) return "";
  return base;
}

export function tabelaSqlitePermitida(nome) {
  const tabela = String(nome ?? "");
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(tabela) ? tabela : "";
}

export function valorVisivel(coluna, valor, completo = false) {
  if (valor == null) return "";
  const texto = typeof valor === "string" ? valor : String(valor);
  const secreto = COLUNA_SECRETA.test(coluna) || (coluna === "id" && texto.startsWith("maicon."));
  if (secreto) return texto ? `••••${texto.slice(-4)}` : "";
  const limite = completo ? 80000 : 180;
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

export function listarSqlite() {
  if (!fs.existsSync(PASTA)) return [];
  return fs
    .readdirSync(PASTA)
    .map((nome) => arquivoSqlitePermitido(nome))
    .filter(Boolean)
    .sort()
    .map((arquivo) => {
      const db = abrirSqlite(arquivo);
      const tabelas = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all()
        .map((linha) => String(linha.name));
      return {
        arquivo,
        tabelas: tabelas.map((nome) => ({
          nome,
          total: Number(db.prepare(`SELECT COUNT(*) AS n FROM "${nome}"`).get()?.n) || 0,
        })),
      };
    });
}

export function lerTabelaSqlite(arquivo, tabela, pagina) {
  const nomeArquivo = arquivoSqlitePermitido(arquivo);
  const nomeTabela = tabelaSqlitePermitida(tabela);
  if (!nomeArquivo || !nomeTabela) throw new Error("Tabela inválida.");
  const db = abrirSqlite(nomeArquivo);
  const existe = db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?").get(nomeTabela);
  if (!existe) throw new Error("Tabela não encontrada.");
  const colunas = db.prepare(`PRAGMA table_info("${nomeTabela}")`).all().map((coluna) => String(coluna.name));
  const total = Number(db.prepare(`SELECT COUNT(*) AS n FROM "${nomeTabela}"`).get()?.n) || 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const atual = Math.min(paginas, Math.max(1, Number(pagina) || 1));
  const linhas = db
    .prepare(`SELECT rowid AS _linha, * FROM "${nomeTabela}" LIMIT ? OFFSET ?`)
    .all(POR_PAGINA, (atual - 1) * POR_PAGINA)
    .map((linha) => ({
      _linha: Number(linha._linha) || 0,
      ...Object.fromEntries(colunas.map((coluna) => [coluna, valorVisivel(coluna, linha[coluna])])),
    }));
  return { arquivo: nomeArquivo, tabela: nomeTabela, colunas, linhas, total, pagina: atual, paginas, porPagina: POR_PAGINA };
}

export function lerLinhaSqlite(arquivo, tabela, linha) {
  const nomeArquivo = arquivoSqlitePermitido(arquivo);
  const nomeTabela = tabelaSqlitePermitida(tabela);
  const id = Number(linha);
  if (!nomeArquivo || !nomeTabela || !Number.isInteger(id) || id < 1) throw new Error("Registro inválido.");
  const db = abrirSqlite(nomeArquivo);
  const existe = db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?").get(nomeTabela);
  if (!existe) throw new Error("Tabela não encontrada.");
  const colunas = db.prepare(`PRAGMA table_info("${nomeTabela}")`).all().map((coluna) => String(coluna.name));
  const registro = db.prepare(`SELECT * FROM "${nomeTabela}" WHERE rowid = ?`).get(id);
  if (!registro) throw new Error("Registro não encontrado.");
  return {
    colunas,
    valores: Object.fromEntries(colunas.map((coluna) => [coluna, valorVisivel(coluna, registro[coluna], true)])),
  };
}
