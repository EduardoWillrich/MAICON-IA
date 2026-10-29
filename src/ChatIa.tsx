import { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logoMaiconPng from "./assets/maicon-logo.png";
import logoMaicon from "./assets/maicon-logo.svg";
import logoConline from "./assets/conline-logo.png";
import type { LogPdf } from "./PdfHistorico";
import {
  relatorioComDetalhe,
  pediuNoChat,
  relatorioGrande,
  secaoDaFerramenta,
  type RelatorioChat,
  type SecaoRelatorio,
} from "./pdfRelatorio";
import { guardarReceita, receitaSalva, textoDaConsulta, type Receita } from "./receitasIa";
import { InicioPainel } from "./InicioPainel";
import { AvaliacaoResposta } from "./AvaliacaoResposta";
import { renovarTokenGmail } from "./tokenGmail";
import { SymbolLoader } from "./Loader";
import { SqlDestaque } from "./SqlDestaque";
import { LogCard, PainelTiCard, logDoTexto, painelDoTexto } from "./PainelTi";
import { completarConsultaLog } from "./ferramentasIa";
import { formatarDataHora } from "./datas";
import { acoesDoEvento, camposQueMudaram, nomeProprio, rotuloCampo } from "./relatorio";
import { rotuloTipo } from "./types";

type ChamadaFerramenta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type Preferencia = { termo: string; tabela: string; campo: string; observacao: string };

type UsoTokens = { entrada: number; saida: number; total: number };

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function palavrasDaBusca(consulta: string) {
  return semAcento(consulta).split(/\s+/).filter((parte) => parte.length > 1);
}

function textoCombina(texto: string, consulta: string) {
  const palavras = palavrasDaBusca(consulta);
  if (!palavras.length) return false;
  const base = semAcento(texto);
  return palavras.every((parte) => base.includes(parte));
}

function trechoDaBusca(texto: string, consulta: string) {
  const base = texto.replace(/\s+/g, " ").trim();
  const normal = semAcento(base);
  const alvo = palavrasDaBusca(consulta)[0] ?? "";
  const em = alvo ? normal.indexOf(alvo) : 0;
  let inicio = Math.max(0, em - 42);
  if (inicio > 0) {
    const corte = base.indexOf(" ", inicio);
    if (corte !== -1 && corte < em) inicio = corte + 1;
  }
  let fim = Math.min(base.length, Math.max(em, 0) + alvo.length + 72);
  if (fim < base.length) {
    const corte = base.lastIndexOf(" ", fim);
    if (corte > em) fim = corte;
  }
  return `${inicio > 0 ? "…" : ""}${base.slice(inicio, fim).trim()}${fim < base.length ? "…" : ""}`;
}

function formatarDuracao(ms: number): string {
  if (ms < 1000) return `${Math.max(1, ms)} ms`;
  const segundos = ms / 1000;
  if (segundos < 60) {
    const texto = segundos < 10 ? segundos.toFixed(1) : String(Math.round(segundos));
    return `${texto.replace(".", ",")} s`;
  }
  const minutos = Math.floor(segundos / 60);
  const resto = Math.round(segundos % 60);
  return resto ? `${minutos} min ${resto} s` : `${minutos} min`;
}

type Mensagem =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      tool_calls?: ChamadaFerramenta[];
      uso?: UsoTokens;
      duracaoMs?: number;
      relatorio?: RelatorioChat;
      detalheNoChat?: boolean;
      log?: LogPdf;
      excel?: boolean;
      pedidoRelatorio?: boolean;
    }
  | { role: "tool"; tool_call_id: string; content: string };

const MAX_PASSOS = 12;
const LIMITE_RESULTADO = 30000;

function enxugarResultado(resultado: string): string {
  try {
    const dados = JSON.parse(resultado) as { texto?: unknown; sql?: unknown; linhas?: unknown };
    const linhas = Array.isArray(dados.linhas) ? dados.linhas.slice(0, 12) : [];
    return JSON.stringify({
      texto: typeof dados.texto === "string" ? dados.texto : "",
      sql: "",
      linhas,
    });
  } catch {
    const linhas = objetosDaLista(resultado, '"linhas"').slice(0, 12);
    if (linhas.length) return JSON.stringify({ texto: "", sql: "", linhas });
    return `${resultado.slice(0, LIMITE_RESULTADO)}\n[... resultado cortado por tamanho]`;
  }
}

const SUGESTOES_COMERCIAL: { titulo: string; descricao: string; pergunta: string; icone: keyof typeof ICONES }[] = [
  { titulo: "Pendências", descricao: "Atividades pendentes de 2026 do comercial e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do comercial em 2026 e qual o motivo de cada uma?", icone: "busca" },
  { titulo: "Pendências do inside", descricao: "Atividades pendentes de 2026 do inside e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do inside em 2026 e qual o motivo de cada uma?", icone: "busca" },
  { titulo: "Resumo do processo", descricao: "Cliente, vendedor responsável e a situação atual.", pergunta: "Faça o resumo do processo {processo}.", icone: "resumo" },
  { titulo: "Buscar cliente", descricao: "Ficha do cliente: vendedor, sem proposta, último processo e comissão do mês.", pergunta: "Se eu informar uma referência de processo, busque os processos. Se eu informar o nome do cliente, monte a ficha: processos abertos, vendedor, quantos estão sem proposta, o último processo e a comissão deste mês. Se eu não disse nem o nome nem a referência, pergunte qual cliente.", icone: "busca" },
  { titulo: "Proposta", descricao: "Oferta comercial e as datas da proposta.", pergunta: "Qual a proposta e a oferta do processo {processo}?", icone: "busca" },
  { titulo: "Comissão do mês", descricao: "Comissões já calculadas neste mês.", pergunta: "Qual a comissão neste mês?", icone: "check" },
  { titulo: "Processos do cliente", descricao: "Ficha com os processos abertos, o vendedor e a comissão do mês.", pergunta: "Monte a ficha do cliente com os processos abertos. Se eu não disse o nome, pergunte qual cliente. Inclua vendedor, quantos estão sem proposta, o último processo e a comissão deste mês.", icone: "resumo" },
  { titulo: "Minhas pendências", descricao: "O que está atrasado e o que vence nos próximos 7 dias.", pergunta: "Quais são minhas pendências atrasadas e as dos próximos 7 dias?", icone: "check" },
];

const SUGESTOES_SETOR: Record<string, { titulo: string; descricao: string; pergunta: string; icone: keyof typeof ICONES }[]> = {
  inside: SUGESTOES_COMERCIAL,
  comercial: SUGESTOES_COMERCIAL,
  operacional: [
    { titulo: "Pendências", descricao: "Atividades pendentes de 2026 e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do operacional em 2026 e qual o motivo de cada uma?", icone: "busca" },
    { titulo: "Divergências", descricao: "Desembarque de 2026 com 15 dias ou mais de diferença da previsão.", pergunta: "Quais processos de 2026 têm o desembarque real muito diferente da previsão?", icone: "troca" },
    { titulo: "Resumo do processo", descricao: "Situação, prazos e a pendência atual.", pergunta: "Faça o resumo operacional do processo {processo}.", icone: "resumo" },
    { titulo: "Rota do navio", descricao: "Navio, portos e as datas de cada trecho da viagem.", pergunta: "Como está a rota do navio no processo {processo}?", icone: "navio" },
    { titulo: "Acompanhamentos", descricao: "As notas de acompanhamento mais recentes.", pergunta: "Quais os acompanhamentos do processo {processo}?", icone: "busca" },
    { titulo: "Prazos", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "check" },
    { titulo: "Processos parados", descricao: "Sem nenhuma nota de acompanhamento há 7 dias.", pergunta: "Quais processos estão parados há 7 dias sem acompanhamento?", icone: "resumo" },
    { titulo: "O que mudou", descricao: "Campos alterados neste processo nos últimos 30 dias.", pergunta: "O que mudou no processo {processo} nos últimos 30 dias?", icone: "troca" },
  ],
  documental: [
    { titulo: "Fila do CE", descricao: "Atividades abertas que estão com o documental CE.", pergunta: "Quais atividades estão agora com o documental CE?", icone: "check" },
    { titulo: "Fila do IM", descricao: "Atividades abertas que estão com o documental IM.", pergunta: "Quais atividades estão agora com o documental IM?", icone: "check" },
    { titulo: "Pendências", descricao: "Tudo que está pendente no CE e no IM, e o que falta para concluir.", pergunta: "Quais são todas as atividades pendentes do documental CE e do documental IM, e o que falta para concluir cada uma?", icone: "busca" },
    { titulo: "CE ainda não liberado", descricao: "Atividades do CE e do IM que ainda não estão com CE liberado.", pergunta: "Quais atividades do documental CE e do documental IM ainda não têm o CE liberado?", icone: "busca" },
    { titulo: "Do processo", descricao: "Atividades do CE e do IM, envolvidos, liberação e o que falta.", pergunta: "No processo {processo}, quais atividades estão com o documental CE e com o documental IM, quem são os envolvidos, o CE já está liberado e o que falta para concluir?", icone: "resumo" },
    { titulo: "Campos livres", descricao: "Campos livres que já estão preenchidos neste processo.", pergunta: "Quais campos livres estão preenchidos no processo {processo}?", icone: "troca" },
  ],
  admin: [
    { titulo: "Fila dos setores", descricao: "Abertos, sem proposta, atrasados e parados, por setor.", pergunta: "Como está a fila dos setores: processos abertos, sem proposta, atrasados e parados?", icone: "resumo" },
    { titulo: "Processos parados", descricao: "Sem nenhuma nota de acompanhamento há 7 dias.", pergunta: "Quais processos estão parados há 7 dias sem acompanhamento?", icone: "busca" },
    { titulo: "Prazos vencendo", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "check" },
    { titulo: "Divergências", descricao: "Desembarque de 2026 com 15 dias ou mais de diferença da previsão.", pergunta: "Quais processos de 2026 têm o desembarque real muito diferente da previsão?", icone: "troca" },
    { titulo: "Rota do navio", descricao: "Navio, portos e as datas de cada trecho da viagem.", pergunta: "Como está a rota do navio no processo {processo}?", icone: "navio" },
  ],
  gerencia: [
    { titulo: "Fila dos setores", descricao: "Abertos, sem proposta, atrasados e parados, por setor.", pergunta: "Como está a fila dos setores: processos abertos, sem proposta, atrasados e parados?", icone: "resumo" },
    { titulo: "Processos parados", descricao: "Sem nenhuma nota de acompanhamento há 7 dias.", pergunta: "Quais processos estão parados há 7 dias sem acompanhamento?", icone: "busca" },
    { titulo: "Prazos vencendo", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "check" },
    { titulo: "Pendências do operacional", descricao: "Atividades pendentes de 2026 e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do operacional em 2026 e qual o motivo de cada uma?", icone: "busca" },
    { titulo: "Pendências do comercial", descricao: "Atividades pendentes de 2026 e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do comercial em 2026 e qual o motivo de cada uma?", icone: "busca" },
    { titulo: "Documental", descricao: "Tudo que está pendente no CE e no IM, e o que falta para concluir.", pergunta: "Quais são todas as atividades pendentes do documental CE e do documental IM, e o que falta para concluir cada uma?", icone: "check" },
    { titulo: "Painel financeiro", descricao: "Comissões, taxas e prazos do mês, com valores.", pergunta: "Monte o painel financeiro deste mês, com valores.", icone: "grafico" },
    { titulo: "Comissões da equipe", descricao: "Comissões de vendedor já calculadas neste mês.", pergunta: "Qual a comissão de vendedor neste mês, com os valores?", icone: "check" },
    { titulo: "Divergências", descricao: "Desembarque de 2026 com 15 dias ou mais de diferença da previsão.", pergunta: "Quais processos de 2026 têm o desembarque real muito diferente da previsão?", icone: "troca" },
  ],
  financeiro: [
    { titulo: "Painel do mês", descricao: "Comissões, taxas e prazos dos próximos 7 dias.", pergunta: "Monte o painel financeiro deste mês, com valores.", icone: "resumo" },
    { titulo: "Gráfico", descricao: "Linha das faturas do processo, com valor e data.", pergunta: "Me mostre em um gráfico de linhas as faturas de um processo, com número, valor e data. Se eu não informei o número, pergunte qual processo.", icone: "grafico" },
    { titulo: "Comissões", descricao: "Comissões de vendedor já calculadas neste mês.", pergunta: "Qual a comissão de vendedor neste mês, com os valores?", icone: "check" },
    { titulo: "Taxas do processo", descricao: "Pagamento e recebimento de cada taxa.", pergunta: "Quais as taxas do processo {processo}, com pagamento e recebimento?", icone: "busca" },
    { titulo: "Prazos", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "check" },
    { titulo: "Relatório de taxas", descricao: "Taxas do mês com nome, pagamento e recebimento.", pergunta: "Pedir relatório das taxas deste mês, com nome, pagamento e recebimento.", icone: "relatorio" },
  ],
  ti: [
    { titulo: "Painel do TI", descricao: "Resumo das últimas 24 horas: volume, quem alterou e quais tabelas.", pergunta: "Monte o painel do TI das últimas 24 horas.", icone: "resumo" },
    { titulo: "Log recente", descricao: "Eventos das últimas 24 horas, com usuário, tabela, tipo e computador.", pergunta: "Mostre o log das últimas 24 horas, com usuário, tabela, tipo e computador.", icone: "troca" },
    { titulo: "Monitoramentos", descricao: "Quem mudou o projeto de tarefas e a atividade nos registros recentes.", pergunta: "Quais foram os últimos monitoramentos alterados e quem alterou, no projeto de tarefas e na atividade?", icone: "troca" },
    { titulo: "Exclusões", descricao: "O que foi apagado nas últimas 24 horas e quem excluiu.", pergunta: "Quais exclusões aconteceram nas últimas 24 horas?", icone: "busca" },
    { titulo: "Quem mais alterou", descricao: "Ranking de quem mais gravou log nas últimas 24 horas.", pergunta: "Quem mais gravou log nas últimas 24 horas?", icone: "check" },
    { titulo: "Contas da IA", descricao: "Quem entrou na IA e qual o papel de cada conta.", pergunta: "Quais contas acessaram a IA e qual o papel de cada uma?", icone: "busca" },
    { titulo: "Log de um processo", descricao: "Histórico técnico de um processo. Se faltar o número, a IA pergunta.", pergunta: "Consulte o log técnico de um processo. Se eu não informei o número, pergunte qual processo.", icone: "resumo" },
  ],
};

type RelatorioPronto = {
  titulo: string;
  descricao: string;
  pergunta: string;
  icone: keyof typeof ICONES;
  grupo: string;
  visoes: string[];
};

const RELATORIOS_PRONTOS: RelatorioPronto[] = [
  {
    titulo: "Processos abertos",
    descricao: "Abertos neste mês, com cliente, situação e responsável.",
    pergunta: "Pedir relatório dos processos abertos neste mês. Colunas: número do processo, cliente, situação, data de abertura e responsável.",
    icone: "resumo",
    grupo: "Operação",
    visoes: ["*"],
  },
  {
    titulo: "Prazos da semana",
    descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.",
    pergunta: "Pedir relatório dos prazos de embarque, desembarque e entrega que vencem nos próximos 7 dias. Colunas: número do processo, cliente, previsão de embarque, previsão de desembarque e previsão de entrega.",
    icone: "check",
    grupo: "Operação",
    visoes: ["*"],
  },
  {
    titulo: "Atividades pendentes",
    descricao: "O que ainda está aberto neste ano, com previsão e responsável.",
    pergunta: "Pedir relatório das atividades pendentes deste ano. Colunas: número do processo, atividade, responsável, previsão de término e situação.",
    icone: "busca",
    grupo: "Operação",
    visoes: ["*"],
  },
  {
    titulo: "Processos parados",
    descricao: "Sem acompanhamento há 7 dias ou mais.",
    pergunta: "Pedir relatório dos processos parados há 7 dias ou mais, sem nota de acompanhamento. Colunas: número do processo, cliente, data do último acompanhamento e dias sem acompanhamento.",
    icone: "resumo",
    grupo: "Operação",
    visoes: ["operacional", "gerencia"],
  },
  {
    titulo: "Divergências de desembarque",
    descricao: "Desembarque de 2026 longe da previsão.",
    pergunta: "Pedir relatório dos processos de 2026 em que o desembarque real está 15 dias ou mais diferente da previsão. Colunas: número do processo, cliente, desembarque previsto, desembarque real e diferença em dias.",
    icone: "troca",
    grupo: "Operação",
    visoes: ["operacional", "gerencia"],
  },
  {
    titulo: "Propostas do mês",
    descricao: "Situação e valor das propostas deste mês.",
    pergunta: "Pedir relatório das propostas deste mês. Colunas: número do processo, cliente, vendedor, situação da proposta e valor.",
    icone: "busca",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "gerencia"],
  },
  {
    titulo: "Comissões do mês",
    descricao: "Comissões de vendedor já calculadas neste mês.",
    pergunta: "Pedir relatório das comissões de vendedor deste mês. Colunas: vendedor, número do processo, cliente e valor da comissão.",
    icone: "check",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "financeiro", "gerencia"],
  },
  {
    titulo: "Clientes com processos abertos",
    descricao: "Quem tem mais processos abertos, com vendedor e quantos estão sem proposta.",
    pergunta: "Pedir relatório dos clientes com processos abertos nos últimos 6 meses. Colunas: cliente, vendedor, processos abertos e sem proposta. Na carteira, só os clientes do vendedor logado. Na visão de administrador, todos.",
    icone: "resumo",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "gerencia"],
  },
  {
    titulo: "Clientes sem movimento",
    descricao: "Quem já abriu processo e não abre há 90 dias.",
    pergunta: "Pedir relatório dos clientes que já abriram processo e não abrem há 90 dias ou mais. Colunas: cliente, vendedor, data do último processo e dias sem abrir. Na carteira, só os clientes do vendedor logado. Na visão de administrador, todos.",
    icone: "busca",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "gerencia"],
  },
  {
    titulo: "Taxas do mês",
    descricao: "Nome da taxa, pagamento e recebimento.",
    pergunta: "Pedir relatório das taxas deste mês. Colunas: número do processo, cliente, nome da taxa, valor de pagamento e valor de recebimento.",
    icone: "relatorio",
    grupo: "Financeiro",
    visoes: ["financeiro", "gerencia"],
  },
  {
    titulo: "Fila do documental",
    descricao: "CE e IM em aberto, com liberação e o que falta.",
    pergunta: "Pedir relatório das atividades pendentes do documental CE e do documental IM. Colunas: número do processo, atividade, responsável, CE liberado e o que falta para concluir.",
    icone: "check",
    grupo: "Documental",
    visoes: ["documental", "gerencia"],
  },
  {
    titulo: "Log das últimas 24 horas",
    descricao: "Quem alterou, em qual tabela e em qual computador.",
    pergunta: "Pedir relatório do log das últimas 24 horas. Colunas: data, usuário, tabela, tipo e computador.",
    icone: "troca",
    grupo: "TI",
    visoes: ["ti"],
  },
  {
    titulo: "Exclusões recentes",
    descricao: "O que foi apagado nas últimas 24 horas e quem excluiu.",
    pergunta: "Pedir relatório das exclusões das últimas 24 horas. Colunas: data, usuário, tabela, registro e computador.",
    icone: "busca",
    grupo: "TI",
    visoes: ["ti"],
  },
];

function relatoriosDaVisao(visao: string, semComissao: boolean) {
  const area = visao || "geral";
  const lista = RELATORIOS_PRONTOS.filter((item) => {
    if (area === "ti") return item.visoes.includes("ti") || item.visoes.includes("*");
    if (area === "tudo" || area === "admin" || area === "geral") return !item.visoes.includes("ti") || item.visoes.includes("*");
    return item.visoes.includes("*") || item.visoes.includes(area);
  }).filter((item) => !semComissao || !/comiss/i.test(item.titulo));
  const grupos: { nome: string; itens: RelatorioPronto[] }[] = [];
  for (const item of lista) {
    const grupo = grupos.find((atual) => atual.nome === item.grupo);
    if (grupo) grupo.itens.push(item);
    else grupos.push({ nome: item.grupo, itens: [item] });
  }
  return grupos;
}

function comProcesso(lista: { titulo: string; descricao: string; pergunta: string; icone: keyof typeof ICONES; receita?: Receita[] }[], processo: string, modalidade = "") {
  const aereo = /^(IA|EA)/i.test(processo) || (!/^(IM|EM)/i.test(processo) && /^(IA|EA)$/i.test(modalidade));
  return lista.map((item) => {
    const base = item.titulo === "Rota do navio" && aereo
      ? {
          ...item,
          titulo: "Rota do avião",
          descricao: "Voo, aeroportos e as datas de cada trecho da viagem.",
          pergunta: item.pergunta.replace("rota do navio", "rota do avião"),
          icone: "aviao" as const,
        }
      : item;
    const temProcesso = base.pergunta.includes("{processo}");
    const pergunta = !temProcesso
      ? base.pergunta
      : processo
        ? base.pergunta.replaceAll("{processo}", processo)
        : `${base.pergunta.replace(" {processo}", "").replace("{processo}", "um processo")} Se eu não informei o número, pergunte qual processo.`;
    return { ...base, pergunta, receita: base.receita ?? receitaSalva(pergunta) ?? undefined };
  });
}

const SUGESTOES: { titulo: string; descricao: string; pergunta: string; icone: keyof typeof ICONES }[] = [
  {
    titulo: "Consultar um processo",
    descricao: "Quem mexeu no processo e o que foi alterado.",
    pergunta: "Quem alterou o processo IM5328-26 nos últimos 30 dias?",
    icone: "busca",
  },
  {
    titulo: "Cliente do processo",
    descricao: "Dados atuais do cliente, sem abrir o histórico.",
    pergunta: "Qual o cliente do processo IM4940-26?",
    icone: "resumo",
  },
  {
    titulo: "Situação de atividade",
    descricao: "Quando a atividade foi concluída e por quem.",
    pergunta: "Consulte a atividade 2282868 desde 25/09 e diga quem mudou a situação",
    icone: "check",
  },
  {
    titulo: "Antes e depois",
    descricao: "Valor anterior e valor novo de cada campo alterado.",
    pergunta: "Quais campos mudaram e quais eram os valores antes?",
    icone: "troca",
  },
];

const ICONES = {
  ia: "M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zm6 12l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14zM6 15l.7 1.6L8.3 17l-1.6.7L6 19.3l-.7-1.6L3.7 17l1.6-.4L6 15z",
  busca: "M10 4a6 6 0 104.47 10.03l4.75 4.75 1.41-1.41-4.75-4.75A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z",
  resumo: "M5 4h14v2H5V4zm0 4h14v2H5V8zm0 4h9v2H5v-2zm0 4h11v2H5v-2z",
  navio: "M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78a.99.99 0 0 0-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42a.99.99 0 0 0-.6.5c-.12.24-.14.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z",
  aviao: "M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
  caminhao: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9 1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
  check: "M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5L9 16.2z",
  troca: "M7 7h11l-3-3 1.4-1.4L21.8 8l-5.4 5.4L15 12l3-3H7V7zm10 10H6l3 3-1.4 1.4L2.2 16l5.4-5.4L9 12l-3 3h11v2z",
  enviar: "M3 20.5l18-8.5L3 3.5v6.6l12 1.9-12 1.9v6.6z",
  memoria: "M12 3a7 7 0 00-4 12.74V19a1 1 0 001 1h6a1 1 0 001-1v-3.26A7 7 0 0012 3zm-2 18h4v1h-4v-1z",
  config: "M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.56-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z",
  novo: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z",
  fechar: "M6.4 5L5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5z",
  fundo: "M3 5a2 2 0 012-2h14a2 2 0 012 2v6h-2V5H5v14h6v2H5a2 2 0 01-2-2V5zm10 9a1 1 0 011-1h7a1 1 0 011 1v6a1 1 0 01-1 1h-7a1 1 0 01-1-1v-6zm-5.3-6.7L11 10.6V8h2v6H7v-2h2.6L6.3 8.7l1.4-1.4z",
  relatorio: "M6 3h8l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zm7 1.5V9h4.5L13 4.5zM8 13h8v1.5H8V13zm0 3h8v1.5H8V16z",
  grafico: "M3 17.5 8.2 12l3.3 2.6L20.5 5.2l.1 2.2-9.2 9.6-3.4-2.7L4.2 19H3v-1.5z",
  expandir: "M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10L21 11z",
  recolher: "M14 6l-6 6 6 6",
  conversas: "M4 5h11a1 1 0 011 1v7a1 1 0 01-1 1H8l-4 3v-3H4a1 1 0 01-1-1V6a1 1 0 011-1zm9 12h2.5L20 20.5V17h1a1 1 0 001-1v-5h-2v4H13v2z",
  novoAqui: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0H5z",
  painel: "M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z",
  email: "M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm9.3 6.9L20 7.2V6.8l-7.7 4.8L4 6.8v.4l8.3 4.7z",
} as const;

const RESUMO_ENTRADA = false;

function textoVisivel(content: string) {
  return content.split("\n\nTexto lido da imagem:\n")[0] ?? content;
}

function Icone({ nome, tamanho = 18 }: { nome: keyof typeof ICONES; tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden>
      <path fill="currentColor" d={ICONES[nome]} />
    </svg>
  );
}

const ROTULO_FERRAMENTA: Record<string, string> = {
  buscar_tabelas: "Procurando tabelas",
  listar_colunas: "Lendo colunas da tabela",
  consultar_log: "Consultando o log",
  explicar_itens_carga: "Lendo quem incluiu cada item",
  explicar_campo_livre: "Lendo o campo livre",
  painel_ti: "Montando o painel do TI",
  painel_financeiro: "Montando o painel financeiro",
  taxas_processo: "Lendo as taxas do processo",
  log_recente: "Lendo o log recente",
  monitoramentos_alterados: "Lendo monitoramentos alterados",
  consultar_dados: "Lendo dados do banco",
  documental_ce: "Lendo o documental CE",
  atividades_pendentes: "Lendo atividades pendentes",
  divergencias_viagem: "Lendo divergências de desembarque",
  rota_processo: "Montando a rota",
  andamento_atividade: "Lendo o andamento da atividade",
  executar_sql: "Consultando o banco",
  emails_gmail: "Lendo os e-mails",
  localizar_processo: "Localizando o processo",
  resultado_atual: "Lendo o resultado da tela",
  lembrar_preferencia: "Guardando na memória",
  esquecer_preferencia: "Removendo da memória",
};

function dataLegivel(valor: unknown): string {
  const texto = String(valor ?? "");
  const data = texto.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!data) return texto;
  return `${data[3]}/${data[2]}/${data[1]} ${data[4]}:${data[5]}`;
}

function resumirResultado(conteudo: string): string {
  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    const texto = conteudo.trim();
    if (texto.startsWith("Erro:") || soNomesDeTabela(texto)) return "";
    return texto;
  }
  if (!dados || typeof dados !== "object") return "";
  const registro = dados as { texto?: unknown; linhas?: Record<string, unknown>[]; house?: Record<string, unknown>[] };
  if (typeof registro.texto === "string" && registro.texto.trim()) return registro.texto.trim();
  const linhas = Array.isArray(registro.linhas) ? registro.linhas : [];
  if (linhas.length) {
    const comDescricao = linhas.filter((linha) => String(linha.Descricao ?? linha.descricao ?? "").trim());
    if (comDescricao.length) {
      return comDescricao
        .map((linha) => {
          const descricao = String(linha.Descricao ?? linha.descricao ?? "").replace(/\s+/g, " ").trim();
          const quando = linha.Data ?? linha.data;
          const responsavel = String(linha.Responsavel ?? linha.responsavel ?? "").trim();
          const partes = [descricao];
          if (quando) partes.unshift(`${dataLegivel(quando)}.`);
          if (responsavel) partes.push(`Responsável: ${responsavel}.`);
          return partes.join(" ");
        })
        .join("\n");
    }
    return linhas
      .slice(0, 5)
      .map((item) =>
        Object.entries(item)
          .filter(([, valor]) => valor != null && String(valor).trim())
          .map(([chave, valor]) => `${chave}: ${dataLegivel(valor)}`)
          .join(". "),
      )
      .join("\n");
  }
  return "";
}

function semMençãoPdf(texto: string): string {
  return texto
    .split(/(```[\s\S]*?```)/g)
    .map((parte) =>
      parte.startsWith("```")
        ? parte
        : parte
            .replace(/[^.!?\n]*\bpdf\b[^.!?\n]*[.!?]?/gi, "")
            .replace(/[^.!?\n]*\b(excel|planilha)\b[^.!?\n]*[.!?]?/gi, ""),
    )
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fimDoJson(texto: string, inicio: number): number {
  let profundidade = 0;
  let textoAberto = false;
  let escape = false;
  for (let i = inicio; i < texto.length; i += 1) {
    const char = texto[i];
    if (textoAberto) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === "\"") textoAberto = false;
      continue;
    }
    if (char === "\"") textoAberto = true;
    else if (char === "{") profundidade += 1;
    else if (char === "}") {
      profundidade -= 1;
      if (profundidade === 0) return i + 1;
    }
  }
  return -1;
}

function objetosDaLista(texto: string, marca: string): unknown[] {
  const pos = texto.indexOf(marca);
  if (pos < 0) return [];
  const ini = texto.indexOf("[", pos);
  if (ini < 0) return [];
  const lista: unknown[] = [];
  let i = ini + 1;
  while (i < texto.length) {
    while (i < texto.length && /[\s,]/.test(texto[i])) i += 1;
    if (texto[i] !== "{") break;
    const fim = fimDoJson(texto, i);
    if (fim < 0) break;
    try {
      lista.push(JSON.parse(texto.slice(i, fim)));
    } catch {
      break;
    }
    i = fim;
  }
  return lista;
}

function tabelaDosRegistros(lista: unknown): string {
  if (!Array.isArray(lista) || !lista.length) return "";
  return textoDaConsulta(JSON.stringify({ linhas: lista }));
}

function respostaSemPayload(texto: string): string {
  const inicio = texto.indexOf("{");
  if (inicio < 0 || !/"sql"\s*:/.test(texto)) return texto;
  const antes = texto.slice(0, inicio).trim();
  if (/```/.test(antes)) return texto;
  const fim = fimDoJson(texto, inicio);
  if (fim < 0) {
    const tabela = tabelaDosRegistros(objetosDaLista(texto.slice(inicio), '"linhas"'));
    const aviso = tabela
      ? "A lista veio cortada. Peça um período menor se precisar de todos os registros."
      : "A consulta veio cortada. Peça um período menor para ver a lista completa.";
    return [antes, tabela, aviso].filter(Boolean).join("\n\n");
  }
  const candidato = texto.slice(inicio, fim).trim();
  const depois = texto.slice(fim).trim();
  const limpo = textoDaConsulta(candidato);
  const util = limpo && limpo !== candidato && !/"sql"\s*:/.test(limpo) ? limpo : "";
  if (!util && !depois) {
    let house = "";
    try {
      const dados = JSON.parse(candidato) as { house?: unknown; master?: unknown };
      const partes = [tabelaDosRegistros(dados.house), tabelaDosRegistros(dados.master)].filter(Boolean);
      house = partes.join("\n\n");
    } catch {
      house = "";
    }
    if (house) return [antes, house].filter(Boolean).join("\n\n");
  }
  return [antes, util, depois].filter(Boolean).join("\n\n") || antes || "Não encontrei dados para mostrar nessa consulta.";
}

function dataCurta(valor: string): string {
  const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return valor.match(/^\d{2}\/\d{2}\/\d{2,4}/)?.[0] ?? "";
}

function graficoSePedido(texto: string, pedido: string): string {
  if (!/gr[aá]fico/i.test(pedido) || !/fatura/i.test(pedido) || /```grafico/i.test(texto)) return texto;
  const linhas = texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.startsWith("|") && !/^\|\s*-+/.test(linha));
  if (linhas.length < 2) return texto;
  const celulas = (linha: string) => linha.split("|").slice(1, -1).map((celula) => celula.trim());
  const cabeca = celulas(linhas[0]).map((celula) => celula.toLowerCase());
  const iNome = cabeca.findIndex((celula) => /fatura|n[uú]mero|nome/.test(celula));
  const iValor = cabeca.findIndex((celula) => /valor/.test(celula));
  const iData = cabeca.findIndex((celula) => /^data\b/.test(celula));
  if (iNome < 0 || iValor < 0) return texto;
  const pontos: string[] = [];
  for (const linha of linhas.slice(1)) {
    const cols = celulas(linha);
    const nome = cols[iNome] ?? "";
    const valor = numeroMonetario((cols[iValor] ?? "").replace(/R\$/gi, "").replace(/\s/g, ""));
    if (!nome || valor == null) continue;
    const data = iData >= 0 ? dataCurta(cols[iData] ?? "") : "";
    pontos.push(data ? `${nome} | ${valor} | ${data}` : `${nome} | ${valor}`);
  }
  if (!pontos.length) return texto;
  const processo = (pedido.match(/\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/i)?.[0] ?? "").toUpperCase();
  const titulo = processo ? `Faturas ${processo}` : "Faturas";
  return `${texto.trim()}\n\n\`\`\`grafico\n${titulo}\n${pontos.join("\n")}\n\`\`\``;
}

function processoCitado(texto: string): string {
  return texto.toUpperCase().match(/\b[A-Z]{1,4}\d{2,6}-\d{2}\b/)?.[0] ?? "";
}

function receitaCampoLivre(pergunta: string): Receita[] | null {
  const fala = textoVisivel(pergunta);
  if (!/campo livre/i.test(fala) || !/quem (?:alter|inclu|mud)|hist[oó]rico|tipo fixo/i.test(fala)) return null;
  const processo = processoCitado(pergunta);
  const identificador = fala.toUpperCase().match(/CAMPO LIVRE\s+([A-Z][A-Z0-9_]{1,30})/)?.[1] ?? "";
  if (!processo || !identificador) return null;
  const grupo = fala.match(/distribui[cç][aã]o de documentos/i)?.[0] ?? "";
  return [{ nome: "explicar_campo_livre", args: { numero: processo, identificador, grupo } }];
}

function receitaItensCarga(pergunta: string, anteriores: Mensagem[]): Receita[] | null {
  const fala = textoVisivel(pergunta);
  const recente = anteriores
    .filter((item) => item.role === "user")
    .slice(-3)
    .map((item) => textoVisivel(item.content))
    .join("\n");
  if (/\btaxas?\b|idlogistica_?taxa|atividade|documento|despesa|fatura/i.test(fala)) return null;
  const contexto = `${fala}\n${recente}`;
  const sobreCarga =
    /duplicad|container|item de carga|sem bl|lista de carga/i.test(contexto) ||
    (/quem inclu/i.test(contexto) && /container|\bcarga\b/i.test(contexto));
  const resumoDesses = /resumo/i.test(fala) && (sobreCarga || /duplicad|container|item de carga|sem bl/i.test(recente));
  const resumoGenerico = /resumo (?:operacional )?(?:do|de um) processo/i.test(fala) && !sobreCarga;
  if (resumoGenerico || (!sobreCarga && !resumoDesses)) return null;
  const processo = processoCitado(pergunta) || processoCitado(recente);
  if (!processo) return null;
  const numeros = [...new Set((pergunta.toUpperCase().match(/\b[A-Z]{4}\d{7}\b/g) ?? []))];
  return [{ nome: "explicar_itens_carga", args: { numero: processo, numeros: numeros.slice(0, 40).join(", ") } }];
}

function textoItensDaRodada(historico: Mensagem[], pergunta: string): string {
  let inicio = -1;
  for (let i = historico.length - 1; i >= 0; i--) {
    if (historico[i].role === "user" && historico[i].content === pergunta) {
      inicio = i;
      break;
    }
  }
  const trecho = historico.slice(inicio + 1);
  const nomes = new Map<string, string>();
  for (const item of trecho) {
    if (item.role !== "assistant") continue;
    for (const chamada of item.tool_calls ?? []) nomes.set(chamada.id, chamada.function.name);
  }
  for (const item of trecho) {
    if (item.role !== "tool" || nomes.get(item.tool_call_id) !== "explicar_itens_carga") continue;
    const pronto = textoDaConsulta(item.content);
    if (pronto) return pronto;
  }
  return "";
}

function receitaDaRota(pergunta: string, anteriores: Mensagem[]): Receita[] | null {
  const numero = pergunta.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i)?.[1];
  if (!numero || pedeLog(textoVisivel(pergunta))) return null;
  const pedeRota = /rota|navio|rastre/i.test(pergunta);
  const recente = anteriores
    .filter((item) => item.role === "user" || (item.role === "assistant" && item.content))
    .slice(-4)
    .map((item) => item.content)
    .join("\n");
  const soNumero = pergunta.trim().length <= numero.length + 8;
  if (!pedeRota && !(/rota|navio|rastre/i.test(recente) && soNumero)) return null;
  return [{ nome: "rota_processo", args: { numero: numero.toUpperCase() } }];
}

function perguntaAberta(anteriores: Mensagem[]): string {
  const usuarios = anteriores.filter((item) => item.role === "user");
  for (let i = usuarios.length - 1; i >= 0; i--) {
    const texto = textoVisivel(usuarios[i].content);
    const achado = texto.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i)?.[1];
    const soNumero = Boolean(achado) && texto.trim().length <= (achado?.length ?? 0) + 8;
    if (!soNumero && texto.trim()) return texto;
  }
  return "";
}

function receitaDoAssunto(assunto: string, numero: string): Receita[] | null {
  const n = numero.toUpperCase();
  if (/campo(?:s)? livres?/i.test(assunto) && !/quem (?:alter|inclu|mud)|hist[oó]rico/i.test(assunto)) {
    return [{ nome: "documental_ce", args: { foco: "campos", numero: n } }];
  }
  if (/documental/i.test(assunto) && /atividade|envolvid|liberad|falta para concluir/i.test(assunto)) {
    return [{ nome: "documental_ce", args: { foco: "processo", caso: "ambos", numero: n } }];
  }
  if (pedeLog(assunto)) return null;
  if (/rota|navio|rastre/i.test(assunto)) return [{ nome: "rota_processo", args: { numero: n } }];
  if (/acompanhament/i.test(assunto)) return [{ nome: "acompanhamentos_processo", args: { numero: n } }];
  if (/proposta|oferta/i.test(assunto)) return [{ nome: "proposta_processo", args: { numero: n } }];
  if (/\btaxas?\b/i.test(assunto)) return [{ nome: "taxas_processo", args: { numero: n } }];
  if (/o que mudou|últimos 30 dias|ultimos 30 dias/i.test(assunto)) return [{ nome: "o_que_mudou", args: { numero: n } }];
  if (/resumo/i.test(assunto)) return [{ nome: "resumo_processo", args: { numero: n } }];
  return null;
}

function receitaContinuacao(pergunta: string, anteriores: Mensagem[]): Receita[] | null {
  const numero = pergunta.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i)?.[1];
  if (!numero || pergunta.trim().length > numero.length + 8) return null;
  const assunto = perguntaAberta(anteriores);
  if (!assunto) return null;
  return receitaDoAssunto(assunto, numero);
}

function textoRotaDaRodada(historico: Mensagem[], pergunta: string): string {
  let inicio = -1;
  for (let i = historico.length - 1; i >= 0; i--) {
    const item = historico[i];
    if (item.role === "user" && item.content === pergunta) {
      inicio = i;
      break;
    }
  }
  const trecho = historico.slice(inicio + 1);
  const nomes = new Map<string, string>();
  for (const item of trecho) {
    if (item.role !== "assistant") continue;
    for (const chamada of item.tool_calls ?? []) nomes.set(chamada.id, chamada.function.name);
  }
  for (const item of trecho) {
    if (item.role !== "tool" || nomes.get(item.tool_call_id) !== "rota_processo") continue;
    const pronto = textoDaConsulta(item.content);
    if (pronto.includes("```rota")) return pronto;
  }
  return "";
}

function textoDocumentalDaRodada(historico: Mensagem[], pergunta: string): string {
  let inicio = -1;
  for (let i = historico.length - 1; i >= 0; i--) {
    const item = historico[i];
    if (item.role === "user" && item.content === pergunta) {
      inicio = i;
      break;
    }
  }
  const trecho = historico.slice(inicio + 1);
  const nomes = new Map<string, string>();
  for (const item of trecho) {
    if (item.role !== "assistant") continue;
    for (const chamada of item.tool_calls ?? []) nomes.set(chamada.id, chamada.function.name);
  }
  const partes: string[] = [];
  for (const item of trecho) {
    if (item.role !== "tool" || !["documental_ce", "atividades_pendentes", "divergencias_viagem"].includes(nomes.get(item.tool_call_id) ?? "")) continue;
    const pronto = textoDaConsulta(item.content);
    if (pronto) partes.push(pronto);
  }
  return partes.join("\n\n");
}

function textoDosDados(historico: Mensagem[]): string {
  const ferramentas = historico.filter((m) => m.role === "tool").reverse();
  for (const item of ferramentas) {
    const texto = resumirResultado(item.content);
    if (texto) return texto;
  }
  return "";
}

function soNomesDeTabela(texto: string): boolean {
  const linhas = texto.split("\n").map((linha) => linha.trim()).filter(Boolean);
  return linhas.length > 0 && linhas.every((linha) => /^(cad|mov|sys|aux|imp|vis)_[A-Za-z0-9_]+$/.test(linha));
}

function diaSeguinte(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + 1);
  return data.toISOString().slice(0, 10);
}

function periodoPedido(texto: string): { inicio: string; fimExclusivo?: string } | null {
  const ano = new Date().getFullYear();
  if (/\b(este|esse|neste|no)\s+ano\b|\bano atual\b/i.test(texto)) {
    return { inicio: `${ano}-01-01`, fimExclusivo: `${ano + 1}-01-01` };
  }
  const achadas = [...texto.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/g)];
  if (!achadas.length) return null;
  const iso = achadas.map((parte) => {
    let y = parte[3] ?? String(ano);
    if (y.length === 2) y = `20${y}`;
    return `${y}-${parte[2].padStart(2, "0")}-${parte[1].padStart(2, "0")}`;
  });
  const ordenadas = [...iso].sort();
  const fim = ordenadas.length > 1 ? ordenadas[ordenadas.length - 1] : undefined;
  return { inicio: ordenadas[0], fimExclusivo: fim ? diaSeguinte(fim) : undefined };
}

function indiceNoNivelZero(texto: string, palavra: RegExp): number {
  let profundidade = 0;
  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i];
    if (char === "(") profundidade += 1;
    else if (char === ")") profundidade = Math.max(0, profundidade - 1);
    else if (profundidade === 0 && palavra.test(texto.slice(i))) return i;
  }
  return -1;
}

function limparFiltroSolto(texto: string): string {
  let atual = texto;
  let anterior = "";
  while (atual !== anterior) {
    anterior = atual;
    atual = atual
      .replace(/\bWHERE\s+AND\b/gi, "WHERE")
      .replace(/\bAND\s+AND\b/gi, "AND")
      .replace(/\bAND\s+(?=ORDER\s+BY|GROUP\s+BY|HAVING\b)/gi, "")
      .replace(/\bWHERE\s+(?=ORDER\s+BY|GROUP\s+BY|HAVING\b)/gi, "");
  }
  return atual;
}

function sqlComPeriodo(sql: string, pedido: string): string {
  let texto = sql.replace(/\btop\s+(?!1\b)\d+\s+/gi, "");
  const periodo = periodoPedido(pedido);
  if (!periodo) return texto;
  const coluna = texto.match(/(\b\w+\.Data(?:_\w+)*)\s*(?:>=|<=|>|<)/i)?.[1];
  if (!coluna) return texto;
  const nome = coluna.replace(".", "\\.");
  texto = limparFiltroSolto(texto.replace(new RegExp(`${nome}\\s*(?:>=|<=|>|<)\\s*'\\d{4}-\\d{2}-\\d{2}'`, "gi"), ""));
  const filtro = periodo.fimExclusivo
    ? `${coluna} >= '${periodo.inicio}' AND ${coluna} < '${periodo.fimExclusivo}'`
    : `${coluna} >= '${periodo.inicio}'`;
  const onde = indiceNoNivelZero(texto, /^where\b/i);
  const ordem = indiceNoNivelZero(texto, /^(?:order|group)\s+by\b/i);
  if (onde >= 0) {
    const palavra = texto.slice(onde).match(/^where\b/i)?.[0] ?? "WHERE";
    const resto = limparFiltroSolto(texto.slice(onde + palavra.length)).replace(/^\s+/, "");
    const ligacao = resto && !/^(?:order|group)\s+by\b/i.test(resto) ? " AND " : "\n";
    return `${texto.slice(0, onde)}WHERE ${filtro}${ligacao}${resto}`;
  }
  if (ordem >= 0) return `${texto.slice(0, ordem)}WHERE ${filtro}\n${texto.slice(ordem)}`;
  return `${texto}\nWHERE ${filtro}`;
}

function pedeLog(texto: string) {
  return /quem (?:inclu|alter|excl|mud|lan[cç]|cri|apag|cadastr|mexeu)|hist[oó]rico|\blog\b|antes e depois|\bid\s?\d{3,}|\bid_?(?:logistica|projeto|tarefa|atividade|pessoa|acompanhamento)\w*/i.test(texto);
}

function numerosContainer(texto: string): string[] {
  return [...new Set((texto.toUpperCase().match(/\b[A-Z]{4}\d{7}\b/g) ?? []))].slice(0, 40);
}

function idsMaritimos(texto: string): string[] {
  return [
    ...new Set([...texto.matchAll(/IdLogistica_Maritima_Container\s*[:=]?\s*(\d{3,})/gi)].map((achado) => achado[1])),
  ].slice(0, 40);
}

function idsTaxa(texto: string): string[] {
  const nomeados = [...texto.matchAll(/\bid\s?_?logistica\s?_?taxa\s*[:=]?\s*(\d{3,})/gi)].map((achado) => achado[1]);
  const soltos = /\btaxa\b/i.test(texto) ? [...texto.matchAll(/\b(\d{5,})\b/g)].map((achado) => achado[1]) : [];
  return [...new Set([...nomeados, ...soltos])].slice(0, 40);
}

function argsLogDosIds(ids: string[], pedido: string) {
  const ano = new Date().getFullYear();
  const hoje = new Date();
  const dois = (n: number) => String(n).padStart(2, "0");
  const hojeBr = `${dois(hoje.getDate())}/${dois(hoje.getMonth() + 1)}/${ano}`;
  const periodo = periodoPedido(pedido);
  const br = (iso: string) => {
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  };
  const fimExclusivo = periodo?.fimExclusivo;
  const fim = fimExclusivo
    ? br(new Date(Date.parse(`${fimExclusivo}T00:00:00Z`) - 86400000).toISOString().slice(0, 10))
    : hojeBr;
  return {
    tabela: "mov_Logistica_Maritima_Container",
    campo_chave: "IdLogistica_Maritima_Container",
    valores: ids.join(", "),
    data_inicio: periodo ? br(periodo.inicio) : `01/01/${ano}`,
    data_fim: fim,
    tipo: /inclu/i.test(pedido) ? 1 : 0,
    ancorar: !periodoPedido(pedido),
    processo: [...new Set(pedido.toUpperCase().match(RE_PROCESSO) ?? [])].join(", "),
  };
}

function argsLogDosContainers(numeros: string[], pedido: string) {
  return { ...argsLogDosIds(numeros, pedido), campo_chave: "Number", valores: numeros.join(", ") };
}

const RE_PROCESSO = /\b[A-Z]{1,4}\d{2,6}-\d{2}\b/g;

function restringirAoProcesso(log: LogPdf, pedido: string): LogPdf {
  const processos = [...new Set((pedido.toUpperCase().match(RE_PROCESSO) ?? []))];
  if (!processos.length) return log;
  const eventos = log.eventos.filter((evento) => {
    const proc = (evento.numeroProcesso ?? "").toUpperCase();
    return !proc || processos.includes(proc);
  });
  return eventos.length === log.eventos.length ? log : { ...log, eventos };
}

function sqlSemRepetir(sql: string): string {
  const texto = sql.trim().replace(/;\s*$/, "");
  const meio = Math.floor(texto.length / 2);
  const esquerda = texto.slice(0, meio).trim().replace(/;\s*$/, "");
  const direita = texto.slice(meio).trim().replace(/^;/, "").trim();
  if (esquerda.length > 40 && esquerda.replace(/\s+/g, " ").toLowerCase() === direita.replace(/\s+/g, " ").toLowerCase()) {
    return esquerda;
  }
  return texto;
}

function mensagensParaArquivo(lista: Mensagem[]): Mensagem[] {
  return lista.map((mensagem) => {
    if (mensagem.role !== "tool") return mensagem;
    const sql = sqlDoResultado(mensagem.content);
    if (!sql) return { ...mensagem, content: mensagem.content.slice(0, 2000) };
    let texto = "";
    try {
      const dados = JSON.parse(mensagem.content) as { texto?: unknown };
      if (typeof dados.texto === "string") texto = dados.texto.slice(0, 4000);
    } catch {
      /* o resultado não é JSON */
    }
    return { ...mensagem, content: JSON.stringify({ sql, texto }) };
  });
}

function sqlDoResultado(resultado: string): string | null {
  const direto = resultado.match(/^SQL:\n([\s\S]*?)\n\n/)?.[1]?.trim();
  if (direto) return direto;
  try {
    const dados = JSON.parse(resultado) as { sql?: unknown };
    if (typeof dados.sql === "string" && dados.sql.trim()) return dados.sql.trim();
  } catch {
    /* resultado não é JSON */
  }
  return null;
}

function textoConsulta(chamada: ChamadaFerramenta | undefined, resultado: string): string | null {
  if (!chamada) return null;
  const nome = chamada.function.name;
  if (
    ![
      "executar_sql",
      "consultar_dados",
      "localizar_processo",
      "resumo_processo",
      "buscar_processos",
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
      "log_recente",
      "monitoramentos_alterados",
      "painel_financeiro",
      "taxas_processo",
      "andamento_atividade",
    ].includes(nome)
  ) {
    return null;
  }
  const sql = sqlDoResultado(resultado);
  if (sql) return sql;
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(chamada.function.arguments || "{}");
  } catch {
    args = {};
  }
  if (nome === "executar_sql" && args.sql) return String(args.sql);
  return null;
}

function blocosDaConversa(mensagens: Mensagem[]) {
  const chamadas = new Map<string, ChamadaFerramenta>();
  const blocos: { mensagem: Exclude<Mensagem, { role: "tool" }>; consultas: string[] }[] = [];
  let pendentes: string[] = [];
  for (const mensagem of mensagens) {
    if (mensagem.role === "assistant") {
      for (const chamada of mensagem.tool_calls ?? []) chamadas.set(chamada.id, chamada);
    }
    if (mensagem.role === "tool") {
      const texto = textoConsulta(chamadas.get(mensagem.tool_call_id), mensagem.content);
      if (texto && !pendentes.includes(texto)) pendentes.push(texto);
      continue;
    }
    if (!mensagem.content.trim()) continue;
    const ultima = pendentes.at(-1);
    blocos.push({ mensagem, consultas: mensagem.role === "assistant" && ultima ? [ultima] : [] });
    if (mensagem.role === "assistant") pendentes = [];
  }
  return blocos;
}

const EXPLORACAO = new Set(["buscar_tabelas", "listar_colunas", "lembrar_preferencia", "esquecer_preferencia", "resultado_atual"]);

function receitasDaConversa(historico: Mensagem[]): Receita[] {
  let inicio = -1;
  for (let i = historico.length - 1; i >= 0; i--) {
    if (historico[i].role === "user") {
      inicio = i;
      break;
    }
  }
  const trecho = historico.slice(Math.max(0, inicio + 1));
  const porId = new Map(trecho.flatMap((mensagem) => (mensagem.role === "tool" ? [[mensagem.tool_call_id, mensagem.content] as const] : [])));
  const lista: Receita[] = [];
  for (const mensagem of trecho) {
    if (mensagem.role !== "assistant") continue;
    for (const chamada of mensagem.tool_calls ?? []) {
      if (EXPLORACAO.has(chamada.function.name)) continue;
      const conteudo = porId.get(chamada.id) ?? "";
      if (!conteudo || conteudo.startsWith("Erro:")) continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(chamada.function.arguments || "{}");
      } catch {
        args = {};
      }
      lista.push({ nome: chamada.function.name, args });
    }
  }
  return lista;
}

function setasDoChat(texto: string) {
  return texto
    .replace(/\$+\s*\\+rightarrow\s*\$+/g, "→")
    .replace(/\\+rightarrow/g, "→");
}

function numeroMonetario(texto: string): number | null {
  const t = texto.trim();
  if (/^-?\d{1,3}(?:\.\d{3})+,\d+$/.test(t) || /^-?\d+,\d+$/.test(t)) {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const ROTULO_MOEDA = "Mercadoria|Import[aâ]ncia(?:\\s+Segurada)?|Comiss[aã]o|Frete|Pagamento|Recebimento|Pr[eê]mio";
const NUMERO_MOEDA = "[+-]?(?:\\d{1,3}(?:\\.\\d{3})+,\\d+|\\d+,\\d+|\\d+(?:\\.\\d+)?)";

function moedasDoChat(texto: string) {
  const regra = new RegExp(
    `(${ROTULO_MOEDA})(\\**\\s*:?\\s*\\**\\s*\\(?\\s*)(?:R\\$\\s*)?(${NUMERO_MOEDA})(?:(\\s*(?:→|->)\\s*)(?:R\\$\\s*)?(${NUMERO_MOEDA}))?`,
    "gi",
  );
  return texto.replace(regra, (todo, rotulo: string, meio: string, antes: string, seta?: string, depois?: string) => {
    if (/R\$/.test(todo)) return todo;
    const a = numeroMonetario(antes);
    if (a == null) return todo;
    const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const b = depois ? numeroMonetario(depois) : null;
    return `${rotulo}${meio}${moeda(a)}${seta && b != null ? `${seta}${moeda(b)}` : ""}`;
  });
}

function numeroDoGrafico(bruto: string) {
  const limpo = bruto.replace(/R\$/gi, "").replace(/\s/g, "").trim();
  return numeroMonetario(limpo);
}

function diaDoGrafico(valor: string) {
  const achado = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!achado) return null;
  const ano = achado[3].length === 2 ? 2000 + Number(achado[3]) : Number(achado[3]);
  return Date.UTC(ano, Number(achado[2]) - 1, Number(achado[1]));
}

function seriesDoGrafico(texto: string) {
  const linhas = texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
  let titulo = "";
  const itens: { nome: string; valor: number; detalhe: string; moeda: boolean }[] = [];
  for (const linha of linhas) {
    const corte = linha.split("|").map((parte) => parte.trim());
    if (corte.length < 2) {
      if (!titulo && itens.length === 0) titulo = linha.replace(/^#+\s*/, "");
      continue;
    }
    const nome = corte[0].replace(/^[-*]\s*/, "").trim();
    const valor = numeroDoGrafico(corte[1]);
    if (!nome || valor == null) continue;
    itens.push({
      nome,
      valor,
      detalhe: corte[2]?.replace(/^[-*]\s*/, "").trim() || "",
      moeda: /R\$|,/.test(corte[1]) || !Number.isInteger(valor),
    });
  }
  const serie = itens.slice(0, 12);
  const comData = serie.filter((item) => diaDoGrafico(item.detalhe) != null);
  if (comData.length === serie.length && serie.length > 1) {
    serie.sort((a, b) => (diaDoGrafico(a.detalhe) ?? 0) - (diaDoGrafico(b.detalhe) ?? 0));
  }
  return { titulo, itens: serie, moeda: serie.some((item) => item.moeda) };
}

function curvaSuave(pontos: { x: number; y: number }[]) {
  if (!pontos.length) return "";
  if (pontos.length === 1) return `M ${pontos[0].x} ${pontos[0].y}`;
  let caminho = `M ${pontos[0].x} ${pontos[0].y}`;
  for (let i = 0; i < pontos.length - 1; i += 1) {
    const p0 = pontos[i - 1] || pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    caminho += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return caminho;
}

function textoDoValor(valor: number, moeda: boolean) {
  if (!moeda) return valor.toLocaleString("pt-BR");
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Grafico({ texto }: { texto: string }) {
  const gradiente = useId().replace(/:/g, "");
  const { titulo, itens, moeda } = seriesDoGrafico(texto);
  if (!itens.length) return null;
  const largura = 640;
  const altura = 248;
  const margem = { esquerda: 58, direita: 18, topo: 28, base: 58 };
  const internoLargura = largura - margem.esquerda - margem.direita;
  const internoAltura = altura - margem.topo - margem.base;
  const menor = Math.min(...itens.map((item) => item.valor));
  const maior = Math.max(...itens.map((item) => item.valor));
  const base = Math.min(0, menor);
  const topo = Math.max(0, maior);
  const faixa = topo - base || 1;
  const pontos = itens.map((item, indice) => {
    const x = margem.esquerda + (itens.length === 1 ? internoLargura / 2 : (indice / (itens.length - 1)) * internoLargura);
    const y = margem.topo + ((topo - item.valor) / faixa) * internoAltura;
    return { ...item, x, y };
  });
  const linha = curvaSuave(pontos);
  const chao = margem.topo + ((topo - base) / faixa) * internoAltura;
  const area = `${linha} L ${pontos[pontos.length - 1].x} ${chao} L ${pontos[0].x} ${chao} Z`;
  const total = itens.reduce((soma, item) => soma + item.valor, 0);
  const media = total / itens.length;
  const resumo = [
    ["Total", textoDoValor(total, moeda)],
    ["Média", textoDoValor(media, moeda)],
    ["Maior", textoDoValor(maior, moeda)],
    ["Menor", textoDoValor(menor, moeda)],
    ["Pontos", String(itens.length)],
  ];
  const marcas = [0, 0.5, 1].map((passo) => {
    const valor = topo - faixa * passo;
    const y = margem.topo + passo * internoAltura;
    return { valor, y };
  });
  return (
    <figure className="chat-grafico">
      {titulo ? <figcaption>{titulo}</figcaption> : null}
      <div className="chat-grafico-resumo">
        {resumo.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <span>{rotulo}</span>
            <strong>{valor}</strong>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={titulo || "Gráfico de linhas"}>
        <defs>
          <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e53935" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#e53935" stopOpacity="0" />
          </linearGradient>
        </defs>
        {marcas.map((marca) => (
          <g key={marca.y}>
            <line x1={margem.esquerda} x2={largura - margem.direita} y1={marca.y} y2={marca.y} />
            <text x={margem.esquerda - 8} y={marca.y + 4} textAnchor="end">
              {textoDoValor(Math.abs(marca.valor) >= 100 ? Math.round(marca.valor) : marca.valor, false)}
            </text>
          </g>
        ))}
        <path className="chat-grafico-area" d={area} fill={`url(#${gradiente})`} />
        <path className="chat-grafico-linha" d={linha} />
        {pontos.map((ponto, indice) => (
          <g key={`${ponto.nome}-${ponto.detalhe}-${ponto.x}`}>
            <circle cx={ponto.x} cy={ponto.y} r="4.5" />
            {ponto.valor === maior || ponto.valor === menor || itens.length <= 5 ? (
              <text className="chat-grafico-valor" x={ponto.x} y={Math.max(14, ponto.y - 10)} textAnchor="middle">
                {textoDoValor(ponto.valor, moeda)}
              </text>
            ) : null}
            <text className="chat-grafico-eixo" x={ponto.x} y={altura - 16} textAnchor="middle">
              {ponto.detalhe
                ? indice > 0 && pontos[indice - 1].detalhe === ponto.detalhe
                  ? ""
                  : ponto.detalhe.replace(/\/(\d{4})$/, (_, ano: string) => `/${ano.slice(-2)}`)
                : ponto.nome.length > 12
                  ? `${ponto.nome.slice(0, 11)}…`
                  : ponto.nome}
            </text>
            <title>{[ponto.nome, ponto.detalhe, textoDoValor(ponto.valor, moeda)].filter(Boolean).join(" · ")}</title>
          </g>
        ))}
      </svg>
      <ul className="chat-grafico-lista">
        {pontos.map((ponto) => (
          <li key={`lista-${ponto.nome}-${ponto.detalhe}-${ponto.valor}`}>
            <span>{ponto.nome}</span>
            {ponto.detalhe ? <time>{ponto.detalhe}</time> : <time />}
            <strong>{textoDoValor(ponto.valor, moeda)}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function abrirLista(texto: string) {
  return texto
    .split("\n")
    .map((linha) => {
      const achados = [...linha.matchAll(/\b[A-Z]{1,4}\d{2,6}-\d{2}\b/g)];
      if (achados.length < 2) return linha;
      const inicio = achados[0].index ?? 0;
      const titulo = linha.slice(0, inicio).replace(/^[-*]\s*/, "").trim();
      const itens = linha
        .slice(inicio)
        .split(/(?=\b[A-Z]{1,4}\d{2,6}-\d{2}\b)/)
        .map((item) => item.trim())
        .filter(Boolean);
      return [titulo, ...itens.map((item) => `- ${item.replace(/^[-*]\s*/, "")}`)].filter(Boolean).join("\n");
    })
    .join("\n");
}

function semSql(texto: string) {
  const semBloco = texto.replace(/```[\s\S]*?```/g, (bloco) => (/\bselect\b/i.test(bloco) ? "" : bloco));
  const semSelect = semBloco.replace(/(?:^|\n)\s*SELECT\b[\s\S]*?(?=\n\n|$)/gi, "");
  const semPedido = /\bselect\b/i.test(texto)
    ? semSelect.replace(/a consulta utilizada[\s\S]*$/i, "A consulta SQL fica disponível só para o administrador.")
    : semSelect;
  return semPedido.replace(/\n{3,}/g, "\n\n").trim();
}

type TrechoRota = {
  papel?: string;
  origem?: string;
  destino?: string;
  origemLivre?: boolean;
  destinoLivre?: boolean;
  origemTitulo?: string;
  destinoTitulo?: string;
  quando?: string;
  estado?: string;
  navio?: string;
  meio?: string;
  detalhe?: string;
  datas?: { rotulo?: string; valor?: string }[];
};

type CartaoRota = {
  processo?: string;
  cliente?: string;
  processoSituacao?: string;
  situacao?: string;
  navio?: string;
  viagem?: string;
  cia?: string;
  conhecimento?: string;
  fatos?: { rotulo?: string; valor?: string }[];
  aviso?: string;
  trechos?: TrechoRota[];
};

function classeRota(situacao: string) {
  const texto = situacao.toLowerCase();
  if (texto.includes("aguard")) return "previsto";
  if (texto.includes("desembarc") || texto.includes("entreg") || texto.includes("finaliz") || texto.includes("encerr") || texto.includes("conclu") || texto.includes("colet")) return "feito";
  if (texto.includes("atras") || texto.includes("cancel") || texto.includes("diverg")) return "atraso";
  if (texto.includes("trâns") || texto.includes("trans") || texto.includes("embarc") || texto.includes("chegad")) return "agora";
  return "previsto";
}

function meioDaRota(processo: string, meio?: string) {
  if (meio === "aviao" || meio === "caminhao" || meio === "navio") return meio;
  const prefixo = processo.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  if (prefixo === "IA" || prefixo === "EA") return "aviao";
  return "navio";
}

function MarcaRota({ meio }: { meio: string }) {
  const nome = meio === "aviao" ? "aviao" : meio === "caminhao" ? "caminhao" : "navio";
  return (
    <svg className="chat-rota-icone" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path fill="currentColor" d={ICONES[nome]} />
    </svg>
  );
}

function codigoCurto(valor: string) {
  const texto = valor.replace(/\s+/g, " ").trim();
  if (texto.length <= 12) return texto;
  const primeiro = texto.split(/[\s./-]+/).find((parte) => parte.length >= 2) || texto;
  return primeiro.length <= 12 ? primeiro : `${texto.slice(0, 11)}…`;
}

function rotasDoTexto(texto: string) {
  return [...texto.matchAll(/```rota\s*\n([\s\S]*?)```/gi)].map((achado) => achado[1]);
}

function frasesDoJson(valor: unknown, saida: string[]) {
  if (typeof valor === "string") {
    const texto = valor.replace(/\s+/g, " ").trim();
    if (texto && !/^(true|false|navio|aviao|caminhao|previsto|feito|agora|atraso)$/i.test(texto)) saida.push(texto);
    return;
  }
  if (typeof valor === "number" && Number.isFinite(valor)) saida.push(valor.toLocaleString("pt-BR"));
  if (Array.isArray(valor)) {
    valor.forEach((item) => frasesDoJson(item, saida));
    return;
  }
  if (valor && typeof valor === "object") {
    Object.values(valor).forEach((item) => frasesDoJson(item, saida));
  }
}

function textoDaRota(bruto: string) {
  try {
    const dados = JSON.parse(bruto) as CartaoRota;
    const partes = [dados.processo, dados.cliente, dados.situacao, dados.navio, dados.viagem ? `viagem ${dados.viagem}` : "", dados.cia, dados.conhecimento]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    for (const fato of dados.fatos ?? []) {
      const rotulo = String(fato.rotulo ?? "").trim();
      const valor = String(fato.valor ?? "").trim();
      if (rotulo && valor) partes.push(`${rotulo}: ${valor}`);
    }
    for (const trecho of dados.trechos ?? []) {
      const origem = trecho.origemTitulo || trecho.origem || "";
      const destino = trecho.destinoTitulo || trecho.destino || "";
      if (origem || destino) partes.push(`${origem || "—"} → ${destino || "—"}`);
      if (trecho.papel) partes.push(trecho.papel);
      if (trecho.navio) partes.push(trecho.navio);
      if (trecho.detalhe) partes.push(trecho.detalhe);
      for (const data of trecho.datas ?? []) {
        const rotulo = String(data.rotulo ?? "").trim();
        const valor = String(data.valor ?? "").trim();
        if (rotulo && valor) partes.push(`${rotulo}: ${valor}`);
      }
      if (trecho.quando) partes.push(trecho.quando);
    }
    if (dados.aviso) partes.push(dados.aviso);
    return partes.join(" · ");
  } catch {
    return "";
  }
}

function textoParaBusca(texto: string) {
  const semBloco = texto.replace(/```([a-z]*)\s*\n?([\s\S]*?)```/gi, (_todo, tipo: string, corpo: string) => {
    const nome = tipo.toLowerCase();
    if (nome === "rota") return textoDaRota(corpo) || corpo.replace(/[{}[\]"]/g, " ");
    if (nome === "grafico") return corpo.replace(/\|/g, " ");
    const frases: string[] = [];
    try {
      frasesDoJson(JSON.parse(corpo), frases);
    } catch {
      return corpo.replace(/[{}[\]"]/g, " ");
    }
    return frases.join(" · ");
  });
  return semBloco.replace(/[#>*_`]/g, " ").replace(/\s+/g, " ").trim();
}

function RotaCard({ bruto, completo = false }: { bruto: string; completo?: boolean }) {
  let dados: CartaoRota | null = null;
  try {
    dados = JSON.parse(bruto) as CartaoRota;
  } catch {
    return null;
  }
  if (!dados || typeof dados !== "object") return null;
  const trechos = Array.isArray(dados.trechos) ? dados.trechos : [];
  const situacao = String(dados.situacao ?? "").trim();
  const fatos = (dados.fatos ?? []).filter((item) => item.valor);
  const extra = [dados.cliente, dados.navio, dados.viagem ? `viagem ${dados.viagem}` : ""].filter(Boolean);
  return (
    <article className={`chat-rota${completo ? " completo" : ""} ${classeRota(situacao)}`}>
      <div className="consulta">
        <div className="cartao">
          <header className="cartao-topo">
            <div className="cartao-linha">
              <h2>{dados.processo || "Processo"}</h2>
              {situacao ? <span className="selo">{situacao}</span> : null}
            </div>
            {extra.length ? <p className="sub">{extra.join(" · ")}</p> : null}
            {fatos.length ? (
              <dl className="meta">
                {fatos.map((item) => (
                  <div key={`${item.rotulo}-${item.valor}`}>
                    <dt>{item.rotulo}</dt>
                    <dd>{item.valor}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </header>
          {trechos.length ? (
            <div className="trechos">
              {trechos.map((trecho, indice) => {
                const origem = completo ? trecho.origemTitulo || trecho.origem || "" : trecho.origemLivre ? trecho.origem || "" : codigoCurto(trecho.origem || "");
                const destino = completo ? trecho.destinoTitulo || trecho.destino || "" : trecho.destinoLivre ? trecho.destino || "" : codigoCurto(trecho.destino || "");
                const datas = trecho.datas?.filter((item) => item.valor) ?? [];
                const lista = datas.length ? datas : trecho.quando ? [{ rotulo: "Data", valor: trecho.quando }] : [];
                return (
                  <section key={`${trecho.origem}-${trecho.destino}-${indice}`} className="trecho">
                    <span className="trecho-icone">
                      <MarcaRota meio={meioDaRota(dados.processo || "", trecho.meio)} />
                    </span>
                    <div className="trecho-tipo">{trecho.papel || "Trecho"}</div>
                    <div className="rota" title={`${trecho.origemTitulo || trecho.origem || "—"} → ${trecho.destinoTitulo || trecho.destino || "—"}`}>
                      <b>{origem || "—"}</b>
                      <span className="seta" aria-hidden>→</span>
                      <b>{destino || "—"}</b>
                    </div>
                    {trecho.detalhe ? <p className="trecho-info">{trecho.detalhe}</p> : null}
                    {lista.length ? (
                      <dl className="datas">
                        {lista.map((item) => {
                          const previsto = /prev/i.test(item.rotulo || "");
                          return (
                            <div key={`${item.rotulo}-${item.valor}`} className={trecho.estado === "atraso" && !previsto ? "atraso" : ""}>
                              <dt>{item.rotulo}</dt>
                              <dd>{item.valor}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : null}
          {dados.aviso ? <footer className="rodape">{dados.aviso}</footer> : null}
        </div>
      </div>
    </article>
  );
}

function EmailCard({ bruto }: { bruto: string }) {
  let dados: { assunto?: string; de?: string; data?: string; naoLida?: boolean; alerta?: string; corpo?: string } = {};
  try {
    dados = JSON.parse(bruto);
  } catch {
    return null;
  }
  const corpo = String(dados.corpo ?? "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
  return (
    <article className={`chat-email${dados.alerta ? " alerta" : ""}`}>
      <header>
        <strong>{dados.assunto || "E-mail"}</strong>
        {dados.naoLida ? <em>Não lida</em> : null}
      </header>
      <p>
        {dados.de ? <span>{dados.de}</span> : null}
        {dados.data ? <time>{dados.data}</time> : null}
      </p>
      {dados.alerta ? <b>Alerta: {dados.alerta}. Não clique em link nem informe senha.</b> : null}
      {corpo.length ? (
        <div>
          {corpo.map((linha) =>
            /^\*\*[^*]+:\*\*/.test(linha) ? (
              <p key={linha}>
                <span>{linha.replace(/^\*\*|\*\*/g, "").split(":")[0]}</span>
                {linha.replace(/^\*\*[^*]+:\*\*\s*/, "")}
              </p>
            ) : (
              <p key={linha}>{linha}</p>
            ),
          )}
        </div>
      ) : null}
    </article>
  );
}

type ItemLista = { hora: string; titulo: string; linhas: string[]; tag: string; tipo: string };
type PecaResposta =
  | { tipo: "md"; texto: string }
  | { tipo: "lista"; titulo: string; sub: string; itens: ItemLista[]; aviso: string };

function limparMarcacao(texto: string) {
  return texto.replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
}

function classeTag(rotulo: string) {
  const t = rotulo.toLowerCase();
  if (t.startsWith("exc")) return "del";
  if (t.startsWith("atu")) return "upd";
  if (t.startsWith("inc") || t.startsWith("ope")) return "add";
  return "";
}

function itemDaLista(bruto: string, filhos: string[]): ItemLista | null {
  const texto = limparMarcacao(bruto);
  const extras = filhos.map(limparMarcacao).filter(Boolean);
  if (!texto) return null;
  const evento = texto.match(/^(inclusão|exclusão|atualização|operação)\s+em\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})(?::\d{2})?,\s*por\s+(.+)$/i);
  if (evento) {
    const corpo = evento[4].trim();
    const corte = corpo.match(/^(.*?)(?:\.\s+(\d+\s+campos?\b.*))?$/i);
    const quem = (corte?.[2] ? corte[1] : corpo).replace(/\.$/, "").trim();
    const detalhe = corte?.[2]?.replace(/\.$/, "").trim() || "";
    return {
      hora: evento[3],
      titulo: detalhe || evento[1],
      linhas: [quem, ...extras].filter(Boolean),
      tag: evento[1],
      tipo: classeTag(evento[1]),
    };
  }
  const recente = texto.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+·\s+(inclusão|exclusão|atualização|operação)\s+·\s+(.+)$/i);
  if (recente) {
    const resto = recente[4].split(/\s·\s/).map((parte) => parte.trim()).filter(Boolean);
    return {
      hora: recente[2],
      titulo: resto[0] || recente[3],
      linhas: [...resto.slice(1), ...extras],
      tag: recente[3],
      tipo: classeTag(recente[3]),
    };
  }
  const partes = texto.split(/\s·\s/).map((parte) => parte.trim()).filter(Boolean);
  let hora = "";
  const cabeca = partes[0] || "";
  const relogio = cabeca.match(/^(?:\d{2}\/\d{2}\/\d{4}\s+)?(\d{2}:\d{2})(?::\d{2})?$/);
  const soData = cabeca.match(/^(\d{2}\/\d{2})\/\d{4}$/);
  if (relogio || soData || /^\d{2}:\d{2}$/.test(cabeca)) {
    hora = relogio?.[1] || soData?.[1] || cabeca;
    partes.shift();
  }
  const titulo = partes.shift() || extras.shift() || texto;
  return { hora, titulo, linhas: [...partes, ...extras], tag: "", tipo: "" };
}

function partirResposta(texto: string): PecaResposta[] {
  const linhas = texto.replace(/\r/g, "").split("\n");
  const pecas: PecaResposta[] = [];
  let md: string[] = [];
  let i = 0;
  const guardarTexto = () => {
    const t = md.join("\n").trim();
    if (t) pecas.push({ tipo: "md", texto: t });
    md = [];
  };
  while (i < linhas.length) {
    if (!/^[-*]\s+\S/.test(linhas[i])) {
      md.push(linhas[i]);
      i += 1;
      continue;
    }
    const brutos: { bruto: string; filhos: string[] }[] = [];
    while (i < linhas.length) {
      if (/^[-*]\s+\S/.test(linhas[i])) {
        brutos.push({ bruto: linhas[i].replace(/^[-*]\s+/, ""), filhos: [] });
        i += 1;
        continue;
      }
      if (/^\s+[-*]\s+\S/.test(linhas[i]) && brutos.length) {
        brutos[brutos.length - 1].filhos.push(linhas[i].replace(/^\s+[-*]\s+/, ""));
        i += 1;
        continue;
      }
      if (!linhas[i].trim()) {
        let j = i + 1;
        while (j < linhas.length && !linhas[j].trim()) j += 1;
        if (j < linhas.length && /^[-*]\s+\S/.test(linhas[j])) {
          i = j;
          continue;
        }
      }
      break;
    }
    const itens = brutos.map((item) => itemDaLista(item.bruto, item.filhos)).filter((item): item is ItemLista => Boolean(item));
    const vale = itens.length >= 2 || (itens.length === 1 && (brutos[0].filhos.length > 0 || /·|,\s*por\s+/i.test(brutos[0].bruto)));
    if (!vale) {
      for (const item of brutos) md.push(`- ${item.bruto}`, ...item.filhos.map((filho) => `  - ${filho}`));
      continue;
    }
    const intro = md.join("\n").trim().split("\n").filter((linha, indice, lista) => linha.trim() || lista.slice(indice + 1).some((proxima) => proxima.trim()));
    md = [];
    while (intro.length && !intro[intro.length - 1].trim()) intro.pop();
    let titulo = "";
    const ultima = intro[intro.length - 1]?.trim() ?? "";
    const heading = ultima.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      titulo = limparMarcacao(heading[1]);
      intro.pop();
    } else if (ultima && ultima.length < 100 && !/[.!?]$/.test(ultima)) {
      titulo = limparMarcacao(ultima.replace(/^\*\*|\*\*$/g, ""));
      intro.pop();
    }
    const resto = intro.join("\n").trim();
    let sub = "";
    if (resto && resto.length < 220 && !resto.includes("\n\n")) sub = limparMarcacao(resto);
    else if (resto) pecas.push({ tipo: "md", texto: resto });
    const aviso: string[] = [];
    while (i < linhas.length && !linhas[i].trim()) i += 1;
    while (i < linhas.length && linhas[i].trim() && !/^[-*]\s+/.test(linhas[i]) && !/^#{1,6}\s+/.test(linhas[i]) && aviso.length < 2) {
      if (linhas[i].trim().length > 180) break;
      aviso.push(limparMarcacao(linhas[i]));
      i += 1;
    }
    pecas.push({ tipo: "lista", titulo, sub, itens, aviso: aviso.join(" ") });
  }
  guardarTexto();
  return pecas;
}

type DataPrazo = { rotulo: string; data: string; hora: string; dias: number };
type ItemPrazo = { codigo: string; empresa: string; filial: string; datas: DataPrazo[] };

function diasAte(data: string) {
  const [dia, mes, ano] = data.split("/").map(Number);
  const alvo = new Date(ano, (mes || 1) - 1, dia || 1);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function rotuloRelativo(dias: number) {
  if (dias === 0) return "Hoje";
  if (dias > 0) return `Em ${dias} ${dias === 1 ? "dia" : "dias"}`;
  const n = Math.abs(dias);
  return `Há ${n} ${n === 1 ? "dia" : "dias"}`;
}

function prazosDaLista(titulo: string, itens: ItemLista[]) {
  if (!/prazos vencidos/i.test(titulo)) return null;
  const lista = itens
    .map((item) => {
      const codigo = item.titulo.match(/\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/i)?.[0] ?? "";
      const texto = [item.titulo, ...item.linhas].join(" · ");
      const empresaBruta = item.linhas.find((linha) => !/(?:previsão de\s+)?(?:embarque|desembarque|entrega)\s+\d{2}\//i.test(linha)) ?? "";
      const filial = empresaBruta.match(/\s*(\([^)]+\))\s*$/)?.[1] ?? "";
      const empresa = (filial ? empresaBruta.slice(0, empresaBruta.length - filial.length) : empresaBruta).trim();
      const datas: DataPrazo[] = [];
      const legado = !/previsão de\s+(?:embarque|desembarque|entrega)/i.test(texto);
      for (const achado of texto.matchAll(/(previsão de\s+)?(embarque|desembarque|entrega)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/gi)) {
        const nome = achado[2].toLowerCase();
        const base = nome === "embarque" ? "embarque" : nome === "desembarque" ? "desembarque" : "entrega";
        const previsao = Boolean(achado[1]) || legado;
        const rotulo = previsao ? `Previsão de ${base}` : base[0].toUpperCase() + base.slice(1);
        datas.push({ rotulo, data: achado[3], hora: achado[4] ?? "", dias: diasAte(achado[3]) });
      }
      if (!codigo || !datas.length) return null;
      return { codigo, empresa, filial, datas };
    })
    .filter((item): item is ItemPrazo => Boolean(item));
  if (!lista.length) return null;
  const corte = titulo.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return { titulo: corte?.[1]?.trim() || titulo, sub: corte?.[2]?.trim() || "", itens: lista };
}

function PrazosCard({ titulo, sub, itens, aviso }: { titulo: string; sub: string; itens: ItemPrazo[]; aviso: string }) {
  const tons = itens.map((item) => item.datas[item.datas.length - 1]?.dias ?? 0);
  const atrasados = tons.filter((dias) => dias < 0).length;
  const hoje = tons.filter((dias) => dias === 0).length;
  const semana = tons.filter((dias) => dias > 0 && dias <= 7).length;
  const adiante = tons.filter((dias) => dias > 7).length;
  const resumo = [
    `${itens.length} ${itens.length === 1 ? "processo" : "processos"}`,
    atrasados ? `${atrasados} ${atrasados === 1 ? "atrasado" : "atrasados"}` : "",
    hoje ? `${hoje} ${hoje === 1 ? "vence hoje" : "vencem hoje"}` : "",
    semana ? `${semana} em até 7 dias` : "",
    adiante ? `${adiante} mais adiante` : "",
  ].filter(Boolean);
  return (
    <article className="resposta prazos">
      <header className="prazos-topo">
        <h2>
          {titulo}
          {sub ? <small>{sub}</small> : null}
        </h2>
        <div className="resumo">
          {resumo.map((texto) => (
            <span
              key={texto}
              className={/atrasad|vence hoje|vencem hoje/i.test(texto) ? "hoje" : /7 dias/i.test(texto) ? "semana" : /adiante/i.test(texto) ? "normal" : ""}
            >
              {texto}
            </span>
          ))}
        </div>
      </header>
      <ul className="prazos-lista">
        {itens.map((item, indice) => {
          const referencia = item.datas[item.datas.length - 1];
          const tom = referencia.dias <= 0 ? "hoje" : referencia.dias <= 7 ? "semana" : "";
          return (
            <li key={`${item.codigo}-${indice}`} className={`prazo-item${tom ? ` ${tom}` : ""}`} style={{ ["--i" as string]: indice }}>
              <div>
                <span className="codigo">{item.codigo}</span>
                {item.empresa ? (
                  <p className="empresa">
                    {item.empresa}
                    {item.filial ? <span className="filial">{item.filial}</span> : null}
                  </p>
                ) : null}
              </div>
              <div className="datas-prazo">
                {item.datas.map((data, n) => (
                  <div key={`${data.rotulo}-${data.data}`} className={n === item.datas.length - 1 ? "prazo fim" : "prazo"}>
                    <span className="rotulo">{data.rotulo}</span>
                    <span className="data">
                      {data.data}
                      {data.hora ? <span className="hora">{data.hora}</span> : null}
                    </span>
                    {n === item.datas.length - 1 ? <span className="rel">{rotuloRelativo(data.dias)}</span> : null}
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {aviso ? <p className="prazos-aviso">{aviso}</p> : null}
    </article>
  );
}

function partesDoResumo(texto: string) {
  const limpo = texto.replace(/\r/g, "").trim();
  const inicio = limpo.match(/^Processo\s+([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i);
  if (!inicio) return null;
  const corteNota = limpo.match(/\n?\s*Último acompanhamento\s*(\([^)]*\))?\s*:/i);
  const cabeca = (corteNota ? limpo.slice(0, corteNota.index) : limpo).trim();
  const nota = corteNota
    ? {
        cabeca: `Último acompanhamento${corteNota[1] ? ` ${corteNota[1]}` : ""}`.replace(/\s+/g, " ").trim(),
        texto: limpo.slice((corteNota.index ?? 0) + corteNota[0].length).trim(),
      }
    : null;
  const regra = /(?:^|\n|\s)(Previsão de embarque|Previsão de desembarque|Previsão de entrega|Cliente|Referência|Vendedor|Situação|Averbação|Pendência|(?<!de\s)(?:Embarque|Desembarque|Entrega))\s*:/gi;
  const achados = [...cabeca.matchAll(regra)];
  if (achados.length < 2) return null;
  const partes: { rotulo: string; valor: string }[] = [];
  for (let i = 0; i < achados.length; i += 1) {
    const de = (achados[i].index ?? 0) + achados[i][0].length;
    const ate = i + 1 < achados.length ? achados[i + 1].index ?? cabeca.length : cabeca.length;
    const valor = cabeca.slice(de, ate).replace(/\s+/g, " ").trim().replace(/^\|\s*/, "");
    if (valor) partes.push({ rotulo: achados[i][1], valor });
  }
  if (!partes.length) return null;
  return { processo: inicio[1].toUpperCase(), partes, nota };
}

function resumoDoTexto(texto: string) {
  const bruto = partesDoResumo(texto);
  if (!bruto) return null;
  const cliente = bruto.partes.find((parte) => /^cliente$/i.test(parte.rotulo))?.valor ?? "";
  const situacao = bruto.partes.find((parte) => /^situa/i.test(parte.rotulo))?.valor ?? "";
  const pendencia = bruto.partes.find((parte) => /^pend/i.test(parte.rotulo))?.valor ?? "";
  const datas: DataPrazo[] = [];
  const campos: { rotulo: string; valor: string }[] = [];
  for (const parte of bruto.partes) {
    if (/^(cliente|situa|pend)/i.test(parte.rotulo)) continue;
    const data = parte.valor.match(/^(?:previsto|prevista)?\s*(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?$/i);
    if (data && /embarque|desembarque|entrega|averba|previsão/i.test(parte.rotulo)) {
      const nome = parte.rotulo.replace(/^previsão de\s+/i, "");
      const previsao = /^previsão/i.test(parte.rotulo) || /previst/i.test(parte.valor);
      datas.push({
        rotulo: previsao ? `Previsão de ${nome.toLowerCase()}` : nome,
        data: data[1],
        hora: data[2] ?? "",
        dias: diasAte(data[1]),
      });
      continue;
    }
    campos.push(parte);
  }
  return { processo: bruto.processo, cliente, situacao, pendencia, datas, campos, nota: bruto.nota };
}

function ResumoCard({
  resumo,
}: {
  resumo: NonNullable<ReturnType<typeof resumoDoTexto>>;
}) {
  return (
    <article className="resposta">
      <header className="prazos-topo">
        <h2>
          <span className="codigo">{resumo.processo}</span>
          {resumo.cliente ? <small>{resumo.cliente}</small> : null}
        </h2>
        {resumo.situacao || resumo.pendencia ? (
          <div className="resumo">
            {resumo.situacao ? <span className="semana">{resumo.situacao}</span> : null}
            {resumo.pendencia ? <span>{resumo.pendencia}</span> : null}
          </div>
        ) : null}
      </header>
      {resumo.datas.length ? (
        <div className="datas-prazo resposta-datas">
          {resumo.datas.map((data) => (
            <div key={`${data.rotulo}-${data.data}`} className="prazo fim">
              <span className="rotulo">{data.rotulo}</span>
              <span className="data">
                {data.data}
                {data.hora ? <span className="hora">{data.hora}</span> : null}
              </span>
              <span className="rel">{rotuloRelativo(data.dias)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {resumo.campos.length ? (
        <dl className="resposta-campos">
          {resumo.campos.map((campo) => (
            <div key={campo.rotulo}>
              <dt>{campo.rotulo}</dt>
              <dd>{campo.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {resumo.nota ? (
        <section className="resposta-nota">
          <span className="rotulo">{resumo.nota.cabeca}</span>
          <p>{resumo.nota.texto}</p>
        </section>
      ) : null}
    </article>
  );
}

function TextoResposta({ texto }: { texto: string }) {
  return (
    <article className="resposta">
      <div className="resposta-texto">
        <MarkdownTexto texto={texto} />
      </div>
    </article>
  );
}

function ListaCard({ titulo, sub, itens, aviso }: { titulo: string; sub: string; itens: ItemLista[]; aviso: string }) {
  return (
    <article className="resposta">
      {titulo || sub ? (
        <header className="prazos-topo">
          <h2>
            {titulo || "Resultado"}
            {sub ? <small>{sub}</small> : null}
          </h2>
          <div className="resumo">
            <span>{itens.length === 1 ? "1 item" : `${itens.length} itens`}</span>
          </div>
        </header>
      ) : null}
      <ul className="prazos-lista">
        {itens.map((item, indice) => {
          const codigo = item.titulo.match(/\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/i)?.[0] ?? "";
          const tituloEhCodigo = codigo && item.titulo.trim().toUpperCase() === codigo.toUpperCase();
          const nome = tituloEhCodigo ? item.linhas[0] ?? "" : item.titulo;
          const detalhes = tituloEhCodigo ? item.linhas.slice(1) : item.linhas;
          const tom = item.tipo === "del" ? "hoje" : item.tipo === "upd" ? "semana" : "";
          return (
            <li key={`${item.titulo}-${item.hora}-${indice}`} className={`prazo-item${tom ? ` ${tom}` : ""}`} style={{ ["--i" as string]: indice }}>
              <div>
                {codigo ? <span className="codigo">{codigo}</span> : null}
                {nome ? <p className="empresa">{nome}</p> : null}
                {detalhes.map((linha) => (
                  <p key={linha} className="resposta-detalhe">{linha}</p>
                ))}
              </div>
              {item.hora || item.tag ? (
                <div className="datas-prazo">
                  {item.hora ? (
                    <div className="prazo">
                      <span className="rotulo">Hora</span>
                      <span className="data">{item.hora}</span>
                    </div>
                  ) : null}
                  {item.tag ? (
                    <div className="prazo fim">
                      <span className="rel">{item.tag}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {aviso ? <p className="prazos-aviso">{aviso}</p> : null}
    </article>
  );
}

function pediuTextoParaEnviar(texto: string) {
  return /resumo|texto (?:pra|para) (?:enviar|o usu[aá]rio|encaminhar|entregar)|encaminhar|entregar (?:pra|para) quem pediu/i.test(texto);
}

function pediuImpressao(texto: string) {
  return /formatad[oa].{0,40}imprim|pra imprimir|para imprimir|para impress|pra impress/i.test(textoVisivel(texto));
}

function normalizarCartoes(texto: string) {
  const limpo = semBlocoAberto(texto)
    .replace(/```([a-z]*)[^\S\n]*\n?([\s\S]*?)```/gi, (bloco, linguagem: string, corpo: string) => {
      const tipo = linguagem.toLowerCase();
      const conteudo = corpo.trim();
      if (!conteudo) return "";
      if (/^(grafico|email|rota)$/.test(tipo)) return bloco;
      if (!/^(log|painel|json)$/.test(tipo) && !/^[{[]/.test(conteudo)) return bloco;
      try {
        const dados = JSON.parse(conteudo) as { banco?: unknown; itens?: unknown };
        if (dados?.banco) return "```painel\n" + conteudo + "\n```";
        if (Array.isArray(dados?.itens) && dados.itens.length) return "```log\n" + conteudo + "\n```";
      } catch {
        return "";
      }
      return "";
    })
    .trim();
  return /```/.test(limpo) ? limpo : limpo.replace(/^\s*\{\s*"titulo"\s*:[\s\S]*$/m, "").trim();
}

function semBlocoAberto(texto: string) {
  const cercas = texto.match(/```/g)?.length ?? 0;
  if (cercas % 2 === 0) return texto;
  const corte = texto.lastIndexOf("```");
  const antes = texto.slice(0, corte).trimEnd();
  const resto = texto.slice(corte);
  const tipo = resto.match(/^```([a-z]*)/i)?.[1]?.toLowerCase() ?? "";
  const corpo = resto.replace(/^```[a-z]*[^\S\n]*\n?/i, "");
  if (tipo === "log" || tipo === "json" || /"rotulo"\s*:/.test(corpo)) {
    const itens = objetosDaLista(corpo, '"itens"');
    if (itens.length) {
      const titulo = corpo.match(/"titulo"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1] ?? "Log recente";
      const sub = corpo.match(/"sub"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1] ?? "";
      const bloco = "```log\n" + JSON.stringify({ titulo, sub, itens }) + "\n```";
      return antes ? `${antes}\n\n${bloco}` : bloco;
    }
  }
  if (tipo === "grafico" || tipo === "email" || tipo === "rota") {
    const fechado = `${resto.trimEnd()}\n\`\`\``;
    return antes ? `${antes}\n${fechado}` : fechado;
  }
  return antes;
}

function temCartao(texto: string) {
  return /```(?:log|painel)\b|\{\s*"titulo"\s*:/i.test(texto);
}

function cartaoDaFerramenta(conteudo: string): string | null {
  const texto = textoDaConsulta(conteudo) || conteudo;
  for (const achado of texto.matchAll(/```(log|painel)\s*([\s\S]*?)```/gi)) {
    const bloco = achado[0];
    const log = achado[1].toLowerCase() === "log" ? logDoTexto(bloco) : null;
    if (log && log.itens.length) return bloco;
    if (achado[1].toLowerCase() === "painel" && painelDoTexto(bloco)) return bloco;
  }
  return null;
}

function Markdown({ texto: bruto, ocultarSql = false, textoCorrido = false }: { texto: string; ocultarSql?: boolean; textoCorrido?: boolean }) {
  let texto = bruto;
  const partes: { tipo: "md" | "grafico" | "email" | "rota"; texto: string }[] = [];
  const normal = normalizarCartoes(texto);
  if (textoCorrido) {
    return normal ? <TextoResposta texto={ocultarSql ? semSql(normal) : normal} /> : null;
  }
  const painel = painelDoTexto(normal);
  if (painel && !/\|[^\n]+\|/.test(normal)) return <PainelTiCard painel={painel} />;
  const log = logDoTexto(normal);
  if (log?.itens.length) return <LogCard log={log} />;
  if (!normal) return null;
  texto = normal;
  const regra = /```(grafico|email|rota)\s*\n([\s\S]*?)```/gi;
  let cursor = 0;
  for (const achado of texto.matchAll(regra)) {
    const inicio = achado.index ?? 0;
    if (inicio > cursor) {
      const md = abrirLista(moedasDoChat(setasDoChat(ocultarSql ? semSql(texto.slice(cursor, inicio)) : texto.slice(cursor, inicio))));
      if (md.trim()) partes.push({ tipo: "md", texto: md });
    }
    const tipo = achado[1] === "email" ? "email" : achado[1] === "rota" ? "rota" : "grafico";
    partes.push({ tipo, texto: achado[2] });
    cursor = inicio + achado[0].length;
  }
  if (cursor < texto.length) {
    const md = abrirLista(moedasDoChat(setasDoChat(ocultarSql ? semSql(texto.slice(cursor)) : texto.slice(cursor))));
    if (md.trim()) partes.push({ tipo: "md", texto: md });
  }
  return (
    <>
      {partes.map((parte, indice) =>
        parte.tipo === "grafico" ? (
          <Grafico key={indice} texto={parte.texto} />
        ) : parte.tipo === "email" ? (
          <EmailCard key={indice} bruto={parte.texto} />
        ) : parte.tipo === "rota" ? (
          <RotaCard key={indice} bruto={parte.texto} />
        ) : (
          <Fragmento key={indice} texto={parte.texto} />
        ),
      )}
    </>
  );
}

function MarkdownTexto({ texto }: { texto: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="chat-tabela">
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {texto}
    </ReactMarkdown>
  );
}

function Fragmento({ texto }: { texto: string }) {
  const resumo = resumoDoTexto(texto);
  if (resumo) return <ResumoCard resumo={resumo} />;
  const pecas = partirResposta(texto);
  const temLista = pecas.some((peca) => peca.tipo === "lista");
  if (!temLista) return <TextoResposta texto={pecas.map((peca) => (peca.tipo === "md" ? peca.texto : "")).join("\n\n")} />;
  return (
    <>
      {pecas.map((peca, indice) => {
        if (peca.tipo !== "lista") {
          return <TextoResposta key={indice} texto={peca.texto} />;
        }
        const prazos = prazosDaLista(peca.titulo, peca.itens);
        if (prazos) return <PrazosCard key={indice} titulo={prazos.titulo} sub={prazos.sub} itens={prazos.itens} aviso={peca.aviso} />;
        return <ListaCard key={indice} titulo={peca.titulo} sub={peca.sub} itens={peca.itens} aviso={peca.aviso} />;
      })}
    </>
  );
}

function logGuardado(historico: Mensagem[]): LogPdf | null {
  for (let i = historico.length - 1; i >= 0; i--) {
    const item = historico[i];
    if (item.role === "assistant" && item.log?.eventos?.length) return item.log;
    if (item.role === "tool") {
      const log = logEmbutido(item.content);
      if (log?.eventos?.length) return log;
    }
  }
  return null;
}

function chamadaParaImprimir(historico: Mensagem[]): { nome: string; args: Record<string, unknown> } | null {
  for (let i = historico.length - 1; i >= 0; i--) {
    const item = historico[i];
    if (item.role !== "assistant" || !item.tool_calls?.length) continue;
    for (let c = item.tool_calls.length - 1; c >= 0; c--) {
      const chamada = item.tool_calls[c];
      if (!["explicar_itens_carga", "explicar_campo_livre", "consultar_log"].includes(chamada.function.name)) continue;
      try {
        return { nome: chamada.function.name, args: JSON.parse(chamada.function.arguments || "{}") as Record<string, unknown> };
      } catch {
        return { nome: chamada.function.name, args: {} };
      }
    }
  }
  return null;
}

function logEmbutido(resultado: string): LogPdf | null {
  try {
    const dados = JSON.parse(resultado) as { log?: LogPdf };
    if (!dados.log || !Array.isArray(dados.log.eventos) || !dados.log.titulo) return null;
    return dados.log;
  } catch {
    return null;
  }
}

function cartaoDoHistorico(log: LogPdf) {
  const eventos = log.eventos.filter(
    (evento) => evento.tipo === 1 || evento.tipo === 2 || camposQueMudaram(evento).length > 0,
  );
  const amostra = eventos.slice(0, 8);
  const resto = eventos.length - amostra.length;
  const itens = amostra.map((evento) => {
    const quando = new Date(evento.data || evento.dataInicioTransacao || evento.dataTerminoTransacao);
    const valido = !Number.isNaN(quando.getTime());
    const hora = valido
      ? quando.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })
      : "—";
    const dia = valido
      ? quando.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const mudancas = acoesDoEvento(evento).slice(0, 8).map((acao) => ({
      campo: rotuloCampo(acao.nome),
      de: acao.antes,
      para: acao.depois,
    }));
    return {
      hora,
      dia,
      tabela: evento.tabela?.trim() || log.titulo,
      tipo: evento.tipo === 2 ? "del" : evento.tipo === 3 ? "upd" : "add",
      rotulo: rotuloTipo(evento.tipo),
      quem: nomeProprio(evento.usuario ?? ""),
      windows: evento.usuarioWindows?.trim() || "",
      computador: evento.computador?.trim() || "",
      processo: evento.numeroProcesso?.trim() || "",
      mudancas,
    };
  });
  const aviso = resto > 0 ? `Mais ${resto} alteraç${resto === 1 ? "ão" : "ões"} no histórico impresso.` : "";
  return {
    titulo: log.titulo,
    sub: log.periodo || itens[0]?.dia || "",
    itens,
    aviso: itens.length ? aviso : `Nenhuma alteração em ${log.titulo}.`,
  };
}

function resumoDoLog(log: LogPdf): string {
  const eventos = log.eventos.filter(
    (evento) => evento.tipo === 1 || evento.tipo === 2 || camposQueMudaram(evento).length > 0,
  );
  if (!eventos.length) return `Nenhuma alteração em ${log.titulo}.`;
  const amostra = eventos.slice(0, 8);
  const linhas = amostra.map((evento) => {
    const quando = formatarDataHora(evento.data || evento.dataInicioTransacao || evento.dataTerminoTransacao);
    const quem = nomeProprio(evento.usuario ?? "");
    const campos = camposQueMudaram(evento).length;
    return `- **${rotuloTipo(evento.tipo)}** em ${quando}, por ${quem}. ${campos} campo${campos === 1 ? "" : "s"}.`;
  });
  const resto = eventos.length - amostra.length;
  return [
    `#### ${log.titulo}`,
    "",
    ...linhas,
    "",
    "Os valores de cada campo ficam em Imprimir histórico.",
    resto > 0 ? `Mais ${resto} alteraç${resto === 1 ? "ão" : "ões"} no histórico impresso.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function RelatorioChatBloco({
  relatorio,
  aberto,
  onAlternar,
  excel,
}: {
  relatorio: RelatorioChat;
  aberto: boolean;
  onAlternar: () => void;
  excel?: boolean;
}) {
  const [cheia, setCheia] = useState(false);
  const completo = relatorioComDetalhe(relatorio);
  const total = completo.secoes.reduce((soma, secao) => soma + secao.linhas.length, 0);
  useEffect(() => {
    if (!cheia) return;
    function fechar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setCheia(false);
    }
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [cheia]);

  const tabelas = (
    <div className="chat-completo">
      {completo.secoes.map((secao, indice) => (
        <SecaoRelatorioTabela key={`${secao.titulo}-${indice}`} secao={secao} />
      ))}
    </div>
  );

  return (
    <div className="chat-relatorio">
      <div className="chat-relatorio-topo">
        <div>
          <span>Relatório</span>
          <strong>{completo.titulo}</strong>
          <small>{total} {total === 1 ? "resultado" : "resultados"}</small>
        </div>
        <div className="chat-relatorio-acoes">
          {excel ? (
            <button type="button" className="chat-ver-consulta" onClick={() => void import("./excelRelatorio").then((m) => m.baixarExcel(completo))}>
              Baixar Excel
            </button>
          ) : null}
          <button type="button" className="chat-ver-consulta" onClick={() => setCheia(true)}>
            Tela cheia
          </button>
          <button type="button" className="chat-ver-consulta" onClick={onAlternar}>
            {aberto ? "Recolher" : "Ver relatório"}
          </button>
        </div>
      </div>
      {aberto && !cheia ? tabelas : null}
      {cheia ? (
        <div
          className="chat-relatorio-tela"
          role="dialog"
          aria-modal="true"
          aria-label={completo.titulo}
          onClick={() => setCheia(false)}
        >
          <div className="chat-relatorio-tela-painel" onClick={(evento) => evento.stopPropagation()}>
            <div className="chat-relatorio-topo">
              <div>
                <span>Relatório</span>
                <strong>{completo.titulo}</strong>
                <small>{total} {total === 1 ? "resultado" : "resultados"}</small>
              </div>
              <div className="chat-relatorio-acoes">
                {excel ? (
                  <button type="button" className="chat-ver-consulta" onClick={() => void import("./excelRelatorio").then((m) => m.baixarExcel(completo))}>
                    Baixar Excel
                  </button>
                ) : null}
                <button type="button" className="chat-ver-consulta" onClick={() => setCheia(false)}>
                  Fechar
                </button>
              </div>
            </div>
            {tabelas}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SecaoRelatorioTabela({ secao }: { secao: SecaoRelatorio }) {
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<string[]>(() => secao.colunas.map(() => ""));
  const [ordem, setOrdem] = useState<{ coluna: number; direcao: "asc" | "desc" } | null>(null);
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const linhas = secao.linhas
    .filter((linha) => {
      if (termo && !linha.some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo))) return false;
      return filtros.every((filtro, coluna) => !filtro.trim() || (linha[coluna] ?? "").toLocaleLowerCase("pt-BR").includes(filtro.trim().toLocaleLowerCase("pt-BR")));
    })
    .map((linha, indice) => ({ linha, indice }))
    .sort((a, b) => {
      if (!ordem) return a.indice - b.indice;
      const av = a.linha[ordem.coluna] ?? "";
      const bv = b.linha[ordem.coluna] ?? "";
      const numeroA = Number(av.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
      const numeroB = Number(bv.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
      const comparacao = Number.isFinite(numeroA) && Number.isFinite(numeroB) && av !== "" && bv !== ""
        ? numeroA - numeroB
        : av.localeCompare(bv, "pt-BR", { numeric: true, sensitivity: "base" });
      return ordem.direcao === "asc" ? comparacao : -comparacao;
    });

  function ordenar(coluna: number) {
    setOrdem((atual) =>
      atual?.coluna === coluna
        ? atual.direcao === "asc"
          ? { coluna, direcao: "desc" }
          : null
        : { coluna, direcao: "asc" },
    );
  }

  return (
    <section className="chat-relatorio-secao">
      <div className="chat-relatorio-secao-topo">
        <strong>{secao.titulo}</strong>
        <label>
          <span>Buscar em tudo</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite para filtrar..." />
        </label>
        <small>Mostrando {linhas.length} de {secao.linhas.length}</small>
      </div>
      <div className="chat-relatorio-tabela-wrap">
        <table className="chat-relatorio-tabela">
          <thead>
            <tr>
              {secao.colunas.map((coluna, indice) => (
                <th key={`${coluna}-${indice}`}>
                  <button type="button" onClick={() => ordenar(indice)}>
                    {coluna}
                    <span>{ordem?.coluna === indice ? (ordem.direcao === "asc" ? " ↑" : " ↓") : " ↕"}</span>
                  </button>
                </th>
              ))}
            </tr>
            <tr className="chat-relatorio-filtros">
              {secao.colunas.map((coluna, indice) => (
                <th key={`${coluna}-filtro-${indice}`}>
                  <input
                    aria-label={`Filtrar por ${coluna}`}
                    value={filtros[indice] ?? ""}
                    onChange={(e) => setFiltros((atuais) => atuais.map((valor, i) => i === indice ? e.target.value : valor))}
                    placeholder="Filtrar..."
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ linha, indice }) => (
              <tr key={indice}>
                {secao.colunas.map((_, coluna) => <td key={coluna}>{linha[coluna] || "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!linhas.length ? <div className="chat-relatorio-vazio">Nenhum resultado corresponde aos filtros.</div> : null}
      </div>
    </section>
  );
}

type ConversaResumo = { id: string; titulo: string; atualizado: string };

function saudacaoInicial(nomeCompleto: string, qtd: number | null, area: string) {
  const hora = new Date().getHours();
  const periodo = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = nomeCompleto.split(" ")[0]?.toLowerCase().replace(/^./, (letra) => letra.toUpperCase()) || "";
  const titulo = primeiro ? `${periodo}, ${primeiro}.` : `${periodo}.`;
  const assunto = area === "inside" || area === "comercial" ? "proposta/oferta" : area === "documental" ? "atividades do documental CE e do IM" : "processos";
  if (area === "financeiro") {
    return {
      titulo,
      detalhe: "Visão financeira. Valores, taxas, comissões e prazos. Peça um gráfico quando quiser ver os números.",
      extra: "",
    };
  }
  if (area === "ti") {
    const pendencia =
      qtd != null && qtd > 0
        ? qtd === 1
          ? "Você tem uma pendência para hoje."
          : `Você tem ${qtd} Atividades para hoje.`
        : "";
    return {
      titulo,
      detalhe: pendencia || "Escolha uma consulta pronta. O período e o que entra na resposta já estão definidos.",
      extra: pendencia ? "Escolha uma consulta pronta. O período e o que entra na resposta já estão definidos." : "",
    };
  }
  const detalhe =
    qtd === null
      ? "Em que posso ajudar?"
      : qtd < 0
        ? "Não localizei suas pendências no cadastro."
        : qtd === 0
          ? "Tudo em dia. Nenhuma pendência para hoje."
          : qtd === 1
            ? "Você tem uma pendência para hoje."
            : `Você tem ${qtd} pendências para hoje.`;
  const extra = qtd === 0 ? `Aproveite pra verificar algo relacionado a ${assunto}.` : "";
  return { titulo, detalhe, extra };
}

export function ChatIa({
  api,
  aberto,
  onAbrir,
  onFechar,
  executar,
  capturarLog,
  onImprimirLog,
  onTelaCheia,
  email = "",
  nome = "",
  foto = "",
  onSair,
  fixo = false,
  admin = false,
  acessoConfirmado = true,
  setor = "geral",
  modalidade = "",
  visao = "tudo",
  onVisao,
  onAcessoRemovido,
  permissoes,
}: {
  api: string;
  aberto: boolean;
  onAbrir: () => void;
  onFechar: () => void;
  executar: (nome: string, args: Record<string, unknown>, sinal?: AbortSignal) => Promise<string>;
  capturarLog: () => LogPdf | null;
  onImprimirLog: (log: LogPdf) => void;
  onTelaCheia: (cheia: boolean) => void;
  email?: string;
  nome?: string;
  foto?: string;
  onSair?: () => void;
  fixo?: boolean;
  admin?: boolean;
  acessoConfirmado?: boolean;
  setor?: string;
  modalidade?: string;
  encontrado?: boolean;
  visao?: string;
  onVisao?: (visao: string) => void;
  onAcessoRemovido?: () => void;
  permissoes?: {
    admin: boolean;
    log: boolean;
    memoria: boolean;
    pendencias: boolean;
    consulta: boolean;
    sql: boolean;
    relatorio: boolean;
    excel?: boolean;
    semComissao?: boolean;
  };
}) {
  const pode = permissoes ?? {
    admin,
    log: admin,
    memoria: admin,
    pendencias: true,
    consulta: admin,
    sql: admin,
    relatorio: true,
    excel: false,
  };
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [consultaAberta, setConsultaAberta] = useState<number | null>(null);
  const [rotaCheia, setRotaCheia] = useState<string | null>(null);
  const [consultaCopiada, setConsultaCopiada] = useState<number | null>(null);
  const [respostaCopiada, setRespostaCopiada] = useState<number | null>(null);
  const telaCheia = false;
  const [forcarDetalhe, setForcarDetalhe] = useState<Record<number, boolean>>({});
  const [texto, setTexto] = useState("");
  const [status, setStatus] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [emFundo, setEmFundo] = useState(false);
  const [sobreTela, setSobreTela] = useState(false);
  const pipRef = useRef<Window | null>(null);
  const enviarRef = useRef<(conteudo: string) => void>(() => {});
  const [temaClaro, setTemaClaro] = useState(() => document.documentElement.classList.contains("tema-claro"));
  const [erro, setErro] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const abortarRef = useRef<AbortController | null>(null);
  const canceladoRef = useRef(false);
  const modoRelatorioRef = useRef(false);
  const apresentacaoRef = useRef(false);
  const entradaRef = useRef<HTMLTextAreaElement>(null);
  const [memoriaAberta, setMemoriaAberta] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [inicioAberto, setInicioAberto] = useState(true);
  const [abaAbertura, setAbaAbertura] = useState<"consultas" | "relatorios">("consultas");
  const [lateralRecolhida, setLateralRecolhida] = useState(() => sessionStorage.getItem("maicon-lateral") === "1");
  const [visoesAbertas, setVisoesAbertas] = useState(false);
  const [telaLateral, setTelaLateral] = useState<"menu" | "conversas">("menu");
  const [chaves, setChaves] = useState<{ id: string; provedor: string; rotulo: string; final: string }[]>([]);
  const [novaChave, setNovaChave] = useState({ provedor: "gemini", rotulo: "", chave: "" });
  const [filtroContas, setFiltroContas] = useState("");
  const [contas, setContas] = useState<
    {
      email: string;
      nome: string;
      papel: string;
      adminFixo?: boolean;
      verLog: boolean;
      verMemoria: boolean;
      verPendencias: boolean;
      verConsulta: boolean;
      fazerLog: boolean;
      fazerMemoria: boolean;
      fazerSql: boolean;
      fazerRelatorio: boolean;
      fazerExcel: boolean;
      setorManual?: string;
      modalidadeManual?: string;
    }[]
  >([]);
  const [contaAberta, setContaAberta] = useState<(typeof contas)[number] | null>(null);
  const [contaExcluir, setContaExcluir] = useState<(typeof contas)[number] | null>(null);
  const [painel, setPainel] = useState<{
    encontrado: boolean;
    nome: string;
    processos: { processo: string; cliente: string }[];
    atividades: { codigo: string; atividade: string; processo: string; marca?: string; quando?: string }[];
  } | null>(null);
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [buscaAlvo, setBuscaAlvo] = useState<number | null>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const buscaCaixaRef = useRef<HTMLDivElement>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const conversaIdRef = useRef<string | null>(null);
  const [preferencias, setPreferencias] = useState<Preferencia[]>([]);
  const [glossario, setGlossario] = useState<{ termo: string; significado: string }[]>([]);
  const [termoGlossario, setTermoGlossario] = useState("");
  const [textoGlossario, setTextoGlossario] = useState("");
  const [falhasSemana, setFalhasSemana] = useState<{ email: string; pergunta: string; motivo: string; regra?: string }[]>([]);
  const [placar, setPlacar] = useState<{ visao: string; boas: number; ruins: number }[]>([]);
  const [promovidas, setPromovidas] = useState<number[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState({ termo: "", tabela: "", campo: "", observacao: "" });
  const [erroMemoria, setErroMemoria] = useState("");

  function limparRascunho() {
    setEditando(null);
    setRascunho({ termo: "", tabela: "", campo: "", observacao: "" });
    setErroMemoria("");
  }

  async function salvarMemoria() {
    setErroMemoria("");
    const resp = await fetch(`${api}/api/memoria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...rascunho,
        email,
        acao: editando == null ? "lembrar" : "editar",
        indice: editando,
      }),
    });
    const dados = await resp.json();
    if (!resp.ok) {
      setErroMemoria(dados.erro || "Falha ao salvar a memória");
      return;
    }
    limparRascunho();
    await carregarMemoria();
  }

  async function carregarMemoria() {
    const resp = await fetch(`${api}/api/memoria?email=${encodeURIComponent(email)}`);
    const dados = await resp.json();
    setPreferencias(Array.isArray(dados.preferencias) ? dados.preferencias : []);
    setGlossario(Array.isArray(dados.glossario) ? dados.glossario : []);
  }

  async function esquecer(p: Preferencia) {
    await fetch(`${api}/api/memoria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "esquecer", email, termo: p.termo || p.observacao }),
    });
    await carregarMemoria();
  }

  useEffect(() => {
    if (!texto && entradaRef.current) entradaRef.current.style.height = "auto";
  }, [texto]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, status]);

  const abertoRef = useRef(aberto);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const visivel = aberto && !emFundo;

  useEffect(() => {
    abertoRef.current = visivel;
    if (visivel) setAviso(null);
  }, [visivel]);

  function avisarConclusao(texto: string, comErro: boolean) {
    const resumo = texto.replace(/```[\s\S]*?```/g, " ").replace(/[#*`>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
    const pip = pipRef.current;
    const naJanelaPequena = Boolean(pip && !pip.closed && pip.document.hasFocus());
    const naIa = !document.hidden && document.hasFocus();
    if (!abertoRef.current) setAviso({ texto: resumo || "Consulta concluída.", erro: comErro });
    if (naIa || naJanelaPequena || !("Notification" in window) || Notification.permission !== "granted") return;
    const nota = new Notification(comErro ? "Maicon AI: a consulta falhou" : "Maicon AI: resposta pronta", {
      body: resumo || "A consulta terminou.",
      icon: logoMaiconPng,
      tag: "maicon-ia",
    });
    nota.onclick = () => {
      window.focus();
      setEmFundo(false);
      onAbrir();
      nota.close();
    };
  }

  function novaConversa() {
    modoRelatorioRef.current = false;
    apresentacaoRef.current = false;
    setInicioAberto(false);
    setAbaAbertura("consultas");
    conversaIdRef.current = null;
    setConversaId(null);
    sessionStorage.removeItem("maicon-conversa-id");
    setMensagens([]);
    setConsultaAberta(null);
    setMemoriaAberta(false);
    setConfigAberta(false);
    if (!email) return;
    void (async () => {
      try {
        const resp = await fetch(`${api}/api/inicio`);
        const dados = await resp.json();
        if (resp.ok) setPainel(dados);
      } catch {
        /* a lista tenta de novo na próxima conversa */
      }
    })();
  }

  function cancelarConsulta() {
    canceladoRef.current = true;
    abortarRef.current?.abort();
    setStatus("Cancelando…");
  }

  function voltarDoFundo() {
    setEmFundo(false);
    onAbrir();
  }

  function textoMini(valor: string) {
    return semBlocoAberto(valor)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*`>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pintarMiniChat(janela: Window) {
    const lista = janela.document.getElementById("msgs");
    const estado = janela.document.getElementById("estado");
    const campo = janela.document.getElementById("campo") as HTMLTextAreaElement | null;
    if (!lista || !estado) return;
    const itens = mensagens.flatMap((item) => {
      if (item.role === "tool" || !("content" in item)) return [];
      const texto = textoMini(item.content);
      if (!texto) return [];
      return [`<p class="${item.role === "user" ? "eu" : "ia"}">${texto.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"))}</p>`];
    });
    const pensando = ocupado ? `<p class="ia pensando">${(status || "Consultando…").replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"))}</p>` : "";
    lista.innerHTML =
      `${itens.slice(-8).join("")}${pensando}` ||
      `<div class="vazio"><span class="vazio-icone"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="${ICONES.ia}"/></svg></span><strong>Fico aqui enquanto você trabalha</strong><small>Pergunte sobre um processo, cliente ou atividade.</small><div class="atalhos"><button type="button" data-pergunta="Quais são minhas pendências atrasadas e as dos próximos 7 dias?">Minhas pendências</button><button type="button" data-pergunta="Faça o resumo do processo ">Resumo de processo</button></div></div>`;
    lista.scrollTop = lista.scrollHeight;
    estado.textContent = ocupado ? status || "Consultando…" : "Pronto";
    estado.classList.toggle("ativo", ocupado);
    if (campo) campo.disabled = ocupado;
    const botao = janela.document.getElementById("enviar") as HTMLButtonElement | null;
    if (botao) botao.disabled = ocupado;
  }

  function desenharMiniChat(janela: Window) {
    const doc = janela.document;
    doc.documentElement.lang = "pt-BR";
    doc.title = "Maicon AI";
    doc.head.innerHTML = `<style>
      *{box-sizing:border-box}
      html,body{margin:0;height:100%;background:#0e1014;color:#e8eaef;font:15px/1.45 "Segoe UI",system-ui,sans-serif}
      body{display:flex;flex-direction:column;height:100%}
      header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,#151821,#0e1014)}
      .marca{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#b71c1c,#e53935);display:grid;place-items:center;flex:none;box-shadow:0 4px 12px rgba(229,57,53,.25)}
      .marca img{width:17px;height:17px;object-fit:contain}
      header strong{font-size:14.5px;font-weight:680;letter-spacing:-.01em}
      #estado{margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:rgba(93,204,160,.1);color:#5dcca0;font-size:11.5px;font-weight:650;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #estado::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:currentColor}
      #estado.ativo{background:rgba(245,158,11,.12);color:#ffb74d}
      #estado.ativo::before{animation:pulsa 1.2s ease-in-out infinite}
      @keyframes pulsa{50%{opacity:.25}}
      #msgs{flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:16px 14px}
      #msgs::-webkit-scrollbar{width:6px}
      #msgs::-webkit-scrollbar-thumb{background:#2a2f3c;border-radius:6px}
      #msgs p{margin:0;max-width:88%;padding:9px 13px;white-space:pre-wrap;font-size:14px;line-height:1.5;overflow-wrap:anywhere}
      #msgs .eu{align-self:flex-end;color:#fff;background:linear-gradient(135deg,#8e2323,#b3302c);border-radius:16px 16px 4px 16px}
      #msgs .ia{align-self:flex-start;color:#e6e6ea;background:#1b1e27;border:1px solid #262a35;border-radius:16px 16px 16px 4px}
      #msgs .pensando{color:#ffb74d;background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2)}
      .vazio{margin:auto;display:flex;flex-direction:column;align-items:center;gap:6px;max-width:260px;text-align:center;color:#8b95a7}
      .vazio-icone{width:44px;height:44px;margin-bottom:6px;border-radius:14px;display:grid;place-items:center;color:#ff8a80;background:rgba(229,57,53,.12)}
      .vazio strong{color:#e8eaef;font-size:14.5px;font-weight:650}
      .vazio small{font-size:13px}
      .atalhos{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:12px}
      .atalhos button{width:auto;height:auto;padding:6px 12px;border:1px solid #2a2f3c;border-radius:999px;background:#151821;color:#c9cfdb;font:inherit;font-size:12.5px;cursor:pointer}
      .atalhos button:hover{border-color:rgba(229,57,53,.6);color:#fff}
      form{display:flex;align-items:flex-end;gap:8px;margin:0 12px 12px;padding:5px 5px 5px 14px;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:#151821;transition:border-color .15s}
      form:focus-within{border-color:rgba(229,57,53,.6)}
      textarea{flex:1;resize:none;height:22px;max-height:96px;margin:8px 0;border:0;outline:none;background:transparent;color:#e8eaef;font:inherit;font-size:14px;line-height:1.5}
      textarea::placeholder{color:#7c8596}
      #enviar{flex:none;width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:50%;color:#fff;background:linear-gradient(135deg,#b71c1c,#e53935);cursor:pointer;transition:transform .15s,opacity .15s}
      #enviar:hover:not(:disabled){transform:scale(1.06)}
      #enviar:disabled{opacity:.35;cursor:default}
      .dica{margin:-6px 0 8px;text-align:center;color:#5d6577;font-size:11px}
    </style>`;
    doc.body.innerHTML = `<header><span class="marca"><img src="${logoMaicon}" alt=""></span><strong>Maicon AI</strong><span id="estado">Pronto</span></header><div id="msgs"></div><form id="envio"><textarea id="campo" rows="1" placeholder="Pergunte sobre um processo…"></textarea><button id="enviar" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="${ICONES.enviar}"/></svg></button></form><p class="dica">Enter envia · Shift+Enter quebra linha</p>`;
    const campo = doc.getElementById("campo") as HTMLTextAreaElement | null;
    const ajustar = () => {
      if (!campo) return;
      campo.style.height = "22px";
      campo.style.height = `${Math.min(campo.scrollHeight, 96)}px`;
    };
    const mandar = (valor: string) => {
      const texto = valor.trim();
      if (!texto) return;
      if (campo) campo.value = "";
      ajustar();
      enviarRef.current(texto);
    };
    campo?.addEventListener("input", ajustar);
    campo?.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" && !evento.shiftKey) {
        evento.preventDefault();
        mandar(campo.value);
      }
    });
    doc.getElementById("envio")?.addEventListener("submit", (evento) => {
      evento.preventDefault();
      mandar(campo?.value ?? "");
    });
    doc.getElementById("msgs")?.addEventListener("click", (evento) => {
      const alvo = (evento.target as HTMLElement).closest<HTMLButtonElement>("button[data-pergunta]");
      const pergunta = alvo?.dataset.pergunta ?? "";
      if (!pergunta || !campo) return;
      if (pergunta.endsWith(" ")) {
        campo.value = pergunta;
        campo.focus();
        ajustar();
        return;
      }
      mandar(pergunta);
    });
  }

  async function abrirSobreTela() {
    const aberta = pipRef.current;
    if (aberta && !aberta.closed) {
      aberta.focus();
      return;
    }
    const pedido = (window as Window & { documentPictureInPicture?: { requestWindow: (opcoes: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
    if (!pedido) {
      setInicioAberto(false);
      setConfigAberta(false);
      setMemoriaAberta(false);
      setErro("Este navegador não deixa a janela ficar sobre os outros apps.");
      return;
    }
    let janela: Window;
    try {
      janela = await pedido.requestWindow({ width: 380, height: 560 });
    } catch {
      return;
    }
    pipRef.current = janela;
    setSobreTela(true);
    desenharMiniChat(janela);
    pintarMiniChat(janela);
    janela.addEventListener("pagehide", () => {
      if (pipRef.current === janela) pipRef.current = null;
      setSobreTela(false);
    });
  }

  useEffect(() => {
    const janela = pipRef.current;
    if (!janela || janela.closed) return;
    pintarMiniChat(janela);
  }, [mensagens, ocupado, status]);

  function rodarEmSegundoPlano() {
    void abrirSobreTela();
  }

  enviarRef.current = (conteudo: string) => {
    void enviar(conteudo);
  };

  useEffect(() => {
    onTelaCheia(telaCheia);
  }, [telaCheia, onTelaCheia]);

  async function copiarConsulta(texto: string, indice: number) {
    try {
      await navigator.clipboard.writeText(texto);
      setConsultaCopiada(indice);
      window.setTimeout(() => setConsultaCopiada((atual) => (atual === indice ? null : atual)), 1600);
    } catch {
      setErro("Não foi possível copiar a consulta.");
    }
  }

  async function copiarResposta(texto: string, indice: number) {
    try {
      await navigator.clipboard.writeText(semMençãoPdf(respostaSemPayload(texto)).trim());
      setRespostaCopiada(indice);
      window.setTimeout(() => setRespostaCopiada((atual) => (atual === indice ? null : atual)), 1600);
    } catch {
      setErro("Não foi possível copiar a resposta.");
    }
  }

  useEffect(() => {
    if (!aberto) return;
    entradaRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, onFechar]);

  useEffect(() => {
    if (inicioAberto) setBuscaAberta(false);
  }, [inicioAberto]);

  useEffect(() => {
    if (!buscaAberta) return;
    buscaRef.current?.focus();
    const fechar = (evento: MouseEvent) => {
      if (!buscaCaixaRef.current?.contains(evento.target as Node)) {
        setBuscaAberta(false);
        setBuscaTexto("");
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [buscaAberta]);

  async function atualizarConversas() {
    if (!email) return;
    try {
      const resp = await fetch(`${api}/api/conversas?email=${encodeURIComponent(email)}`);
      const dados = await resp.json();
      if (resp.ok && Array.isArray(dados.conversas)) setConversas(dados.conversas);
    } catch {
      /* a lista permanece como está se a rede falhar */
    }
  }

  useEffect(() => {
    void atualizarConversas();
  }, [email, api]);

  useEffect(() => {
    if (!email) return;
    let ativo = true;
    void (async () => {
      try {
        const resp = await fetch(`${api}/api/inicio`);
        const dados = await resp.json();
        if (ativo && resp.ok) setPainel(dados);
      } catch {
        /* o painel inicial tenta de novo na próxima abertura */
      }
    })();
    return () => {
      ativo = false;
    };
  }, [email, nome, api]);

  useEffect(() => {
    if (!RESUMO_ENTRADA || !email || mensagens.length) return;
    const dia = new Date().toISOString().slice(0, 10);
    const chave = `maicon-entrada:${email}:${dia}`;
    if (sessionStorage.getItem(chave)) return;
    let ativo = true;
    void (async () => {
      try {
        const resp = await fetch(`${api}/api/gmail/resumo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: await renovarTokenGmail(),
            email,
            nome,
            visao: admin ? visao : setor,
            entrada: true,
          }),
        });
        const dados = await resp.json().catch(() => ({}));
        if (!ativo) return;
        sessionStorage.setItem(chave, "1");
        const texto = typeof dados.texto === "string" ? dados.texto.trim() : "";
        if (texto) setMensagens((atual) => (atual.length ? atual : [{ role: "assistant", content: texto }]));
      } catch {
        /* a entrada do dia tenta de novo se a rede falhou */
      }
    })();
    return () => {
      ativo = false;
    };
  }, [email, mensagens.length, api, nome, admin, visao, setor]);

  useEffect(() => {
    if (!email || !conversaId || ocupado) return;
    const timer = window.setTimeout(() => {
      void gravarConversa(conversaId, mensagens).then(() => atualizarConversas());
    }, 600);
    return () => window.clearTimeout(timer);
  }, [mensagens, conversaId, ocupado, email, api]);

  async function carregarContas() {
    if (!email) return;
    const resp = await fetch(`${api}/api/contas?email=${encodeURIComponent(email)}`);
    const dados = await resp.json();
    if (resp.ok && Array.isArray(dados.contas)) setContas(dados.contas);
  }

  function alterarConta(patch: Partial<(typeof contas)[number]>) {
    setContaAberta((atual) => (atual ? { ...atual, ...patch } : atual));
  }

  async function excluirConta(conta: (typeof contas)[number]) {
    const resp = await fetch(`${api}/api/contas?emailAdmin=${encodeURIComponent(email)}&email=${encodeURIComponent(conta.email)}`, {
      method: "DELETE",
    });
    const dados = await resp.json();
    if (resp.ok && Array.isArray(dados.contas)) {
      setContas(dados.contas);
      setContaAberta(null);
      setContaExcluir(null);
    } else setErro(dados.erro || "Não removeu a conta.");
  }

  async function salvarConta(conta: (typeof contas)[number]) {
    const resp = await fetch(`${api}/api/contas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...conta, emailAdmin: email }),
    });
    const dados = await resp.json();
    if (resp.ok && Array.isArray(dados.contas)) {
      setContas(dados.contas);
      setContaAberta(null);
    } else setErro(dados.erro || "Não salvou a conta.");
  }

  async function carregarChaves() {
    if (!email) return;
    const resp = await fetch(`${api}/api/chaves?email=${encodeURIComponent(email)}`);
    const dados = await resp.json();
    if (resp.ok && Array.isArray(dados.chaves)) setChaves(dados.chaves);
  }

  async function salvarChave() {
    if (!email || !novaChave.chave.trim()) return;
    const resp = await fetch(`${api}/api/chaves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...novaChave }),
    });
    const dados = await resp.json();
    if (!resp.ok) {
      setErro(dados.erro || "Não salvou a chave.");
      return;
    }
    setChaves(dados.chaves ?? []);
    setNovaChave({ provedor: novaChave.provedor, rotulo: "", chave: "" });
    setErro("");
  }

  async function removerChave(id: string) {
    if (!email) return;
    const resp = await fetch(`${api}/api/chaves/${id}?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    const dados = await resp.json();
    if (resp.ok) setChaves(dados.chaves ?? []);
  }

  async function excluirConversa(id: string) {
    if (!email || ocupado) return;
    const resp = await fetch(`${api}/api/conversas/${id}?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    if (!resp.ok) return;
    if (conversaIdRef.current === id) {
      conversaIdRef.current = null;
      sessionStorage.removeItem("maicon-conversa-id");
      setConversaId(null);
      setMensagens([]);
    }
    await atualizarConversas();
  }

  async function limparConversas() {
    if (!email || ocupado || conversas.length === 0) return;
    const resp = await fetch(`${api}/api/conversas?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    if (!resp.ok) return;
    if (conversaIdRef.current) {
      conversaIdRef.current = null;
      sessionStorage.removeItem("maicon-conversa-id");
      setConversaId(null);
      setMensagens([]);
    }
    setConversas([]);
  }

  async function abrirConversa(id: string) {
    if (!email || ocupado) return;
    const resp = await fetch(`${api}/api/conversas/${id}?email=${encodeURIComponent(email)}`);
    const dados = await resp.json();
    if (!resp.ok) return;
    conversaIdRef.current = id;
    sessionStorage.setItem("maicon-conversa-id", id);
    setConversaId(id);
    setMensagens(Array.isArray(dados.mensagens) ? dados.mensagens : []);
    setInicioAberto(false);
    setMemoriaAberta(false);
    setConsultaAberta(null);
    modoRelatorioRef.current = false;
  }

  async function garantirConversa(titulo: string) {
    if (!email || conversaIdRef.current) return;
    const resp = await fetch(`${api}/api/conversas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, titulo: titulo.slice(0, 80) }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.id) return;
    conversaIdRef.current = dados.id;
    sessionStorage.setItem("maicon-conversa-id", dados.id);
    setConversaId(dados.id);
  }

  async function gravarConversa(id: string, lista: Mensagem[]) {
    if (!email || !id || !lista.some((item) => item.role === "user")) return;
    const titulo = lista.find((item) => item.role === "user" && "content" in item)?.content?.slice(0, 80) || "Nova conversa";
    await fetch(`${api}/api/conversas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, titulo, mensagens: mensagensParaArquivo(lista) }),
    });
  }

  async function enviar(conteudo: string, receitaPronta?: Receita[] | null) {
    if (!conteudo.trim() || ocupado) return;
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    setInicioAberto(false);
    setTexto("");
    setErro("");
    if (/^pedir relat[oó]rio/i.test(conteudo.trim()) && !pode.relatorio) {
      setErro("Seu acesso não permite ver nem extrair relatórios.");
      return;
    }
    setOcupado(true);
    canceladoRef.current = false;
    const controle = new AbortController();
    abortarRef.current = controle;
    const gasto: UsoTokens = { entrada: 0, saida: 0, total: 0 };
    const inicioConsulta = performance.now();
    const duracaoConsulta = () => Math.max(1, Math.round(performance.now() - inicioConsulta));
    const pergunta = conteudo.trim();
    if (/^pedir relat[oó]rio/i.test(pergunta)) modoRelatorioRef.current = true;
    await garantirConversa(pergunta);
    if (conversaIdRef.current) sessionStorage.setItem("maicon-conversa-id", conversaIdRef.current);
    const completo = pediuNoChat(pergunta);
    const secoesDaPergunta: SecaoRelatorio[] = [];
    let logDaPergunta: LogPdf | null = null;
    const comeco = apresentacaoRef.current && pergunta.startsWith("Sou novo por aqui");
    let historico: Mensagem[] = [
      ...(comeco ? [] : mensagens),
      { role: "user", content: pergunta },
    ];
    setMensagens(historico);
    const entregarDados = () => {
      if (pedeLog(textoVisivel(pergunta))) return false;
      const pronto = textoDosDados(historico);
      if (!pronto) return false;
      historico = [...historico, { role: "assistant", content: pronto, duracaoMs: duracaoConsulta() }];
      setMensagens(historico);
      setErro("");
      avisarConclusao(pronto, false);
      return true;
    };
    try {
      if (/quais contas acessaram a ia/i.test(pergunta)) {
        setStatus("Lendo as contas…");
        const resp = await fetch(`${api}/api/contas?email=${encodeURIComponent(email)}`);
        const dados = await resp.json().catch(() => null);
        if (!resp.ok || !Array.isArray(dados?.contas)) throw new Error(dados?.erro || "Não consegui ler as contas da IA.");
        const setorDe = (valor: string) =>
          ({ inside: "Inside", comercial: "Vendedor", operacional: "Operacional", documental: "Documental", financeiro: "Financeiro", gerencia: "Gerência" })[valor] ?? "";
        const linhas = (dados.contas as { nome?: string; email?: string; papel?: string; setorManual?: string }[]).map((conta) => {
          const papel = conta.papel === "admin" ? "Administrador" : "Usuário";
          const setor = conta.setorManual && conta.setorManual !== "auto" ? setorDe(conta.setorManual) : "";
          return `- ${conta.nome?.trim() || conta.email} · ${conta.email} · ${papel}${setor ? ` · ${setor}` : ""}`;
        });
        const content = linhas.length ? `Contas com acesso à IA:\n\n${linhas.join("\n")}` : "Nenhuma conta com acesso à IA.";
        historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
        setMensagens(historico);
        setErro("");
        avisarConclusao(content, false);
        return;
      }
      if (pediuImpressao(pergunta) && !modoRelatorioRef.current && !apresentacaoRef.current) {
        let log = logGuardado(mensagens);
        if (!log) {
          const chamada = chamadaParaImprimir(mensagens);
          if (chamada) {
            setStatus("Montando o histórico…");
            const resultado = await executar(chamada.nome, chamada.args, controle.signal);
            log = logEmbutido(resultado) ?? (chamada.nome === "consultar_log" ? capturarLog() : null);
          }
        }
        if (log) {
          const resposta: Extract<Mensagem, { role: "assistant" }> = {
            role: "assistant",
            content: resumoDoLog(log),
            log,
            duracaoMs: duracaoConsulta(),
          };
          historico = [...historico, resposta];
          setMensagens(historico);
          setErro("");
          avisarConclusao(resposta.content, false);
          return;
        }
      }
      const campoDireto = modoRelatorioRef.current || apresentacaoRef.current ? null : receitaCampoLivre(pergunta);
      const cargaDireta = campoDireto || modoRelatorioRef.current || apresentacaoRef.current ? null : receitaItensCarga(pergunta, mensagens);
      const continuacao = modoRelatorioRef.current || apresentacaoRef.current ? null : receitaContinuacao(pergunta, mensagens);
      const rotaDireta = continuacao || cargaDireta || modoRelatorioRef.current || apresentacaoRef.current ? null : receitaDaRota(pergunta, mensagens);
      let receita = campoDireto ?? cargaDireta ?? continuacao ?? rotaDireta ?? (modoRelatorioRef.current || apresentacaoRef.current ? null : receitaPronta?.length ? receitaPronta : receitaSalva(pergunta));
      if (!rotaDireta && !receita && !apresentacaoRef.current) {
        const respReceita = await fetch(
          `${api}/api/receitas?email=${encodeURIComponent(email)}&visao=${encodeURIComponent(admin ? visao : setor)}&pergunta=${encodeURIComponent(pergunta)}`,
        );
        const dadosReceita = await respReceita.json().catch(() => null);
        if (Array.isArray(dadosReceita?.receita) && dadosReceita.receita.length) receita = dadosReceita.receita;
      }
      if (/\btaxa\b/i.test(textoVisivel(pergunta)) && receita?.some((passo) => passo.nome === "explicar_itens_carga")) receita = null;
      if (
        pedeLog(textoVisivel(pergunta)) &&
        receita &&
        !receita.some((passo) =>
          ["consultar_log", "explicar_itens_carga", "explicar_campo_livre", "monitoramentos_alterados", "log_recente"].includes(passo.nome),
        )
      ) {
        receita = null;
      }
      const containersDiretos = numerosContainer(pergunta);
      const idsDiretos = idsMaritimos(pergunta);
      const taxasDiretas = idsTaxa(textoVisivel(pergunta));
      if (!receita && pedeLog(textoVisivel(pergunta)) && (containersDiretos.length || idsDiretos.length || taxasDiretas.length)) {
        setStatus("Consultando o log…");
        historico = [...historico, { role: "assistant", content: "Estou consultando o log." }];
        setMensagens(historico);
        const args = taxasDiretas.length
          ? { ...argsLogDosIds(taxasDiretas, pergunta), tabela: "mov_Logistica_Taxa", campo_chave: "IdLogistica_Taxa" }
          : containersDiretos.length
            ? argsLogDosContainers(containersDiretos, pergunta)
            : argsLogDosIds(idsDiretos, pergunta);
        const resultado = await executar("consultar_log", args, controle.signal);
        const bruto = capturarLog();
        const log = bruto ? restringirAoProcesso(bruto, pergunta) : null;
        const resposta: Extract<Mensagem, { role: "assistant" }> = {
          role: "assistant",
          content: log ? resumoDoLog(log) : resultado,
          duracaoMs: duracaoConsulta(),
          ...(log ? { log } : {}),
        };
        historico = [...historico.slice(0, -1), resposta];
        setMensagens(historico);
        setErro("");
        avisarConclusao(resposta.content, false);
        return;
      }
      if (receita) {
        setStatus("Consultando…");
        const partes: string[] = [];
        const brutos: { nome: string; args: Record<string, unknown>; resultado: string }[] = [];
        let falhou = false;
        for (const passo of receita) {
          if (canceladoRef.current) throw new DOMException("Cancelado", "AbortError");
          setStatus(`${ROTULO_FERRAMENTA[passo.nome] ?? "Consultando"}…`);
          const args = passo.nome === "consultar_log" ? completarConsultaLog(passo.args, pergunta) : passo.args;
          const resultado = await executar(passo.nome, args, controle.signal);
          if (resultado.startsWith("Erro:")) {
            if (rotaDireta || continuacao) {
              historico = [...historico, { role: "assistant", content: resultado.replace(/^Erro:\s*/, ""), duracaoMs: duracaoConsulta() }];
              setMensagens(historico);
              setErro("");
              return;
            }
            falhou = true;
            break;
          }
          brutos.push({ nome: passo.nome, args, resultado });
          const secao = secaoDaFerramenta(passo.nome, resultado);
          if (secao) secoesDaPergunta.push(secao);
          if (passo.nome === "consultar_log") {
            const log = capturarLog();
            if (log) logDaPergunta = restringirAoProcesso(log, pergunta);
          }
          if (passo.nome === "explicar_campo_livre") {
            const log = logEmbutido(resultado);
            if (log) logDaPergunta = log;
          }
          const pronto = textoDaConsulta(resultado);
          if (pronto) partes.push(pronto);
        }
        if (!falhou && partes.length) {
          const content = graficoSePedido(partes.join("\n\n"), `${pergunta}\n${perguntaAberta(mensagens)}`);
          const resposta: Extract<Mensagem, { role: "assistant" }> = { role: "assistant", content, duracaoMs: duracaoConsulta() };
          if (relatorioGrande(secoesDaPergunta)) {
            resposta.relatorio = { titulo: pergunta.replace(/\s+/g, " ").slice(0, 90), secoes: secoesDaPergunta };
          }
          if (logDaPergunta) resposta.log = logDaPergunta;
          const rastros: Mensagem[] = brutos.flatMap((item, indice) => {
            const id = `receita-${indice}`;
            return [
              {
                role: "assistant" as const,
                content: "",
                tool_calls: [{ id, type: "function" as const, function: { name: item.nome, arguments: JSON.stringify(item.args) } }],
              },
              { role: "tool" as const, tool_call_id: id, content: item.resultado },
            ];
          });
          historico = [...historico, ...rastros, resposta];
          setMensagens(historico);
          avisarConclusao(content, false);
          return;
        }
        secoesDaPergunta.length = 0;
        logDaPergunta = null;
      }
      for (let passo = 0; passo < MAX_PASSOS; passo++) {
        setStatus("Pensando…");
        if (canceladoRef.current) throw new DOMException("Cancelado", "AbortError");
        const resp = await fetch(`${api}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          mensagens: historico.map((item) =>
            item.role === "tool" ? { ...item, content: textoDaConsulta(item.content) || item.content } : item,
          ),
          completo,
          relatorio: modoRelatorioRef.current,
          apresentacao: apresentacaoRef.current,
          email,
          nome,
          visao: admin ? visao : setor,
        }),
          signal: controle.signal,
        });
        if (!resp.ok || !resp.body) {
          const dados = await resp.json().catch(() => ({}));
          throw new Error(dados.erro || "Falha ao falar com a IA");
        }
        const leitor = resp.body.getReader();
        const decodificar = new TextDecoder();
        let resto = "";
        let parcial = "";
        let resposta: Extract<Mensagem, { role: "assistant" }> | null = null;
        while (true) {
          const { done, value } = await leitor.read();
          if (done) break;
          resto += decodificar.decode(value, { stream: true });
          const blocos = resto.split("\n\n");
          resto = blocos.pop() ?? "";
          for (const bloco of blocos) {
            const linha = bloco.split("\n").find((l) => l.startsWith("data: "));
            if (!linha) continue;
            const evento = JSON.parse(linha.slice(6)) as {
              tipo: string;
              texto?: string;
              erro?: string;
              mensagem?: Extract<Mensagem, { role: "assistant" }>;
            };
            if (evento.tipo === "erro") throw new Error(evento.erro || "Falha ao falar com a IA");
            if (evento.tipo === "texto" && evento.texto) {
              parcial += evento.texto;
              if (modoRelatorioRef.current) {
                setStatus("Montando o relatório…");
              } else {
                setStatus("Escrevendo…");
                const visivel = semBlocoAberto(parcial);
                if (visivel.trim() && !temCartao(visivel)) setMensagens([...historico, { role: "assistant", content: visivel }]);
              }
            }
            if (evento.tipo === "fim" && evento.mensagem) {
              resposta = evento.mensagem;
              if (resposta.uso) {
                gasto.entrada += resposta.uso.entrada;
                gasto.saida += resposta.uso.saida;
                gasto.total += resposta.uso.total;
              }
            }
          }
        }
        if (!resposta) throw new Error("A IA não respondeu.");
        const conteudo = respostaSemPayload((resposta.content?.trim() ? resposta.content : parcial).trim());
        const pedeHistorico = /quem inclu|quem alter|hist[oó]rico|\blog\b|item de carga|mostre d/i.test(textoVisivel(pergunta));
        const containersPedidos = numerosContainer(pedeHistorico ? pergunta : textoVisivel(pergunta));
        const respondeuSql = /^SQL:/m.test(conteudo) || /<PrimaryKeys>\s*<\/PrimaryKeys>/.test(conteudo);
        if (!resposta.tool_calls?.length && containersPedidos.length && !logDaPergunta && (pedeHistorico || respondeuSql) && passo < MAX_PASSOS - 1) {
          historico = [
            ...historico,
            { ...resposta, content: "" },
            {
              role: "user",
              content:
                `Consulte o log em mov_Logistica_Maritima_Container com campo_chave Number e valores ${containersPedidos.join(", ")}. ` +
                "Não responda com SQL e não use eventos de outros containers.",
            },
          ];
          continue;
        }
        if (!resposta.tool_calls?.length && soNomesDeTabela(conteudo) && passo < MAX_PASSOS - 1) {
          historico = [
            ...historico,
            { ...resposta, content: "" },
            {
              role: "user",
              content: "Não liste nomes de tabela. Consulte os registros do processo e responda com os dados.",
            },
          ];
          continue;
        }
        historico = [...historico, { ...resposta, content: conteudo }];
        setMensagens(historico);
        if (!resposta.tool_calls?.length) break;
        const porId = new Map(
          historico.flatMap((m) => (m.role === "tool" ? [[m.tool_call_id, m.content] as const] : [])),
        );
        const jaFeitas = new Map<string, string>(
          historico.flatMap((m) =>
            m.role === "assistant"
              ? (m.tool_calls ?? []).flatMap((chamada) => {
                  const conteudo = porId.get(chamada.id);
                  return conteudo ? [[`${chamada.function.name}\n${chamada.function.arguments}`, conteudo] as const] : [];
                })
              : [],
          ),
        );
        const vistas = new Set<string>();
        const resultados = await Promise.all(
          resposta.tool_calls.map(async (chamada) => {
            const chave = `${chamada.function.name}\n${chamada.function.arguments}`;
            const repetida = jaFeitas.get(chave) ?? (vistas.has(chave) ? "Esta consulta já foi executada nesta pergunta. Use o resultado anterior." : undefined);
            vistas.add(chave);
            if (repetida) return { role: "tool" as const, tool_call_id: chamada.id, content: repetida };
            setStatus(`${ROTULO_FERRAMENTA[chamada.function.name] ?? "Trabalhando"}…`);
            let resultado: string;
            try {
              const args = JSON.parse(chamada.function.arguments || "{}");
              const pedido = [...historico].reverse().find((m) => m.role === "user")?.content ?? "";
              if (chamada.function.name === "consultar_log") {
                Object.assign(args, completarConsultaLog(args, pedido));
                chamada.function.arguments = JSON.stringify(args);
              }
              if (chamada.function.name === "executar_sql" && typeof args.sql === "string") {
                args.sql = sqlComPeriodo(sqlSemRepetir(args.sql), pedido);
              }
              if (canceladoRef.current) throw new DOMException("Cancelado", "AbortError");
              resultado = await executar(chamada.function.name, args, controle.signal);
            } catch (e) {
              if (canceladoRef.current || (e instanceof DOMException && e.name === "AbortError")) throw e;
              resultado = `Erro: ${e instanceof Error ? e.message : String(e)}`;
            }
            if (chamada.function.name === "consultar_log" || chamada.function.name === "resultado_atual") {
              const log = capturarLog();
              const pedido = [...historico].reverse().find((m) => m.role === "user")?.content ?? "";
              if (log) logDaPergunta = restringirAoProcesso(log, pedido);
            }
            if (chamada.function.name === "explicar_campo_livre") {
              const log = logEmbutido(resultado);
              if (log) logDaPergunta = log;
            }
            const secao = secaoDaFerramenta(chamada.function.name, resultado);
            if (secao) secoesDaPergunta.push(secao);
            if (resultado.length > LIMITE_RESULTADO) {
              resultado = enxugarResultado(resultado);
            }
            return { role: "tool" as const, tool_call_id: chamada.id, content: resultado };
          }),
        );
        historico = [...historico, ...resultados];
        setMensagens(historico);
      }
      if (pedeLog(textoVisivel(pergunta)) && !logDaPergunta) {
        const contexto = historico
          .filter((item) => item.role === "user" || item.role === "assistant" || item.role === "tool")
          .map((item) => item.content)
          .join("\n");
        const ids = idsMaritimos(contexto);
        const containers = numerosContainer(pergunta);
        if (ids.length || containers.length) {
          setStatus("Consultando o log…");
          const args = containers.length ? argsLogDosContainers(containers, contexto) : argsLogDosIds(ids, contexto);
          try {
            const resultado = await executar("consultar_log", args, controle.signal);
            const log = capturarLog();
            if (log) logDaPergunta = restringirAoProcesso(log, contexto);
            historico = [
              ...historico,
              {
                role: "assistant",
                content: "",
                tool_calls: [{ id: "log-direto", type: "function", function: { name: "consultar_log", arguments: JSON.stringify(args) } }],
              },
              { role: "tool", tool_call_id: "log-direto", content: resultado },
            ];
          } catch (erro) {
            if (canceladoRef.current || (erro instanceof DOMException && erro.name === "AbortError")) throw erro;
          }
        }
      }
      let corte = 0;
      for (let i = historico.length - 1; i >= 0; i--) {
        if (historico[i].role === "user" && historico[i].content === pergunta) {
          corte = i;
          break;
        }
      }
      const ultima = [...historico.slice(corte + 1)].reverse().find((m) => m.role === "assistant" && m.content.trim());
      if (!ultima && logDaPergunta) {
        const resposta: Extract<Mensagem, { role: "assistant" }> = {
          role: "assistant",
          content: resumoDoLog(logDaPergunta),
          log: logDaPergunta,
          duracaoMs: duracaoConsulta(),
        };
        historico = [...historico, resposta];
        setMensagens(historico);
        setErro("");
        avisarConclusao(resposta.content, false);
        return;
      }
      if (!ultima) {
        const daFerramenta = [...historico.slice(corte + 1)]
          .reverse()
          .filter((item) => item.role === "tool")
          .map((item) => cartaoDaFerramenta(item.content) || textoDaConsulta(item.content))
          .find((item) => item && !item.startsWith("Erro:"));
        if (daFerramenta) {
          const resposta: Extract<Mensagem, { role: "assistant" }> = {
            role: "assistant",
            content: daFerramenta,
            duracaoMs: duracaoConsulta(),
          };
          historico = [...historico, resposta];
          setMensagens(historico);
          setErro("");
          avisarConclusao(resposta.content, false);
          return;
        }
        if (entregarDados()) return;
        throw new Error("A consulta terminou sem texto. Tente de novo.");
      }
      if (ultima.role === "assistant") {
        const formatado = textoItensDaRodada(historico, pergunta) || textoRotaDaRodada(historico, pergunta) || textoDocumentalDaRodada(historico, pergunta);
        if (formatado) ultima.content = formatado;
        else ultima.content = respostaSemPayload(ultima.content);
        const cartao = historico
          .slice(corte + 1)
          .filter((item) => item.role === "tool")
          .map((item) => cartaoDaFerramenta(item.content))
          .reverse()
          .find(Boolean);
        if (cartao) ultima.content = cartao;
        else if (temCartao(ultima.content)) {
          const limpo = normalizarCartoes(ultima.content).trim();
          ultima.content = limpo || "Não consegui montar o cartão desta consulta. Tente de novo.";
        }
        if (gasto.total > 0) ultima.uso = gasto;
        ultima.duracaoMs = duracaoConsulta();
        if (modoRelatorioRef.current && secoesDaPergunta.length) {
          const ultimaSecao = secoesDaPergunta[secoesDaPergunta.length - 1];
          ultima.relatorio = {
            titulo: pergunta.replace(/\s+/g, " ").slice(0, 90),
            secoes: [ultimaSecao],
          };
          ultima.pedidoRelatorio = true;
        } else if (relatorioGrande(secoesDaPergunta)) {
          ultima.relatorio = {
            titulo: pergunta.replace(/\s+/g, " ").slice(0, 90),
            secoes: secoesDaPergunta,
          };
          ultima.detalheNoChat = completo;
        }
        const explicacao = textoItensDaRodada(historico, pergunta);
        if (explicacao) ultima.content = explicacao;
        else if (logDaPergunta) {
          ultima.log = logDaPergunta;
          ultima.content = resumoDoLog(logDaPergunta);
        }
        const novas = receitasDaConversa(historico).filter((item) => !pedeLog(textoVisivel(pergunta)) || item.nome === "consultar_log");
        if (novas.length) {
          guardarReceita(pergunta, novas);
          void fetch(`${api}/api/receitas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, visao: admin ? visao : setor, pergunta, ferramentas: novas }),
          });
        }
        setMensagens([...historico]);
        if (/j[aá] salvei|prefer[eê]ncia salva|guardei (essa|a) prefer/i.test(ultima.content)) {
          const gravou = historico.some((item) => item.role === "tool" && item.content === "Preferência salva.");
          if (!gravou) {
            const regra = ultima.content.replace(/^[\s\S]*?prefer[eê]ncia:\s*/i, "").replace(/\s+/g, " ").trim().slice(0, 400);
            const termo = (regra || pergunta).slice(0, 80);
            await fetch(`${api}/api/memoria`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, acao: "lembrar", termo, observacao: regra || pergunta }),
            });
            void carregarMemoria();
          }
        }
      }
      avisarConclusao(ultima.content, false);
    } catch (e) {
      const cancelada = canceladoRef.current || (e instanceof DOMException && e.name === "AbortError");
      if (cancelada) {
        historico = [...historico, { role: "assistant", content: "Consulta cancelada.", duracaoMs: duracaoConsulta() }];
        setMensagens(historico);
        setErro("");
        return;
      }
      if (entregarDados()) return;
      const mensagem = e instanceof Error ? e.message : "Falha ao falar com a IA";
      if (/acesso à IA foi removido/i.test(mensagem)) {
        onAcessoRemovido?.();
        return;
      }
      setErro(mensagem);
      void fetch(`${api}/api/falhas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, visao: admin ? visao : setor, pergunta, motivo: mensagem }),
      });
      avisarConclusao(mensagem, true);
    } finally {
      const id = conversaIdRef.current;
      if (id) void gravarConversa(id, historico).then(() => atualizarConversas());
      setOcupado(false);
      setStatus("");
    }
  }

  const rodape = !visivel ? (
    <button
      type="button"
      className={`chat-bolinha nao-imprimir${ocupado ? " ocupada" : ""}${aviso?.erro ? " falhou" : aviso ? " pronta" : ""}`}
      onClick={voltarDoFundo}
      title={ocupado ? status || "Consulta em andamento" : aviso ? (aviso.erro ? "A consulta falhou" : "Consulta pronta") : "Voltar ao chat"}
      aria-label={ocupado ? status || "Consulta em andamento" : "Voltar ao chat"}
    >
      <img src={logoMaicon} alt="" />
    </button>
  ) : null;

  if (!visivel) return rodape;

  const blocos = blocosDaConversa(mensagens);
  const trechosBusca = palavrasDaBusca(buscaTexto).length
    ? blocos.flatMap((bloco, indice) => {
        const texto = textoParaBusca(bloco.mensagem.content);
        if (!textoCombina(texto, buscaTexto)) return [];
        return [{ indice, quem: bloco.mensagem.role === "user" ? "Você" : "Assistente", trecho: trechoDaBusca(texto, buscaTexto) }];
      })
    : [];

  return (
    <div
      className={`chat-fundo nao-imprimir${fixo || telaCheia ? " tela-cheia" : ""}${fixo ? " pagina" : ""}`}
      onClick={telaCheia ? (e) => { if (e.target === e.currentTarget) onFechar(); } : undefined}
    >
      {fixo ? (
        <aside className={`chat-lateral${lateralRecolhida ? " recolhida" : ""}`}>
          <div className="chat-lateral-topo">
            <img src={logoConline} alt="Conline" />
            <button
              type="button"
              className="chat-lateral-recolher"
              title={lateralRecolhida ? "Abrir menu" : "Recolher menu"}
              onClick={() => {
                setLateralRecolhida((atual) => {
                  sessionStorage.setItem("maicon-lateral", atual ? "0" : "1");
                  return !atual;
                });
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M9 4.5v15" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
          {telaLateral === "conversas" || configAberta || memoriaAberta ? (
            <button
              type="button"
              className="chat-lateral-voltar"
              title="Voltar"
              onClick={() => {
                setTelaLateral("menu");
                setMemoriaAberta(false);
                setConfigAberta(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 6.5 9 12l5.5 5.5" />
              </svg>
              {lateralRecolhida ? null : <span>Voltar</span>}
            </button>
          ) : null}
          {!lateralRecolhida && telaLateral === "conversas" ? (
            <>
              <button
                type="button"
                disabled={ocupado}
                title="Nova conversa"
                onClick={() => {
                  setTelaLateral("menu");
                  novaConversa();
                }}
              >
                <Icone nome="novo" tamanho={16} />
                <span>Nova conversa</span>
              </button>
              <div className="chat-conversas-topo">
                <p>Conversas</p>
                {conversas.length > 0 ? (
                  <button type="button" className="chat-limpar" disabled={ocupado} onClick={() => void limparConversas()}>
                    Limpar todas
                  </button>
                ) : null}
              </div>
              <ul className="chat-lateral-conversas">
                {conversas.length === 0 ? <li className="chat-historico-vazio">Nenhuma conversa salva</li> : null}
                {conversas.map((item) => (
                  <li key={item.id}>
                    <button type="button" className={item.id === conversaId ? "ativo" : ""} onClick={() => void abrirConversa(item.id)}>
                      {item.titulo}
                    </button>
                    <button type="button" className="chat-excluir" title="Excluir conversa" onClick={() => void excluirConversa(item.id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
          {admin ? (
            <div className="chat-lateral-visao">
              <button type="button" className="chat-visoes-toggle" onClick={() => setVisoesAbertas((atual) => !atual)}>
                <span>Setores</span>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden className={visoesAbertas ? "aberta" : ""}>
                  <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              {visoesAbertas ? (
                <ul>
                  {(
                    [
                      ["comercial", "Comercial"],
                      ["operacional", "Operacional"],
                      ["documental", "Documental"],
                      ["financeiro", "Financeiro"],
                      ["gerencia", "Gerência"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <li key={valor}>
                      <button type="button" className={visao === valor || (valor === "comercial" && visao === "inside") ? "ativo" : ""} onClick={() => onVisao?.(valor)}>
                        {rotulo}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p>Equipe</p>
              <ul>
                <li>
                  <button type="button" className={visao === "ti" ? "ativo" : ""} onClick={() => onVisao?.("ti")}>
                    TI
                  </button>
                </li>
              </ul>
            </div>
          ) : null}
          <p>Conta</p>
          <ul className="chat-lateral-menu">
            <li>
              <button
                type="button"
                disabled={ocupado}
                title="Nova conversa"
                onClick={() => {
                  setTelaLateral("menu");
                  novaConversa();
                }}
              >
                <Icone nome="novo" tamanho={16} />
                <span>Nova conversa</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={inicioAberto ? "ativo" : ""}
                title="Início"
                onClick={() => {
                  setConfigAberta(false);
                  setMemoriaAberta(false);
                  setInicioAberto(true);
                  setTelaLateral("menu");
                }}
              >
                <Icone nome="painel" tamanho={16} />
                <span>Início</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled={ocupado}
                title="Sou novo por aqui"
                onClick={() => {
                  modoRelatorioRef.current = false;
                  apresentacaoRef.current = true;
                  conversaIdRef.current = null;
                  setConversaId(null);
                  setMensagens([]);
                  setConsultaAberta(null);
                  setMemoriaAberta(false);
                  setConfigAberta(false);
                  setTelaLateral("menu");
                  void enviar("Sou novo por aqui. Me apresente o que você pode fazer e tire dúvidas sobre o sistema.");
                }}
              >
                <Icone nome="novoAqui" tamanho={16} />
                <span>Sou novo por aqui</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                title="Conversas"
                onClick={() => {
                  if (lateralRecolhida) {
                    setLateralRecolhida(false);
                    sessionStorage.setItem("maicon-lateral", "0");
                  }
                  setTelaLateral("conversas");
                }}
              >
                <Icone nome="conversas" tamanho={16} />
                <span>Conversas</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={sobreTela ? "ativo" : ""}
                title="Abrir um chat menor sobre os outros apps"
                onClick={rodarEmSegundoPlano}
              >
                <Icone nome="fundo" tamanho={16} />
                <span>Sobre a tela</span>
              </button>
            </li>
            {admin ? (
              <li>
                <button
                  type="button"
                  className={memoriaAberta ? "ativo" : ""}
                  title="Memória"
                  onClick={() => {
                    setConfigAberta(false);
                    setInicioAberto(false);
                    if (!memoriaAberta) void carregarMemoria();
                    setMemoriaAberta((v) => !v);
                  }}
                >
                  <Icone nome="memoria" tamanho={16} />
                  <span>Memória</span>
                </button>
              </li>
            ) : null}
          </ul>
            </>
          )}
          <div className="chat-lateral-rodape">
            {onSair ? (
              <button type="button" className="chat-lateral-sair" onClick={onSair} title="Sair">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6H6a1 1 0 00-1 1v10a1 1 0 001 1h3" />
                  <path d="M10 12h9" />
                  <path d="M16 8l4 4-4 4" />
                </svg>
                {lateralRecolhida ? null : <span>Sair</span>}
              </button>
            ) : null}
            {admin ? (
              <button
                type="button"
                className={`chat-lateral-config${configAberta ? " ativo" : ""}`}
                title="Configurações"
                aria-label="Configurações"
                onClick={() => {
                  setMemoriaAberta(false);
                  setInicioAberto(false);
                  setConfigAberta((v) => !v);
                  void carregarChaves();
                  void carregarContas();
                  void fetch(`${api}/api/revisao?email=${encodeURIComponent(email)}`)
                    .then((resp) => resp.json())
                    .then((dados) => {
                      const falhas = Array.isArray(dados.falhas) ? dados.falhas : [];
                      const ruins = (Array.isArray(dados.avaliacoes) ? dados.avaliacoes : []).map(
                        (item: { email: string; pergunta: string; comentario: string }) => ({
                          email: item.email,
                          pergunta: item.pergunta,
                          motivo: `👎 ${item.comentario || "Marcada como errada, sem comentário."}`,
                          regra: item.comentario,
                        }),
                      );
                      setFalhasSemana([...ruins, ...falhas]);
                      setPlacar(Array.isArray(dados.placar) ? dados.placar : []);
                    })
                    .catch(() => setFalhasSemana([]));
                }}
              >
                <Icone nome="config" tamanho={16} />
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}
      <div className={`chat-janela${inicioAberto ? " inicio-ativa" : ""}`} role="dialog" aria-label={inicioAberto ? "Início" : "Assistente IA"}>
        <header className="chat-cab">
          <div className="chat-identidade">
            <div>
              <div className="chat-titulo-linha">
                <strong>{inicioAberto ? "Início" : fixo ? "Maicon AI" : "Assistente IA"}</strong>
              </div>
              {fixo ? (
                <span className="chat-papel">
                  {!acessoConfirmado
                    ? "Confirmando acesso"
                    : admin && visao === "financeiro"
                      ? "Financeiro"
                      : admin && visao === "gerencia"
                        ? "Gerência"
                      : admin && visao === "ti"
                        ? "TI"
                      : admin && visao === "documental"
                        ? "Documental"
                        : admin && visao === "operacional"
                          ? "Operacional"
                          : admin && (visao === "comercial" || visao === "inside")
                            ? "Comercial"
                        : admin
                          ? "Administrador"
                          : setor === "operacional"
                              ? modalidade
                                ? `Operacional ${modalidade}`
                                : "Operacional"
                              : setor === "documental"
                                ? "Documental"
                                : setor === "financeiro"
                                  ? "Financeiro"
                                : setor === "gerencia"
                                  ? "Gerência"
                                : setor === "comercial" || setor === "inside"
                                  ? "Comercial"
                                  : "Acesso limitado"}
                </span>
              ) : null}
            </div>
          </div>
          {!inicioAberto ? (
            <div className={`chat-busca${buscaAberta ? " aberta" : ""}`} ref={buscaCaixaRef}>
                {buscaAberta ? (
                  <>
                    <label className="chat-busca-campo">
                      <Icone nome="busca" tamanho={15} />
                      <input
                        ref={buscaRef}
                        value={buscaTexto}
                        placeholder="Buscar nesta conversa"
                        aria-label="Buscar palavras nesta conversa"
                        onChange={(e) => setBuscaTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setBuscaAberta(false);
                            setBuscaTexto("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        title="Fechar busca"
                        onClick={() => {
                          setBuscaAberta(false);
                          setBuscaTexto("");
                        }}
                      >
                        ×
                      </button>
                    </label>
                    <ul className="chat-busca-lista">
                      {!palavrasDaBusca(buscaTexto).length ? <li className="vazio">Digite uma palavra desta conversa</li> : null}
                      {palavrasDaBusca(buscaTexto).length && trechosBusca.length === 0 ? <li className="vazio">Nenhuma mensagem com essas palavras</li> : null}
                      {trechosBusca.map((item) => (
                        <li key={item.indice}>
                          <button
                            type="button"
                            className={buscaAlvo === item.indice ? "ativo" : ""}
                            onClick={() => {
                              setBuscaAlvo(item.indice);
                              document.getElementById(`chat-msg-${item.indice}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                              setBuscaAberta(false);
                            }}
                          >
                            <strong>{item.trecho}</strong>
                            <small>{item.quem}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <button type="button" className="chat-acao" title="Pesquisar nesta conversa" onClick={() => setBuscaAberta(true)}>
                    <Icone nome="busca" tamanho={16} />
                    <span>Pesquisar nesta conversa</span>
                  </button>
                )}
              </div>
            ) : null}
          <div className="chat-cab-acoes">
            {ocupado ? (
              <button type="button" className="chat-acao chat-cancelar-acao" onClick={cancelarConsulta} title="Cancelar a consulta">
                <span>Cancelar</span>
              </button>
            ) : null}
            {ocupado ? (
              <button type="button" className="chat-acao" onClick={rodarEmSegundoPlano} title="Deixar a consulta numa bolinha no canto da tela">
                <Icone nome="fundo" tamanho={16} />
                <span>Segundo plano</span>
              </button>
            ) : null}
            {fixo ? (
              <div className="chat-cab-perfil">
                <em>
                  <b>
                    <label className="chat-tema-toggle" title={temaClaro ? "Modo escuro" : "Modo claro"}>
                      <input
                        className="chat-tema-input"
                        type="checkbox"
                        checked={temaClaro}
                        aria-label={temaClaro ? "Ativar modo escuro" : "Ativar modo claro"}
                        onChange={() => {
                          const claro = !temaClaro;
                          document.documentElement.classList.toggle("tema-claro", claro);
                          document.documentElement.classList.toggle("tema-escuro", !claro);
                          localStorage.setItem("maicon-tema", claro ? "claro" : "escuro");
                          setTemaClaro(claro);
                        }}
                      />
                      <svg className="chat-tema-icon chat-tema-icon--moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <path fill="currentColor" d="M16 13.2A6.2 6.2 0 0 1 9.4 6 6.5 6.5 0 1 0 16.8 14a6 6 0 0 1-.8-.8z" />
                      </svg>
                      <svg className="chat-tema-icon chat-tema-icon--sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <circle cx="12" cy="12" r="4" fill="currentColor" />
                        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
                      </svg>
                    </label>
                    {nome.trim() || email}
                  </b>
                  {new Date().toLocaleDateString("pt-BR")}
                </em>
                {foto ? (
                  <img src={foto} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(nome || email || "?").slice(0, 1).toUpperCase()}</span>
                )}
              </div>
            ) : (
              <>
                {admin ? (
                  <button
                    type="button"
                    className={`chat-acao chat-acao-cheia${configAberta ? " ativo" : ""}`}
                    onClick={() => {
                      setMemoriaAberta(false);
                      setConfigAberta((v) => !v);
                      void carregarChaves();
                      void carregarContas();
                    }}
                    title="Chaves de IA"
                  >
                    <Icone nome="config" tamanho={16} />
                    <span>Configurações</span>
                  </button>
                ) : null}
                <button type="button" className="chat-acao icone" onClick={onFechar} title="Fechar (Esc)">
                  <Icone nome="fechar" tamanho={18} />
                </button>
              </>
            )}
          </div>
        </header>

        {contaAberta ? (
          <div className="chat-modal" onClick={() => setContaAberta(null)}>
            <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
              <header>
                <div>
                  <strong>{contaAberta.nome || contaAberta.email}</strong>
                  <small>{contaAberta.email}</small>
                </div>
                <button type="button" className="chat-acao icone" onClick={() => setContaAberta(null)} title="Fechar">
                  <Icone nome="fechar" tamanho={18} />
                </button>
              </header>
              <label className="chat-conta-papel">
                Papel
                <select
                  value={contaAberta.adminFixo ? "admin" : contaAberta.papel}
                  disabled={contaAberta.adminFixo}
                  onChange={(e) => alterarConta({ papel: e.target.value })}
                >
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <label className="chat-conta-papel">
                Setor
                <select
                  value={contaAberta.setorManual || "auto"}
                  disabled={contaAberta.adminFixo}
                  onChange={(e) => alterarConta({ setorManual: e.target.value })}
                >
                  <option value="auto">Automático, pelo cargo</option>
                  <option value="inside">Inside sales</option>
                  <option value="comercial">Vendedor</option>
                  <option value="operacional">Operacional</option>
                  <option value="documental">Documental</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="gerencia">Gerência (todos os setores)</option>
                </select>
              </label>
              <label className="chat-conta-papel">
                Operação
                <select
                  value={contaAberta.modalidadeManual || "auto"}
                  disabled={contaAberta.adminFixo || contaAberta.papel === "admin"}
                  onChange={(e) => alterarConta({ modalidadeManual: e.target.value })}
                >
                  <option value="auto">Automática, pelos processos</option>
                  <option value="todas">Todas (IA, EA, IM e EM)</option>
                  <option value="IA">IA — importação aérea</option>
                  <option value="EA">EA — exportação aérea</option>
                  <option value="IM">IM — importação marítima</option>
                  <option value="EM">EM — exportação marítima</option>
                </select>
              </label>
              <div className="chat-conta-grupo">
                <span>Pode ver</span>
                <div className="chat-conta-opcoes">
                  {(
                    [
                      ["verLog", "Log"],
                      ["verMemoria", "Memória"],
                      ["verPendencias", "Pendências"],
                      ["verConsulta", "Consulta SQL"],
                      ["fazerRelatorio", "Ver relatórios"],
                    ] as const
                  ).map(([campo, rotulo]) => (
                    <label key={campo} className="chat-conta-opcao">
                      <input
                        type="checkbox"
                        checked={contaAberta.papel === "admin" || contaAberta[campo]}
                        disabled={contaAberta.adminFixo || contaAberta.papel === "admin"}
                        onChange={(e) => alterarConta({ [campo]: e.target.checked })}
                      />
                      {rotulo}
                    </label>
                  ))}
                </div>
              </div>
              <div className="chat-conta-grupo">
                <span>Pode fazer</span>
                <div className="chat-conta-opcoes">
                  {(
                    [
                      ["fazerLog", "Solicitar log"],
                      ["fazerMemoria", "Gravar memória"],
                      ["fazerSql", "SQL livre"],
                      ["fazerExcel", "Extrair Excel"],
                    ] as const
                  ).map(([campo, rotulo]) => (
                    <label key={campo} className="chat-conta-opcao">
                      <input
                        type="checkbox"
                        checked={campo === "fazerExcel" ? Boolean(contaAberta.fazerExcel) : contaAberta.papel === "admin" || contaAberta[campo]}
                        disabled={campo === "fazerExcel" ? false : contaAberta.adminFixo || contaAberta.papel === "admin"}
                        onChange={(e) => alterarConta({ [campo]: e.target.checked })}
                      />
                      {rotulo}
                    </label>
                  ))}
                </div>
              </div>
              <div className="chat-modal-acoes">
                {contaAberta.adminFixo || contaAberta.email === email ? (
                  <small>{contaAberta.adminFixo ? "Administrador fixo" : "Sua conta"}</small>
                ) : (
                  <button type="button" className="chat-acao chat-acao-perigo" onClick={() => setContaExcluir(contaAberta)}>
                    Excluir usuário
                  </button>
                )}
                <button type="button" className="chat-acao" onClick={() => void salvarConta(contaAberta)}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {contaExcluir ? (
          <div className="chat-modal chat-confirma-fundo" onClick={() => setContaExcluir(null)}>
            <div
              className="chat-modal-card chat-confirma"
              role="dialog"
              aria-label="Excluir usuário"
              onClick={(e) => e.stopPropagation()}
            >
              <header>
                <div>
                  <strong>Excluir usuário</strong>
                  <small>{contaExcluir.email}</small>
                </div>
              </header>
              <p>O acesso de {contaExcluir.nome || contaExcluir.email} à IA será encerrado.</p>
              <div className="chat-confirma-acoes">
                <button type="button" className="chat-acao" onClick={() => setContaExcluir(null)}>
                  Cancelar
                </button>
                <button type="button" className="chat-acao chat-acao-perigo" onClick={() => void excluirConta(contaExcluir)}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {configAberta ? (
          <div className="chat-mensagens">
            <div className="chat-coluna">
              <section className="chat-secao">
                <div className="chat-memoria-topo">
                  <h3>Gerenciar permissões e usuários</h3>
                  <p>Clique em uma pessoa para definir o papel e o que ela pode ver e fazer.</p>
                </div>
                <div className="chat-contas-busca">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                    <circle cx="10.5" cy="10.5" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M15.2 15.2L20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    value={filtroContas}
                    placeholder="Procurar por nome ou e-mail"
                    onChange={(e) => setFiltroContas(e.target.value)}
                  />
                </div>
                <ul className="chat-contas">
                  {(() => {
                    const termo = filtroContas.trim().toLowerCase();
                    const visiveis = termo
                      ? contas.filter((conta) => `${conta.nome} ${conta.email}`.toLowerCase().includes(termo))
                      : contas;
                    if (!visiveis.length) {
                      return <li className="chat-historico-vazio">Nenhum usuário com esse filtro</li>;
                    }
                    return visiveis.map((conta) => {
                      const nome = conta.nome?.trim();
                      const repetido = !nome || nome.toLowerCase() === conta.email.toLowerCase();
                      return (
                        <li key={conta.email}>
                          <button type="button" className="chat-conta-linha" onClick={() => setContaAberta({ ...conta })}>
                            <span className="chat-conta-avatar">{(nome || conta.email).slice(0, 1).toUpperCase()}</span>
                            <span>
                              <strong>{repetido ? conta.email : nome}</strong>
                              {repetido ? null : <small>{conta.email}</small>}
                            </span>
                            <em>
                              {conta.adminFixo || conta.papel === "admin" ? "Administrador" : "Usuário"}
                              {conta.setorManual === "inside" ? " · Inside" : conta.setorManual === "comercial" ? " · Vendedor" : conta.setorManual === "operacional" ? ` · Operacional${["IA", "EA", "IM", "EM"].includes(conta.modalidadeManual || "") ? ` ${conta.modalidadeManual}` : conta.modalidadeManual === "todas" ? " · todas" : ""}` : conta.setorManual === "documental" ? " · Documental" : conta.setorManual === "financeiro" ? " · Financeiro" : conta.setorManual === "gerencia" ? " · Gerência" : ""}
                            </em>
                          </button>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </section>
              <section className="chat-secao">
              <div className="chat-memoria-topo">
                <h3>Chaves de IA</h3>
                <p>Se a chave em uso estourar o limite, a próxima da lista é usada na mesma pergunta.</p>
              </div>
              <ul className="chat-chaves">
                {chaves.length === 0 ? <li>Nenhuma chave cadastrada. A do servidor continua valendo.</li> : null}
                {chaves.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.rotulo || item.provedor}</strong>
                      <small>{item.provedor} · ····{item.final}</small>
                    </span>
                    <button type="button" className="chat-acao" onClick={() => void removerChave(item.id)}>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="chat-memoria-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void salvarChave();
                }}
              >
                <select value={novaChave.provedor} onChange={(e) => setNovaChave({ ...novaChave, provedor: e.target.value })}>
                  <option value="gemini">Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Beam</option>
                </select>
                <input
                  value={novaChave.rotulo}
                  placeholder="Nome, opcional"
                  onChange={(e) => setNovaChave({ ...novaChave, rotulo: e.target.value })}
                />
                <input
                  value={novaChave.chave}
                  placeholder="Cole a chave da API"
                  type="password"
                  autoComplete="off"
                  onChange={(e) => setNovaChave({ ...novaChave, chave: e.target.value })}
                />
                <button type="submit" className="chat-acao" disabled={!novaChave.chave.trim()}>
                  Adicionar chave
                </button>
              </form>
              <div className="chat-memoria-topo">
                <h3>Revisão da semana</h3>
                <p>Perguntas que falharam ou foram marcadas com 👎 nos últimos 7 dias. Use "Virar regra" para a IA seguir a correção com todos.</p>
                {placar.length ? (
                  <p className="chat-placar">
                    {placar.map((item) => (
                      <span key={item.visao}>
                        {item.visao}: 👍 {item.boas} · 👎 {item.ruins}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              <ul className="chat-memoria">
                {falhasSemana.length === 0 ? <li>Nenhuma falha registrada nesta semana.</li> : null}
                {falhasSemana.map((item, indice) => (
                  <li key={`${item.email}-${indice}`}>
                    <div>
                      <strong>{item.pergunta}</strong>
                      <span>{item.motivo}</span>
                      <small>{item.email}</small>
                    </div>
                    {item.regra ? (
                      <button
                        type="button"
                        className="chat-ver-consulta"
                        disabled={promovidas.includes(indice)}
                        onClick={() => {
                          setPromovidas((atual) => [...atual, indice]);
                          void fetch(`${api}/api/memoria`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ observacao: `Em pedidos como "${item.pergunta}": ${item.regra}` }),
                          });
                        }}
                      >
                        {promovidas.includes(indice) ? "Virou regra" : "Virar regra"}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              </section>
            </div>
          </div>
        ) : memoriaAberta ? (
          <div className="chat-mensagens">
            <div className="chat-coluna">
              <div className="chat-memoria-topo">
                <h3>Memória do assistente</h3>
                <p>
                  Preferências que a IA segue em todas as conversas. Só o administrador grava. Para ensinar algo novo, diga no chat, por exemplo:
                  <em> "quando eu falar house, use a mov_Logistica_House"</em>.
                </p>
              </div>
              <form
                className="chat-memoria-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void salvarMemoria();
                }}
              >
                <label>
                  <span>Termo</span>
                  <input
                    placeholder="house"
                    value={rascunho.termo}
                    onChange={(e) => setRascunho({ ...rascunho, termo: e.target.value })}
                  />
                </label>
                <label>
                  <span>Tabela</span>
                  <input
                    placeholder="mov_Logistica_House"
                    value={rascunho.tabela}
                    onChange={(e) => setRascunho({ ...rascunho, tabela: e.target.value })}
                  />
                </label>
                <label>
                  <span>Campo chave</span>
                  <input
                    placeholder="IdLogistica_House"
                    value={rascunho.campo}
                    onChange={(e) => setRascunho({ ...rascunho, campo: e.target.value })}
                  />
                </label>
                <label className="chat-memoria-obs">
                  <span>Observação</span>
                  <input
                    placeholder="Quando usar essa tabela"
                    value={rascunho.observacao}
                    onChange={(e) => setRascunho({ ...rascunho, observacao: e.target.value })}
                  />
                </label>
                <div className="chat-memoria-form-acoes">
                  <button type="submit">
                    {editando == null ? "Adicionar" : "Salvar"}
                  </button>
                  {editando != null ? (
                    <button type="button" className="chat-memoria-cancelar" onClick={limparRascunho}>
                      Cancelar
                    </button>
                  ) : null}
                </div>
                {erroMemoria ? <p className="chat-erro">{erroMemoria}</p> : null}
              </form>
              {preferencias.length === 0 ? <p className="chat-vazio-texto">Nenhuma preferência salva ainda.</p> : null}
              <ul className="chat-memoria">
                {preferencias.map((p, i) => (
                  <li key={`${p.termo}-${i}`}>
                    <div>
                      <div className="chat-memoria-regra">
                        {p.termo ? <span className="chat-chip">{p.termo}</span> : null}
                        {p.tabela ? (
                          <>
                            <span className="chat-memoria-seta">→</span>
                            <code>{p.tabela}</code>
                          </>
                        ) : null}
                        {p.campo ? <code>{p.campo}</code> : null}
                      </div>
                      {p.observacao ? <span>{p.observacao}</span> : null}
                    </div>
                    <div className="chat-memoria-acoes">
                    <button
                      type="button"
                      className="chat-acao"
                      onClick={() => {
                        setEditando(i);
                        setRascunho({
                          termo: p.termo,
                          tabela: p.tabela,
                          campo: p.campo,
                          observacao: p.observacao,
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button type="button" className="chat-acao" onClick={() => void esquecer(p)}>
                      Esquecer
                    </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="chat-memoria-topo">
                <h3>Glossário</h3>
                <p>Siglas e nomes do negócio que a IA usa em todas as conversas.</p>
              </div>
              <form
                className="chat-glossario-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    const resp = await fetch(`${api}/api/glossario`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, termo: termoGlossario, significado: textoGlossario }),
                    });
                    const dados = await resp.json();
                    if (!resp.ok) {
                      setErroMemoria(dados.erro || "Não salvou o termo.");
                      return;
                    }
                    setGlossario(dados.glossario ?? []);
                    setTermoGlossario("");
                    setTextoGlossario("");
                  })();
                }}
              >
                <label>
                  <span>Termo</span>
                  <input placeholder="house" value={termoGlossario} onChange={(e) => setTermoGlossario(e.target.value)} />
                </label>
                <label>
                  <span>Significado</span>
                  <input placeholder="O que a IA deve entender" value={textoGlossario} onChange={(e) => setTextoGlossario(e.target.value)} />
                </label>
                <button type="submit" disabled={!termoGlossario.trim() || !textoGlossario.trim()}>
                  Salvar termo
                </button>
              </form>
              <ul className="chat-memoria">
                {glossario.map((item) => (
                  <li key={item.termo}>
                    <div>
                      <div className="chat-memoria-regra">
                        <span className="chat-chip">{item.termo}</span>
                        <span>{item.significado}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="chat-acao"
                      onClick={() => {
                        void fetch(`${api}/api/glossario?termo=${encodeURIComponent(item.termo)}&email=${encodeURIComponent(email)}`, { method: "DELETE" }).then(async (resp) => {
                          const dados = await resp.json();
                          if (resp.ok) setGlossario(dados.glossario ?? []);
                        });
                      }}
                    >
                      Esquecer
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : inicioAberto ? (
          <InicioPainel
            api={api}
            email={email}
            nome={nome}
            visao={admin ? visao : setor}
            mostrarFila={pode.pendencias}
            onPerguntar={(pergunta) => {
              setInicioAberto(false);
              void enviar(pergunta);
            }}
          />
        ) : (
          <div className="chat-mensagens">
            <div className="chat-coluna">
              {blocos.length === 0 ? (
                <div className="chat-boas-vindas">
                  <span className="chat-marca">
                    <img src={logoMaicon} alt="" />
                  </span>
                  <h2>Maicon AI</h2>
                  <div className="chat-inicio">
                  <div className="chat-linha">
                    <div className="chat-msg chat-assistant">
                      {(() => {
                        const saudacao = saudacaoInicial(nome || "", null, admin ? visao : setor);
                        return (
                          <p className="chat-saudacao">
                            <b>{saudacao.titulo}</b>
                            <span>{saudacao.detalhe}</span>
                            {saudacao.extra ? <span>{saudacao.extra}</span> : null}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="chat-abertura">
                    {pode.relatorio ? (
                    <div className="chat-abertura-troca" role="tablist" aria-label="Tipo de consulta">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={abaAbertura === "consultas"}
                        className={abaAbertura === "consultas" ? "ativa" : ""}
                        onClick={() => setAbaAbertura("consultas")}
                      >
                        Consultas prontas
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={abaAbertura === "relatorios"}
                        className={abaAbertura === "relatorios" ? "ativa" : ""}
                        onClick={() => setAbaAbertura("relatorios")}
                      >
                        Pedir relatório
                      </button>
                    </div>
                    ) : null}
                    {pode.relatorio && abaAbertura === "relatorios" ? (
                      <>
                        {relatoriosDaVisao(admin ? visao : setor, Boolean(permissoes?.semComissao)).map((grupo) => (
                          <div key={grupo.nome} className="chat-abertura-grupo">
                            <span>{grupo.nome}</span>
                            <div className="chat-abertura-opcoes">
                              {grupo.itens.map((item) => (
                                <button
                                  key={item.titulo}
                                  type="button"
                                  disabled={ocupado}
                                  onClick={() => {
                                    modoRelatorioRef.current = true;
                                    void enviar(item.pergunta);
                                  }}
                                >
                                  <span className="chat-abertura-icone">
                                    <Icone nome={item.icone} tamanho={19} />
                                  </span>
                                  <span className="chat-abertura-texto">
                                    <strong>{item.titulo}</strong>
                                    <small>{item.descricao}</small>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="chat-abertura-grupo">
                          <span>Do seu jeito</span>
                          <div className="chat-abertura-opcoes">
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => {
                                modoRelatorioRef.current = true;
                                void enviar("Pedir relatório");
                              }}
                            >
                              <span className="chat-abertura-icone">
                                <Icone nome="relatorio" tamanho={19} />
                              </span>
                              <span className="chat-abertura-texto">
                                <strong>Montar outro</strong>
                                <small>A IA pergunta o assunto, o período e as colunas, e mostra a tabela no chat.</small>
                              </span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      (admin && visao === "tudo"
                        ? [
                            { nome: "Visão geral", itens: SUGESTOES_SETOR.admin },
                            { nome: "Comercial", itens: SUGESTOES_SETOR.comercial },
                            { nome: "Operacional", itens: SUGESTOES_SETOR.operacional },
                            { nome: "Documental", itens: SUGESTOES_SETOR.documental },
                          ]
                        : [
                            {
                              nome: "",
                              itens:
                                SUGESTOES_SETOR[admin ? (visao === "inside" ? "comercial" : visao) : setor] ??
                                (pode.log ? SUGESTOES : SUGESTOES.filter((s) => s.titulo === "Cliente do processo")),
                            },
                          ]
                      ).map((grupo) => {
                        const itens = grupo.itens.filter((s) => !permissoes?.semComissao || !/comiss/i.test(s.titulo));
                        if (!itens.length) return null;
                        return (
                          <div key={grupo.nome || "atalhos"} className="chat-abertura-grupo">
                            {grupo.nome || !pode.relatorio ? <span>{grupo.nome || "Consultas prontas"}</span> : null}
                            <div className="chat-abertura-opcoes">
                              {comProcesso(
                                itens,
                                painel?.processos?.find((item) => item.processo && !/TESTE|DEMU/i.test(item.processo))?.processo ?? "",
                                modalidade,
                              ).map((s) => (
                                <button key={s.titulo} type="button" onClick={() => void enviar(s.pergunta, s.receita)}>
                                  <span className="chat-abertura-icone">
                                    <Icone nome={s.icone} tamanho={19} />
                                  </span>
                                  <span className="chat-abertura-texto">
                                    <strong>{s.titulo}</strong>
                                    <small>{s.descricao}</small>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  </div>
                </div>
              ) : null}

              {blocos.map((bloco, i) =>
                bloco.mensagem.role === "assistant" &&
                !("log" in bloco.mensagem && bloco.mensagem.log) &&
                !bloco.mensagem.relatorio &&
                !normalizarCartoes(bloco.mensagem.content) ? null : bloco.mensagem.role === "assistant" ? (
                  <div key={i} id={`chat-msg-${i}`} className={`chat-linha${buscaAlvo === i ? " busca-alvo" : ""}`}>
                    <div className="chat-msg chat-assistant">
                      {"log" in bloco.mensagem && bloco.mensagem.log ? (
                        <LogCard log={cartaoDoHistorico(bloco.mensagem.log)} />
                      ) : bloco.mensagem.relatorio &&
                        (("pedidoRelatorio" in bloco.mensagem && bloco.mensagem.pedidoRelatorio) ||
                          /^\s*pedir relat[oó]rio/i.test(
                            blocos
                              .slice(0, i)
                              .reverse()
                              .find((item) => item.mensagem.role === "user")?.mensagem.content ?? "",
                          )) ? null : (
                        <Markdown
                          ocultarSql={!admin}
                          textoCorrido={pediuTextoParaEnviar(
                            blocos
                              .slice(0, i)
                              .reverse()
                              .find((item) => item.mensagem.role === "user")?.mensagem.content ?? "",
                          )}
                          texto={semMençãoPdf(
                            graficoSePedido(
                              respostaSemPayload(bloco.mensagem.content),
                              blocos
                                .slice(0, i)
                                .filter((item) => item.mensagem.role === "user")
                                .map((item) => item.mensagem.content)
                                .join("\n"),
                            ),
                          )}
                        />
                      )}
                      {pode.log && "log" in bloco.mensagem && bloco.mensagem.log ? (
                        <div className="chat-relatorio">
                          <button
                            type="button"
                            className="chat-pdf"
                            onClick={() => {
                              if ("log" in bloco.mensagem && bloco.mensagem.log) onImprimirLog(bloco.mensagem.log);
                            }}
                          >
                            Imprimir histórico
                          </button>
                        </div>
                      ) : null}
                      {pode.relatorio && bloco.mensagem.relatorio && !("log" in bloco.mensagem && bloco.mensagem.log) ? (
                        <RelatorioChatBloco
                          relatorio={bloco.mensagem.relatorio}
                          excel={Boolean(pode.excel)}
                          aberto={forcarDetalhe[i] ?? true}
                          onAlternar={() =>
                            setForcarDetalhe((atual) => ({
                              ...atual,
                              [i]: !(atual[i] ?? true),
                            }))
                          }
                        />
                      ) : null}
                      {bloco.mensagem.content.trim() || bloco.consultas.length || ("duracaoMs" in bloco.mensagem && bloco.mensagem.duracaoMs) || rotasDoTexto(bloco.mensagem.content).length ? (
                        <div className="chat-consulta-linha">
                          {admin && bloco.consultas.length && !("log" in bloco.mensagem && bloco.mensagem.log) ? (
                          <button
                            type="button"
                            className="chat-ver-consulta"
                            onClick={() => setConsultaAberta((atual) => (atual === i ? null : i))}
                          >
                            {consultaAberta === i ? "Ocultar consulta" : "Ver consulta"}
                          </button>
                          ) : null}
                          {rotasDoTexto(bloco.mensagem.content).length ? (
                            <button type="button" className="chat-ver-consulta" onClick={() => setRotaCheia(rotasDoTexto(bloco.mensagem.content)[0])}>
                              Ver em tela cheia
                            </button>
                          ) : null}
                          {bloco.mensagem.content.trim() ? (
                            <button type="button" className="chat-ver-consulta" onClick={() => void copiarResposta(bloco.mensagem.content, i)}>
                              {respostaCopiada === i ? "Copiado" : "Copiar resposta"}
                            </button>
                          ) : null}
                          {bloco.mensagem.content.trim() && !(ocupado && i === blocos.length - 1) ? (
                            <AvaliacaoResposta
                              pergunta={textoVisivel(
                                [...blocos.slice(0, i)].reverse().find((b) => b.mensagem.role === "user")?.mensagem.content ?? "",
                              )}
                              resposta={bloco.mensagem.content}
                              visao={admin ? visao : setor}
                            />
                          ) : null}
                          {"duracaoMs" in bloco.mensagem && bloco.mensagem.duracaoMs ? (
                            <span className="chat-tempo">Levou {formatarDuracao(bloco.mensagem.duracaoMs)}</span>
                          ) : null}
                          {admin && consultaAberta === i && bloco.consultas.length && !("log" in bloco.mensagem && bloco.mensagem.log) ? (
                            <>
                              <button
                                type="button"
                                className="chat-ver-consulta"
                                onClick={() => void copiarConsulta(bloco.consultas.join("\n\n"), i)}
                              >
                                {consultaCopiada === i ? "Copiado" : "Copiar consulta"}
                              </button>
                              <SqlDestaque texto={bloco.consultas.join("\n\n")} />
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div key={i} id={`chat-msg-${i}`} className={`chat-linha usuario${buscaAlvo === i ? " busca-alvo" : ""}`}>
                    <div className="chat-msg chat-user">
                      {textoVisivel(bloco.mensagem.content)}
                    </div>
                  </div>
                ),
              )}

              {status ? (
                <div className="chat-linha chat-pensando">
                  <SymbolLoader className="cl-loader--inline" label={status} />
                  <div className="chat-msg chat-assistant chat-digitando">{status}</div>
                </div>
              ) : null}
              {erro ? <p className="chat-erro">{erro}</p> : null}
              <div ref={fimRef} />
            </div>
          </div>
        )}

        {inicioAberto ? null : <form
          className="chat-entrada"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(texto);
          }}
        >
          <div className="chat-coluna">
            <div className="chat-caixa">
              <textarea
                ref={entradaRef}
                value={texto}
                rows={1}
                placeholder="Pergunte sobre um processo, cliente, atividade ou período…"
                onChange={(e) => {
                  setTexto(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void enviar(texto);
                  }
                }}
              />
              <button type="submit" className="chat-enviar" disabled={ocupado || !texto.trim()} title="Enviar">
                <Icone nome="enviar" tamanho={18} />
              </button>
            </div>
          </div>
        </form>}
        {rotaCheia ? (
          <div className="chat-rota-tela" role="dialog" aria-label="Viagem em tela cheia" onClick={() => setRotaCheia(null)}>
            <div className="chat-rota-tela-painel" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="chat-rota-tela-fechar" onClick={() => setRotaCheia(null)}>
                Fechar
              </button>
              <RotaCard bruto={rotaCheia} completo />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
