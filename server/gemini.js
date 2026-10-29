import { createHash } from "node:crypto";

const CACHE_MS = 15 * 60 * 1000;
const COOLDOWN_LIMITE_MS = 60 * 1000;
const COOLDOWN_INSTAVEL_MS = 30 * 1000;
const RESERVAS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const estados = new Map();

function idDaChave(chave) {
  return createHash("sha256").update(String(chave)).digest("hex");
}

function nomeLimpo(nome) {
  return String(nome ?? "").replace(/^models\//, "").trim();
}

export function modeloGeminiServeAoChat(modelo) {
  const nome = nomeLimpo(modelo?.name ?? modelo);
  const metodos = Array.isArray(modelo?.supportedGenerationMethods)
    ? modelo.supportedGenerationMethods
    : ["generateContent"];
  if (!/^gemini-/i.test(nome) || !metodos.includes("generateContent")) return false;
  return !/(?:image|tts|transcribe|robotics|computer-use|nano-banana|embedding|aqa|live)/i.test(nome);
}

export function ordenarModelosGemini(modelos, preferido) {
  const lista = [...new Set(modelos.map(nomeLimpo).filter(Boolean))];
  const principal = nomeLimpo(preferido);
  if (principal && !lista.includes(principal)) lista.unshift(principal);
  return lista.sort((a, b) => {
    if (a === principal) return -1;
    if (b === principal) return 1;
    const experimentalA = /preview|exp|latest/i.test(a) ? 1 : 0;
    const experimentalB = /preview|exp|latest/i.test(b) ? 1 : 0;
    return experimentalA - experimentalB || a.localeCompare(b);
  });
}

function estadoDaChave(chave) {
  const id = idDaChave(chave);
  let estado = estados.get(id);
  if (!estado) {
    estado = { modelos: [], expira: 0, cursor: 0, bloqueados: new Map() };
    estados.set(id, estado);
  }
  return estado;
}

function erroHttp(mensagem, status) {
  const erro = new Error(String(mensagem || "O Gemini não respondeu."));
  erro.status = Number(status) || 0;
  return erro;
}

async function descobrirModelos(chave) {
  const resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
    { headers: { "x-goog-api-key": chave } },
  );
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw erroHttp(dados?.error?.message || `Gemini respondeu ${resp.status}`, resp.status);
  }
  return (dados.models ?? []).filter(modeloGeminiServeAoChat).map((modelo) => nomeLimpo(modelo.name));
}

export async function modelosGeminiParaTentativa(chave, preferido = process.env.GEMINI_MODEL) {
  const estado = estadoDaChave(chave);
  const agora = Date.now();
  if (!estado.modelos.length || estado.expira <= agora) {
    try {
      const descobertos = await descobrirModelos(chave);
      estado.modelos = ordenarModelosGemini(descobertos, preferido);
      estado.expira = agora + CACHE_MS;
    } catch (erro) {
      if ([401, 403].includes(Number(erro?.status))) throw erro;
      estado.modelos = ordenarModelosGemini(RESERVAS, preferido);
      estado.expira = agora + COOLDOWN_INSTAVEL_MS;
    }
  }

  const inicio = estado.cursor % estado.modelos.length;
  const ordenados = estado.modelos.map((_, indice) => estado.modelos[(inicio + indice) % estado.modelos.length]);
  const livres = ordenados.filter((modelo) => (estado.bloqueados.get(modelo) ?? 0) <= agora);
  return livres.length ? livres : ordenados;
}

function numeroHeader(headers, nome) {
  const valor = Number(headers?.get?.(nome));
  return Number.isFinite(valor) ? valor : null;
}

export function limiteGeminiProximo(headers) {
  const pares = [
    ["x-ratelimit-remaining-requests", "x-ratelimit-limit-requests"],
    ["x-ratelimit-remaining-tokens", "x-ratelimit-limit-tokens"],
    ["ratelimit-remaining", "ratelimit-limit"],
  ];
  return pares.some(([restanteNome, limiteNome]) => {
    const restante = numeroHeader(headers, restanteNome);
    const limite = numeroHeader(headers, limiteNome);
    return restante != null && limite != null && limite > 0 && restante <= Math.max(1, limite * 0.1);
  });
}

function retryDepois(headers) {
  const segundos = Number(headers?.get?.("retry-after"));
  return Number.isFinite(segundos) && segundos > 0 ? Math.min(segundos * 1000, 15 * 60 * 1000) : COOLDOWN_LIMITE_MS;
}

export function registrarResultadoGemini(chave, modelo, { ok, status = 0, headers } = {}) {
  const estado = estadoDaChave(chave);
  const indice = estado.modelos.indexOf(modelo);
  if (indice >= 0) estado.cursor = (indice + 1) % estado.modelos.length;

  if (ok && limiteGeminiProximo(headers)) {
    estado.bloqueados.set(modelo, Date.now() + COOLDOWN_LIMITE_MS);
    return;
  }
  if (Number(status) === 429) {
    estado.bloqueados.set(modelo, Date.now() + retryDepois(headers));
    return;
  }
  if (Number(status) >= 500) {
    estado.bloqueados.set(modelo, Date.now() + COOLDOWN_INSTAVEL_MS);
    return;
  }
  if (ok) estado.bloqueados.delete(modelo);
}

export function limparEstadoGeminiParaTeste() {
  estados.clear();
}
