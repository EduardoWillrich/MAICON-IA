import { criarFiltroDeChamada, criarFiltroDePensamento, extrairChamadasDoTexto } from "./chamadaTexto.js";

export const MODELO_GEMMA = "gemma-4-26b-a4b-it";
export const JANELA_GEMMA = 262144;

const TIPOS = {
  string: "STRING",
  number: "NUMBER",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  array: "ARRAY",
  object: "OBJECT",
};

export function modeloGoogle(preferido = process.env.GOOGLE_MODEL) {
  const nome = String(preferido ?? "").trim();
  if (!nome) return MODELO_GEMMA;
  const curto = nome.includes("/") ? nome.slice(nome.lastIndexOf("/") + 1) : nome;
  return curto || MODELO_GEMMA;
}

export function urlGoogle(modelo, fluxo = "gerar") {
  const nome = encodeURIComponent(modeloGoogle(modelo));
  const acao = fluxo === "stream" ? "streamGenerateContent?alt=sse" : "generateContent";
  return `https://generativelanguage.googleapis.com/v1beta/models/${nome}:${acao}`;
}

function esquema(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return valor;
  const saida = {};
  for (const [chave, item] of Object.entries(valor)) {
    if (chave === "additionalProperties" || chave === "$schema") continue;
    if (chave === "type" && typeof item === "string") {
      saida.type = TIPOS[item.toLowerCase()] || item.toUpperCase();
      continue;
    }
    if (chave === "properties" && item && typeof item === "object") {
      saida.properties = Object.fromEntries(Object.entries(item).map(([nome, prop]) => [nome, esquema(prop)]));
      continue;
    }
    if (chave === "items") {
      saida.items = esquema(item);
      continue;
    }
    if (chave === "enum" && Array.isArray(item)) {
      saida.enum = item.map((valor) => String(valor));
      continue;
    }
    saida[chave] = item;
  }
  return saida;
}

export function declaracoesGoogle(tools) {
  return (Array.isArray(tools) ? tools : [])
    .map((item) => {
      const fn = item?.function ?? item ?? {};
      return {
        name: String(fn.name ?? "").trim(),
        description: String(fn.description || fn.name || "").trim(),
        parameters: esquema(fn.parameters || { type: "object", properties: {} }),
      };
    })
    .filter((item) => item.name);
}

function argsDaChamada(bruto) {
  if (bruto && typeof bruto === "object" && !Array.isArray(bruto)) return bruto;
  try {
    const lido = JSON.parse(String(bruto || "{}"));
    return lido && typeof lido === "object" && !Array.isArray(lido) ? lido : { valor: lido };
  } catch {
    return {};
  }
}

function respostaDaFerramenta(conteudo) {
  const texto = typeof conteudo === "string" ? conteudo : JSON.stringify(conteudo ?? "");
  try {
    const lido = JSON.parse(texto);
    if (lido && typeof lido === "object" && !Array.isArray(lido)) return lido;
    return { resultado: lido };
  } catch {
    return { resultado: texto };
  }
}

function acrescentar(contents, role, parts) {
  if (!parts.length) return;
  const ultimo = contents.at(-1);
  if (ultimo?.role === role) ultimo.parts.push(...parts);
  else contents.push({ role, parts });
}

export function pedidoGoogle(corpo) {
  const sistema = [];
  const contents = [];
  for (const mensagem of corpo?.messages ?? []) {
    if (mensagem?.role === "system") {
      const texto = String(mensagem.content ?? "").trim();
      if (texto) sistema.push(texto);
      continue;
    }
    if (mensagem?.role === "tool") {
      acrescentar(contents, "user", [{
        functionResponse: {
          name: String(mensagem.name || "ferramenta"),
          response: respostaDaFerramenta(mensagem.content),
          ...(mensagem.tool_call_id ? { id: mensagem.tool_call_id } : {}),
        },
      }]);
      continue;
    }
    const role = mensagem?.role === "assistant" ? "model" : "user";
    const parts = [];
    const texto = typeof mensagem?.content === "string" ? mensagem.content : "";
    if (texto.trim()) parts.push({ text: texto });
    for (const chamada of mensagem?.tool_calls ?? []) {
      const nome = String(chamada?.function?.name ?? "").trim();
      if (!nome) continue;
      parts.push({
        functionCall: {
          name: nome,
          args: argsDaChamada(chamada.function?.arguments),
          ...(chamada.id ? { id: chamada.id } : {}),
        },
      });
    }
    acrescentar(contents, role, parts);
  }
  if (contents[0]?.role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "Continue." }] });
  }
  if (sistema.length) {
    const instrucao = sistema.join("\n\n");
    const primeiro = contents.find((item) => item.role === "user" && item.parts.some((parte) => parte.text));
    if (primeiro) primeiro.parts.unshift({ text: instrucao });
    else contents.unshift({ role: "user", parts: [{ text: instrucao }] });
  }
  const ferramentas = declaracoesGoogle(corpo?.tools);
  const pedido = {
    contents: contents.length ? contents : [{ role: "user", parts: [{ text: "" }] }],
    generationConfig: {
      temperature: Number.isFinite(Number(corpo?.temperature)) ? Number(corpo.temperature) : 0.2,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  };
  const saida = Number(corpo?.max_tokens);
  if (Number.isFinite(saida) && saida > 0) pedido.generationConfig.maxOutputTokens = saida;
  if (ferramentas.length) pedido.tools = [{ functionDeclarations: ferramentas }];
  return pedido;
}

export function usoGoogle(meta) {
  if (!meta || typeof meta !== "object") return null;
  const entrada = Number(meta.promptTokenCount) || 0;
  const saida = Number(meta.candidatesTokenCount) || 0;
  const raciocinio = Number(meta.thoughtsTokenCount) || 0;
  const total = Number(meta.totalTokenCount) || entrada + saida + raciocinio;
  if (!total) return null;
  return {
    entrada,
    saida,
    total,
    contexto: JANELA_GEMMA,
    ...(raciocinio ? { raciocinio } : {}),
  };
}

export function partesGoogle(candidato) {
  const parts = candidato?.content?.parts ?? [];
  let content = "";
  let reasoning = "";
  const tools = [];
  for (const parte of parts) {
    if (parte?.thought) {
      if (parte.text) reasoning += parte.text;
      continue;
    }
    if (parte?.text) content += parte.text;
    const nome = String(parte?.functionCall?.name ?? "").trim();
    if (!nome) continue;
    tools.push({
      id: parte.functionCall.id || `call_${tools.length}_${nome}`,
      type: "function",
      function: {
        name: nome,
        arguments: JSON.stringify(parte.functionCall.args ?? {}),
      },
    });
  }
  return { content, reasoning, tools };
}

function aplicarPedaco(acc, pedaco) {
  if (pedaco?.usageMetadata) acc.uso = usoGoogle(pedaco.usageMetadata);
  const partes = pedaco?.candidates?.[0]?.content?.parts ?? [];
  for (const parte of partes) {
    if (parte?.thought) {
      if (parte.text) acc.reasoning += parte.text;
      continue;
    }
    if (parte?.text) acc.pensamento.receber(parte.text);
    const nome = String(parte?.functionCall?.name ?? "").trim();
    if (!nome) continue;
    acc.tools.push({
      id: parte.functionCall.id || `call_${acc.tools.length}_${nome}`,
      type: "function",
      function: {
        name: nome,
        arguments: JSON.stringify(parte.functionCall.args ?? {}),
      },
    });
  }
}

function lerLinha(acc, linha) {
  const texto = String(linha ?? "").trim();
  if (!texto.startsWith("data:")) return;
  const carga = texto.slice(5).trim();
  if (!carga || carga === "[DONE]") return;
  try {
    aplicarPedaco(acc, JSON.parse(carga));
  } catch {
    /* pedaço incompleto */
  }
}

export async function lerStreamGoogle(body, aoTexto) {
  const leitor = body.getReader();
  const decodificar = new TextDecoder();
  let resto = "";
  const acc = { content: "", reasoning: "", tools: [], uso: null };
  const filtro = criarFiltroDeChamada(aoTexto);
  acc.pensamento = criarFiltroDePensamento(
    (texto) => {
      acc.content += texto;
      filtro.receber(texto);
    },
    (texto) => {
      acc.reasoning += texto;
    },
  );
  while (true) {
    const { done, value } = await leitor.read();
    if (done) break;
    resto += decodificar.decode(value, { stream: true });
    const linhas = resto.split("\n");
    resto = linhas.pop() ?? "";
    for (const linha of linhas) lerLinha(acc, linha);
  }
  if (resto.trim()) lerLinha(acc, resto);
  acc.pensamento.finalizar();
  filtro.finalizar();
  const doTexto = extrairChamadasDoTexto(acc.content);
  const doRaciocinio = extrairChamadasDoTexto(acc.reasoning);
  const vistas = new Set();
  const tools = [...acc.tools, ...doTexto.chamadas, ...doRaciocinio.chamadas].filter((item) => {
    const nome = item?.function?.name;
    if (!nome) return false;
    const chave = `${nome}\n${item.function.arguments ?? ""}`;
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
  const content = doTexto.texto;
  if (!content.trim() && !tools.length) return null;
  return {
    content,
    ...(acc.uso ? { uso: acc.uso } : {}),
    ...(tools.length ? { tool_calls: tools } : {}),
  };
}
