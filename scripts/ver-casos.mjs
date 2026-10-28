import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/conversas.sqlite", { readOnly: true });
const ids = [
  ["b33d4b3a-e61a-469c-a952-15a37ec5fb71", 11],
  ["be799dcf-742f-40e9-b919-c03dd9d736a9", 3],
  ["9babf978-f55e-4f30-810f-43b8c843c25e", null],
  ["cb54efa9-2182-4db3-9c5f-b33a16d1670d", null],
];
for (const [id, ordem] of ids) {
  const rows = db.prepare("SELECT ordem, conteudo FROM mensagens WHERE conversa_id = ? ORDER BY ordem").all(id);
  console.log("\n====", id, "msgs", rows.length);
  for (const row of rows) {
    if (ordem != null && row.ordem !== ordem) continue;
    const msg = JSON.parse(row.conteudo);
    if (msg.role !== "assistant") continue;
    const c = msg.content || "";
    console.log("ordem", row.ordem, "len", c.length, "log", Boolean(msg.log), "relatorio", Boolean(msg.relatorio));
    console.log(c.slice(0, 1200));
    console.log("---TAIL---");
    console.log(c.slice(-400));
  }
}
