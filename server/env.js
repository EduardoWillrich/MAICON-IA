import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arquivo = path.join(raiz, ".env");

function aplicarEnvLocal() {
  let texto = "";
  try {
    texto = fs.readFileSync(arquivo, "utf8");
  } catch {
    return;
  }
  for (const linha of texto.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const igual = limpa.indexOf("=");
    if (igual <= 0) continue;
    const chave = limpa.slice(0, igual).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(chave)) continue;
    if (process.env[chave]) continue;
    let valor = limpa.slice(igual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    process.env[chave] = valor;
  }
}

aplicarEnvLocal();

export function emailsAdmin() {
  const bruto = String(process.env.MAICON_ADMINS ?? "");
  return [...new Set(bruto.split(/[,;]/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
}
