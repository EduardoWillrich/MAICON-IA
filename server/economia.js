const CUMPRIMENTO = /^(?:oi|ol[aá]|opa|e a[ií]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|ok|beleza|tudo bem|quem [eé] voc[eê]|o que voc[eê] (?:faz|pode fazer)|como voc[eê] funciona|ajuda|help)[!.?\s]*$/i;
const PROCESSO = /\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i;
const DADO = /\b(?:select|sql|relat[oó]rios?|processos?|clientes?|taxas?|faturas?|gr[aá]ficos?|e-?mails?|containers?|comiss[oõ]es?|atividades?|propostas?|embarques?|quantos|quantas|liste|listar|mostre|mostrar)\b|\blogs?(?=\s|[?.!,]|$)|\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/i;

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
  const temNumero = PROCESSO.test(pedido);
  const temAlvo = /\b(?:cliente|refer[eê]ncia|n[uú]mero)\s+[\w.-]{2,}/i.test(pedido);
  if (falaProcesso && !temNumero && !temAlvo && pedido.length < 180) {
    return "Informe o número do processo, como IM5328-26, ou o nome do cliente/referência para eu localizar as informações.";
  }
  return "";
}

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
  return { escopo: "abertas" };
}

function argsDocumental(texto) {
  const pedido = String(texto ?? "");
  const temCe = /documental\s+ce|\bce\b/i.test(pedido);
  const temIm = /documental\s+im|\bim\b/i.test(pedido);
  const caso = temCe && temIm ? "ambos" : temIm ? "im" : "ce";
  const numero = pedido.match(PROCESSO)?.[1]?.toUpperCase() ?? "";
  let foco = "fila";
  if (/campo livre/i.test(pedido)) foco = "campos";
  else if (numero) foco = "processo";
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

function pedeResumoProcesso(pedido) {
  return /\bresumo\b/i.test(pedido) || (/\bresum(?:a|e|ir)\b/i.test(pedido) && /\bprocesso\b/i.test(pedido));
}

const ASSUNTO_GERAL = /parad|fila dos setores|painel |\bprazos?\b|pend[eê]ncias do |processos abertos|quais clientes|comiss[aã]o neste|comiss[aã]o de vendedor neste|deste m[eê]s|neste m[eê]s|log das [uú]ltimas|exclus[oõ]es aconteceram|monitorament|\bminhas?\b.{0,40}pend[eê]n/i;
const SEGUE_PROCESSO = /desse|deste|dele|dela|nesse|neste|mesmo processo|mudan[cç]a|altera[cç]|hist[oó]rico|\blogs?\b|frete|taxas?|pagamento|recebimento|comiss|atividad|pend[eê]ncia|cliente|vendedor|situa|refer[eê]ncia|embarc|navio|porto|libera|\bce\b|proposta|oferta|acompanhament|quem alter|quem inclu|o que mudou|resumo/i;
const APONTA_PROCESSO = /desse|deste|dele|dela|dessa|desta|nesse|neste|mesmo processo|do processo/i;

export function textoCalendario(agora = new Date()) {
  const zona = "America/Sao_Paulo";
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const numero = (tipo) => Number(partes.find((item) => item.type === tipo)?.value);
  const ano = numero("year");
  const mes = numero("month");
  const dia = numero("day");
  const hoje = new Date(Date.UTC(ano, mes - 1, dia));
  const ontem = new Date(hoje);
  ontem.setUTCDate(ontem.getUTCDate() - 1);
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
  const dow = hoje.getUTCDay();
  const inicioSemana = new Date(hoje);
  inicioSemana.setUTCDate(inicioSemana.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  const fmt = (data) => {
    const p = (valor) => String(valor).padStart(2, "0");
    return `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
  };
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: zona, weekday: "long" }).format(agora);
  const hojeBr = fmt(hoje);
  const ontemBr = fmt(ontem);
  return {
    hoje: hojeBr,
    ontem: ontemBr,
    inicioMes: fmt(inicioMes),
    inicioSemana: fmt(inicioSemana),
    texto:
      `DATA DE HOJE: ${semana}, ${hojeBr}, fuso America/Sao_Paulo. ` +
      `Ontem é ${ontemBr}. Este mês vai de ${fmt(inicioMes)} até ${hojeBr}. ` +
      `Esta semana começa em ${fmt(inicioSemana)}. ` +
      "hoje, ontem, esse mês, este mês, neste mês e esta semana usam exatamente essas datas. " +
      "Não pergunte a data de novo. Uma lista por período não reaproveita o processo da mensagem anterior. " +
      "Referência de cliente, como 136.763, não é número de processo. Número de processo tem letras, hífen e ano, como IM5944-26.",
  };
}

export function listaDePropostas(texto) {
  const pedido = String(texto ?? "");
  if (!/\bpropostas?\b/i.test(pedido)) return false;
  if (APONTA_PROCESSO.test(pedido)) return false;
  const periodo = /\b(?:ontem|hoje|m[eê]s|semana|data|\d{1,2}\/\d{1,2}\/\d{4})\b/i.test(pedido);
  const lista = /\b(?:liste|listar|lista|todas|todos|abertas?)\b/i.test(pedido);
  if (PROCESSO.test(pedido) && !periodo) return false;
  return periodo || (lista && !PROCESSO.test(pedido));
}

export function argsPropostas(texto) {
  const pedido = String(texto ?? "");
  const situacao = /abert/i.test(pedido) ? "abertas" : "todas";
  const data = pedido.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (data) {
    const dia = data[1].padStart(2, "0");
    const mes = data[2].padStart(2, "0");
    const valor = `${dia}/${mes}/${data[3]}`;
    return { inicio: valor, fim: valor, situacao };
  }
  if (/ontem/i.test(pedido)) return { quando: "ontem", situacao };
  if (/\bhoje\b/i.test(pedido)) return { quando: "hoje", situacao };
  if (/semana/i.test(pedido)) return { quando: "semana", situacao };
  return { quando: "mes", situacao };
}

export function pedidoDaRodada(mensagens) {
  const lista = Array.isArray(mensagens) ? mensagens : [];
  const atual = String([...lista].reverse().find((item) => item?.role === "user")?.content ?? "");
  if (!atual.trim() || PROCESSO.test(atual)) return atual;
  if (listaDePropostas(atual)) return atual;
  const aponta = /desse|deste|dele|dela|nesse|neste|mesmo processo/i.test(atual);
  if (ASSUNTO_GERAL.test(atual) && !aponta) return atual;
  if (!SEGUE_PROCESSO.test(atual)) return atual;
  const usuarios = lista.filter((item) => item?.role === "user");
  for (let i = usuarios.length - 2; i >= 0; i--) {
    const numero = String(usuarios[i]?.content ?? "").match(PROCESSO)?.[1];
    if (numero) return `${atual} ${numero.toUpperCase()}`;
  }
  return atual;
}

export function ferramentasProvaveis(texto) {
  const pedido = String(texto ?? "");
  const base = ["localizar_processo"];
  if (/diverg|muito diferente da previs|diferente da previs/i.test(pedido)) return ["divergencias_viagem"];
  if (/fila dos setores/i.test(pedido)) return ["fila_setor"];
  if (/parad/i.test(pedido) && /processo|acompanh/i.test(pedido)) return ["processos_parados"];
  if (/documental/i.test(pedido) && /atividade|fila|pend[eê]ncia|liberad|campo livre/i.test(pedido)) return ["documental_ce"];
  if (/atividad|pend[eê]ncia/i.test(pedido) && /\b(?:do|da|de)\s+(?:operacional|comercial|inside)\b/i.test(pedido)) return ["atividades_pendentes"];
  if (/(?:\bminha|\bminhas|\bmeu|\bmeus|\btenho\b)\b/i.test(pedido) && /atividad|pend[eê]ncia/i.test(pedido)) return ["pendencias"];
  if (/atividad/i.test(pedido) && /atras/i.test(pedido)) return ["pendencias"];
  if (/^ficha do cliente\b/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/quais clientes (?:t[eê]m|tiveram) mais processos abertos/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/quais clientes t[eê]m processo aberto sem proposta/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/quais clientes j[aá] abriram processo e n[aã]o abrem/i.test(pedido)) return ["processos_abertos_cliente"];
  if (/desembar[qc]|(?<!des)embar[qc]|entrega|\bprazos?\b/i.test(pedido) && !PROCESSO.test(pedido)) return ["prazos"];
  if (/\btaxas?\b/i.test(pedido) && /m[eê]s/i.test(pedido) && !PROCESSO.test(pedido)) return ["painel_financeiro"];
  if (/painel financeiro/i.test(pedido)) return ["painel_financeiro"];
  if (/\bcomiss/i.test(pedido)) return ["comissao_periodo"];
  if (/(?:\bce\b|liberad|documenta)/i.test(pedido) && PROCESSO.test(pedido)) return ["documental_ce"];
  if (/painel do ti|quem mais gravou log/i.test(pedido)) return ["painel_ti"];
  if (/exclus|log das [uú]ltimas|log recente/i.test(pedido)) return ["log_recente"];
  if (/monitorament/i.test(pedido)) return ["monitoramentos_alterados"];
  if (listaDePropostas(pedido)) return ["propostas_periodo"];
  if (/\btaxas?\b|\bfrete\b|\bpagamento\b|\brecebimento\b/i.test(pedido)) return [...base, "taxas_processo"];
  if (/rota|navio|rastre|porto|embarc/i.test(pedido)) return [...base, "rota_processo"];
  if (/acompanhament/i.test(pedido)) return [...base, "acompanhamentos_processo"];
  if (/proposta|oferta/i.test(pedido)) return [...base, "proposta_processo"];
  if (pedeResumoProcesso(pedido) && PROCESSO.test(pedido)) return ["resumo_processo"];
  if (/atividad|pend[eê]ncia/i.test(pedido) && PROCESSO.test(pedido)) return ["andamento_atividade"];
  if (/hist[oó]rico|quem alter|o que mudou|\blogs?\b|antes e depois|mudan[cç]a|altera[cç]|mexeu/i.test(pedido)) return [...base, "consultar_log", "o_que_mudou"];
  if (/e-?mail|caixa de entrada/i.test(pedido)) return ["emails_gmail"];
  if (/relat[oó]rio|quantos|quantas|\bliste\b|\blistar\b|\bmostre\b|\bmostrar\b/i.test(pedido)) {
    return ["buscar_tabelas", "listar_colunas", "executar_sql"];
  }
  if (PROCESSO.test(pedido)) {
    return [...base, "consultar_dados"];
  }
  return [];
}

export function chamadaDireta(texto) {
  const pedido = String(texto ?? "");
  if (listaDePropostas(pedido)) return { nome: "propostas_periodo", args: argsPropostas(pedido) };
  if (/\bprocessos?\s+abertos?\b/i.test(pedido) && !/fila dos setores|clientes|ficha do cliente/i.test(pedido) && !PROCESSO.test(pedido)) {
    return { nome: "processos_abertos", args: { quando: /\bhoje\b/i.test(pedido) ? "hoje" : "abertos" } };
  }
  const numero = pedido.match(PROCESSO)?.[1]?.toUpperCase();
  const historico = /quem (?:inclu|alter|excl|mud|mexeu)|hist[oó]rico|\blogs?\b|antes e depois|mudan[cç]a|altera[cç]/i.test(pedido);
  if (numero && !historico) {
    if (/\btaxas?\b|\bfrete\b|\bpagamento\b|\brecebimento\b/i.test(pedido)) return { nome: "taxas_processo", args: { numero } };
    if (/rota|navio|rastre|porto|embarc/i.test(pedido)) return { nome: "rota_processo", args: { numero } };
    if (/acompanhament/i.test(pedido)) return { nome: "acompanhamentos_processo", args: { numero } };
    if (/proposta|oferta/i.test(pedido)) return { nome: "proposta_processo", args: { numero } };
    if (/\bcomiss/i.test(pedido)) return { nome: "comissao_periodo", args: { numero } };
    if (/\bce\b|documenta|libera/i.test(pedido)) return { nome: "documental_ce", args: { numero, foco: "processo", caso: "ambos" } };
    if (/atividad|pend[eê]ncia/i.test(pedido)) {
      return { nome: "andamento_atividade", args: { numero, pendentes: /pendent/i.test(pedido) } };
    }
    if (pedeResumoProcesso(pedido)) return { nome: "resumo_processo", args: { numero } };
    return null;
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
  if (nome === "propostas_periodo") return { nome, args: argsPropostas(pedido) };
  if (nome === "processos_abertos_cliente") {
    const ficha = pedido.match(/ficha do cliente\s+(.+?)(?::|$)/i)?.[1]?.trim();
    if (ficha && !/qual cliente/i.test(pedido)) return { nome, args: { cliente: ficha.replace(/\.$/, "") } };
    if (/sem proposta/i.test(pedido)) return { nome, args: { foco: "sem_proposta" } };
    if (/n[aã]o abrem|90 dias/i.test(pedido)) return { nome, args: { foco: "sem_movimento" } };
    if (/mais processos abertos/i.test(pedido)) {
      return { nome, args: { foco: "abertos", ...(/\bhoje\b/i.test(pedido) ? { quando: "hoje" } : {}) } };
    }
  }
  return null;
}

const TEXTOS_PRONTOS = new Set([
  "acompanhamentos_processo",
  "pendencias",
  "o_que_mudou",
  "proposta_processo",
  "propostas_periodo",
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
  const lista = mensagens ?? [];
  let inicio = 0;
  for (let i = lista.length - 1; i >= 0; i--) {
    if (lista[i]?.role === "user") {
      inicio = i;
      break;
    }
  }
  const destaPergunta = lista.slice(inicio);
  const ultima = [...destaPergunta].reverse().find((item) => item?.role === "tool");
  if (!ultima?.tool_call_id || String(ultima.content ?? "").startsWith("Erro:")) return "";
  const chamada = [...destaPergunta]
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
