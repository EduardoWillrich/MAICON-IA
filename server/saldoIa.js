import { usoIaDesde } from "./conversas.js";

const LIMITE_GOOGLE = 1500;
let cacheOpenRouter = { ate: 0, dados: null };

export function inicioDoDiaPacifico(agora = new Date()) {
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  const meioDia = new Date(`${dia}T12:00:00Z`);
  const horaLocal = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(meioDia));
  const deslocamento = 12 - horaLocal;
  return new Date(Date.parse(`${dia}T00:00:00Z`) + deslocamento * 3600000).toISOString();
}

export function restante(usados, limite) {
  const usado = Math.max(0, Number(usados) || 0);
  const teto = Math.max(0, Number(limite) || 0);
  return Math.max(0, teto - usado);
}

async function saldoOpenRouter() {
  const chave = String(process.env.OPENROUTER_API_KEY || "").trim();
  if (!chave) return { ativo: false };
  if (cacheOpenRouter.dados && cacheOpenRouter.ate > Date.now()) return cacheOpenRouter.dados;
  const cabecalhos = { Authorization: `Bearer ${chave}` };
  const [chaveResp, creditoResp] = await Promise.all([
    fetch("https://openrouter.ai/api/v1/key", { headers: cabecalhos, signal: AbortSignal.timeout(8000) }),
    fetch("https://openrouter.ai/api/v1/credits", { headers: cabecalhos, signal: AbortSignal.timeout(8000) }),
  ]);
  const chaveJson = await chaveResp.json().catch(() => ({}));
  const creditoJson = await creditoResp.json().catch(() => ({}));
  if (!chaveResp.ok) return { ativo: true, erro: true };
  const data = chaveJson.data ?? {};
  const livre = data.free_model_daily_requests ?? {};
  const creditos = creditoJson.data ?? {};
  const dados = {
    ativo: true,
    erro: false,
    usado: Number(data.usage) || 0,
    teto: data.limit == null ? null : Number(data.limit) || 0,
    restante: data.limit_remaining == null ? null : Number(data.limit_remaining) || 0,
    pedidos: Number(livre.used) || 0,
    limite: livre.limit == null ? null : Number(livre.limit) || 0,
    restam: livre.remaining == null ? null : Number(livre.remaining) || 0,
    contaUsada: Number(creditos.total_usage) || 0,
    contaTotal: Number(creditos.total_credits) || 0,
  };
  cacheOpenRouter = { ate: Date.now() + 15000, dados };
  return dados;
}

export async function saldoIa() {
  const limite = Number(process.env.GOOGLE_LIMITE_DIA || LIMITE_GOOGLE) || LIMITE_GOOGLE;
  const desde = inicioDoDiaPacifico();
  const google = usoIaDesde("google", desde);
  const local = usoIaDesde("openrouter", desde);
  let remoto = { ativo: false };
  try {
    remoto = await saldoOpenRouter();
  } catch {
    remoto = { ativo: Boolean(String(process.env.OPENROUTER_API_KEY || "").trim()), erro: true };
  }
  return {
    google: {
      pedidos: google.pedidos,
      limite,
      restam: restante(google.pedidos, limite),
      tokens: google.tokens,
      entrada: google.entrada,
      saida: google.saida,
    },
    openrouter: {
      ativo: Boolean(remoto.ativo),
      erro: Boolean(remoto.erro),
      usado: remoto.usado ?? null,
      teto: remoto.teto ?? null,
      restante: remoto.restante ?? null,
      pedidos: remoto.pedidos ?? local.pedidos,
      limite: remoto.limite ?? null,
      restam: remoto.restam ?? null,
      tokens: local.tokens,
      contaUsada: remoto.contaUsada ?? null,
      contaTotal: remoto.contaTotal ?? null,
    },
  };
}
