const URL = "https://ollama.com/api/chat";
export const MODELO_OLLAMA = "gemma4:31b";

function modeloOllama(preferido = process.env.OLLAMA_MODEL) {
  const nome = String(preferido ?? "").trim();
  return nome || MODELO_OLLAMA;
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

export function mensagensOllama(mensagens) {
  const saida = [];
  for (const item of Array.isArray(mensagens) ? mensagens : []) {
    const papel = item?.role;
    if (papel !== "system" && papel !== "user" && papel !== "assistant" && papel !== "tool") continue;
    if (papel === "tool") {
      const nome = String(item.name || item.tool_name || "").trim();
      saida.push({
        role: "tool",
        content: String(item.content ?? ""),
        ...(nome ? { tool_name: nome } : {}),
      });
      continue;
    }
    const mensagem = { role: papel, content: String(item.content ?? "") };
    const chamadas = Array.isArray(item.tool_calls) ? item.tool_calls : [];
    if (chamadas.length) {
      mensagem.tool_calls = chamadas
        .map((chamada) => {
          const nome = String(chamada?.function?.name ?? "").trim();
          if (!nome) return null;
          return { function: { name: nome, arguments: argsDaChamada(chamada.function.arguments) } };
        })
        .filter(Boolean);
    }
    if (!mensagem.content && !mensagem.tool_calls?.length) continue;
    saida.push(mensagem);
  }
  return saida;
}

function ferramentasOllama(tools) {
  return (Array.isArray(tools) ? tools : [])
    .map((item) => {
      const fn = item?.function ?? item ?? {};
      const nome = String(fn.name ?? "").trim();
      if (!nome) return null;
      return {
        type: "function",
        function: {
          name: nome,
          description: String(fn.description || nome),
          parameters: fn.parameters && typeof fn.parameters === "object" ? fn.parameters : { type: "object", properties: {} },
        },
      };
    })
    .filter(Boolean);
}

function erroHttp(mensagem, status) {
  const erro = new Error(mensagem || "A Ollama não respondeu.");
  if (status) erro.status = status;
  return erro;
}

export async function pedirOllama(chave, corpo, aoTexto) {
  const acesso = String(chave ?? "").trim();
  if (!acesso) throw erroHttp("A chave da Ollama não está configurada.", 401);
  const tools = ferramentasOllama(corpo?.tools);
  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${acesso}`,
    },
    body: JSON.stringify({
      model: modeloOllama(corpo?.model && String(corpo.model).startsWith("gemma4") ? corpo.model : undefined),
      messages: mensagensOllama(corpo?.messages),
      stream: true,
      ...(tools.length ? { tools } : {}),
      options: { temperature: Number(corpo?.temperature) || 0.3 },
    }),
  });
  if (!resp.ok || !resp.body) {
    const dados = await resp.json().catch(() => ({}));
    throw erroHttp(dados?.error || `A Ollama respondeu ${resp.status}`, resp.status);
  }
  const leitor = resp.body.getReader();
  const decodificar = new TextDecoder();
  let resto = "";
  let content = "";
  const toolsSaida = [];
  let uso = null;
  const ler = (linha) => {
    const texto = String(linha ?? "").trim();
    if (!texto) return;
    let pedaco;
    try {
      pedaco = JSON.parse(texto);
    } catch {
      return;
    }
    if (pedaco.error) throw erroHttp(String(pedaco.error), 502);
    const trecho = String(pedaco.message?.content ?? "");
    if (trecho) {
      content += trecho;
      aoTexto?.(trecho);
    }
    for (const chamada of pedaco.message?.tool_calls ?? []) {
      const nome = String(chamada?.function?.name ?? "").trim();
      if (!nome) continue;
      toolsSaida.push({
        id: `call_${toolsSaida.length}_${nome}`,
        type: "function",
        function: { name: nome, arguments: JSON.stringify(argsDaChamada(chamada.function?.arguments)) },
      });
    }
    if (pedaco.done) {
      const entrada = Number(pedaco.prompt_eval_count) || 0;
      const saida = Number(pedaco.eval_count) || 0;
      const total = entrada + saida;
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
  if (!content.trim() && !toolsSaida.length) throw erroHttp("A Ollama não devolveu resposta.", 502);
  return {
    role: "assistant",
    content,
    ...(uso ? { uso } : {}),
    ...(toolsSaida.length ? { tool_calls: toolsSaida } : {}),
  };
}
