import { DatabaseSync } from "node:sqlite";
import fs from "fs";

const p = "data/conversas.sqlite";
console.log("exists", fs.existsSync(p));
if (!fs.existsSync(p)) process.exit(0);
const db = new DatabaseSync(p, { readOnly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
console.log(tables);
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(t.name, cols.map((c) => c.name).join(", "));
  const n = db.prepare(`SELECT COUNT(*) AS n FROM ${t.name}`).get();
  console.log("count", n);
}
