import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { abrirSqlite } from "./sqlite.js";
import { AsyncLocalStorage } from "node:async_hooks";

const db = abrirSqlite("operacoes.sqlite");
db.exec(`CREATE TABLE IF NOT EXISTS desktop_lock (
  sessao TEXT PRIMARY KEY, dono TEXT NOT NULL, vence INTEGER NOT NULL
)`);
const sessao = `${hostname()}:${process.env.USERNAME || "desktop"}:${process.env.SESSIONNAME || "console"}`;
let cauda = Promise.resolve();
const contexto = new AsyncLocalStorage();

// All callers, including legacy commands, share the same desktop lock.
// The SQLite lease also serializes overlapping Node processes on this machine.
export function executarNoDesktop(executar) {
  if (contexto.getStore()) return Promise.resolve().then(executar);
  const pedido = cauda.then(async () => {
    const dono = randomUUID();
    const limite = Date.now() + 600000;
    while (true) {
      const agora = Date.now();
      const r = db.prepare(`INSERT INTO desktop_lock VALUES (?, ?, ?)
        ON CONFLICT(sessao) DO UPDATE SET dono=excluded.dono, vence=excluded.vence
        WHERE desktop_lock.vence < ?`).run(sessao, dono, agora + 30000, agora);
      if (r.changes) break;
      if (agora > limite) throw new Error("O HeadCargo está ocupado por outra execução.");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const renovar = setInterval(() => {
      db.prepare("UPDATE desktop_lock SET vence=? WHERE sessao=? AND dono=?").run(Date.now() + 30000, sessao, dono);
    }, 5000);
    renovar.unref();
    try { return await contexto.run(true, executar); }
    finally {
      clearInterval(renovar);
      db.prepare("DELETE FROM desktop_lock WHERE sessao=? AND dono=?").run(sessao, dono);
    }
  });
  cauda = pedido.catch(() => {});
  return pedido;
}
