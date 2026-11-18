const MODELO = "gemma-4-31b-it";
export const MODELO_RESPOSTA = MODELO;
export const MODELO_OPENROUTER = "google/gemma-4-31b-it:free";

export function modelosOpenRouter() {
  return [MODELO_OPENROUTER];
}

export function modeloDaEtapa() {
  return modelosOpenRouter()[0];
}

const MODELO_RESERVA = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

function erroHttp(mensagem, status) {
  const erro = new Error(mensagem || "O OpenRouter não respondeu.");
  if (status) erro.status = status;
  return erro;
}

async function completarOpenRouter(acesso, modelo, corpo, aoTexto, extra = {}) {
  const tools = Array.isArray(corpo?.tools) ? corpo.tools : [];
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${acesso}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelo,
      messages: Array.isArray(corpo?.messages) ? corpo.messages : [],
      stream: true,
      temperature: Number(corpo?.temperature) || 0.3,
      ...extra,
      ...(tools.length ? { tools } : {}),
    }),
  });
  if (!resp.ok || !resp.body) {
    const dados = await resp.json().catch(() => ({}));
    throw erroHttp(dados?.error?.message || `O OpenRouter respondeu ${resp.status}`, resp.status);
  }
  const leitor = resp.body.getReader();
  const decodificar = new TextDecoder();
  let resto = "";
  let content = "";
  const ferramentas = [];
  let uso = null;
  const ler = (linha) => {
    const texto = String(linha ?? "").trim();
    if (!texto.startsWith("data:")) return;
    const bruto = texto.slice(5).trim();
    if (!bruto || bruto === "[DONE]") return;
    let pedaco;
    try {
      pedaco = JSON.parse(bruto);
    } catch {
      return;
    }
    if (pedaco.error) throw erroHttp(pedaco.error.message || "O OpenRouter não respondeu.", Number(pedaco.error.code) || 502);
    const delta = pedaco.choices?.[0]?.delta || {};
    const trecho = String(delta.content ?? "");
    if (trecho) {
      content += trecho;
      aoTexto?.(trecho);
    }
    for (const chamada of delta.tool_calls ?? []) {
      const indice = Number.isInteger(chamada.index) ? chamada.index : ferramentas.length;
      while (ferramentas.length <= indice) ferramentas.push({ id: "", nome: "", argumentos: "" });
      const atual = ferramentas[indice];
      if (chamada.id) atual.id = chamada.id;
      if (chamada.function?.name) atual.nome += chamada.function.name;
      if (chamada.function?.arguments) atual.argumentos += chamada.function.arguments;
    }
    const contagem = pedaco.usage;
    if (contagem) {
      const entrada = Number(contagem.prompt_tokens) || 0;
      const saida = Number(contagem.completion_tokens) || 0;
      const total = Number(contagem.total_tokens) || entrada + saida;
      if (total) uso = { entrada, saida, total, contexto: 262144 };
    }
  };
  while (true) {
    const { done, value } = await leitor.read();
    if (done) break;
    resto += decodificar.decode(value, { stream: true });
    const linhas = resto.split("\n");
    resto = linhas.pop() ?? "";
    for (const linha of linhas) ler(linha);
  }
  if (resto.trim()) ler(resto);
  const toolsSaida = ferramentas
    .filter((item) => item.nome)
    .map((item, indice) => ({
      id: item.id || `call_${indice}_${item.nome}`,
      type: "function",
      function: { name: item.nome, arguments: item.argumentos || "{}" },
    }));
  if (!content.trim() && !toolsSaida.length) throw erroHttp("O modelo gratuito não devolveu resposta.", 502);
  return {
    role: "assistant",
    content,
    ...(uso ? { uso } : {}),
    ...(toolsSaida.length ? { tool_calls: toolsSaida } : {}),
  };
}

export async function pedirOpenRouter(chave, corpo, aoTexto) {
  const acesso = String(chave ?? "").trim();
  if (!acesso) throw erroHttp("A chave do OpenRouter não está configurada.", 401);
  try {
    return await completarOpenRouter(acesso, MODELO_OPENROUTER, corpo, aoTexto);
  } catch (erro) {
    if (erro?.status !== 429) throw erro;
    console.warn("[IA] Gemma 4 gratuito com limite. Usando o Nemotron gratuito.");
    return completarOpenRouter(acesso, MODELO_RESERVA, corpo, aoTexto, { reasoning: { effort: "none" } });
  }
}
