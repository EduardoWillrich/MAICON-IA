import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CIAS = {
  AD: "Azul",
  G3: "GOL",
  LA: "LATAM",
  JJ: "LATAM",
  "2Z": "Voepass",
  TP: "TAP",
  AF: "Air France",
  KL: "KLM",
  LH: "Lufthansa",
  IB: "Iberia",
  AA: "American Airlines",
  UA: "United",
  DL: "Delta",
  CM: "Copa",
  AR: "Aerolíneas Argentinas",
  AV: "Avianca",
};

const NAVEGADORES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
];

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portaLivre() {
  return new Promise((resolve, reject) => {
    const servidor = createServer();
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", () => {
      const porta = servidor.address().port;
      servidor.close(() => resolve(porta));
    });
  });
}

export function caminhoDoNavegador() {
  return NAVEGADORES.map((item) => String(item || "").trim()).find((item) => item && existsSync(item)) || "";
}

function horaDoTrecho(valor) {
  return String(valor || "").match(/T(\d{2}:\d{2})/)?.[1] || "";
}

function dataDoTrecho(valor) {
  return String(valor || "").slice(0, 10);
}

function dataIso(data) {
  return `${data.ano}-${String(data.mes).padStart(2, "0")}-${String(data.dia).padStart(2, "0")}`;
}

export function ofertasDaMaxMilhas(dados, pedido) {
  const blocos = Array.isArray(dados) ? dados : [dados];
  const dia = dataIso(pedido.embarque);
  const vistas = new Set();
  const ofertas = [];
  for (const bloco of blocos) {
    for (const item of bloco?.offers || []) {
      const total = Number(item?.priceDetails?.totalPrices?.total);
      const ida = (item?.bounds || []).find((trecho) => trecho?.number === 0) || item?.bounds?.[0];
      const saida = ida?.departure?.dateTime || "";
      if (!ida || !Number.isFinite(total) || total <= 0 || dataDoTrecho(saida) !== dia) continue;
      const codigo = String(ida.carrier || ida.segments?.[0]?.marketingAirlineCode || "").toUpperCase();
      const cia = CIAS[codigo] || codigo;
      const hora = horaDoTrecho(saida);
      const origem = String(ida.departure?.locationCode || "").toUpperCase();
      const destino = String(ida.arrival?.locationCode || "").toUpperCase();
      const escalas = Number(ida.totalStops) > 0 ? String(ida.totalStops) : "-";
      if (!cia || !origem || !destino) continue;
      const chave = `${cia}|${hora}|${origem}|${destino}|${total}|${escalas}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      ofertas.push({ cia, hora, origem, destino, escalas, valor: total, onde: "MaxMilhas" });
    }
  }
  return ofertas;
}

function encerrar(filho) {
  if (!filho?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(filho.pid), "/T", "/F"], { windowsHide: true });
    return;
  }
  filho.kill("SIGKILL");
}

export async function lerJsonDaMaxMilhas(url) {
  if (!/^https:\/\/www\.maxmilhas\.com\.br\/busca-passagens-aereas\//.test(String(url || ""))) return [];
  if (typeof WebSocket !== "function") return [];
  const navegador = caminhoDoNavegador();
  if (!navegador) return [];
  const perfil = mkdtempSync(join(tmpdir(), "maicon-voo-"));
  const porta = await portaLivre();
  const filho = spawn(navegador, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--mute-audio",
    `--user-data-dir=${perfil}`,
    `--remote-debugging-port=${porta}`,
    "about:blank",
  ], { windowsHide: true });
  let ws;
  try {
    let versao;
    for (let i = 0; i < 20 && !versao; i += 1) {
      try {
        versao = await fetch(`http://127.0.0.1:${porta}/json/version`).then((resp) => resp.json());
      } catch {
        await esperar(250);
      }
    }
    if (!versao?.webSocketDebuggerUrl) return [];
    ws = new WebSocket(versao.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error("navegador")), { once: true });
    });
    let seq = 0;
    const pendentes = new Map();
    const eventos = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pendentes.has(msg.id)) {
        pendentes.get(msg.id)(msg);
        pendentes.delete(msg.id);
        return;
      }
      eventos.push(msg);
    });
    const enviar = (method, params = {}, sessionId) => new Promise((resolve) => {
      const id = ++seq;
      const pacote = { id, method, params };
      if (sessionId) pacote.sessionId = sessionId;
      pendentes.set(id, resolve);
      ws.send(JSON.stringify(pacote));
    });
    const criado = await enviar("Target.createTarget", { url });
    const sessao = await enviar("Target.attachToTarget", { targetId: criado.result.targetId, flatten: true });
    const sessionId = sessao.result?.sessionId;
    if (!sessionId) return [];
    await enviar("Network.enable", {}, sessionId);
    const lidos = [];
    const vistos = new Set();
    let primeiro = 0;
    const fim = Date.now() + 20000;
    while (Date.now() < fim) {
      await esperar(300);
      const lote = eventos.splice(0);
      for (const msg of lote) {
        if (msg.method !== "Network.responseReceived" || msg.sessionId !== sessionId) continue;
        const endereco = msg.params?.response?.url || "";
        if (!/\/search\/air-offer\/offers\/[^/]+\/[a-z0-9-]+$/i.test(endereco)) continue;
        if (vistos.has(msg.params.requestId)) continue;
        vistos.add(msg.params.requestId);
        const corpo = await enviar("Network.getResponseBody", { requestId: msg.params.requestId }, sessionId);
        let texto = corpo.result?.body || "";
        if (corpo.result?.base64Encoded) texto = Buffer.from(texto, "base64").toString("utf8");
        if (!texto.includes('"offers"')) continue;
        try {
          lidos.push(JSON.parse(texto));
        } catch {
          continue;
        }
      }
      if (!primeiro && lidos.length) primeiro = Date.now();
      if (lidos.length >= 3) break;
      if (primeiro && Date.now() - primeiro > 5000) break;
    }
    return lidos;
  } catch {
    return [];
  } finally {
    try { ws?.close(); } catch { /* o navegador já fechou */ }
    encerrar(filho);
    const limpeza = setTimeout(() => {
      try { rmSync(perfil, { recursive: true, force: true }); } catch { /* o perfil some com o Windows */ }
    }, 800);
    limpeza.unref?.();
  }
}
