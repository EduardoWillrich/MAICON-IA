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

const PROCESSO = /(?:^|\s)(?:IM|IA|EA|EM)\d{2,6}-\d{2}\b/i;

function modalidadeCitada(texto) {
  return String(texto ?? "").toUpperCase().match(/\b(IA|EA|IM|EM)\b/)?.[1] ?? "";
}

function argsPrazos(texto) {
  const pedido = String(texto ?? "");
  const hoje = /\bhoje\b/i.test(pedido);
  const dias = hoje ? 1 : Number(pedido.match(/\b(\d{1,2})\s+dias?\b/i)?.[1]) || 7;
  const marcos = ["embarque", "desembarque", "entrega"].filter((item) => {
    if (item === "embarque") return /(?<!des)embar[qc]/i.test(pedido);
    if (item === "desembarque") return /desembar[qc]/i.test(pedido);
    return /entrega/i.test(pedido);
  });
  const realizado = /desembarcaram|entregaram|(?<!des)embarcaram|j[aá]\s+desembar[qc]/i.test(pedido);
  const modo = realizado ? "realizado" : hoje && marcos.length === 1 ? "hoje" : "janela";
  const args = { dias };
  if (marcos.length && marcos.length < 3) args.marco = marcos.join(",");
  if (modo !== "janela") args.modo = modo;
  const modalidade = modalidadeCitada(pedido);
  if (modalidade) args.modalidade = modalidade;
  return args;
}

function argsPendencias(texto) {
  const pedido = String(texto ?? "");
  const atrasadas = /atras/i.test(pedido);
  const semana = /semana|pr[oó]xim|\b7\s+dias\b/i.test(pedido);
  const hoje = /\bhoje\b/i.test(pedido);
  if ((atrasadas && (semana || hoje)) || (hoje && semana)) return { escopo: "abertas" };
  if (hoje) return { escopo: "hoje" };
  if (semana) return { escopo: "semana" };
  if (atrasadas) return { escopo: "atrasadas" };
  return { escopo: "semana" };
}

function argsDocumental(texto) {
  const pedido = String(texto ?? "");
  const temCe = /documental\s+ce|\bce\b/i.test(pedido);
  const temIm = /documental\s+im|\bim\b/i.test(pedido);
  const caso = temCe && temIm ? "ambos" : temIm ? "im" : "ce";
  const numero = pedido.match(PROCESSO)?.[0]?.trim().toUpperCase() ?? "";
  let foco = "fila";
  if (/campo livre/i.test(pedido)) foco = "campos";
  else if (numero && /no processo|neste processo|do processo/i.test(pedido)) foco = "processo";
  else if (/liberad/i.test(pedido)) foco = "sem_liberacao";
  else if (/falta|pendent/i.test(pedido)) foco = "pendencias";
  return { foco, caso, ...(numero ? { numero } : {}) };
}

function setorDaPergunta(texto) {
  const pedido = String(texto ?? "");
  if (/inside/i.test(pedido)) return "inside";
  if (/comercial/i.test(pedido)) return "comercial";
  return "operacional";
}

export function ferramentasProvaveis(texto) {
  const pedido = String(texto ?? "");
  const base = ["localizar_processo"];
  if (/diverg|muito diferente da previs|diferente da previs/i.test(pedido)) return ["divergencias_viagem"];
  if (/fila dos setores/i.test(pedido)) return ["fila_setor"];
  if (/parad/i.test(pedido) && /processo|acompanh/i.test(pedido)) return ["processos_parados"];
  if (/documental/i.test(pedido) && /atividade|fila|pend[eê]ncia|liberad|campo livre/i.test(pedido)) return ["documental_ce"];
  if (/atividad|pend[eê]ncia/i.test(pedido) && /\b(?:do|da|de)\s+(?:operacional|comercial|inside)\b/i.test(pedido)) return ["atividades_pendentes"];
  if (/(?:\bminha|\bminhas|\bmeu|\bmeus)\b/i.test(pedido) && /atividad|pend[eê]ncia/i.test(pedido)) return ["pendencias"];
  if (/atividad/i.test(pedido) && /atras/i.test(pedido)) return ["pendencias"];
  if (/^ficha do cliente\b/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/quais clientes t[eê]m mais processos abertos/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/quais clientes t[eê]m processo aberto sem proposta/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/quais clientes j[aá] abriram processo e n[aã]o abrem/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/desembar[qc]|(?<!des)embar[qc]|entrega|\bprazos?\b/i.test(pedido) && !PROCESSO.test(pedido)) return ["prazos"];
  if (/\btaxas?\b/i.test(pedido) && /m[eê]s/i.test(pedido) && !PROCESSO.test(pedido)) return ["painel_financeiro"];
  if (/painel financeiro/i.test(pedido)) return ["painel_financeiro"];
  if (/comiss/i.test(pedido) && !PROCESSO.test(pedido)) return ["comissao_periodo"];
  if (/painel do ti|quem mais gravou log/i.test(pedido)) return ["painel_ti"];
  if (/exclus|log das [uú]ltimas|log recente/i.test(pedido)) return ["log_recente"];
  if (/monitorament/i.test(pedido)) return ["monitoramentos_alterados"];
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
  const pedido = String(texto ?? "");
  if (/\bprocessos?\s+abertos?\b/i.test(pedido) && !/fila dos setores|clientes|ficha do cliente/i.test(pedido) && !/(?:IM|IA|EA|EM)\d{2,6}-\d{2}/i.test(pedido)) {
    return { nome: "processos_abertos", args: { quando: /\bhoje\b/i.test(pedido) ? "hoje" : "abertos" } };
  }
  const numero = pedido.match(/(?:^|\s)((?:IM|IA|EA|EM)\d{2,6}-\d{2})\b/i)?.[1]?.toUpperCase();
  const historico = /quem (?:inclu|alter|excl|mud)|hist[oó]rico|\blog\b|antes e depois/i.test(pedido);
  if (numero && !historico) {
    if (/\btaxas?\b/i.test(pedido)) return { nome: "taxas_processo", args: { numero } };
    if (/rota|navio|rastre/i.test(pedido)) return { nome: "rota_processo", args: { numero } };
    if (/acompanhament/i.test(pedido)) return { nome: "acompanhamentos_processo", args: { numero } };
    if (/proposta|oferta/i.test(pedido)) return { nome: "proposta_processo", args: { numero } };
    return { nome: "resumo_processo", args: { numero } };
  }
  const ferramentas = ferramentasProvaveis(pedido);
  if (ferramentas.length !== 1) return null;
  const nome = ferramentas[0];
  if (nome === "prazos") return { nome, args: argsPrazos(pedido) };
  if (nome === "pendencias") return { nome, args: argsPendencias(pedido) };
  if (nome === "atividades_pendentes") return { nome, args: { setor: setorDaPergunta(pedido) } };
  if (nome === "documental_ce") return { nome, args: argsDocumental(pedido) };
  if (nome === "processos_parados") {
    return { nome, args: { dias: Number(pedido.match(/\b(\d{1,2})\s+dias?\b/i)?.[1]) || 7 } };
  }
  if (nome === "divergencias_viagem") return { nome, args: { dias: 15 } };
  if (nome === "fila_setor") return { nome, args: {} };
  if (nome === "comissao_periodo") return { nome, args: {} };
  if (nome === "painel_financeiro") {
    return { nome, args: /\btaxas?\b/i.test(pedido) && !/painel/i.test(pedido) ? { foco: "taxas" } : {} };
  }
  if (nome === "painel_ti") return { nome, args: { horas: Number(pedido.match(/\b(\d{1,3})\s+horas?\b/i)?.[1]) || 24 } };
  if (nome === "log_recente") {
    const horas = Number(pedido.match(/\b(\d{1,3})\s+horas?\b/i)?.[1]) || 24;
    return { nome, args: /exclus/i.test(pedido) ? { horas, tipo: 2 } : { horas } };
  }
  if (nome === "monitoramentos_alterados") return { nome, args: { dias: 7 } };
  if (nome === "processos_abertos_cliente") {
    const ficha = pedido.match(/ficha do cliente\s+(.+?)(?::|$)/i)?.[1]?.trim();
    if (ficha && !/qual cliente/i.test(pedido)) return { nome, args: { cliente: ficha.replace(/\.$/, "") } };
    if (/sem proposta/i.test(pedido)) return { nome, args: { foco: "sem_proposta" } };
    if (/n[aã]o abrem|90 dias/i.test(pedido)) return { nome, args: { foco: "sem_movimento" } };
    if (/mais processos abertos/i.test(pedido)) return { nome, args: { foco: "abertos" } };
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
  "resumo_processo",
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
  const bruto = String(ultima.content ?? "").trim();
  try {
    const dados = JSON.parse(bruto);
    if (typeof dados?.texto === "string" && dados.texto.trim()) return dados.texto.trim();
  } catch {
    /* o chat já enviou o texto pronto, sem o JSON */
  }
  if (bruto && !bruto.startsWith("{") && !bruto.startsWith("Erro:")) return bruto;
  return "";
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
