import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arquivo = path.join(raiz, ".env");

try {
  process.loadEnvFile(arquivo);
} catch (erro) {
  console.error(`Não leu o .env em ${arquivo}: ${erro?.message || erro}`);
}

export function emailsAdmin() {
  let texto = "";
  try {
    texto = fs.readFileSync(arquivo, "utf8");
  } catch {
    texto = "";
  }
  const linha = texto.split(/\r?\n/).find((item) => /^\s*MAICON_ADMINS\s*=/.test(item));
  const bruto = linha
    ? linha.replace(/^\s*MAICON_ADMINS\s*=\s*/, "").trim().replace(/^["']|["']$/g, "")
    : String(process.env.MAICON_ADMINS ?? "");
  return [...new Set(bruto.split(/[,;]/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
}
