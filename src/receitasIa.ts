export type Receita = { nome: string; args: Record<string, unknown> };

const CHAVE = "maicon-receitas";
const PROCESSO = "\\b([A-Za-z]{1,4}\\d{2,6}-\\d{2})\\b";

const FIXAS: Record<string, Receita[]> = {
  "monte o painel do ti das últimas 24 horas.": [{ nome: "painel_ti", args: { horas: 24 } }],
  "mostre o log das últimas 24 horas, com usuário, tabela, tipo e computador.": [{ nome: "log_recente", args: { horas: 24 } }],
  "quais foram os últimos monitoramentos alterados e quem alterou, no projeto de tarefas e na atividade?": [
    { nome: "monitoramentos_alterados", args: { dias: 7 } },
  ],
  "quais exclusões aconteceram nas últimas 24 horas?": [{ nome: "log_recente", args: { horas: 24, tipo: 2 } }],
  "quem mais gravou log nas últimas 24 horas?": [{ nome: "painel_ti", args: { horas: 24 } }],
  "monte o painel financeiro deste mês, com valores.": [{ nome: "painel_financeiro", args: {} }],
  "qual a comissão de vendedor neste mês, com os valores?": [{ nome: "comissao_periodo", args: {} }],
  "qual a comissão de vendedor neste mês?": [{ nome: "comissao_periodo", args: {} }],
  "qual a comissão neste mês?": [{ nome: "comissao_periodo", args: {} }],
  "quais são minhas pendências atrasadas e as dos próximos 7 dias?": [{ nome: "pendencias", args: { escopo: "abertas" } }],
  "quais são minhas pendências atrasadas, de hoje e da semana?": [{ nome: "pendencias", args: { escopo: "abertas" } }],
  "quais atividades minhas estão atrasadas?": [{ nome: "pendencias", args: { escopo: "atrasadas" } }],
  "quais processos desembarcaram hoje?": [{ nome: "prazos", args: { dias: 1, marco: "desembarque", modo: "realizado" } }],
  "quais processos desembarcam hoje?": [{ nome: "prazos", args: { dias: 1, marco: "desembarque", modo: "hoje" } }],
  "quais processos embarcaram ou desembarcaram hoje?": [
    { nome: "prazos", args: { dias: 1, marco: "embarque,desembarque", modo: "realizado" } },
  ],
  "quais as taxas deste mês, com nome, pagamento e recebimento?": [{ nome: "painel_financeiro", args: { foco: "taxas" } }],
  "quais exclusões aconteceram nas últimas 24 horas? diga usuário, tabela e horário.": [{ nome: "log_recente", args: { horas: 24, tipo: 2 } }],
  "monte o painel do ti das últimas 24 horas, com as tabelas mais alteradas.": [{ nome: "painel_ti", args: { horas: 24 } }],
  "quais clientes têm mais processos abertos?": [{ nome: "processos_abertos_cliente", args: { foco: "abertos" } }],
  "quais clientes têm processo aberto sem proposta?": [{ nome: "processos_abertos_cliente", args: { foco: "sem_proposta" } }],
  "quais clientes já abriram processo e não abrem há 90 dias?": [{ nome: "processos_abertos_cliente", args: { foco: "sem_movimento" } }],
  "quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?": [{ nome: "prazos", args: { dias: 7 } }],
  "quais processos estão parados há 7 dias sem acompanhamento?": [{ nome: "processos_parados", args: { dias: 7 } }],
  "quais processos de 2026 têm o desembarque real muito diferente da previsão?": [
    { nome: "divergencias_viagem", args: { dias: 15 } },
  ],
  "como está a fila dos setores: processos abertos, sem proposta, atrasados e parados?": [{ nome: "fila_setor", args: {} }],
  "quais são as atividades pendentes do operacional em 2026 e qual o motivo de cada uma?": [
    { nome: "atividades_pendentes", args: { setor: "operacional" } },
  ],
  "quais são as atividades pendentes do inside em 2026 e qual o motivo de cada uma?": [
    { nome: "atividades_pendentes", args: { setor: "inside" } },
  ],
  "quais são as atividades pendentes do comercial em 2026 e qual o motivo de cada uma?": [
    { nome: "atividades_pendentes", args: { setor: "comercial" } },
  ],
  "quais atividades estão agora com o documental ce?": [{ nome: "documental_ce", args: { foco: "fila", caso: "ce" } }],
  "quais atividades estão agora com o documental im?": [{ nome: "documental_ce", args: { foco: "fila", caso: "im" } }],
  "quais atividades estão agora com o documental ce e com o documental im?": [
    { nome: "documental_ce", args: { foco: "fila", caso: "ambos" } },
  ],
  "quais são todas as atividades pendentes do documental ce e do documental im, e o que falta para concluir cada uma?": [
    { nome: "documental_ce", args: { foco: "pendencias", caso: "ambos" } },
  ],
  "quais atividades do documental ce e do documental im ainda não têm o ce liberado?": [
    { nome: "documental_ce", args: { foco: "sem_liberacao", caso: "ambos" } },
  ],
  "quais atividades com o documental ce ainda não têm o ce liberado?": [{ nome: "documental_ce", args: { foco: "sem_liberacao", caso: "ce" } }],
};

const VARIAVEIS: { re: RegExp; montar: (m: RegExpMatchArray) => Receita[] }[] = [
  {
    re: /^quais processos (ia|ea|im|em) (embarcaram|desembarcaram) hoje\??$/i,
    montar: (m) => [{
      nome: "prazos",
      args: {
        dias: 1,
        marco: m[2].toLowerCase().startsWith("des") ? "desembarque" : "embarque",
        modo: "realizado",
        modalidade: m[1].toUpperCase(),
      },
    }],
  },
  {
    re: /^ficha do cliente (.+?):/i,
    montar: (m) => [{ nome: "processos_abertos_cliente", args: { cliente: m[1].trim() } }],
  },
  {
    re: /^qual o andamento da atividade (.+?) no processo (.+?)\?$/i,
    montar: (m) => [{ nome: "andamento_atividade", args: { codigo: m[1].trim(), numero: m[2].trim().toUpperCase() } }],
  },
  {
    re: new RegExp(`^faça o resumo(?: operacional)? do processo ${PROCESSO}\\.?$`, "i"),
    montar: (m) => [{ nome: "resumo_processo", args: { numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`^quais as taxas do processo ${PROCESSO}`, "i"),
    montar: (m) => [{ nome: "taxas_processo", args: { numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`^qual a proposta ligada ao processo ${PROCESSO}\\?$`, "i"),
    montar: (m) => [{ nome: "proposta_processo", args: { numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`^qual a proposta e a oferta do processo ${PROCESSO}\\?$`, "i"),
    montar: (m) => [{ nome: "proposta_processo", args: { numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`^quais os acompanhamentos do processo ${PROCESSO}\\?$`, "i"),
    montar: (m) => [{ nome: "acompanhamentos_processo", args: { numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`(?:rota|navio|rastre)[\\s\\S]{0,80}${PROCESSO}|${PROCESSO}[\\s\\S]{0,80}(?:rota|navio|rastre)`, "i"),
    montar: (m) => [{ nome: "rota_processo", args: { numero: (m[1] || m[2]).toUpperCase() } }],
  },
  {
    re: new RegExp(`^o que mudou no processo ${PROCESSO} nos últimos 30 dias\\?$`, "i"),
    montar: (m) => [{ nome: "o_que_mudou", args: { numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`^quais campos livres estão preenchidos no processo ${PROCESSO}\\?$`, "i"),
    montar: (m) => [{ nome: "documental_ce", args: { foco: "campos", numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`^no processo ${PROCESSO}, quais atividades estão com o documental ce`, "i"),
    montar: (m) => [{ nome: "documental_ce", args: { foco: "processo", caso: "ambos", numero: m[1].toUpperCase() } }],
  },
  {
    re: new RegExp(`(?:frete|pagamento|recebimento)[\\s\\S]{0,80}?${PROCESSO}|${PROCESSO}[\\s\\S]{0,80}?(?:frete|pagamento|recebimento)`, "i"),
    montar: (m) => [{ nome: "taxas_processo", args: { numero: (m[1] || m[2]).toUpperCase() } }],
  },
  {
    re: new RegExp(`comiss[\\s\\S]{0,80}?${PROCESSO}|${PROCESSO}[\\s\\S]{0,80}?comiss`, "i"),
    montar: (m) => [{ nome: "comissao_periodo", args: { numero: (m[1] || m[2]).toUpperCase() } }],
  },
  {
    re: new RegExp(`(?:\\bce\\b|liberad|documenta)[\\s\\S]{0,80}?${PROCESSO}|${PROCESSO}[\\s\\S]{0,80}?(?:\\bce\\b|liberad|documenta)`, "i"),
    montar: (m) => [{ nome: "documental_ce", args: { foco: "processo", caso: "ambos", numero: (m[1] || m[2]).toUpperCase() } }],
  },
  {
    re: new RegExp(`(?:embarc|porto|desembarc)[\\s\\S]{0,80}?${PROCESSO}|${PROCESSO}[\\s\\S]{0,80}?(?:embarc|porto|desembarc)`, "i"),
    montar: (m) => [{ nome: "rota_processo", args: { numero: (m[1] || m[2]).toUpperCase() } }],
  },
  {
    re: new RegExp(`(?:atividad|pend[eê]ncia)[\\s\\S]{0,80}?${PROCESSO}|${PROCESSO}[\\s\\S]{0,80}?(?:atividad|pend[eê]ncia)`, "i"),
    montar: (m) => [{
      nome: "andamento_atividade",
      args: {
        numero: (m[1] || m[2]).toUpperCase(),
        pendentes: /pendent/i.test(m.input ?? ""),
      },
    }],
  },
];

function chaveDa(pergunta: string) {
  return pergunta.replace(/\s+/g, " ").trim().toLowerCase();
}

function ler(): Record<string, Receita[]> {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE) || "{}") as unknown;
    if (!dados || typeof dados !== "object") return {};
    return dados as Record<string, Receita[]>;
  } catch {
    return {};
  }
}

function semente(pergunta: string): Receita[] | null {
  const chave = chaveDa(pergunta);
  if (FIXAS[chave]) return FIXAS[chave];
  for (const item of VARIAVEIS) {
    const achado = chave.match(item.re);
    if (achado) return item.montar(achado);
  }
  return null;
}

export function receitaSalva(pergunta: string): Receita[] | null {
  const fixa = semente(pergunta);
  if (fixa) return fixa;
  const salvas = ler()[chaveDa(pergunta)];
  if (Array.isArray(salvas) && salvas.length) return salvas;
  return null;
}

export function guardarReceita(pergunta: string, ferramentas: Receita[]) {
  const uteis = ferramentas.filter((item) => item.nome && item.args);
  if (!uteis.length) return;
  const todas = ler();
  todas[chaveDa(pergunta)] = uteis.slice(0, 4);
  localStorage.setItem(CHAVE, JSON.stringify(todas));
}

export function textoDaConsulta(resultado: string): string {
  const limpo = resultado.trim();
  if (!limpo) return "";
  try {
    const dados = JSON.parse(limpo) as { texto?: unknown; linhas?: unknown; sql?: unknown; house?: unknown };
    if (typeof dados.texto === "string" && dados.texto.trim()) return dados.texto.trim();
    if (Array.isArray(dados.linhas) && dados.linhas.length) {
      const linhas = dados.linhas.filter((linha) => linha && typeof linha === "object") as Record<string, unknown>[];
      const colunas = Object.keys(linhas[0] ?? {})
        .filter((coluna) => !/^id/i.test(coluna))
        .slice(0, 8);
      if (!colunas.length) return limpo;
      const celula = (valor: unknown) => String(valor ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
      const cabeca = `| ${colunas.join(" | ")} |`;
      const traco = `| ${colunas.map(() => "---").join(" | ")} |`;
      const corpo = linhas
        .slice(0, 30)
        .map((linha) => `| ${colunas.map((coluna) => celula(linha[coluna])).join(" | ")} |`);
      const extra = linhas.length > 30 ? `\n\nMostrei 30 de ${linhas.length}.` : "";
      return `${cabeca}\n${traco}\n${corpo.join("\n")}${extra}`;
    }
    if ("sql" in dados || "house" in dados) return "";
  } catch {
    /* a ferramenta já devolveu texto */
  }
  return limpo;
}
