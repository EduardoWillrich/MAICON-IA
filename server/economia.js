const CUMPRIMENTO = /^(?:oi|ol[aá]|opa|e a[ií]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|ok|beleza|tudo bem|quem [eé] voc[eê]|o que voc[eê] (?:faz|pode fazer)|como voc[eê] funciona|ajuda|help)[!.?\s]*$/i;
const DADO = /\b(?:select|sql|relat[oó]rios?|processos?|clientes?|taxas?|faturas?|gr[aá]ficos?|e-?mails?|containers?|comiss[oõ]es?|atividades?|propostas?|embarques?|quantos|quantas|liste|listar|mostre|mostrar)\b|\blogs?(?=\s|[?.!,]|$)|(?:^|\s)(?:IM|IA|EA|EM)\d{2,6}-\d{2}\b/i;

export const MODELOS_LEVES = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
export const MODELOS_RESPOSTA = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];

export function pedidoSimples(texto) {
  const pedido = String(texto ?? "").trim();
  if (!pedido || pedido.length > 160 || DADO.test(pedido)) return false;
  return CUMPRIMENTO.test(pedido);
}

export function pedidoInformativo(texto) {
  const pedido = String(texto ?? "").trim();
  return Boolean(pedido) && pedido.length <= 500 && !DADO.test(pedido);
}

export function conversaSimples(mensagens) {
  if (!Array.isArray(mensagens) || mensagens.some((item) => item?.role === "tool" || item?.tool_calls?.length)) return false;
  const pedido = [...mensagens].reverse().find((item) => item?.role === "user")?.content;
  return pedidoSimples(pedido);
}

export function respostaImediata(texto) {
  const pedido = String(texto ?? "").trim();
  if (pedidoSimples(pedido)) {
    if (/obrigad|valeu/i.test(pedido)) return "Por nada! Se precisar, é só chamar.";
    if (/quem [eé] voc[eê]|o que voc[eê] (?:faz|pode fazer)|como voc[eê] funciona|ajuda|help/i.test(pedido)) {
      return "Sou o Maicon, a IA da Conline. Posso consultar processos, clientes, taxas, atividades, prazos, e-mails e relatórios. Informe um número de processo, cliente ou período para começar.";
    }
    return "Olá! Sou o Maicon. Informe um processo, cliente, assunto ou período e eu consulto para você.";
  }
  const falaProcesso = /\bprocesso\b/i.test(pedido);
  const temNumero = /(?:^|\s)(?:IM|IA|EA|EM)\d{2,6}-\d{2}\b/i.test(pedido);
  const temAlvo = /\b(?:cliente|refer[eê]ncia|n[uú]mero)\s+[\w.-]{2,}/i.test(pedido);
  if (falaProcesso && !temNumero && !temAlvo && pedido.length < 180) {
    return "Informe o número do processo, como IM5328-26, ou o nome do cliente/referência para eu localizar as informações.";
  }
  return "";
}

export function ferramentasProvaveis(texto) {
  const pedido = String(texto ?? "");
  const base = ["localizar_processo"];
  if (/desembarc|embarque|entrega|prazos?/i.test(pedido)) return ["prazos"];
  if (/\btaxas?\b/i.test(pedido)) return [...base, "taxas_processo"];
  if (/rota|navio|rastre/i.test(pedido)) return [...base, "rota_processo"];
  if (/acompanhament/i.test(pedido)) return [...base, "acompanhamentos_processo"];
  if (/proposta|oferta/i.test(pedido)) return [...base, "proposta_processo"];
  if (/resumo/i.test(pedido) && /\bprocesso\b/i.test(pedido)) return [...base, "resumo_processo"];
  if (/hist[oó]rico|quem alter|o que mudou/i.test(pedido)) return [...base, "consultar_log", "o_que_mudou"];
  if (/e-?mail|caixa de entrada/i.test(pedido)) return ["emails_gmail"];
  if (/relat[oó]rio|quantos|quantas|\bliste\b|\blistar\b|\bmostre\b|\bmostrar\b/i.test(pedido)) {
    return ["buscar_tabelas", "listar_colunas", "executar_sql"];
  }
  if (/(?:^|\s)(?:IM|IA|EA|EM)\d{2,6}-\d{2}\b/i.test(pedido)) {
    return [...base, "consultar_dados", "resumo_processo"];
  }
  return [];
}

export function chamadaDireta(texto) {
  const ferramentas = ferramentasProvaveis(texto);
  if (ferramentas.length !== 1) return null;
  if (ferramentas[0] === "prazos") {
    const dias = /\bhoje\b/i.test(String(texto ?? ""))
      ? 1
      : Number(String(texto ?? "").match(/\b(\d{1,2})\s+dias?\b/i)?.[1]) || 7;
    return { nome: "prazos", args: { dias } };
  }
  return null;
}

const TEXTOS_PRONTOS = new Set([
  "acompanhamentos_processo",
  "pendencias",
  "o_que_mudou",
  "proposta_processo",
  "comissao_periodo",
  "processos_abertos_cliente",
  "prazos",
  "processos_parados",
  "documental_ce",
  "atividades_pendentes",
  "divergencias_viagem",
  "rota_processo",
  "fila_setor",
  "painel_ti",
  "painel_financeiro",
  "taxas_processo",
  "log_recente",
  "monitoramentos_alterados",
  "explicar_itens_carga",
  "explicar_campo_livre",
  "andamento_atividade",
]);

export function respostaDeFerramentaPronta(mensagens) {
  const ultima = [...(mensagens ?? [])].reverse().find((item) => item?.role === "tool");
  if (!ultima?.tool_call_id || String(ultima.content ?? "").startsWith("Erro:")) return "";
  const chamada = [...mensagens]
    .reverse()
    .filter((item) => item?.role === "assistant")
    .flatMap((item) => item.tool_calls ?? [])
    .find((item) => item.id === ultima.tool_call_id);
  if (!chamada || !TEXTOS_PRONTOS.has(chamada.function?.name)) return "";
  try {
    const dados = JSON.parse(String(ultima.content ?? ""));
    return typeof dados?.texto === "string" ? dados.texto.trim() : "";
  } catch {
    return "";
  }
}

export function lerFiltro(texto, ferramentasValidas) {
  const bruto = String(texto ?? "").match(/\{[\s\S]*\}/)?.[0];
  if (!bruto) return { ferramentas: [], termos: "" };
  try {
    const dados = JSON.parse(bruto);
    const validas = new Set(ferramentasValidas);
    const ferramentas = (Array.isArray(dados.ferramentas) ? dados.ferramentas : [])
      .map((item) => String(item ?? "").trim())
      .filter((item) => validas.has(item));
    return { ferramentas, termos: String(dados.termos ?? "").trim().slice(0, 300) };
  } catch {
    return { ferramentas: [], termos: "" };
  }
}
