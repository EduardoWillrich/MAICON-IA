import { createHmac, timingSafeEqual } from "node:crypto";

const DURACAO_MS = 30 * 24 * 60 * 60 * 1000;
const RENOVAR_ANTES_MS = 7 * 24 * 60 * 60 * 1000;

function segredo() {
  const valor = String(
    process.env.MAICON_SESSION_SECRET ||
    process.env.SQL_PASSWORD ||
    "",
  ).trim();
  if (valor.length < 16) throw new Error("Configure MAICON_SESSION_SECRET com pelo menos 16 caracteres.");
  return valor;
}

function assinatura(conteudo) {
  return createHmac("sha256", segredo()).update(conteudo).digest("base64url");
}

export function criarSessaoAssinada(email, nome, agora = Date.now()) {
  const dados = {
    email: String(email ?? "").trim().toLowerCase(),
    nome: String(nome ?? "").trim().slice(0, 120),
    exp: agora + DURACAO_MS,
  };
  if (!dados.email.includes("@")) throw new Error("Conta inválida para a sessão.");
  const corpo = Buffer.from(JSON.stringify(dados)).toString("base64url");
  return `maicon.v2.${corpo}.${assinatura(corpo)}`;
}

export function lerSessaoAssinada(token, agora = Date.now()) {
  const partes = String(token ?? "").split(".");
  if (partes.length !== 4 || partes[0] !== "maicon" || partes[1] !== "v2") return null;
  const corpo = partes[2];
  const recebida = Buffer.from(partes[3], "base64url");
  const esperada = Buffer.from(assinatura(corpo), "base64url");
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8"));
    const email = String(dados?.email ?? "").trim().toLowerCase();
    const nome = String(dados?.nome ?? "").trim() || email;
    const exp = Number(dados?.exp);
    if (!email.includes("@") || !Number.isFinite(exp) || exp <= agora) return null;
    return { email, nome, exp, renovar: exp - agora <= RENOVAR_ANTES_MS };
  } catch {
    return null;
  }
}
