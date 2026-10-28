import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/conversas.sqlite", { readOnly: true });
const rows = db.prepare("SELECT visao, chave, ferramentas FROM receitas WHERE chave LIKE '%contas acessaram%'").all();
console.log(rows);
