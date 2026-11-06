import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { calculosDaConsulta, guardarReceita, linhasDaConsulta, receitaSalva, textoDaConsulta, type Receita } from "./receitasIa";
import { InicioPainel } from "./InicioPainel";
import { AvaliacaoResposta } from "./AvaliacaoResposta";
import { renovarTokenGmail } from "./tokenGmail";
import { SymbolLoader } from "./Loader";
import { SqlDestaque } from "./SqlDestaque";
import { DiaCard, LogCard, PainelTiCard, diaDoTexto, logDoTexto, painelDoTexto } from "./PainelTi";
import { completarConsultaLog } from "./ferramentasIa";
import { formatarDataHora, formatarDatasNoTexto } from "./datas";
import { acoesDoEvento, camposQueMudaram, nomeProprio, rotuloCampo } from "./relatorio";
import { rotuloTipo } from "./types";

type ChamadaFerramenta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type Preferencia = { termo: string; tabela: string; campo: string; observacao: string };

type UsoTokens = { entrada: number; saida: number; total: number; contexto?: number; raciocinio?: number; janela?: number };

function numeroTokens(valor: number) {
  return valor.toLocaleString("pt-BR");
}

function percentualDe(fracao: number) {
  const pct = fracao * 100;
  if (pct <= 0) return "0%";
  if (pct < 0.1) return "< 0,1%";
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function textoPercentual(uso: UsoTokens) {
  const ocupada = uso.janela || uso.entrada;
  if (!uso.contexto || ocupada <= 0) return "0%";
  return percentualDe(ocupada / uso.contexto);
}

type ConsumoConversa = {
  id: string;
  email?: string;
  titulo: string;
  total: number;
  entrada: number;
  saida: number;
  raciocinio: number;
  chamadas: number;
  ocupacao: number;
  parte: number;
};

function PreviaRelatorio({
  previa,
  podeAprovar,
  onAprovar,
}: {
  previa: { sql: string; colunas: string[]; linhas: string[][] };
  podeAprovar: boolean;
  onAprovar: () => void;
}) {
  return (
    <div className="chat-previa">
      <div className="chat-previa-topo">
        <strong>Antes de começarmos, confira se essas informações estão corretas.</strong>
      </div>
      <div className="chat-previa-campos">
        {previa.colunas.map((coluna) => (
          <span key={coluna}>{coluna}</span>
        ))}
      </div>
      {previa.linhas.length ? (
        <div className="chat-relatorio-tabela-wrap">
          <table className="chat-relatorio-tabela">
            <thead>
              <tr>
                {previa.colunas.map((coluna) => (
                  <th key={coluna}>{coluna}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previa.linhas.map((linha, indice) => (
                <tr key={indice}>
                  {linha.map((celula, coluna) => (
                    <td key={coluna}>{celula}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Nenhuma linha nesta amostra.</p>
      )}
      {podeAprovar ? (
        <div className="chat-previa-acoes">
          <button type="button" onClick={onAprovar}>
            Está certo, trazer o restante
          </button>
          <small>Se algo estiver errado, escreva o que precisa mudar.</small>
        </div>
      ) : null}
    </div>
  );
}

const IAS_CONSUMO = ["google", "openrouter"] as const;
type IaConsumo = (typeof IAS_CONSUMO)[number];
const ROTULO_CONSUMO: Record<IaConsumo, { nome: string; aba: string; texto: string }> = {
  google: {
    nome: "Gemma 4",
    aba: "Google",
    texto: "Pedidos de hoje no Gemma 4, pela API do Google. O dia zera à meia-noite da Califórnia.",
  },
  openrouter: {
    nome: "Gemma 4 31B · OpenRouter",
    aba: "OpenRouter",
    texto: "Reserva usada quando o Google estoura o limite ou devolve erro. É o mesmo Gemma 4 31B.",
  },
};

type SaldoIa = {
  google: { pedidos: number; limite: number; restam: number; tokens: number };
  openrouter: {
    ativo: boolean;
    usado: number | null;
    teto: number | null;
    restante: number | null;
    pedidos: number;
    limite: number | null;
    restam: number | null;
    tokens: number;
  };
};

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "USD" });
}

function PainelSaldo({ saldo }: { saldo: SaldoIa | null }) {
  const google = saldo?.google;
  const reserva = saldo?.openrouter;
  return (
    <div className="chat-saldo">
      <article>
        <span>Google · usado</span>
        <strong>{numeroTokens(google?.pedidos || 0)}</strong>
        <small>
          {google ? `restam ${numeroTokens(google.restam)} de ${numeroTokens(google.limite)}` : "carregando"}
          {google?.tokens ? ` · ${numeroTokens(google.tokens)} tokens` : ""}
        </small>
      </article>
      <article>
        <span>OpenRouter · ainda temos</span>
        <strong>{reserva?.restante == null ? "—" : dinheiro(reserva.restante)}</strong>
        <small>
          {reserva?.usado == null ? "sem chave" : `${dinheiro(reserva.usado)} usados`}
          {reserva?.teto != null ? ` de ${dinheiro(reserva.teto)}` : ""}
          {reserva?.limite != null ? ` · grátis ${numeroTokens(reserva.pedidos)} de ${numeroTokens(reserva.limite)}, restam ${numeroTokens(reserva.restam || 0)}` : ""}
        </small>
      </article>
    </div>
  );
}

function GraficoConsumo({ conversas, onAbrir }: { conversas: ConsumoConversa[]; onAbrir: (item: ConsumoConversa) => void }) {
  if (!conversas.length) {
    return <p className="chat-historico-vazio">Nenhuma consulta contabilizada ainda. Faça uma pergunta no chat para comparar.</p>;
  }
  const maior = Math.max(...conversas.map((item) => item.total), 1);
  return (
    <div className="chat-consumo-lista">
      <div className="chat-consumo-lista-topo">
        <div className="chat-consumo-legenda">
          <span><i className="entrada" /> Entrada</span>
          <span><i className="saida" /> Saída</span>
          <span><i className="raciocinio" /> Raciocínio</span>
        </div>
        <small>{conversas.length} {conversas.length === 1 ? "conversa" : "conversas"}</small>
      </div>
      <ol className="chat-consumo-rolagem">
        {conversas.map((item, indice) => {
          const largura = Math.max(6, Math.round((item.total / maior) * 100));
          return (
            <li key={item.id || item.titulo}>
              <button
                type="button"
                className="chat-consumo-abrir"
                disabled={!item.id}
                title={item.id ? "Abrir esta conversa" : "Conversa sem vínculo"}
                onClick={() => onAbrir(item)}
              >
                <span className="chat-consumo-posto">{indice + 1}</span>
                <div className="chat-consumo-nome">
                  <strong title={item.titulo}>{item.titulo}</strong>
                  <small>
                    {numeroTokens(item.chamadas)} {item.chamadas === 1 ? "consulta" : "consultas"} · janela {percentualDe(item.ocupacao)}
                  </small>
                </div>
                <div className="chat-consumo-trilho" title={`${numeroTokens(item.entrada)} entrada · ${numeroTokens(item.saida)} saída · ${numeroTokens(item.raciocinio)} raciocínio`}>
                  <div style={{ width: `${largura}%` }}>
                    {item.entrada > 0 ? <i className="entrada" style={{ flex: item.entrada }} /> : null}
                    {item.saida > 0 ? <i className="saida" style={{ flex: item.saida }} /> : null}
                    {item.raciocinio > 0 ? <i className="raciocinio" style={{ flex: item.raciocinio }} /> : null}
                  </div>
                </div>
                <div className="chat-consumo-valor">
                  <b>{numeroTokens(item.total)}</b>
                  <em>{percentualDe(item.parte)}</em>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function tituloUso(uso: UsoTokens) {
  const partes = [
    `Entrada ${numeroTokens(uso.janela || uso.entrada)}`,
    `Saída ${numeroTokens(uso.saida)}`,
  ];
  if (uso.raciocinio) partes.push(`Raciocínio ${numeroTokens(uso.raciocinio)}`);
  if (uso.contexto) partes.push(`Janela ${numeroTokens(uso.contexto)}`);
  return partes.join(" · ");
}

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
      previa?: { sql: string; colunas: string[]; linhas: string[][] };
    }
  | { role: "tool"; tool_call_id: string; content: string };

const MAX_PASSOS = 12;

const SUGESTOES_COMERCIAL: { titulo: string; descricao: string; pergunta: string; icone: keyof typeof ICONES }[] = [
  { titulo: "Meu dia", descricao: "O que está pendente no seu nome: atrasado, hoje e a semana.", pergunta: "Como está o meu dia?", icone: "meudia" },
  { titulo: "Ficha do processo", descricao: "Situação, proposta e o que fazer agora neste processo.", pergunta: "Monte a ficha do processo {processo}.", icone: "fichaProcesso" },
  { titulo: "Pendências", descricao: "Atividades pendentes deste ano do comercial e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do comercial deste ano e qual o motivo de cada uma?", icone: "pendencias" },
  { titulo: "Pendências do inside", descricao: "Atividades pendentes deste ano do inside e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do inside deste ano e qual o motivo de cada uma?", icone: "pendenciasInside" },
  { titulo: "Resumo do processo", descricao: "Cliente, vendedor responsável e a situação atual.", pergunta: "Faça o resumo do processo {processo}.", icone: "resumoProcesso" },
  { titulo: "Buscar cliente", descricao: "Ficha do cliente: vendedor, sem proposta, último processo, comissão e se paga em dia.", pergunta: "Se eu informar uma referência de processo, busque os processos. Se eu informar o nome do cliente, monte a ficha: processos abertos, vendedor, quantos estão sem proposta, o último processo, a comissão deste mês, se ele é ouro, prata ou bronze e se paga em dia. Se eu não disse nem o nome nem a referência, pergunte qual cliente.", icone: "buscarCliente" },
  { titulo: "Proposta", descricao: "Oferta comercial e as datas da proposta.", pergunta: "Qual a proposta e a oferta do processo {processo}?", icone: "proposta" },
  { titulo: "Comissão do mês", descricao: "Comissões já calculadas neste mês.", pergunta: "Qual a comissão neste mês?", icone: "comissaoMes" },
  { titulo: "Processos do cliente", descricao: "Ficha com os processos abertos, o vendedor, a comissão e o relacionamento.", pergunta: "Monte a ficha do cliente com os processos abertos. Se eu não disse o nome, pergunte qual cliente. Inclua vendedor, quantos estão sem proposta, o último processo, a comissão deste mês, se ele é ouro, prata ou bronze e se paga em dia.", icone: "processosCliente" },
  { titulo: "Ouro, prata e bronze", descricao: "Relacionamento desses clientes, em cartões coloridos.", pergunta: "Qual o relacionamento dos clientes ouro, prata e bronze?", icone: "ouroPrata" },
  { titulo: "Minhas pendências", descricao: "O que está atrasado e o que vence nos próximos 7 dias.", pergunta: "Quais são minhas pendências atrasadas e as dos próximos 7 dias?", icone: "minhasPendencias" },
];

const SUGESTOES_SETOR: Record<string, { titulo: string; descricao: string; pergunta: string; icone: keyof typeof ICONES }[]> = {
  inside: SUGESTOES_COMERCIAL,
  comercial: SUGESTOES_COMERCIAL,
  operacional: [
    { titulo: "Meu dia", descricao: "O que está pendente no seu nome: atrasado, hoje e a semana.", pergunta: "Como está o meu dia?", icone: "meudia" },
    { titulo: "Ficha do processo", descricao: "Situação, documental e o que fazer agora neste processo.", pergunta: "Monte a ficha do processo {processo}.", icone: "fichaProcesso" },
    { titulo: "Pendências", descricao: "Atividades pendentes deste ano e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do operacional deste ano e qual o motivo de cada uma?", icone: "pendencias" },
    { titulo: "Divergências", descricao: "Desembarque deste ano com 15 dias ou mais de diferença da previsão.", pergunta: "Quais processos deste ano têm o desembarque real muito diferente da previsão?", icone: "divergencias" },
    { titulo: "Resumo do processo", descricao: "Situação, prazos e a pendência atual.", pergunta: "Faça o resumo operacional do processo {processo}.", icone: "resumoProcesso" },
    { titulo: "Rota do navio", descricao: "Navio, portos e as datas de cada trecho da viagem.", pergunta: "Como está a rota do navio no processo {processo}?", icone: "navio" },
    { titulo: "Acompanhamentos", descricao: "As notas de acompanhamento mais recentes.", pergunta: "Quais os acompanhamentos do processo {processo}?", icone: "acompanhamentos" },
    { titulo: "Prazos", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "prazos" },
    { titulo: "Processos parados", descricao: "Sem nenhuma nota de acompanhamento há 7 dias.", pergunta: "Quais processos estão parados há 7 dias sem acompanhamento?", icone: "Processosparados" },
    { titulo: "O que mudou", descricao: "Campos alterados neste processo nos últimos 30 dias.", pergunta: "O que mudou no processo {processo} nos últimos 30 dias?", icone: "oQueMudou" },
  ],
  documental: [
    { titulo: "Meu dia", descricao: "O que está pendente no seu nome: atrasado, hoje e a semana.", pergunta: "Como está o meu dia?", icone: "meudia" },
    { titulo: "Ficha do processo", descricao: "Atividades, liberação do CE e o que fazer agora.", pergunta: "Monte a ficha do processo {processo}.", icone: "fichaProcesso" },
    { titulo: "Fila do CE", descricao: "Atividades abertas que estão com o documental CE.", pergunta: "Quais atividades estão agora com o documental CE?", icone: "filaCe" },
    { titulo: "Fila do IM", descricao: "Atividades abertas que estão com o documental IM.", pergunta: "Quais atividades estão agora com o documental IM?", icone: "filaIm" },
    { titulo: "Pendências", descricao: "Tudo que está pendente no CE e no IM, e o que falta para concluir.", pergunta: "Quais são todas as atividades pendentes do documental CE e do documental IM, e o que falta para concluir cada uma?", icone: "pendencias" },
    { titulo: "CE ainda não liberado", descricao: "Atividades do CE e do IM que ainda não estão com CE liberado.", pergunta: "Quais atividades do documental CE e do documental IM ainda não têm o CE liberado?", icone: "ceNaoLiberado" },
    { titulo: "Do processo", descricao: "Atividades do CE e do IM, envolvidos, liberação e o que falta.", pergunta: "No processo {processo}, quais atividades estão com o documental CE e com o documental IM, quem são os envolvidos, o CE já está liberado e o que falta para concluir?", icone: "doProcesso" },
    { titulo: "Campos livres", descricao: "Campos livres que já estão preenchidos neste processo.", pergunta: "Quais campos livres estão preenchidos no processo {processo}?", icone: "camposLivres" },
  ],
  admin: [
    { titulo: "Meu dia", descricao: "O que está pendente no seu nome: atrasado, hoje e a semana.", pergunta: "Como está o meu dia?", icone: "resumo" },
    { titulo: "Fila dos setores", descricao: "Abertos, sem proposta, atrasados e parados, por setor.", pergunta: "Como está a fila dos setores: processos abertos, sem proposta, atrasados e parados?", icone: "resumo" },
    { titulo: "Processos parados", descricao: "Sem nenhuma nota de acompanhamento há 7 dias.", pergunta: "Quais processos estão parados há 7 dias sem acompanhamento?", icone: "busca" },
    { titulo: "Prazos vencendo", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "check" },
    { titulo: "Divergências", descricao: "Desembarque deste ano com 15 dias ou mais de diferença da previsão.", pergunta: "Quais processos deste ano têm o desembarque real muito diferente da previsão?", icone: "troca" },
    { titulo: "Rota do navio", descricao: "Navio, portos e as datas de cada trecho da viagem.", pergunta: "Como está a rota do navio no processo {processo}?", icone: "navio" },
  ],
  gerencia: [
    { titulo: "Meu dia", descricao: "O que está pendente no seu nome: atrasado, hoje e a semana.", pergunta: "Como está o meu dia?", icone: "meudia" },
    { titulo: "Ficha do processo", descricao: "Situação, proposta, documental e o que fazer agora.", pergunta: "Monte a ficha do processo {processo}.", icone: "fichaProcesso" },
    { titulo: "Fila dos setores", descricao: "Abertos, sem proposta, atrasados e parados, por setor.", pergunta: "Como está a fila dos setores: processos abertos, sem proposta, atrasados e parados?", icone: "filaCe" },
    { titulo: "Processos parados", descricao: "Sem nenhuma nota de acompanhamento há 7 dias.", pergunta: "Quais processos estão parados há 7 dias sem acompanhamento?", icone: "Processosparados" },
    { titulo: "Prazos vencendo", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "prazos" },
    { titulo: "Pendências do operacional", descricao: "Atividades pendentes deste ano e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do operacional deste ano e qual o motivo de cada uma?", icone: "pendencias" },
    { titulo: "Pendências do comercial", descricao: "Atividades pendentes deste ano e o motivo de cada uma.", pergunta: "Quais são as atividades pendentes do comercial deste ano e qual o motivo de cada uma?", icone: "pendencias" },
    { titulo: "Documental", descricao: "Tudo que está pendente no CE e no IM, e o que falta para concluir.", pergunta: "Quais são todas as atividades pendentes do documental CE e do documental IM, e o que falta para concluir cada uma?", icone: "filaIm" },
    { titulo: "Painel financeiro", descricao: "Comissões, taxas e prazos do mês, com valores.", pergunta: "Monte o painel financeiro deste mês, com valores.", icone: "painelMes" },
    { titulo: "Passagens", descricao: "Melhor preço na data de embarque e no destino.", pergunta: "Compare os preços de passagem aérea. Se eu não informei o destino ou a data de embarque, pergunte só o que falta.", icone: "passagens" },
    { titulo: "Comissões da equipe", descricao: "Comissões de vendedor já calculadas neste mês.", pergunta: "Qual a comissão de vendedor neste mês, com os valores?", icone: "comissoes" },
    { titulo: "Divergências", descricao: "Desembarque deste ano com 15 dias ou mais de diferença da previsão.", pergunta: "Quais processos deste ano têm o desembarque real muito diferente da previsão?", icone: "divergencias" },
  ],
  financeiro: [
    { titulo: "Meu dia", descricao: "O que está pendente no seu nome: atrasado, hoje e a semana.", pergunta: "Como está o meu dia?", icone: "meudia" },
    { titulo: "Painel do mês", descricao: "Comissões, taxas e prazos dos próximos 7 dias.", pergunta: "Monte o painel financeiro deste mês, com valores.", icone: "painelMes" },
    { titulo: "Gráfico", descricao: "Linha das faturas do processo, com valor e data.", pergunta: "Me mostre em um gráfico de linhas as faturas de um processo, com número, valor e data. Se eu não informei o número, pergunte qual processo.", icone: "graficoLinha" },
    { titulo: "Comissões", descricao: "Comissões de vendedor já calculadas neste mês.", pergunta: "Qual a comissão de vendedor neste mês, com os valores?", icone: "comissoes" },
    { titulo: "Taxas do processo", descricao: "Pagamento e recebimento de cada taxa.", pergunta: "Quais as taxas do processo {processo}, com pagamento e recebimento?", icone: "taxasProcesso" },
    { titulo: "Prazos", descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.", pergunta: "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?", icone: "prazos" },
    { titulo: "Relatório de taxas", descricao: "Taxas do mês com nome, pagamento e recebimento.", pergunta: "Pedir relatório das taxas deste mês, com nome, pagamento e recebimento.", icone: "relatorioTaxas" },
    { titulo: "Relacionamento", descricao: "Se o cliente é ouro, prata ou bronze e se paga em dia.", pergunta: "Monte a ficha do cliente. Se eu não disse o nome, pergunte qual. Diga se ele é ouro, prata ou bronze e se paga em dia.", icone: "relacionamento" },
    { titulo: "Ouro, prata e bronze", descricao: "Relacionamento desses clientes, em cartões coloridos.", pergunta: "Qual o relacionamento dos clientes ouro, prata e bronze?", icone: "ouroPrata" },
    { titulo: "Passagens (BETA)", descricao: "Melhor preço na data de embarque e no destino.", pergunta: "Compare os preços de passagem aérea. Se eu não informei o destino ou a data de embarque, pergunte só o que falta.", icone: "passagens" },
  ],
  ti: [
    { titulo: "Meu dia", descricao: "O que está pendente no seu nome: atrasado, hoje e a semana.", pergunta: "Como está o meu dia?", icone: "meudia" },
    { titulo: "Painel do TI", descricao: "Resumo das últimas 24 horas: volume, quem alterou e quais tabelas.", pergunta: "Monte o painel do TI das últimas 24 horas.", icone: "TI" },
    { titulo: "Log recente", descricao: "Eventos das últimas 24 horas, com usuário, tabela, tipo e computador.", pergunta: "Mostre o log das últimas 24 horas, com usuário, tabela, tipo e computador.", icone: "Relogiolista" },
    { titulo: "Monitoramentos", descricao: "Quem mudou o projeto de tarefas e a atividade nos registros recentes.", pergunta: "Quais foram os últimos monitoramentos alterados e quem alterou, no projeto de tarefas e na atividade?", icone: "Monitoramento" },
    { titulo: "Exclusões", descricao: "O que foi apagado nas últimas 24 horas e quem excluiu.", pergunta: "Quais exclusões aconteceram nas últimas 24 horas?", icone: "lixo" },
    { titulo: "Quem mais alterou", descricao: "Ranking de quem mais gravou log nas últimas 24 horas.", pergunta: "Quem mais gravou log nas últimas 24 horas?", icone: "Rank" },
    { titulo: "Contas da IA", descricao: "Quem entrou na IA e qual o papel de cada conta.", pergunta: "Quais contas acessaram a IA e qual o papel de cada uma?", icone: "ContaIA" },
    { titulo: "Log de um processo", descricao: "Histórico técnico de um processo. Se faltar o número, a IA pergunta.", pergunta: "Consulte o log técnico de um processo. Se eu não informei o número, pergunte qual processo.", icone: "LogProcesso" },
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
    icone: "processosCliente",
    grupo: "Operação",
    visoes: ["*"],
  },
  {
    titulo: "Prazos da semana",
    descricao: "Embarque, desembarque e entrega que vencem nos próximos 7 dias.",
    pergunta: "Pedir relatório dos prazos de embarque, desembarque e entrega que vencem nos próximos 7 dias. Colunas: número do processo, cliente, previsão de embarque, previsão de desembarque e previsão de entrega.",
    icone: "prazos",
    grupo: "Operação",
    visoes: ["*"],
  },
  {
    titulo: "Atividades pendentes",
    descricao: "O que ainda está aberto neste ano, com previsão e responsável.",
    pergunta: "Pedir relatório das atividades pendentes deste ano. Colunas: número do processo, atividade, responsável, previsão de término e situação.",
    icone: "pendencias",
    grupo: "Operação",
    visoes: ["*"],
  },
  {
    titulo: "Processos parados",
    descricao: "Sem acompanhamento há 7 dias ou mais.",
    pergunta: "Pedir relatório dos processos parados há 7 dias ou mais, sem nota de acompanhamento. Colunas: número do processo, cliente, data do último acompanhamento e dias sem acompanhamento.",
    icone: "Processosparados",
    grupo: "Operação",
    visoes: ["operacional", "gerencia"],
  },
  {
    titulo: "Divergências de desembarque",
    descricao: "Desembarque deste ano longe da previsão.",
    pergunta: "Pedir relatório dos processos deste ano em que o desembarque real está 15 dias ou mais diferente da previsão. Colunas: número do processo, cliente, desembarque previsto, desembarque real e diferença em dias.",
    icone: "divergencias",
    grupo: "Operação",
    visoes: ["operacional", "gerencia"],
  },
  {
    titulo: "Propostas do mês",
    descricao: "Situação e valor das propostas deste mês.",
    pergunta: "Pedir relatório das propostas deste mês. Colunas: número do processo, cliente, vendedor, situação da proposta e valor.",
    icone: "proposta",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "gerencia"],
  },
  {
    titulo: "Comissões do mês",
    descricao: "Comissões de vendedor já calculadas neste mês.",
    pergunta: "Pedir relatório das comissões de vendedor deste mês. Colunas: vendedor, número do processo, cliente e valor da comissão.",
    icone: "comissoes",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "financeiro", "gerencia"],
  },
  {
    titulo: "Clientes com processos abertos",
    descricao: "Quem tem mais processos abertos, com vendedor e quantos estão sem proposta.",
    pergunta: "Pedir relatório dos clientes com processos abertos nos últimos 6 meses. Colunas: cliente, vendedor, processos abertos e sem proposta. Na carteira, só os clientes do vendedor logado. Na visão de administrador, todos.",
    icone: "buscarCliente",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "gerencia"],
  },
  {
    titulo: "Clientes sem movimento",
    descricao: "Quem já abriu processo e não abre há 90 dias.",
    pergunta: "Pedir relatório dos clientes que já abriram processo e não abrem há 90 dias ou mais. Colunas: cliente, vendedor, data do último processo e dias sem abrir. Na carteira, só os clientes do vendedor logado. Na visão de administrador, todos.",
    icone: "oQueMudou",
    grupo: "Comercial",
    visoes: ["inside", "comercial", "gerencia"],
  },
  {
    titulo: "Taxas do mês",
    descricao: "Nome da taxa, pagamento e recebimento.",
    pergunta: "Pedir relatório das taxas deste mês. Colunas: número do processo, cliente, nome da taxa, valor de pagamento e valor de recebimento.",
    icone: "relatorioTaxas",
    grupo: "Financeiro",
    visoes: ["financeiro", "gerencia"],
  },
  {
    titulo: "Fila do documental",
    descricao: "CE e IM em aberto, com liberação e o que falta.",
    pergunta: "Pedir relatório das atividades pendentes do documental CE e do documental IM. Colunas: número do processo, atividade, responsável, CE liberado e o que falta para concluir.",
    icone: "filaCe",
    grupo: "Documental",
    visoes: ["documental", "gerencia"],
  },
  {
    titulo: "Log das últimas 24 horas",
    descricao: "Quem alterou, em qual tabela e em qual computador.",
    pergunta: "Pedir relatório do log das últimas 24 horas. Colunas: data, usuário, tabela, tipo e computador.",
    icone: "Relogiolista",
    grupo: "TI",
    visoes: ["ti"],
  },
  {
    titulo: "Exclusões recentes",
    descricao: "O que foi apagado nas últimas 24 horas e quem excluiu.",
    pergunta: "Pedir relatório das exclusões das últimas 24 horas. Colunas: data, usuário, tabela, registro e computador.",
    icone: "lixo",
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
  lixo: "M9.38 1C9.09 1 8.86 1.23 8.86 1.52C8.86 1.81 9.09 2.05 9.38 2.05L14.62 2.05C14.91 2.05 15.14 1.81 15.14 1.52C15.14 1.23 14.91 1 14.62 1L9.38 1zM5.02 3.44C3.76 3.44 2.75 4.46 2.75 5.71C2.75 6.97 3.76 7.98 5.02 7.98L18.46 7.98L18.46 18.98C18.46 20.62 17.13 21.95 15.49 21.95L8.51 21.95C6.87 21.95 5.54 20.62 5.54 18.98L5.54 9.9C5.54 9.61 5.31 9.38 5.02 9.38C4.73 9.38 4.49 9.61 4.49 9.9L4.49 18.98C4.49 21.2 6.29 23 8.51 23L15.49 23C17.71 23 19.51 21.2 19.51 18.98L19.51 7.92C20.51 7.68 21.25 6.79 21.25 5.71C21.25 4.46 20.24 3.44 18.98 3.44L5.02 3.44zM5.02 4.49L18.98 4.49C19.66 4.49 20.21 5.04 20.21 5.71C20.21 6.39 19.66 6.94 18.98 6.94L5.02 6.94C4.34 6.94 3.79 6.39 3.79 5.71C3.79 5.04 4.34 4.49 5.02 4.49zM9.56 10.43C9.27 10.43 9.03 10.66 9.03 10.95L9.03 18.98C9.03 19.27 9.27 19.51 9.56 19.51C9.85 19.51 10.08 19.27 10.08 18.98L10.08 10.95C10.08 10.66 9.85 10.43 9.56 10.43zM14.44 10.43C14.15 10.43 13.92 10.66 13.92 10.95L13.92 18.98C13.92 19.27 14.15 19.51 14.44 19.51C14.73 19.51 14.97 19.27 14.97 18.98L14.97 10.95C14.97 10.66 14.73 10.43 14.44 10.43z",
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
  TI: "M5.35709 16V5.78571c0-.43393.34822-.78571.77777-.78571H18.5793c.4296 0 .7778.35178.7778.78571V16M5.35709 16h-1c-.55229 0-1 .4477-1 1v1c0 .5523.44771 1 1 1H20.3571c.5523 0 1-.4477 1-1v-1c0-.5523-.4477-1-1-1h-1M5.35709 16H19.3571M9.35709 8l2.62501 2.5L9.35709 13m4.00001 0h2",
  Monitoramento: "M5 19h4m6 0h4m-6.9627-4.3843V8.63418L17 5.93918m-4.9298 2.66213L7.04175 5.93919M12 2.99719l5.033 2.90583v5.81168L12 14.6205l-5.03303-2.9058V5.90302L12 2.99719ZM14 19c0 1.1045-.8954 2-2 2s-2-.8955-2-2c0-1.1046.8954-2 2-2s2 .8954 2 2Z",
  meudia:"M12 2v2M4.93 4.93l1.41 1.41M19.07 4.93l-1.41 1.41M20 12h2M15.947 12.65a4 4 0 0 0-5.925-4.128M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z",
  ContaIA: "M13.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM3 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M19 2c.3 2.2 1.8 3.7 4 4-2.2.3-3.7 1.8-4 4-.3-2.2-1.8-3.7-4-4 2.2-.3 3.7-1.8 4-4Z",
  LogProcesso: "M6.5 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM6.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM6.5 19a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM5 6.5v4M5 13.5v4M10 5h11M10 12h8M10 19h11",
  Relogiolista: "M22 16.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM16.5 14v2.5l1.5 1M3 5h14M3 10h6M3 15h5",
  Rank: "M3 21v-9h5V4h8v11h5v6ZM8 12v9M16 15v6",
  fichaProcesso: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8ZM14 3v5h5M9 13h6M9 17h4",
  pendencias: "M6 3h12M6 21h12M7 3v3.5a5 5 0 0 0 1.5 3.5L12 12l-3.5 2A5 5 0 0 0 7 17.5V21M17 3v3.5a5 5 0 0 1-1.5 3.5L12 12l3.5 2a5 5 0 0 1 1.5 3.5V21",
  pendenciasInside: "M7 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM4 20v-1a5 5 0 0 1 5-5M21 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM17 15v2l1.5 1",
  resumoProcesso: "M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM10 2h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM9 11h6M9 15h6",
  buscarCliente: "M7 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM4 20v-1a5 5 0 0 1 5-5M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM19.2 18.2 21 20",
  proposta: "M21 3 3 10.5l7 3 3 7ZM10 13.5 21 3",
  comissaoMes: "M6 5h12M5 9h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM14.5 14.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM6.5 14.5h.01M17.5 14.5h.01",
  processosCliente: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM14 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8.5 17a3.5 3 0 0 1 7 0",
  ouroPrata: "M8 2.5 12 9l4-6.5M17.5 15a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM14 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  minhasPendencias: "M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 19v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M19.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM17.5 14a4 4 0 0 1 3.5 4v1",
  divergencias: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01",
  acompanhamentos: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  prazos: "M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM3 10h18M9 16l2 2 4-4",
  oQueMudou: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2",
  Processosparados: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM10 9v6M14 9v6",
  painelMes: "M3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1ZM13 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1ZM13 14a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1ZM3 17a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z",
  graficoLinha: "M3 3v16a2 2 0 0 0 2 2h16M7 14l4-4 3 3 5-6",
  comissoes: "M6 5h12M5 9h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM14.5 14.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM6.5 14.5h.01M17.5 14.5h.01",
  taxasProcesso: "M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-3.5-2-3.5 2-3.5-2ZM9 8h6M9 12h6",
  relatorioTaxas: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8ZM14 3v5h5M9 17v-3M12 17v-5M15 17v-7",
  relacionamento: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
  passagens: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z",
  filaCe: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM8 12l3 3 5-6",
  filaIm: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12l3 3 5-6",
  ceNaoLiberado: "M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V7a4 4 0 0 1 8 0v4M12 15v2",
  doProcesso: "M4 6h16M4 12h12M4 18h8",
  camposLivres: "M17 3l4 4-4 4M21 7H3M7 13l-4 4 4 4M3 17h18",
} as const;

const RESUMO_ENTRADA = false;
const CONTORNO = ["TI", "Monitoramento", "meudia", "ContaIA", "LogProcesso", "Relogiolista", "Rank", "fichaProcesso", "pendencias", "pendenciasInside", "resumoProcesso", "buscarCliente", "proposta", "comissaoMes", "processosCliente", "ouroPrata", "minhasPendencias", "divergencias", "acompanhamentos", "prazos", "oQueMudou", "Processosparados", "painelMes", "graficoLinha", "comissoes", "taxasProcesso", "relatorioTaxas", "relacionamento", "passagens", "filaCe", "filaIm", "ceNaoLiberado", "doProcesso", "camposLivres"] as const;

function textoVisivel(content: string) {
  return content.split("\n\nTexto lido da imagem:\n")[0] ?? content;
}

function Icone({ nome, tamanho = 18 }: { nome: keyof typeof ICONES; tamanho?: number }) {
  if ((CONTORNO as readonly string[]).includes(nome)) {
    return (
      <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONES[nome]} />
      </svg>
    );
  }
  if (nome === "novo") {
    return (
      <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 5.2h9.4A2.6 2.6 0 0 1 19 7.8v5.6a2.6 2.6 0 0 1-2.6 2.6H10l-3.8 3v-3H7A2.6 2.6 0 0 1 4.4 13.4V7.8A2.6 2.6 0 0 1 7 5.2z" />
        <path d="M11.7 8.2v4.6M9.4 10.5h4.6" />
      </svg>
    );
  }
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
  passagens_aereas: "Comparando passagens",
  relacionamento_clientes: "Montando o relacionamento",
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
  propostas_periodo: "Lendo as propostas do período",
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

function textoParaIa(conteudo: string) {
  const pronto = textoDaConsulta(conteudo) || conteudo;
  return pronto.length > 8000 ? `${pronto.slice(0, 8000)}\n…` : pronto;
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
    const amostra = (comDescricao.length ? comDescricao : linhas).slice(0, 20);
    const texto = comDescricao.length
      ? amostra
          .map((linha) => {
            const descricao = String(linha.Descricao ?? linha.descricao ?? "").replace(/\s+/g, " ").trim();
            const quando = linha.Data ?? linha.data;
            const responsavel = String(linha.Responsavel ?? linha.responsavel ?? "").trim();
            const partes = [descricao];
            if (quando) partes.unshift(`${dataLegivel(quando)}.`);
            if (responsavel) partes.push(`Responsável: ${responsavel}.`);
            return partes.join(" ");
          })
          .join("\n")
      : amostra
          .map((item) =>
            Object.entries(item)
              .filter(([, valor]) => valor != null && String(valor).trim())
              .map(([chave, valor]) => `${chave}: ${dataLegivel(valor)}`)
              .join(". "),
          )
          .join("\n");
    const total = comDescricao.length || linhas.length;
    return total > amostra.length ? `${texto}\nMais ${total - amostra.length} registros.` : texto;
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

function assuntoGeral(texto: string) {
  return /parad|fila dos setores|painel |\bprazos?\b|pend[eê]ncias do |processos abertos|quais clientes|comiss[aã]o neste|comiss[aã]o de vendedor neste|deste m[eê]s|neste m[eê]s|log das [uú]ltimas|exclus[oõ]es aconteceram|monitorament|\bminhas?\b.{0,40}pend[eê]n/i.test(texto)
    && !/desse|deste|dele|dela|nesse|neste|mesmo processo/i.test(texto);
}

function segueProcesso(texto: string) {
  return /desse|deste|dele|dela|nesse|neste|mesmo processo|mudan[cç]a|altera[cç]|hist[oó]rico|\blogs?\b|frete|taxas?|pagamento|recebimento|comiss|atividad|pend[eê]ncia|cliente|vendedor|situa|refer[eê]ncia|embarc|navio|porto|libera|\bce\b|proposta|oferta|acompanhament|quem alter|quem inclu|o que mudou|resumo/i.test(texto);
}

function perguntaComProcesso(pergunta: string, anteriores: Mensagem[]): string {
  if (processoCitado(pergunta) || assuntoGeral(pergunta) || !segueProcesso(pergunta)) return pergunta;
  const usuarios = anteriores.filter((item) => item.role === "user");
  for (let i = usuarios.length - 1; i >= 0; i--) {
    const numero = processoCitado(usuarios[i].content);
    if (numero) return `${pergunta} ${numero}`;
  }
  return pergunta;
}

function etapaDaRodada(historico: Mensagem[], relatorio: boolean, sqlAprovado: string) {
  const rodada = trechoDaPergunta(historico);
  let nome = "";
  let conteudo = "";
  for (let i = rodada.length - 1; i >= 0; i--) {
    const item = rodada[i];
    if (item.role !== "tool") continue;
    conteudo = item.content;
    const chamada = rodada.find(
      (mensagem) => mensagem.role === "assistant" && mensagem.tool_calls?.some((chamada) => chamada.id === item.tool_call_id),
    );
    nome = chamada?.role === "assistant" ? chamada.tool_calls?.find((chamada) => chamada.id === item.tool_call_id)?.function.name ?? "" : "";
    break;
  }
  const sqlOk = nome === "executar_sql" && Boolean(conteudo) && !conteudo.startsWith("Erro:");
  if (sqlAprovado) return sqlOk ? "resposta" : "relatorio";
  if (relatorio) return "previa";
  if (sqlOk) return "resposta";
  return "consulta";
}

function trechoDaPergunta(historico: Mensagem[]): Mensagem[] {
  let inicio = 0;
  for (let i = historico.length - 1; i >= 0; i--) {
    if (historico[i].role === "user") {
      inicio = i;
      break;
    }
  }
  return historico.slice(inicio);
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
  const sobreCarga =
    /duplicad|container|item de carga|sem bl|lista de carga/i.test(fala) ||
    (/quem inclu/i.test(fala) && /container|\bcarga\b/i.test(fala));
  const resumoDesses = /resumo/i.test(fala) && /duplicad|container|item de carga|sem bl/i.test(recente);
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

const FERRAMENTAS_PRONTAS = new Set([
  "acompanhamentos_processo",
  "meu_dia",
  "ficha_processo",
  "processos_abertos",
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
  "passagens_aereas",
  "relacionamento_clientes",
  "taxas_processo",
  "log_recente",
  "monitoramentos_alterados",
  "explicar_itens_carga",
  "explicar_campo_livre",
  "andamento_atividade",
]);

function respostaProntaDoHistorico(historico: Mensagem[]): string {
  const trecho = trechoDaPergunta(historico);
  const nomes = new Map<string, string>();
  for (const item of trecho) {
    if (item.role !== "assistant") continue;
    for (const chamada of item.tool_calls ?? []) nomes.set(chamada.id, chamada.function.name);
  }
  for (let i = trecho.length - 1; i >= 0; i--) {
    const item = trecho[i];
    if (item.role !== "tool") continue;
    if (!FERRAMENTAS_PRONTAS.has(nomes.get(item.tool_call_id) ?? "")) continue;
    const texto = textoDaConsulta(item.content);
    if (texto && !texto.startsWith("Erro:")) return texto;
  }
  return "";
}

function textoDosDados(historico: Mensagem[]): string {
  const ferramentas = trechoDaPergunta(historico).filter((m) => m.role === "tool").reverse();
  for (const item of ferramentas) {
    const texto = resumirResultado(item.content);
    if (texto) return texto;
  }
  return "";
}

function soNomesDeTabela(texto: string): boolean {
  const nomes = texto.split(/\s+/).map((nome) => nome.trim()).filter(Boolean);
  return nomes.length > 0 && nomes.every((nome) => /^(?:cad|mov|sys|aux|imp|vis)_[A-Za-z0-9_]+$/.test(nome));
}

function catalogoInterno(texto: string): boolean {
  if (/```(?:log|painel|dia)\b/i.test(texto)) return false;
  if (/"Coluna"\s*:/.test(texto) && /"(?:Tabela|Ref_Tabela)"\s*:/.test(texto)) return true;
  return soNomesDeTabela(texto) || (texto.match(/\b(?:cad|mov|sys|aux|imp|vis)_[A-Za-z0-9_]+\b/g) ?? []).length >= 6;
}

function diaSeguinte(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + 1);
  return data.toISOString().slice(0, 10);
}

function hojeIsoBrasil(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const numero = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? "";
  return `${numero("year")}-${numero("month")}-${numero("day")}`;
}

function diaAnterior(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() - 1);
  return data.toISOString().slice(0, 10);
}

function periodoPedido(texto: string): { inicio: string; fimExclusivo?: string } | null {
  const ano = new Date().getFullYear();
  if (/\b(este|esse|neste|no)\s+ano\b|\bano atual\b/i.test(texto)) {
    return { inicio: `${ano}-01-01`, fimExclusivo: `${ano + 1}-01-01` };
  }
  const periodoPalavra = /\b(?:semana|m[eê]s|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i.test(texto);
  const achadas = periodoPalavra ? [] : [...texto.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/g)];
  if (achadas.length) {
    const iso = achadas.map((parte) => {
      let y = parte[3] ?? String(ano);
      if (y.length === 2) y = `20${y}`;
      return `${y}-${parte[2].padStart(2, "0")}-${parte[1].padStart(2, "0")}`;
    });
    const ordenadas = [...iso].sort();
    if (ordenadas.length > 1) return { inicio: ordenadas[0], fimExclusivo: diaSeguinte(ordenadas[ordenadas.length - 1]) };
    if (!/\b(?:a partir|desde|ap[oó]s)\b/i.test(texto)) {
      return { inicio: ordenadas[0], fimExclusivo: diaSeguinte(ordenadas[0]) };
    }
    return { inicio: ordenadas[0] };
  }
  if (/\bhoje\b/i.test(texto)) {
    const inicio = hojeIsoBrasil();
    return { inicio, fimExclusivo: diaSeguinte(inicio) };
  }
  if (/\bontem\b/i.test(texto)) {
    const fimExclusivo = hojeIsoBrasil();
    return { inicio: diaAnterior(fimExclusivo), fimExclusivo };
  }
  const hoje = hojeIsoBrasil();
  const [anoHoje, mesHoje] = hoje.split("-").map(Number);
  if (/\bsemana\s+passada\b/i.test(texto)) {
    const [ano, mes, dia] = hoje.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    const dow = data.getUTCDay();
    data.setUTCDate(data.getUTCDate() - (dow === 0 ? 6 : dow - 1));
    const fimExclusivo = data.toISOString().slice(0, 10);
    data.setUTCDate(data.getUTCDate() - 7);
    return { inicio: data.toISOString().slice(0, 10), fimExclusivo };
  }
  if (/\b(?:esta|essa|nesta|na|da)\s+semana\b/i.test(texto)) {
    const [ano, mes, dia] = hoje.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    const dow = data.getUTCDay();
    data.setUTCDate(data.getUTCDate() - (dow === 0 ? 6 : dow - 1));
    return { inicio: data.toISOString().slice(0, 10), fimExclusivo: diaSeguinte(hoje) };
  }
  if (/\bm[eê]s\s+passad[oa]\b/i.test(texto)) {
    const mes = mesHoje === 1 ? 12 : mesHoje - 1;
    const ano = mesHoje === 1 ? anoHoje - 1 : anoHoje;
    const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const fimExclusivo = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
    return { inicio, fimExclusivo };
  }
  if (/\b(?:este|esse|neste|no|do|da|o)\s+m[eê]s\b/i.test(texto)) {
    return { inicio: `${hoje.slice(0, 8)}01`, fimExclusivo: diaSeguinte(hoje) };
  }
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const nomeMes = meses.find((nome) => new RegExp(`\\b${nome}\\b`, "i").test(texto)) ?? (/\bmarco\b/i.test(texto) ? "março" : "");
  if (nomeMes) {
    const mesNumero = meses.indexOf(nomeMes) + 1;
    const anoCitado = texto.match(/\b(20\d{2})\b/)?.[1];
    const ano = anoCitado ? Number(anoCitado) : mesNumero > mesHoje ? anoHoje - 1 : anoHoje;
    const inicio = `${ano}-${String(mesNumero).padStart(2, "0")}-01`;
    const fimCheio = mesNumero === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mesNumero + 1).padStart(2, "0")}-01`;
    const fimExclusivo = ano === anoHoje && mesNumero === mesHoje && diaSeguinte(hoje) < fimCheio ? diaSeguinte(hoje) : fimCheio;
    return { inicio, fimExclusivo };
  }
  return null;
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

const LITERAL_DATA = "'\\d{4}-\\d{2}-\\d{2}(?:[ T]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?)?'";

function pedeTipoCarga(texto: string) {
  return /\b(?:fcl|lcl|a[eé]re[oa]|rodovi[aá]ri[oa]|mar[ií]tim[oa]|tipo\s+de\s+carga|tipo_carga)\b/i.test(texto);
}

function semTipoCarga(sql: string) {
  return sql.replace(/(?:\s+and)?\s+(?:\w+\.)?tipo_carga\s*(?:=|<>|!=|in)\s*(?:\([^)]*\)|'\d+'|\d+)/gi, "");
}

function sqlComPeriodo(sql: string, pedido: string): string {
  let texto = sql.replace(/\btop\s+(?!1\b)\d+\s+/gi, "");
  const periodo = periodoPedido(pedido);
  if (!periodo) return texto;
  const coluna =
    texto.match(new RegExp(`(\\b\\w+\\.Data(?:_\\w+)*|\\bData(?:_\\w+)*)\\s*(?:>=|<=|>|<|=)\\s*${LITERAL_DATA}`, "i"))?.[1] ||
    texto.match(/(?:convert|cast)\s*\(\s*(?:date\s*,\s*)?(\b\w+\.Data(?:_\w+)*)[^)]*\)\s*(?:>=|<=|>|<|=)/i)?.[1] ||
    texto.match(/\b(\w+\.Data_Abertura_Processo)\b/i)?.[1];
  if (!coluna) return texto;
  const nome = coluna.replace(/\./g, "\\.");
  const expr = `(?:(?:convert|cast)\\s*\\(\\s*(?:date\\s*,\\s*)?${nome}\\s*(?:as\\s+date\\s*)?\\)|${nome})`;
  texto = limparFiltroSolto(texto.replace(new RegExp(`${expr}\\s*(?:>=|<=|>|<|=)\\s*${LITERAL_DATA}`, "gi"), ""));
  if (!pedeTipoCarga(pedido)) texto = limparFiltroSolto(semTipoCarga(texto));
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

function pedeResumoDaResposta(texto: string) {
  return /^(?:resuma|resume|resumir)(?:\s+(?:isso|a[ií]|essa|este|a resposta|o texto))?[.!? ]*$/i.test(texto.trim());
}

function pedeDatasFormatadas(texto: string) {
  const pedido = texto.trim();
  return pedido.length <= 160 && /format/i.test(pedido) && /\bdatas?\b/i.test(pedido);
}

function semChamadaCrua(texto: string) {
  return texto.replace(/<\s*[|｜]\s*DSML[\s\S]*$/i, "").trim();
}

function resumoCurto(texto: string) {
  const limpo = texto
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .trim();
  const linhas = limpo.split(/\n+/).map((linha) => linha.trim()).filter(Boolean);
  const uteis = linhas.filter((linha) => !/^último acompanhamento/i.test(linha)).slice(0, 6);
  return uteis.join("\n") || limpo.slice(0, 700);
}

function pedeFichaDoProcesso(texto: string) {
  return /\bresumo\b/i.test(texto) || (/\bresum(?:a|e|ir)\b/i.test(texto) && /\bprocesso\b/i.test(texto));
}

function pedeLog(texto: string) {
  return /quem (?:inclu|alter|excl|mud|lan[cç]|cri|apag|cadastr|mexeu)|hist[oó]rico|\blogs?\b|antes e depois|mudan[cç]a|altera[cç]|\bid\s?\d{3,}|\bid_?(?:logistica|projeto|tarefa|atividade|pessoa|acompanhamento)\w*/i.test(texto);
}

function pedidoSemProcesso(texto: string) {
  const fala = textoVisivel(texto);
  if (processosDoTexto(fala).length || numerosContainer(fala).length || idsMaritimos(fala).length || idsTaxa(fala).length) return false;
  return /pergunte qual processo|n[aã]o informei o n[uú]mero|log t[eé]cnico de um processo/i.test(fala);
}

function pedePassagem(texto: string) {
  return /passag(?:em|ens)\s+a[eé]rea/i.test(textoVisivel(texto));
}

function destinoDaPassagem(fala: string) {
  const achado = fala.match(/\bpara\s+(?:o\s+|a\s+)?([A-Za-zÀ-ú][\p{L}.' -]{1,40})/iu);
  if (!achado) return "";
  const nome = achado[1].replace(/\s+(?:em|no|na|dia|de)\b[\s\S]*$/i, "").trim();
  if (!nome || /^(?:o|a|um|uma|eu|mim|hoje|amanh[aã]|esse|essa|este|esta)$/i.test(nome)) return "";
  if (/\b(?:destino|embarque|passagem|pre[cç]o|data)\b/i.test(nome)) return "";
  return nome;
}

function respostaPassagemIncompleta(texto: string) {
  const fala = textoVisivel(texto).replace(/\s+/g, " ").trim();
  if (!pedePassagem(fala)) return "";
  const temData = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(fala);
  const destino = destinoDaPassagem(fala);
  if (temData && destino) return "";
  if (!temData && !destino) return "Informe o destino e a data de embarque, no formato dd/mm/aaaa. Se quiser, diga a origem e a volta.";
  if (!temData) return `Informe a data de embarque para ${destino}, no formato dd/mm/aaaa.`;
  return "Informe o destino da passagem.";
}

function pedeSoAData(texto: string) {
  const fala = textoVisivel(texto).replace(/[?!.]+/g, "").replace(/\s+/g, " ").trim();
  if (!fala || fala.length > 50) return false;
  if (/\b(?:processo|cliente|taxa|atividade|log|fatura|proposta|prazo|embarque|desembarque|comiss|relat[oó]rio)\b/i.test(fala)) return false;
  return /^(?:que|qual)\s+(?:e|é)\s+(?:o\s+)?dia(?:\s+de\s+hoje)?$|^(?:que|qual)\s+(?:e|é|a)\s+a?\s*data(?:\s+de\s+hoje)?$|^que\s+dia\s+(?:e|é)\s+hoje$|^hoje\s+(?:e|é)\s+(?:que\s+)?dia$|^(?:me\s+)?(?:diz|fala|diga|informe)\s+(?:qual\s+)?(?:e|é|a)\s+(?:a\s+)?(?:data|o\s+dia)(?:\s+de\s+hoje)?$|^(?:que|qual)\s+horas?\s+(?:s[aã]o|e)(?:\s+agora)?$|^que\s+horas\s+s[aã]o(?:\s+agora)?$/i.test(fala);
}

function textoDaDataAtual(texto: string) {
  const agora = new Date();
  const zona = "America/Sao_Paulo";
  if (/\bhoras?\b/i.test(texto)) {
    const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: zona, hour: "2-digit", minute: "2-digit" }).format(agora);
    return `Agora são ${hora}.`;
  }
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: zona, weekday: "long" }).format(agora);
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: zona, day: "2-digit", month: "2-digit", year: "numeric" }).format(agora);
  const nome = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `Hoje é ${nome}, ${data}.`;
}

function numeroSolto(texto: string): string {
  const numero = texto.toUpperCase().match(/\b([A-Z]{1,4}\d{2,6}-\d{2})\b/)?.[1] ?? "";
  if (!numero || texto.trim().length > numero.length + 8) return "";
  return numero;
}

function assuntoDaPergunta(pergunta: string, anteriores: Mensagem[]): string {
  const aberto = numeroSolto(pergunta) ? perguntaAberta(anteriores) : "";
  return `${aberto}\n${textoVisivel(pergunta)}`.trim();
}

function segueLog(pergunta: string, anteriores: Mensagem[]): boolean {
  if (pedeLog(textoVisivel(pergunta))) return true;
  if (!numeroSolto(pergunta)) return false;
  const assunto = perguntaAberta(anteriores);
  return Boolean(assunto && pedeLog(assunto));
}

function pedidoInterno(texto: string) {
  return /^(?:Consulte de novo|Consulte o banco|Não liste nomes de tabela|Consulte o log em mov_)/i.test(texto.trim());
}

function processosDoTexto(texto: string): string[] {
  return [...new Set((texto.toUpperCase().match(/\b[A-Z]{1,4}\d{2,6}-\d{2}\b/g) ?? []))].slice(0, 3);
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

function perguntaDeConjunto(pergunta: string) {
  if (processoCitado(pergunta)) return false;
  return /\b(?:m[eê]s|totais|todos|todas|lista|processos|lucros)\b/i.test(pergunta);
}

function sqlAprovadoInteiro(sql: string): string {
  return sql
    .trim()
    .replace(/;\s*$/, "")
    .replace(/\bselect\s+distinct\s+top\s+\d+\s+/i, "SELECT DISTINCT ")
    .replace(/\bselect\s+top\s+\d+\s+/i, "SELECT ");
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
    let linhas: unknown[] | undefined;
    try {
      const dados = JSON.parse(mensagem.content) as { texto?: unknown; linhas?: unknown };
      if (typeof dados.texto === "string") texto = dados.texto;
      if (Array.isArray(dados.linhas)) linhas = dados.linhas;
    } catch {
      /* o resultado não é JSON */
    }
    return { ...mensagem, content: JSON.stringify({ sql, ...(texto ? { texto } : {}), ...(linhas ? { linhas } : {}) }) };
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
      "ficha_processo",
      "meu_dia",
      "processos_abertos",
      "buscar_processos",
      "acompanhamentos_processo",
      "pendencias",
      "o_que_mudou",
      "proposta_processo",
  "propostas_periodo",
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
      "relacionamento_clientes",
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

function indiceDaPergunta(lista: Mensagem[], titulo: string) {
  const blocos = blocosDaConversa(lista);
  const chave = titulo.trim().toLowerCase();
  if (chave && chave !== "consultas anteriores") {
    const achou = blocos.findIndex(
      (bloco) => bloco.mensagem.role === "user" && bloco.mensagem.content.trim().toLowerCase().startsWith(chave.slice(0, 48)),
    );
    if (achou >= 0) return achou;
  }
  return blocos.findIndex((bloco) => bloco.mensagem.role === "user");
}

function blocosDaConversa(mensagens: Mensagem[]) {
  const chamadas = new Map<string, ChamadaFerramenta>();
  const blocos: { mensagem: Exclude<Mensagem, { role: "tool" }>; consultas: string[]; linhas: Record<string, unknown>[]; calculos: string; encartes: string[] }[] = [];
  let pendentes: string[] = [];
  let linhasPendentes: Record<string, unknown>[] = [];
  let calculosPendentes = "";
  let encartesPendentes: string[] = [];
  for (const mensagem of mensagens) {
    if (mensagem.role === "assistant") {
      for (const chamada of mensagem.tool_calls ?? []) chamadas.set(chamada.id, chamada);
    }
    if (mensagem.role === "tool") {
      const texto = textoConsulta(chamadas.get(mensagem.tool_call_id), mensagem.content);
      if (texto && !pendentes.includes(texto)) pendentes.push(texto);
      const linhas = linhasDaConsulta(mensagem.content);
      const calculos = calculosDaConsulta(mensagem.content);
      if (linhas.length > linhasPendentes.length) {
        linhasPendentes = linhas;
        if (calculos) calculosPendentes = calculos;
      } else if (!calculosPendentes && calculos) calculosPendentes = calculos;
      for (const bloco of encartesDoConteudo(mensagem.content)) {
        if (!encartesPendentes.includes(bloco)) encartesPendentes.push(bloco);
      }
      continue;
    }
    if (!mensagem.content.trim()) continue;
    if (mensagem.role === "user" && pedidoInterno(mensagem.content)) continue;
    const ultima = pendentes.at(-1);
    blocos.push({
      mensagem,
      consultas: mensagem.role === "assistant" && ultima ? [ultima] : [],
      linhas: mensagem.role === "assistant" ? linhasPendentes : [],
      calculos: mensagem.role === "assistant" ? calculosPendentes : "",
      encartes: mensagem.role === "assistant" ? encartesPendentes : [],
    });
    if (mensagem.role === "assistant") {
      pendentes = [];
      linhasPendentes = [];
      calculosPendentes = "";
      encartesPendentes = [];
    }
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
      if (args.previa) {
        delete args.previa;
        if (typeof args.sql === "string") args.sql = sqlAprovadoInteiro(args.sql);
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

function textoDoValor(valor: number, moeda: boolean) {
  if (!moeda) return valor.toLocaleString("pt-BR");
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function textoDoEixo(valor: number) {
  const arredondado = Math.abs(valor) >= 100 ? Math.round(valor) : valor;
  return arredondado.toLocaleString("pt-BR", { maximumFractionDigits: Math.abs(valor) >= 100 ? 0 : 1 });
}

function faixaDoValor(valor: number, menor: number, maior: number) {
  if (maior === menor) return "mid";
  if (valor === menor) return "low";
  if (valor === maior) return "high";
  return "mid";
}

function rotuloDoEixo(nome: string, detalhe: string) {
  const hora = nome.match(/^(.*)\s(\d{1,2}:\d{2})$/);
  if (hora) return { titulo: hora[1], sub: detalhe || hora[2] };
  return { titulo: nome, sub: detalhe };
}

function Grafico({ texto }: { texto: string }) {
  const { titulo, itens, moeda } = seriesDoGrafico(texto);
  if (!itens.length) return null;
  const menor = Math.min(...itens.map((item) => item.valor));
  const maior = Math.max(...itens.map((item) => item.valor));
  const total = itens.reduce((soma, item) => soma + item.valor, 0);
  const media = total / itens.length;
  const teto = Math.max(maior, 0) || 1;
  const alturaDe = (valor: number) => Math.max(0, Math.min(100, (Math.max(valor, 0) / teto) * 100));
  const marcas = [0, 0.25, 0.5, 0.75].map((passo) => ({
    valor: teto * passo,
    bottom: passo * 100,
  }));
  const resumo = [
    ["Menor", textoDoValor(menor, moeda), "baixo"],
    ["Média", textoDoValor(media, moeda), ""],
    ["Maior", textoDoValor(maior, moeda), "alto"],
  ];
  return (
    <figure className="chat-grafico">
      {titulo ? <h3 className="chat-grafico-titulo">{titulo}</h3> : null}
      <p className="chat-grafico-sub">{itens.length === 1 ? (moeda ? "1 preço" : "1 ponto") : `${itens.length} ${moeda ? "preços" : "pontos"}`}</p>
      <div className="chat-grafico-stats">
        {resumo.map(([rotulo, valor, faixa]) => (
          <div key={rotulo} className={faixa ? `chat-grafico-stat ${faixa}` : "chat-grafico-stat"}>
            <span>{rotulo}</span>
            <strong>{valor}</strong>
          </div>
        ))}
      </div>
      <div className="chat-grafico-plot" role="img" aria-label={titulo || "Gráfico de preços"}>
        {marcas.map((marca) => (
          <span key={marca.bottom} className="chat-grafico-tick" style={{ bottom: `${marca.bottom}%` }}>
            {textoDoEixo(marca.valor)}
          </span>
        ))}
        {media > 0 && media < teto ? (
          <div className="chat-grafico-media" style={{ bottom: `${alturaDe(media)}%` }}>
            <b>média</b>
          </div>
        ) : null}
        <div className="chat-grafico-barras">
          {itens.map((item, indice) => {
            const faixa = faixaDoValor(item.valor, menor, maior);
            return (
              <div
                key={`${item.nome}-${item.detalhe}-${item.valor}-${indice}`}
                className={`chat-grafico-barra ${faixa}`}
                style={{ ["--v" as string]: String(alturaDe(item.valor)) }}
                title={[item.nome, item.detalhe, textoDoValor(item.valor, moeda)].filter(Boolean).join(" · ")}
              >
                <span>{textoDoEixo(item.valor)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="chat-grafico-eixo">
        {itens.map((item, indice) => {
          const eixo = rotuloDoEixo(item.nome, item.detalhe);
          return (
            <div key={`eixo-${item.nome}-${item.detalhe}-${item.valor}-${indice}`}>
              {eixo.titulo}
              {eixo.sub ? <small>{eixo.sub}</small> : null}
            </div>
          );
        })}
      </div>
      <ul className="chat-grafico-lista">
        {itens.map((item, indice) => {
          const faixa = faixaDoValor(item.valor, menor, maior);
          const cor = faixa === "low" ? "var(--low)" : faixa === "high" ? "var(--high)" : "var(--mid)";
          const selo = faixa === "low" ? "menor" : faixa === "high" ? "maior" : "médio";
          return (
            <li key={`lista-${item.nome}-${item.detalhe}-${item.valor}-${indice}`}>
              <span className="chat-grafico-ponto" style={{ background: cor }} />
              <span>{item.detalhe ? `${item.nome} · ${item.detalhe}` : item.nome}</span>
              <strong>{textoDoValor(item.valor, moeda)}</strong>
              <em className={faixa === "low" ? "baixo" : faixa === "high" ? "alto" : ""}>{selo}</em>
            </li>
          );
        })}
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
    if (nome === "encarte") return textoDoEncarte(corpo);
    if (nome === "grafico") return corpo.replace(/\|/g, " ");
    if (nome === "sites") return textoDosSites(corpo);
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

function textoDoEncarte(bruto: string) {
  try {
    const dados = JSON.parse(bruto) as { nome?: string; classificacao?: string; detalhe?: string };
    return [dados.nome, dados.classificacao, dados.detalhe].map((item) => String(item ?? "").trim()).filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

function textoDosSites(bruto: string) {
  try {
    const dados = JSON.parse(bruto) as { trecho?: string; sites?: { nome?: string; dominio?: string }[] };
    const nomes = (dados.sites ?? []).map((site) => site.nome || site.dominio || "").filter(Boolean);
    return [dados.trecho, ...nomes].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

function LogoSite({ src, nome }: { src: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou || !src) return <span className="chat-site-letra">{nome.slice(0, 1)}</span>;
  return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />;
}

function SitesCard({ bruto }: { bruto: string }) {
  let dados: { titulo?: string; trecho?: string; sites?: { nome?: string; dominio?: string; url?: string; imagem?: string }[] } | null = null;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return null;
  }
  const sites = (dados?.sites ?? []).filter((site) => /^https:\/\//.test(String(site.url ?? "")));
  if (!sites.length) return null;
  return (
    <section className="chat-sites">
      <header>
        <h3>{dados?.titulo || "Onde comparar"}</h3>
        {dados?.trecho ? <p>{dados.trecho}</p> : null}
      </header>
      <div className="chat-sites-grade">
        {sites.map((site) => {
          const nome = site.nome || site.dominio || "Site";
          const dominio = String(site.dominio ?? "").replace(/^www\./, "");
          return (
            <a key={nome} href={site.url} target="_blank" rel="noopener noreferrer">
              <LogoSite src={String(site.imagem ?? "")} nome={nome} />
              <strong>{nome}</strong>
              {dominio ? <span>{dominio}</span> : null}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function nomeDoCartao(nome: string) {
  const texto = nome.trim() || "Cliente";
  const corte = texto.match(/^(.*\S)\s+(\([^)]+\))$/);
  if (!corte) return texto;
  return (
    <>
      {corte[1]} <span className="chat-encarte-codigo">{corte[2]}</span>
    </>
  );
}

function detalheDoCartao(texto: string) {
  const match = texto.match(/^(\d+)\s+(.+)$/);
  if (!match) return texto;
  return (
    <>
      <span className="chat-encarte-qtd">{match[1]}</span> {match[2]}
    </>
  );
}

function EncarteCard({ bruto }: { bruto: string }) {
  let dados: { nome?: string; nivel?: string; classificacao?: string; pagamento?: string; detalhe?: string } | null = null;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return null;
  }
  if (!dados || typeof dados !== "object") return null;
  const nivel = ["ouro", "prata", "bronze"].includes(String(dados.nivel)) ? String(dados.nivel) : "";
  const pagamento = dados.pagamento === "atraso" || dados.pagamento === "em-dia" ? dados.pagamento : "";
  const selo = nivel ? `Cliente ${nivel}` : dados.classificacao || "Sem classificação";
  return (
    <article className={`chat-encarte encarte${nivel ? ` nivel-${nivel}` : ""}`}>
      <header>
        <em>{selo}</em>
        <small className={pagamento}>{detalheDoCartao(dados.detalhe || "Sem faturas recentes")}</small>
      </header>
      <strong>{nomeDoCartao(dados.nome || "Cliente")}</strong>
    </article>
  );
}

function FichaCorpo({ texto }: { texto: string }) {
  const campos: { rotulo: string; valor: string }[] = [];
  const processos: string[] = [];
  let nota = "";
  let naLista = false;
  for (const bruta of texto.split("\n")) {
    const linha = bruta.replace(/\*\*/g, "").trim();
    if (!linha) continue;
    if (/^ficha de\b/i.test(linha) || /^relacionamento:/i.test(linha)) continue;
    if (/^processos abertos$/i.test(linha)) {
      naLista = true;
      continue;
    }
    if (/^e mais\b/i.test(linha)) {
      nota = linha;
      continue;
    }
    if (naLista || /^-\s+/.test(linha)) {
      processos.push(linha.replace(/^-\s+/, ""));
      continue;
    }
    const par = linha.match(/^([^:]{2,40}):\s*(.+)$/);
    if (par) campos.push({ rotulo: par[1], valor: par[2] });
  }
  if (!campos.length && !processos.length) return <Fragmento texto={texto} />;
  return (
    <div className="chat-ficha-corpo">
      {campos.length ? (
        <dl>
          {campos.map((campo) => (
            <div key={campo.rotulo}>
              <dt>{campo.rotulo}</dt>
              <dd>{campo.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {processos.length ? (
        <ul className="chat-ficha-processos">
          {processos.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {nota ? <p>{nota}</p> : null}
    </div>
  );
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
  let dados: { assunto?: string; de?: string; data?: string; naoLida?: boolean; alerta?: string; corpo?: string; processo?: string } = {};
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
        {dados.processo ? <em className="processo">{dados.processo}</em> : null}
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
  return texto.replace(/^#{1,6}\s+/, "").replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
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
  const quando = cabeca.match(/^(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2})(?::\d{2})?)?$/);
  const soRelogio = cabeca.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  if (quando || soRelogio) {
    hora = quando ? (quando[2] ? `${quando[1]} ${quando[2]}` : quando[1]) : soRelogio?.[1] || cabeca;
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
    const anterior = md[md.length - 1]?.trim() ?? "";
    const atual = linhas[i].trim();
    if (anterior.startsWith("|") && atual.includes("|")) {
      const semMarcador = atual.replace(/^[-*]\s+/, "");
      const novaLinha = /^[A-Za-z]{1,4}\d{2,6}-\d{2}\b/.test(semMarcador) || semMarcador.startsWith("|");
      if (novaLinha) md.push(semMarcador.startsWith("|") ? semMarcador : `| ${semMarcador}`);
      else md[md.length - 1] = `${anterior} ${semMarcador}`;
      i += 1;
      continue;
    }
    if (!/^[-*]\s+\S/.test(linhas[i]) || atual.startsWith("|")) {
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
                      {data.hora ? <span className="hora"> {data.hora}</span> : null}
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

function chaveCampo(rotulo: string) {
  return rotulo.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function atividadeDoItem(item: ItemLista) {
  const corte = item.titulo.match(/^(.+?)\s+—\s+(.+)$/);
  if (!corte) return null;
  const campos = new Map<string, string>();
  for (const linha of item.linhas) {
    const par = linha.match(/^([^:]+):\s*(.*)$/);
    if (par) campos.set(chaveCampo(par[1]), par[2].trim());
  }
  if (!campos.has("situacao")) return null;
  return {
    codigo: corte[1].trim(),
    nome: corte[2].trim(),
    situacao: campos.get("situacao") || "—",
    responsavel: campos.get("responsavel") || "—",
    previsao: campos.get("previsao") || "—",
    observacao: campos.get("observacao") || "",
    atrasada: /atrasad/i.test(campos.get("situacao") || ""),
  };
}

function AtividadesCard({ titulo, itens, aviso }: { titulo: string; itens: NonNullable<ReturnType<typeof atividadeDoItem>>[]; aviso: string }) {
  return (
    <article className="resposta">
      <header className="prazos-topo">
        <h2>{titulo || "Atividades"}</h2>
        <div className="resumo">
          <span>{itens.length === 1 ? "1 atividade" : `${itens.length} atividades`}</span>
        </div>
      </header>
      <ul className="atividades-lista">
        {itens.map((item, indice) => (
          <li key={`${item.codigo}-${indice}`} className={`atividade-linha${item.atrasada ? " atrasada" : ""}`}>
            <span className="atividade-codigo">{item.codigo}</span>
            <div className="atividade-corpo">
              <p className="atividade-nome">{item.nome}</p>
              <dl className="atividade-meta">
                <div>
                  <dt>Situação</dt>
                  <dd>{item.situacao.replace(/\s*·\s*atrasada/i, "")}</dd>
                </div>
                <div>
                  <dt>Responsável</dt>
                  <dd>{item.responsavel}</dd>
                </div>
                <div>
                  <dt>Previsão</dt>
                  <dd>{item.previsao}</dd>
                </div>
              </dl>
              {item.observacao ? <p className="atividade-nota">{item.observacao}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      {aviso ? <p className="prazos-aviso">{aviso}</p> : null}
    </article>
  );
}

function ListaCard({ titulo, sub, itens, aviso }: { titulo: string; sub: string; itens: ItemLista[]; aviso: string }) {
  const atividades = itens.map(atividadeDoItem).filter((item): item is NonNullable<ReturnType<typeof atividadeDoItem>> => item !== null);
  if (atividades.length > 0 && atividades.length === itens.length) {
    return <AtividadesCard titulo={titulo} itens={atividades} aviso={aviso} />;
  }
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
          const atividade = !tituloEhCodigo ? item.titulo.match(/^(.+?)\s+—\s+(.+)$/) : null;
          const nome = tituloEhCodigo ? item.linhas[0] ?? "" : atividade?.[2] ?? item.titulo;
          const detalhes = tituloEhCodigo ? item.linhas.slice(1) : item.linhas;
          const selo = tituloEhCodigo ? codigo : atividade?.[1] ?? codigo;
          const quando = item.hora.match(/^(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?$/);
          const data = quando?.[1] ?? item.hora;
          const hora = quando?.[2] ?? "";
          const ePendencia = /pend[eê]ncia/i.test(titulo);
          const dias = quando && ePendencia ? diasAte(quando[1]) : null;
          const rotulo = quando ? (ePendencia ? "Previsão" : "Data") : "Hora";
          const tomPrazo = dias == null ? "" : dias <= 0 ? "hoje" : dias <= 7 ? "semana" : "";
          const tom = item.tipo === "del" ? "hoje" : item.tipo === "upd" ? "semana" : tomPrazo;
          return (
            <li key={`${item.titulo}-${item.hora}-${indice}`} className={`prazo-item${tom ? ` ${tom}` : ""}`} style={{ ["--i" as string]: indice }}>
              <div>
                {selo ? <span className="codigo">{selo}</span> : null}
                {nome ? <p className="empresa">{nome}</p> : null}
                {detalhes.map((linha) => (
                  <p key={linha} className="resposta-detalhe">{linha}</p>
                ))}
              </div>
              {item.hora || item.tag ? (
                <div className="datas-prazo">
                  {item.hora ? (
                    <div className="prazo">
                      <span className="rotulo">{rotulo}</span>
                      <span className="data">
                        {data}
                        {hora ? <span className="hora">{hora}</span> : null}
                      </span>
                      {dias != null ? <span className="rel">{rotuloRelativo(dias)}</span> : null}
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
      if (/^(grafico|email|rota|dia|encarte|sites)$/.test(tipo)) return bloco;
      if (!/^(log|painel|json)$/.test(tipo) && !/^[{[]/.test(conteudo)) return bloco;
      try {
        const dados = JSON.parse(conteudo) as { banco?: unknown; itens?: unknown };
        if (dados?.banco) return "```painel\n" + conteudo + "\n```";
        if (Array.isArray(dados?.itens)) {
          if (dados.itens.length) return "```log\n" + conteudo + "\n```";
          const titulo = typeof (dados as { titulo?: unknown }).titulo === "string" ? (dados as { titulo: string }).titulo : "Log";
          return `Nenhum evento em ${titulo}.`;
        }
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
  if (tipo === "grafico" || tipo === "email" || tipo === "rota" || tipo === "dia" || tipo === "encarte") {
    const fechado = `${resto.trimEnd()}\n\`\`\``;
    return antes ? `${antes}\n${fechado}` : fechado;
  }
  return antes;
}

function temCartao(texto: string) {
  return /```(?:log|painel|dia)\b|\{\s*"titulo"\s*:/i.test(texto);
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

function nivelDoTitulo(linha: string) {
  const limpo = linha.replace(/\*\*/g, "").trim().toLowerCase();
  if (limpo === "ouro" || limpo === "prata" || limpo === "bronze") return limpo;
  return "";
}

function agruparRelacionamento(partes: { tipo: string; texto: string }[]) {
  const encartes = partes.filter((parte) => parte.tipo === "encarte");
  const md = partes.filter((parte) => parte.tipo === "md").map((parte) => parte.texto).join("\n");
  if (encartes.length < 2 || partes.some((parte) => parte.tipo !== "md" && parte.tipo !== "encarte") || !/\b(ouro|prata|bronze)\b/i.test(md)) {
    return null;
  }
  const intro: string[] = [];
  const grupos: { nivel: string; titulo: string; cartoes: string[]; nota: string }[] = [];
  let atual: (typeof grupos)[number] | null = null;
  const abrir = (nivel: string) => {
    if (atual) grupos.push(atual);
    const titulo = nivel ? nivel.charAt(0).toUpperCase() + nivel.slice(1) : "Clientes";
    const grupo = { nivel, titulo, cartoes: [] as string[], nota: "" };
    atual = grupo;
    return grupo;
  };
  const tratar = (linha: string) => {
    const nivel = nivelDoTitulo(linha);
    if (nivel) {
      abrir(nivel);
      return;
    }
    const texto = linha.replace(/\*\*/g, "").trim();
    if (!texto) return;
    if (/^e mais\b|^nenhum cliente\b/i.test(texto)) {
      if (atual) atual.nota = atual.nota ? `${atual.nota} ${texto}` : texto;
      return;
    }
    if (!atual) intro.push(texto);
  };
  for (const parte of partes) {
    if (parte.tipo === "encarte") {
      let nivel = "";
      if (!atual) {
        try {
          nivel = String(JSON.parse(parte.texto)?.nivel ?? "");
        } catch {
          nivel = "";
        }
      }
      const grupo = atual ?? abrir(nivel);
      grupo.cartoes.push(parte.texto);
      continue;
    }
    parte.texto.split("\n").forEach(tratar);
  }
  if (atual) grupos.push(atual);
  return grupos.length ? { intro: intro.join(" "), grupos } : null;
}

function RelacionamentoGrupos({ intro, grupos }: { intro: string; grupos: { nivel: string; titulo: string; cartoes: string[]; nota: string }[] }) {
  return (
    <section className="chat-relacionamento">
      {intro ? <h2>{intro}</h2> : null}
      {grupos.map((grupo) => (
        <section key={grupo.titulo} className={`chat-relacao${grupo.nivel ? ` nivel-${grupo.nivel}` : ""}`}>
          <header>
            <em>{grupo.titulo}</em>
            <span>
              {grupo.cartoes.length} {grupo.cartoes.length === 1 ? "cliente" : "clientes"}
            </span>
          </header>
          {grupo.cartoes.length ? (
            <div className="chat-encartes">
              {grupo.cartoes.map((bruto, indice) => (
                <EncarteCard key={`${grupo.titulo}-${indice}`} bruto={bruto} />
              ))}
            </div>
          ) : null}
          {grupo.nota ? <p>{grupo.nota}</p> : null}
        </section>
      ))}
    </section>
  );
}

function Markdown({ texto: bruto, ocultarSql = false, textoCorrido = false }: { texto: string; ocultarSql?: boolean; textoCorrido?: boolean }) {
  let texto = bruto;
  const partes: { tipo: "md" | "grafico" | "email" | "rota" | "encarte" | "sites"; texto: string }[] = [];
  const normal = normalizarCartoes(texto);
  if (textoCorrido) {
    return normal ? <TextoResposta texto={ocultarSql ? semSql(normal) : normal} /> : null;
  }
  const dia = diaDoTexto(normal);
  if (dia) return <DiaCard dia={dia} />;
  const painel = painelDoTexto(normal);
  if (painel && !/\|[^\n]+\|/.test(normal)) return <PainelTiCard painel={painel} />;
  const log = logDoTexto(normal);
  if (log?.itens.length) return <LogCard log={log} />;
  if (!normal) return null;
  texto = normal;
  const regra = /```(grafico|email|rota|encarte|sites)\s*\n([\s\S]*?)```/gi;
  let cursor = 0;
  for (const achado of texto.matchAll(regra)) {
    const inicio = achado.index ?? 0;
    if (inicio > cursor) {
      const md = abrirLista(moedasDoChat(setasDoChat(ocultarSql ? semSql(texto.slice(cursor, inicio)) : texto.slice(cursor, inicio))));
      if (md.trim()) partes.push({ tipo: "md", texto: md });
    }
    const nome = achado[1].toLowerCase();
    const tipo = nome === "email" ? "email" : nome === "rota" ? "rota" : nome === "encarte" ? "encarte" : nome === "sites" ? "sites" : "grafico";
    partes.push({ tipo, texto: achado[2] });
    cursor = inicio + achado[0].length;
  }
  if (cursor < texto.length) {
    const md = abrirLista(moedasDoChat(setasDoChat(ocultarSql ? semSql(texto.slice(cursor)) : texto.slice(cursor))));
    if (md.trim()) partes.push({ tipo: "md", texto: md });
  }
  const encartes = partes.filter((parte) => parte.tipo === "encarte");
  const textoFicha = partes
    .filter((parte) => parte.tipo === "md")
    .map((parte) => parte.texto)
    .join("\n\n");
  const fichaUnica = encartes.length === 1 && partes.every((parte) => parte.tipo === "encarte" || parte.tipo === "md") && /\bficha de\b|\bvendedor:/i.test(textoFicha);
  if (fichaUnica) {
    return (
      <section className="chat-ficha">
        <EncarteCard bruto={encartes[0].texto} />
        <FichaCorpo texto={textoFicha} />
      </section>
    );
  }
  const relacao = agruparRelacionamento(partes);
  if (relacao) return <RelacionamentoGrupos intro={relacao.intro} grupos={relacao.grupos} />;
  const desenhar = (parte: (typeof partes)[number], indice: number) =>
    parte.tipo === "grafico" ? (
      <Grafico key={indice} texto={parte.texto} />
    ) : parte.tipo === "email" ? (
      <EmailCard key={indice} bruto={parte.texto} />
    ) : parte.tipo === "rota" ? (
      <RotaCard key={indice} bruto={parte.texto} />
    ) : parte.tipo === "encarte" ? (
      <EncarteCard key={indice} bruto={parte.texto} />
    ) : parte.tipo === "sites" ? (
      <SitesCard key={indice} bruto={parte.texto} />
    ) : (
      <Fragmento key={indice} texto={parte.texto} />
    );
  const saida: ReactNode[] = [];
  let fila: { parte: (typeof partes)[number]; indice: number }[] = [];
  const soltarEncartes = () => {
    if (!fila.length) return;
    if (fila.length > 1) {
      saida.push(
        <div className="chat-encartes" key={`encartes-${fila[0].indice}`}>
          {fila.map((item) => desenhar(item.parte, item.indice))}
        </div>,
      );
    } else {
      saida.push(desenhar(fila[0].parte, fila[0].indice));
    }
    fila = [];
  };
  partes.forEach((parte, indice) => {
    if (parte.tipo === "encarte") {
      fila.push({ parte, indice });
      return;
    }
    soltarEncartes();
    saida.push(desenhar(parte, indice));
  });
  soltarEncartes();
  return <>{saida}</>;
}

function extrairEncartes(texto: string) {
  return [...texto.matchAll(/```encarte\s*\n[\s\S]*?```/gi)].map((achado) => achado[0]);
}

function encartesDoConteudo(conteudo: string) {
  return extrairEncartes(textoDaConsulta(conteudo) || "");
}

function nomeDoEncarte(bloco: string) {
  const corpo = bloco.match(/```encarte\s*\n([\s\S]*?)```/i)?.[1] ?? "";
  try {
    const dados = JSON.parse(corpo) as { nome?: string };
    return String(dados.nome ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function garantirEncartes(texto: string, encartes: string[] = []) {
  if (!encartes.length) return texto;
  const presentes = new Set(extrairEncartes(texto).map(nomeDoEncarte).filter(Boolean));
  const faltam = encartes.filter((bloco) => {
    const nome = nomeDoEncarte(bloco);
    return nome ? !presentes.has(nome) : !texto.includes(bloco);
  });
  if (!faltam.length) return texto;
  return [...faltam, texto.trim()].filter(Boolean).join("\n\n");
}

function textoSemListaGrande(texto: string): string {
  const encartes = extrairEncartes(texto);
  const corpo = texto.replace(/```encarte\s*\n[\s\S]*?```/gi, "").trim();
  if (/\bficha de\b/i.test(corpo)) {
    const resumo = corpo
      .replace(/\nProcessos abertos\n(?:[ \t]*- .*(?:\n|$))+/i, "\n")
      .replace(/\nMostrei \d+ de \d+[^\n]*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return [encartes.join("\n\n"), resumo].filter(Boolean).join("\n\n");
  }
  const corte = corpo.search(/\nMostrei \d+ de \d+/);
  if (corte >= 0) {
    const resto = corpo.slice(corte).replace(/^\n?Mostrei \d+ de \d+[^\n]*\n?/, "").trim();
    return [encartes.join("\n\n"), resto].filter(Boolean).join("\n\n");
  }
  if ((corpo.match(/\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/g) ?? []).length > 12) return encartes.join("\n\n");
  return [encartes.join("\n\n"), corpo].filter(Boolean).join("\n\n");
}

function linhasDoCalculo(calculos: string) {
  return calculos
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.startsWith("- "))
    .map((linha) => linha.replace(/^- /, ""));
}

function ListaConsulta({ linhas, calculos = "" }: { linhas: Record<string, unknown>[]; calculos?: string }) {
  const [todos, setTodos] = useState(false);
  const colunas = Object.keys(linhas[0] ?? {}).filter((coluna) => !/^id/i.test(coluna)).slice(0, 6);
  const recentes = 12;
  const visiveis = todos ? linhas : linhas.slice(0, recentes);
  const totais = linhasDoCalculo(calculos);
  return (
    <div className="chat-lista-consulta">
      <div className="chat-relatorio-topo">
        <div>
          <span>Lista</span>
          <strong>{todos ? "Todos os registros" : "Na ordem da consulta"}</strong>
          <small>
            {linhas.length} {linhas.length === 1 ? "registro" : "registros"}
            {todos || linhas.length <= recentes ? "" : ` · mostrando ${visiveis.length}`}
          </small>
        </div>
        {linhas.length > recentes ? (
          <div className="chat-relatorio-acoes">
            <button type="button" className="chat-ver-consulta" onClick={() => setTodos((atual) => !atual)}>
              {todos ? "Mostrar os primeiros" : `Ver todos (${linhas.length})`}
            </button>
          </div>
        ) : null}
      </div>
      {totais.length ? (
        <ul className="chat-lista-totais">
          {totais.map((item, indice) => (
            <li key={`${indice}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="chat-relatorio-tabela-wrap">
        <table className="chat-relatorio-tabela">
          <thead>
            <tr>{colunas.map((coluna) => <th key={coluna}>{coluna.replaceAll("_", " ")}</th>)}</tr>
          </thead>
          <tbody>
            {visiveis.map((linha, indice) => (
              <tr key={indice}>
                {colunas.map((coluna) => (
                  <td key={coluna} className={/processo|numero/i.test(coluna) ? "chat-lista-processo" : undefined}>
                    {formatarDatasNoTexto(String(linha[coluna] ?? ""))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
      {formatarDatasNoTexto(texto)}
    </ReactMarkdown>
  );
}

function atividadesDoTexto(texto: string) {
  const linhas = texto.replace(/\r/g, "").split("\n");
  const titulo = limparMarcacao((linhas.find((linha) => /^#{1,6}\s+/.test(linha.trim())) ?? "").replace(/^#{1,6}\s+/, "")) || "Atividades";
  const itens: NonNullable<ReturnType<typeof atividadeDoItem>>[] = [];
  let atual: NonNullable<ReturnType<typeof atividadeDoItem>> | null = null;
  const fechar = () => {
    if (atual?.situacao) itens.push(atual);
    atual = null;
  };
  const abrir = (codigo: string, nome: string) => {
    fechar();
    atual = { codigo, nome, situacao: "", responsavel: "—", previsao: "—", observacao: "", atrasada: false };
  };
  const guardarCampo = (rotulo: string, valor: string) => {
    if (!atual) return;
    const chave = chaveCampo(rotulo);
    const limpo = valor.replace(/\*\*/g, "").trim();
    if (chave === "situacao") {
      atual.situacao = limpo;
      atual.atrasada = /atrasad/i.test(limpo);
    } else if (chave === "responsavel") atual.responsavel = limpo || "—";
    else if (chave === "previsao") atual.previsao = limpo || "—";
    else if (chave === "observacao") atual.observacao = limpo;
  };
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha || /^#{1,6}\s+/.test(linha)) continue;
    const aninhado = bruta.match(/^\s+-\s+(.+)$/);
    const negrito = !aninhado ? linha.match(/^\*\*(.+)\*\*$/) : null;
    const topo = !aninhado ? linha.match(/^-\s+(.+)$/) : null;
    if (negrito) {
      const nome = negrito[1].replace(/\*\*/g, "").split(/\s+[·—–]\s+/);
      if (nome.length >= 2) abrir(nome[0].trim(), nome.slice(1).join(" ").trim());
      continue;
    }
    if (topo) {
      const cabeca = topo[1].replace(/\*\*/g, "").trim();
      const nome = cabeca.split(/\s+[—–]\s+|\s+·\s+/);
      const rotulo = chaveCampo(nome[0].split(":")[0] || "");
      if (nome.length >= 2 && !["situacao", "responsavel", "previsao", "observacao"].includes(rotulo)) {
        abrir(nome[0].trim(), nome.slice(1).join(" ").trim());
        continue;
      }
    }
    const bullet = (aninhado?.[1] || topo?.[1] || "").replace(/\*\*/g, "").trim();
    if (!bullet || !atual) continue;
    if (/^previs/i.test(bullet)) {
      guardarCampo("Previsão", bullet.replace(/^previs\S*\s*/i, ""));
      continue;
    }
    const par = bullet.match(/^([^:]+):\s*(.*)$/);
    if (par) guardarCampo(par[1], par[2]);
  }
  fechar();
  return itens.length ? { titulo, itens } : null;
}

function Fragmento({ texto }: { texto: string }) {
  const atividades = atividadesDoTexto(texto);
  if (atividades) return <AtividadesCard titulo={atividades.titulo} itens={atividades.itens} aviso="" />;
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
      detalhe: "Visão financeira. Valores, taxas, comissões, prazos e comparação de passagens.",
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

function AvatarConta({ nome, email, foto, grande = false }: { nome?: string; email: string; foto?: string; grande?: boolean }) {
  const letra = (nome || email || "?").trim().slice(0, 1).toUpperCase() || "?";
  const classe = `chat-conta-avatar${grande ? " grande" : ""}`;
  if (foto) return <img className={classe} src={foto} alt="" referrerPolicy="no-referrer" />;
  return <span className={classe}>{letra}</span>;
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
  visao = "gerencia",
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
  const horasMiniRef = useRef<string[]>([]);
  const enviarRef = useRef<(conteudo: string) => void>(() => {});
  const [temaClaro, setTemaClaro] = useState(() => document.documentElement.classList.contains("tema-claro"));
  const [erro, setErro] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const focoMensagemRef = useRef<number | null>(null);
  const abortarRef = useRef<AbortController | null>(null);
  const canceladoRef = useRef(false);
  const modoRelatorioRef = useRef(false);
  const consultaTotalRef = useRef("");
  const apresentacaoRef = useRef(false);
  const entradaRef = useRef<HTMLTextAreaElement>(null);
  const [memoriaAberta, setMemoriaAberta] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [consumoIa, setConsumoIa] = useState<{
    chamadas: number;
    entrada: number;
    saida: number;
    total: number;
    raciocinio: number;
    ocupacao: number;
    pico: number;
    contexto: number;
    conversas: ConsumoConversa[];
  } | null>(null);
  const [abaConfig, setAbaConfig] = useState<"contas" | "sqlite" | "consumo">("contas");
  const [iaConsumo, setIaConsumo] = useState<IaConsumo>("google");
  const [saldoIa, setSaldoIa] = useState<SaldoIa | null>(null);
  const [bancosSqlite, setBancosSqlite] = useState<{ arquivo: string; tabelas: { nome: string; total: number }[] }[]>([]);
  const [arquivoSqlite, setArquivoSqlite] = useState("");
  const [tabelaSqlite, setTabelaSqlite] = useState("");
  const [gradeSqlite, setGradeSqlite] = useState<{
    colunas: string[];
    linhas: Array<Record<string, string> & { _linha?: number }>;
    total: number;
    pagina: number;
    paginas: number;
  } | null>(null);
  const [linhaSqlite, setLinhaSqlite] = useState<{ id: number; colunas: string[]; valores: Record<string, string> } | null>(null);
  const [erroSqlite, setErroSqlite] = useState("");
  const [carregandoSqlite, setCarregandoSqlite] = useState(false);
  const [inicioAberto, setInicioAberto] = useState(true);
  const [abaAbertura, setAbaAbertura] = useState<"consultas" | "relatorios">("consultas");
  const chaveRelatorios = `maicon-relatorios:${email || "local"}`;
  const [relatoriosSalvos, setRelatoriosSalvos] = useState<{ titulo: string; pergunta: string }[]>(() => {
    try {
      const salvos = JSON.parse(localStorage.getItem(chaveRelatorios) || "[]") as unknown;
      return Array.isArray(salvos) ? salvos.filter((item) => item && typeof item.pergunta === "string") : [];
    } catch {
      return [];
    }
  });
  function guardarRelatorio(pergunta: string, titulo = "") {
    const pedido = pergunta.replace(/\s+/g, " ").trim();
    if (!pedido) return;
    const nome = titulo.trim() || pedido.replace(/^pedir relatório d[eoa]s?\s+/i, "").replace(/\.$/, "").slice(0, 72) || "Relatório";
    setRelatoriosSalvos((atual) => {
      const proximos = [{ titulo: nome, pergunta: pedido }, ...atual.filter((item) => item.pergunta !== pedido)].slice(0, 12);
      localStorage.setItem(chaveRelatorios, JSON.stringify(proximos));
      return proximos;
    });
  }
  function esquecerRelatorio(pergunta: string) {
    setRelatoriosSalvos((atual) => {
      const proximos = atual.filter((item) => item.pergunta !== pergunta);
      localStorage.setItem(chaveRelatorios, JSON.stringify(proximos));
      return proximos;
    });
  }
  const [consultasAbertas, setConsultasAbertas] = useState(false);
  const [lateralRecolhida, setLateralRecolhida] = useState(() => sessionStorage.getItem("maicon-lateral") === "1");
  const [visoesAbertas, setVisoesAbertas] = useState(false);
  const [telaLateral, setTelaLateral] = useState<"menu" | "conversas">("menu");
  const [chaves, setChaves] = useState<{ id: string; provedor: string; rotulo: string; final: string }[]>([]);
  const [novaChave, setNovaChave] = useState({ provedor: "openrouter", rotulo: "", chave: "" });
  const [filtroContas, setFiltroContas] = useState("");
  const [contas, setContas] = useState<
    {
      email: string;
      nome: string;
      foto?: string;
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
  const [conversaDe, setConversaDe] = useState("");
  const conversaDeRef = useRef("");
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
  const [avisoMemoria, setAvisoMemoria] = useState("");
  const arquivoMemoriaRef = useRef<HTMLInputElement>(null);

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

  function exportarMemoria() {
    const pacote = {
      tipo: "maicon-memoria",
      preferencias: preferencias.map(({ termo, tabela, campo, observacao }) => ({ termo, tabela, campo, observacao })),
      glossario,
    };
    const arquivo = new Blob([JSON.stringify(pacote, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = "maicon-memoria.json";
    link.click();
    URL.revokeObjectURL(url);
    setAvisoMemoria("Arquivo baixado. Importe esse JSON no Maicon da rede.");
    setErroMemoria("");
  }

  async function importarMemoria(arquivo: File) {
    setErroMemoria("");
    setAvisoMemoria("");
    let pacote: unknown;
    try {
      pacote = JSON.parse(await arquivo.text());
    } catch {
      setErroMemoria("O arquivo não é um JSON válido.");
      return;
    }
    const resp = await fetch(`${api}/api/memoria/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pacote),
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setErroMemoria(dados.erro || "Não importei a memória.");
      return;
    }
    await carregarMemoria();
    const prefs = Number(dados.preferencias) || 0;
    const termos = Number(dados.glossario) || 0;
    setAvisoMemoria(`Importei ${prefs} preferência${prefs === 1 ? "" : "s"} e ${termos} termo${termos === 1 ? "" : "s"}.`);
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
    const foco = focoMensagemRef.current;
    if (foco !== null) {
      focoMensagemRef.current = null;
      setBuscaAlvo(foco);
      window.setTimeout(() => {
        document.getElementById(`chat-msg-${foco}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      return;
    }
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
    consultaTotalRef.current = "";
    apresentacaoRef.current = false;
    setInicioAberto(false);
    setAbaAbertura("consultas");
    setConsultasAbertas(false);
    conversaIdRef.current = null;
    setConversaId(null);
    conversaDeRef.current = "";
    setConversaDe("");
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

  function htmlMini(valor: string) {
    const escaparTexto = (texto: string) => texto.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
    const inline = (texto: string) => escaparTexto(texto).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<b>$1</b>");
    const textoDoValor = (dado: unknown, profundidade = 0): string => {
      if (profundidade > 2 || dado == null) return "";
      if (typeof dado === "string" || typeof dado === "number") return String(dado).trim();
      if (Array.isArray(dado)) return dado.map((item) => textoDoValor(item, profundidade + 1)).filter(Boolean).map((item) => `- ${item}`).join("\n");
      if (typeof dado === "object") {
        return Object.entries(dado as Record<string, unknown>)
          .filter(([chave, item]) => item != null && item !== "" && !/^id/i.test(chave))
          .slice(0, 12)
          .map(([chave, item]) => {
            const corpo = textoDoValor(item, profundidade + 1);
            return corpo ? `- ${chave.replaceAll("_", " ")}: ${corpo.replace(/\n/g, " ")}` : "";
          })
          .filter(Boolean)
          .join("\n");
      }
      return "";
    };
    let fonte = semBlocoAberto(valor).replace(/\r/g, "");
    fonte = fonte.replace(/```[a-z]*[^\S\n]*\n?([\s\S]*?)```/gi, (_bloco, corpo: string) => {
      const texto = corpo.trim();
      if (!texto) return "";
      if (/^[{\[]/.test(texto)) {
        try {
          return textoDoValor(JSON.parse(texto));
        } catch {
          return "";
        }
      }
      return texto;
    });
    fonte = fonte
      .split("\n")
      .map((linha) => {
        const partes = linha.split(/\s+-\s+(?=\*\*|[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/);
        if (partes.length < 3) return linha;
        return partes.map((parte, indice) => (indice === 0 ? parte.trim() : `- ${parte.trim()}`)).join("\n");
      })
      .join("\n");
    const partir = (corpo: string) => {
      const marcado = corpo.match(/^\*\*([^*]+)\*\*:?\s*([\s\S]*)$/);
      if (marcado) return [marcado[1].replace(/:$/, ""), marcado[2]] as const;
      const nota = corpo.match(/^(Última nota\s*\([^)]*\)):\s*([\s\S]+)$/);
      if (nota) return [nota[1], nota[2]] as const;
      const simples = corpo.match(/^([A-Za-zÀ-ú0-9][^:\n]{1,42}):\s+([\s\S]+)$/);
      if (simples && !/[.!?]$/.test(simples[1])) return [simples[1], simples[2]] as const;
      return null;
    };
    const blocos: string[] = [];
    let tabela: string[] | null = null;
    const fecharTabela = () => {
      if (!tabela) return;
      const linhas = tabela.filter((linha) => !/^\|?\s*:?-{2,}/.test(linha.replace(/\|/g, "").trim()));
      linhas.forEach((linha, indice) => {
        const celulas = linha.split("|").map((celula) => celula.trim()).filter(Boolean);
        if (!celulas.length) return;
        if (indice === 0) blocos.push(`<strong class="titulo">${inline(celulas.join(" · "))}</strong>`);
        else blocos.push(`<div class="linha">${celulas.map((celula) => inline(celula)).join(" · ")}</div>`);
      });
      tabela = null;
    };
    for (const linha of fonte.split("\n")) {
      const texto = linha.trim();
      if (texto.startsWith("|")) {
        tabela = tabela ?? [];
        tabela.push(texto);
        continue;
      }
      fecharTabela();
      if (!texto) {
        if (blocos.length && !blocos[blocos.length - 1].includes('class="espaco"')) blocos.push(`<div class="espaco"></div>`);
        continue;
      }
      const titulo = texto.match(/^#{1,6}\s+(.*)$/);
      const item = texto.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (titulo || (!item && !texto.includes(":") && texto.length <= 32 && texto.split(/\s+/).length <= 4 && !/[.!?]$/.test(texto))) {
        blocos.push(`<strong class="titulo">${inline(titulo ? titulo[1] : texto)}</strong>`);
        continue;
      }
      const corpo = (item ? item[1] : texto).trim();
      const rotulo = partir(corpo);
      if (rotulo) {
        blocos.push(`<div class="linha"><b>${inline(rotulo[0])}</b> ${inline(rotulo[1])}</div>`);
        continue;
      }
      blocos.push(`<div class="linha">${inline(corpo)}</div>`);
    }
    fecharTabela();
    return blocos.join("");
  }

  function pintarMiniChat(janela: Window) {
    const lista = janela.document.getElementById("msgs");
    const campo = janela.document.getElementById("campo") as HTMLTextAreaElement | null;
    const chips = janela.document.getElementById("chips");
    if (!lista) return;
    const escapar = (valor: string) => valor.replace(/[&<>"]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"));
    const horaAgora = () => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    if (!mensagens.length) horasMiniRef.current = [];
    const visiveis: { classe: string; texto: string; indice: number }[] = [];
    mensagens.forEach((item, indice) => {
      if (item.role === "tool" || !("content" in item)) return;
      const bruto = textoVisivel(item.content);
      const texto = item.role === "user" ? textoMini(bruto) : htmlMini(bruto);
      if (!texto) return;
      visiveis.push({ classe: item.role === "user" ? "eu" : "ia", texto, indice });
    });
    if (horasMiniRef.current.length > mensagens.length) horasMiniRef.current.length = mensagens.length;
    const itens = visiveis.slice(-8).map((item) => {
      if (!horasMiniRef.current[item.indice]) horasMiniRef.current[item.indice] = horaAgora();
      return `<div class="item ${item.classe}"><div class="bolha">${item.classe === "eu" ? escapar(item.texto) : item.texto}</div><time>${horasMiniRef.current[item.indice]}</time></div>`;
    });
    lista.innerHTML = itens.join("");
    lista.scrollTop = lista.scrollHeight;
    if (chips) {
      const area = admin ? (visao === "inside" ? "comercial" : visao === "tudo" ? "gerencia" : visao) : setor;
      const base = SUGESTOES_SETOR[area] ?? (pode.log ? SUGESTOES : SUGESTOES.filter((s) => s.titulo === "Cliente do processo"));
      const processo = painel?.processos?.find((item) => item.processo && !/TESTE|DEMU/i.test(item.processo))?.processo ?? "";
      const prontas = comProcesso(base, processo, modalidade).filter((s) => !permissoes?.semComissao || !/comiss/i.test(s.titulo));
      chips.innerHTML = prontas.map((item) => {
        const contorno = (CONTORNO as readonly string[]).includes(item.icone);
        const svg = contorno
          ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONES[item.icone]}"/></svg>`
          : `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="${ICONES[item.icone]}"/></svg>`;
        return `<button type="button" data-pergunta="${escapar(item.pergunta)}"><span>${svg}</span>${escapar(item.titulo)}</button>`;
      }).join("");
    }
    const formulario = janela.document.getElementById("envio");
    if (!janela.document.getElementById("mini-giro")) {
      const estilo = janela.document.createElement("style");
      estilo.id = "mini-giro";
      estilo.textContent = `@property --giro{syntax:"<angle>";inherits:false;initial-value:0deg}form.ocupado{border:2px solid transparent;background:linear-gradient(#1b1c22,#1b1c22) padding-box,conic-gradient(from var(--giro),#3a3d46 0turn,#e53935 1turn) border-box;animation:giro 1s linear infinite}@keyframes giro{to{--giro:1turn}}html.claro form.ocupado{background:linear-gradient(#fff,#fff) padding-box,conic-gradient(from var(--giro),#d5d8e0 0turn,#c62828 1turn) border-box}`;
      janela.document.head.appendChild(estilo);
    }
    formulario?.classList.toggle("ocupado", ocupado);
    if (formulario) formulario.setAttribute("aria-busy", ocupado ? "true" : "false");
    const botao = janela.document.getElementById("enviar") as HTMLButtonElement | null;
    if (botao) botao.disabled = ocupado;
  }

  function desenharMiniChat(janela: Window) {
    const doc = janela.document;
    doc.documentElement.lang = "pt-BR";
    doc.title = "Maicon AI";
    doc.head.innerHTML = `<style>
      *{box-sizing:border-box}
      html,body{margin:0;height:100%;background:#141518;color:#e8eaef;font:15px/1.45 "Segoe UI",system-ui,sans-serif}
      body{display:flex;flex-direction:column;height:100%}
      header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.07);background:#141518}
      .marca{width:30px;height:30px;border-radius:50px;background:linear-gradient(135deg,#b71c1c,#e53935);display:grid;place-items:center;flex:none;box-shadow:0 4px 12px rgba(229,57,53,.25)}
      .marca img{width:17px;height:17px;object-fit:contain}
      header strong{font-size:14.5px;font-weight:680;letter-spacing:-.01em}
      #msgs{flex:1;overflow-y:auto;padding:18px 8px 18px 16px;margin-right:4px;display:flex;flex-direction:column;gap:14px;scrollbar-width:thin;scrollbar-color:transparent transparent;transition:scrollbar-color .2s}
      #msgs:hover{scrollbar-color:#3b3c45 transparent}
      #msgs::-webkit-scrollbar{width:8px}
      #msgs::-webkit-scrollbar-track{background:transparent;margin:8px 0}
      #msgs::-webkit-scrollbar-thumb{background:transparent;border-radius:999px;border:2px solid transparent;background-clip:content-box}
      #msgs:hover::-webkit-scrollbar-thumb{background:#3b3c45;background-clip:content-box}
      #msgs::-webkit-scrollbar-thumb:hover{background:#565864;background-clip:content-box}
      .item{display:flex;flex-direction:column;gap:4px;max-width:88%}
      .item.eu{align-self:flex-end;align-items:flex-end}
      .item.ia{align-self:flex-start;align-items:flex-start;max-width:96%}
      .bolha{margin:0;padding:10px 14px;white-space:pre-wrap;font-size:14px;line-height:1.45;overflow-wrap:anywhere}
      .item.eu .bolha{color:#fff;background:#c62828;border-radius:16px 16px 6px 16px}
      .item.ia .bolha{color:#e8eaef;background:#2a2d36;border-radius:16px 16px 16px 6px;white-space:normal;display:flex;flex-direction:column;gap:6px}
      .bolha .titulo{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#ff8a80}
      .bolha .linha{margin:0;line-height:1.4}
      .bolha .linha b{color:#fff;font-weight:700}
      .bolha .espaco{height:8px}
      .item time{color:#8b93a3;font-size:11px}
      .consultas{padding:0 14px 8px}
      .consultas>span{display:block;margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8b93a3}
      .chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
      .chips::-webkit-scrollbar{display:none}
      .chips button{flex:none;display:flex;align-items:center;gap:8px;padding:7px 12px 7px 7px;border:1px solid #2a2f3c;border-radius:12px;background:#171a21;color:#e8eaef;font:inherit;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer}
      .chips button:hover{border-color:rgba(229,57,53,.6)}
      .chips button span{width:26px;height:26px;display:grid;place-items:center;border-radius:8px;color:#ff6b5e;background:rgba(255,107,94,.14)}
      form{position:relative;display:flex;align-items:flex-end;gap:8px;margin:0 12px 8px;padding:5px 5px 5px 14px;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:#1b1c22;transition:border-color .15s}
      form:focus-within{border-color:rgba(229,57,53,.6)}
      @property --giro{syntax:"<angle>";inherits:false;initial-value:0deg}
      form.ocupado{border:2px solid transparent;background:linear-gradient(#1b1c22,#1b1c22) padding-box,conic-gradient(from var(--giro),#3a3d46 0turn,#e53935 1turn) border-box;animation:giro 1s linear infinite}
      @keyframes giro{to{--giro:1turn}}
      textarea{position:relative;z-index:1;flex:1;resize:none;height:22px;max-height:96px;margin:8px 0;border:0;outline:none;background:transparent;color:#e8eaef;font:inherit;font-size:14px;line-height:1.5}
      textarea::placeholder{color:#7c8596}
      #enviar{position:relative;z-index:1;flex:none;width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:50%;color:#fff;background:#c62828;cursor:pointer;transition:transform .15s,opacity .15s}
      #enviar:hover:not(:disabled){transform:scale(1.06)}
      #enviar:disabled{opacity:.35;cursor:default}
      .dica{margin:0 0 10px;text-align:center;color:#5d6577;font-size:11px}
      html.claro,html.claro body{background:#f3f5f8;color:#161a24}
      html.claro header{background:#f3f5f8;border-bottom-color:rgba(20,30,60,.08)}
      html.claro header strong{color:#161a24}
      html.claro #msgs:hover{scrollbar-color:#c5cad3 transparent}
      html.claro #msgs:hover::-webkit-scrollbar-thumb{background:#c5cad3;background-clip:content-box}
      html.claro #msgs::-webkit-scrollbar-thumb:hover{background:#a8b0bc;background-clip:content-box}
      html.claro .item.ia .bolha{color:#161a24;background:#fff;border:1px solid #e4e7ee}
      html.claro .bolha .titulo{color:#c62828}
      html.claro .bolha .linha b{color:#161a24}
      html.claro .item time,html.claro .consultas>span,html.claro .dica{color:#6b7384}
      html.claro .chips button{background:#fff;color:#161a24;border-color:#dfe2ea}
      html.claro .chips button:hover{border-color:#e53935}
      html.claro .chips button span{color:#e53935;background:rgba(229,57,53,.1)}
      html.claro form{background:#fff;border-color:rgba(20,30,60,.12)}
      html.claro form:focus-within{border-color:rgba(198,40,40,.55)}
      html.claro form.ocupado{background:linear-gradient(#fff,#fff) padding-box,conic-gradient(from var(--giro),#d5d8e0 0turn,#c62828 1turn) border-box}
      html.claro textarea{color:#161a24}
      html.claro textarea::placeholder{color:#8b93a3}
    </style>`;
    doc.body.innerHTML = `<header><span class="marca"><img src="${logoMaicon}" alt=""></span><strong>Maicon AI</strong></header><div id="msgs"></div><section class="consultas"><span>Consultas prontas</span><div id="chips" class="chips"></div></section><form id="envio"><span class="giro" aria-hidden="true"></span><textarea id="campo" rows="1" placeholder="Pergunte sobre um processo…"></textarea><button id="enviar" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="${ICONES.enviar}"/></svg></button></form><p class="dica">Enter envia · Shift+Enter quebra linha</p>`;
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
    const aoClicar = (evento: Event) => {
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
    };
    doc.getElementById("chips")?.addEventListener("click", aoClicar);
    doc.documentElement.classList.toggle("claro", document.documentElement.classList.contains("tema-claro"));
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
    const aberta = (window as Window & { documentPictureInPicture?: { window: Window | null } }).documentPictureInPicture?.window;
    if (aberta && !aberta.closed) pipRef.current = aberta;
    const janela = pipRef.current;
    if (!janela || janela.closed) return;
    pintarMiniChat(janela);
  }, [mensagens, ocupado, visao, setor, admin, modalidade, painel]);

  useEffect(() => {
    const janela = pipRef.current;
    if (!janela || janela.closed) return;
    janela.document.documentElement.classList.toggle("claro", temaClaro);
  }, [temaClaro]);

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
      await navigator.clipboard.writeText(formatarDatasNoTexto(semMençãoPdf(respostaSemPayload(texto))).trim());
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

  useEffect(() => {
    if (configAberta && admin) void carregarConsumo(iaConsumo);
  }, [configAberta, admin, email, api, iaConsumo]);

  useEffect(() => {
    if (!admin || !email || !configAberta || abaConfig !== "consumo") return;
    let ativo = true;
    const carregar = () => {
      void fetch(`${api}/api/ia/saldo`)
        .then((resp) => (resp.ok ? resp.json() : null))
        .then((dados) => {
          if (ativo && dados?.google) setSaldoIa(dados);
        })
        .catch(() => {});
    };
    carregar();
    const timer = window.setInterval(carregar, 12000);
    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, [admin, email, api, ocupado, configAberta, abaConfig]);

  async function carregarConsumo(modelo: IaConsumo = iaConsumo) {
    if (!email || !admin) return;
    const resp = await fetch(`${api}/api/ia/consumo?modelo=${modelo}`);
    const dados = await resp.json().catch(() => null);
    if (resp.ok && dados && typeof dados.total === "number") {
      setConsumoIa({ ...dados, conversas: Array.isArray(dados.conversas) ? dados.conversas : [] });
    }
  }

  async function carregarContas() {
    if (!email) return;
    const resp = await fetch(`${api}/api/contas?email=${encodeURIComponent(email)}`);
    const dados = await resp.json();
    if (resp.ok && Array.isArray(dados.contas)) setContas(dados.contas);
  }

  useEffect(() => {
    if (configAberta && admin && foto) void carregarContas();
  }, [foto, configAberta, admin]);

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

  async function carregarSqlite(arquivo = arquivoSqlite, tabela = tabelaSqlite, pagina = 1) {
    if (!email || !admin) return;
    setCarregandoSqlite(true);
    setErroSqlite("");
    setLinhaSqlite(null);
    const catalogo = await fetch(`${api}/api/sqlite`);
    const lista = await catalogo.json().catch(() => ({}));
    if (!catalogo.ok) {
      setErroSqlite(lista.erro || "Não consegui ler o SQLite.");
      setCarregandoSqlite(false);
      return;
    }
    const bancos = Array.isArray(lista.bancos) ? lista.bancos : [];
    setBancosSqlite(bancos);
    const arquivoAtual = bancos.some((banco: { arquivo: string }) => banco.arquivo === arquivo) ? arquivo : bancos[0]?.arquivo || "";
    const tabelas = bancos.find((banco: { arquivo: string }) => banco.arquivo === arquivoAtual)?.tabelas ?? [];
    const tabelaAtual = tabelas.some((item: { nome: string }) => item.nome === tabela) ? tabela : tabelas[0]?.nome || "";
    setArquivoSqlite(arquivoAtual);
    setTabelaSqlite(tabelaAtual);
    if (!arquivoAtual || !tabelaAtual) {
      setGradeSqlite(null);
      setCarregandoSqlite(false);
      return;
    }
    const resp = await fetch(
      `${api}/api/sqlite/linhas?arquivo=${encodeURIComponent(arquivoAtual)}&tabela=${encodeURIComponent(tabelaAtual)}&pagina=${pagina}`,
    );
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setErroSqlite(dados.erro || "Não consegui ler a tabela.");
      setGradeSqlite(null);
    } else {
      setGradeSqlite(dados);
    }
    setCarregandoSqlite(false);
  }

  async function abrirLinhaSqlite(id: number) {
    if (!id || !arquivoSqlite || !tabelaSqlite) return;
    if (linhaSqlite?.id === id) {
      setLinhaSqlite(null);
      return;
    }
    const resp = await fetch(
      `${api}/api/sqlite/linha?arquivo=${encodeURIComponent(arquivoSqlite)}&tabela=${encodeURIComponent(tabelaSqlite)}&linha=${id}`,
    );
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setErroSqlite(dados.erro || "Não consegui abrir o registro.");
      return;
    }
    setLinhaSqlite({ id, colunas: dados.colunas ?? [], valores: dados.valores ?? {} });
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

  async function abrirConversa(id: string, titulo = "") {
    if (!email || ocupado) return;
    const resp = await fetch(`${api}/api/conversas/${id}?email=${encodeURIComponent(email)}`);
    const dados = await resp.json();
    if (!resp.ok) return;
    const lista = Array.isArray(dados.mensagens) ? dados.mensagens : [];
    const alheia = Boolean(dados.somenteLeitura);
    conversaDeRef.current = alheia ? String(dados.email || "") : "";
    setConversaDe(conversaDeRef.current);
    if (alheia) {
      conversaIdRef.current = null;
      sessionStorage.removeItem("maicon-conversa-id");
      setConversaId(null);
    } else {
      conversaIdRef.current = id;
      sessionStorage.setItem("maicon-conversa-id", id);
      setConversaId(id);
    }
    const indice = indiceDaPergunta(lista, titulo || String(dados.titulo || ""));
    focoMensagemRef.current = indice >= 0 ? indice : null;
    setMensagens(lista);
    setInicioAberto(false);
    setConfigAberta(false);
    setMemoriaAberta(false);
    setConsultaAberta(null);
    setTelaLateral(alheia ? "menu" : "conversas");
    modoRelatorioRef.current = false;
  }

  async function garantirConversa(titulo: string) {
    if (!email || conversaIdRef.current) return;
    const resp = await fetch(`${api}/api/conversas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, titulo: titulo.slice(0, 80) }),
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok || !dados.id) return;
    conversaIdRef.current = dados.id;
    sessionStorage.setItem("maicon-conversa-id", dados.id);
    setConversaId(dados.id);
  }

  async function gravarConversa(id: string, lista: Mensagem[], tentativa = 0) {
    if (!email || !id || !lista.some((item) => item.role === "user")) return;
    const titulo = lista.find((item) => item.role === "user" && "content" in item)?.content?.slice(0, 80) || "Nova conversa";
    const resp = await fetch(`${api}/api/conversas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, titulo, visao: admin ? visao : setor, mensagens: mensagensParaArquivo(lista) }),
    });
    if (resp.status === 404 && tentativa < 1) {
      conversaIdRef.current = null;
      setConversaId(null);
      sessionStorage.removeItem("maicon-conversa-id");
      await garantirConversa(titulo);
      if (conversaIdRef.current) await gravarConversa(conversaIdRef.current, lista, tentativa + 1);
    }
  }

  function aprovarPrevia(sql: string) {
    if (!sql) return;
    consultaTotalRef.current = sql;
    void enviar("A primeira linha está certa. Pode trazer o restante.");
  }

  async function enviar(conteudo: string, receitaPronta?: Receita[] | null) {
    if (!conteudo.trim() || ocupado || conversaDeRef.current) return;
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    setInicioAberto(false);
    setConsultasAbertas(false);
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
    const gasto: UsoTokens = { entrada: 0, saida: 0, total: 0, janela: 0 };
    const inicioConsulta = performance.now();
    const duracaoConsulta = () => Math.max(1, Math.round(performance.now() - inicioConsulta));
    const pergunta = conteudo.trim();
    const aprovando = /^a primeira linha est[aá] certa\.\s*pode trazer o restante\.?$/i.test(pergunta);
    if (!aprovando) consultaTotalRef.current = "";
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
      if (pedidoSemProcesso(pergunta)) {
        const content = "Qual processo? Informe o número, como IM5944-26.";
        historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
        setMensagens(historico);
        setErro("");
        avisarConclusao(content, false);
        return;
      }
      if (pedeSoAData(pergunta)) {
        const content = textoDaDataAtual(pergunta);
        historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
        setMensagens(historico);
        setErro("");
        avisarConclusao(content, false);
        return;
      }
      if (pedeResumoDaResposta(textoVisivel(pergunta))) {
        const anterior = [...mensagens].reverse().find((item) => item.role === "assistant" && item.content.trim());
        const content = anterior
          ? resumoCurto(anterior.content)
          : "Não há uma resposta anterior para resumir.";
        historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
        setMensagens(historico);
        setErro("");
        avisarConclusao(content, false);
        return;
      }
      if (pedeDatasFormatadas(textoVisivel(pergunta))) {
        const anterior = [...mensagens].reverse().find((item) => item.role === "assistant" && item.content.trim());
        const content = anterior ? formatarDatasNoTexto(anterior.content) : "";
        if (anterior && content !== anterior.content) {
          historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
          setMensagens(historico);
          setErro("");
          avisarConclusao(content, false);
          return;
        }
      }
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
      let dadosAprovados = false;
      if (aprovando && consultaTotalRef.current) {
        setStatus(modoRelatorioRef.current ? "Montando o relatório…" : "Buscando o restante…");
        const sql = sqlAprovadoInteiro(consultaTotalRef.current);
        const resultado = await executar("executar_sql", { sql }, controle.signal);
        if (/^erro:/i.test(resultado)) {
          const content = resultado.replace(/^Erro:\s*/i, "");
          historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
          setMensagens(historico);
          setErro(content);
          avisarConclusao(content, true);
          return;
        }
        const secao = secaoDaFerramenta("executar_sql", resultado);
        if (secao) secoesDaPergunta.push(secao);
        const id = "consulta-aprovada";
        historico = [
          ...historico,
          {
            role: "assistant",
            content: "",
            tool_calls: [{ id, type: "function", function: { name: "executar_sql", arguments: JSON.stringify({ sql }) } }],
          },
          { role: "tool", tool_call_id: id, content: resultado },
        ];
        setMensagens(historico);
        dadosAprovados = true;
      }
      rotasProntas: {
      if (dadosAprovados) break rotasProntas;
      const campoDireto = modoRelatorioRef.current || apresentacaoRef.current ? null : receitaCampoLivre(pergunta);
      const cargaDireta = campoDireto || modoRelatorioRef.current || apresentacaoRef.current ? null : receitaItensCarga(pergunta, mensagens);
      const continuacao = modoRelatorioRef.current || apresentacaoRef.current ? null : receitaContinuacao(pergunta, mensagens);
      const rotaDireta = continuacao || cargaDireta || modoRelatorioRef.current || apresentacaoRef.current ? null : receitaDaRota(pergunta, mensagens);
      const roteada = perguntaComProcesso(pergunta, mensagens);
      let receita = campoDireto ?? cargaDireta ?? continuacao ?? rotaDireta ?? (modoRelatorioRef.current || apresentacaoRef.current ? null : receitaPronta?.length ? receitaPronta : receitaSalva(roteada));
      if (!rotaDireta && !receita && !apresentacaoRef.current) {
        const respReceita = await fetch(
          `${api}/api/receitas?email=${encodeURIComponent(email)}&visao=${encodeURIComponent(admin ? visao : setor)}&pergunta=${encodeURIComponent(pergunta)}`,
        );
        const dadosReceita = await respReceita.json().catch(() => null);
        if (Array.isArray(dadosReceita?.receita) && dadosReceita.receita.length) receita = dadosReceita.receita;
      }
      if (pedidoSemProcesso(pergunta)) receita = null;
      if (receita?.some((passo) => passo.nome === "resumo_processo") && !pedeFichaDoProcesso(textoVisivel(pergunta))) {
        receita = null;
      }
      if (assuntoGeral(textoVisivel(pergunta)) && receita?.some((passo) => passo.args?.numero)) {
        receita = null;
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
      if (
        receita?.some((passo) => ["consultar_log", "resultado_atual", "log_recente"].includes(passo.nome)) &&
        !pedeLog(assuntoDaPergunta(pergunta, mensagens))
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
      const processosDiretos = processosDoTexto(textoVisivel(roteada));
      const pedidoLog = numeroSolto(pergunta) ? `${perguntaAberta(mensagens)}\n${pergunta}`.trim() : pergunta;
      if (segueLog(pergunta, mensagens) && processosDiretos.length && !containersDiretos.length && !idsDiretos.length && !taxasDiretas.length) {
        setStatus("Consultando o log…");
        historico = [...historico, { role: "assistant", content: "Estou consultando o log." }];
        setMensagens(historico);
        const numero = processosDiretos[0];
        const localizado = await executar("localizar_processo", { numero }, controle.signal);
        let houseId = "";
        let masterId = "";
        try {
          const dados = JSON.parse(localizado) as {
            house?: { IdLogistica_House?: number | string; IdLogistica_Master?: number | string }[];
            master?: { IdLogistica_Master?: number | string }[];
          };
          const house = dados.house?.[0];
          houseId = house?.IdLogistica_House ? String(house.IdLogistica_House) : "";
          masterId = house?.IdLogistica_Master
            ? String(house.IdLogistica_Master)
            : dados.master?.[0]?.IdLogistica_Master
              ? String(dados.master[0].IdLogistica_Master)
              : "";
        } catch {
          houseId = "";
        }
        if (!houseId && !masterId) {
          const bruto = localizado.trim();
          const content = /^erro:/i.test(bruto)
            ? bruto.replace(/^Erro:\s*/i, "")
            : bruto.startsWith("{") || bruto.startsWith("[") || !bruto
              ? `Processo ${numero} não encontrado.`
              : bruto;
          const resposta: Extract<Mensagem, { role: "assistant" }> = {
            role: "assistant",
            content,
            duracaoMs: duracaoConsulta(),
          };
          historico = [...historico.slice(0, -1), resposta];
          setMensagens(historico);
          setErro(content);
          avisarConclusao(content, true);
          return;
        }
        const id = houseId || masterId;
        const args = {
          ...argsLogDosIds([id], pedidoLog),
          tabela: houseId ? "mov_Logistica_House" : "mov_Logistica_Master",
          campo_chave: houseId ? "IdLogistica_House" : "IdLogistica_Master",
          valores: id,
          ancorar: !periodoPedido(pedidoLog),
          processo: numero,
        };
        const resultado = await executar("consultar_log", args, controle.signal);
        const bruto = capturarLog();
        const log = bruto ? restringirAoProcesso(bruto, pedidoLog) : null;
        const falhou = /^erro:/i.test(resultado) && !log;
        const content = log ? resumoDoLog(log) : resultado.replace(/^Erro:\s*/i, "");
        const resposta: Extract<Mensagem, { role: "assistant" }> = {
          role: "assistant",
          content,
          duracaoMs: duracaoConsulta(),
          ...(log ? { log } : {}),
        };
        historico = [...historico.slice(0, -1), resposta];
        setMensagens(historico);
        setErro(falhou ? content : "");
        avisarConclusao(content, falhou);
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
          const args = { ...passo.args };
          if (passo.nome === "consultar_log") Object.assign(args, completarConsultaLog(passo.args, pergunta));
          if (passo.nome === "executar_sql" && typeof args.sql === "string") {
            const eraAmostra = Boolean(args.previa);
            delete args.previa;
            let sql = consultaTotalRef.current || sqlComPeriodo(sqlSemRepetir(args.sql), pergunta);
            if (!consultaTotalRef.current) args.pergunta = pergunta;
            if (consultaTotalRef.current || eraAmostra || perguntaDeConjunto(pergunta)) sql = sqlAprovadoInteiro(sql);
            if (!consultaTotalRef.current) args.previa = true;
            args.sql = sql;
          }
          const resultado = await executar(passo.nome, args, controle.signal);
          if (resultado.startsWith("Erro:") || resultado.startsWith("Ferramenta desconhecida")) {
            if (rotaDireta || continuacao || receita.some((passo) => passo.nome === "meu_dia" || passo.nome === "ficha_processo")) {
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
          if (!consultaTotalRef.current && passo.nome === "executar_sql" && secao?.colunas.length && typeof args.sql === "string") {
            historico = [
              ...historico,
              {
                role: "assistant",
                content: "",
                tool_calls: [{ id: "previa-sql", type: "function", function: { name: "executar_sql", arguments: JSON.stringify(args) } }],
              },
              { role: "tool", tool_call_id: "previa-sql", content: resultado },
              {
                role: "assistant",
                content: "Primeira linha da consulta. Confira se as informações batem antes de seguir.",
                previa: { sql: args.sql, colunas: secao.colunas, linhas: secao.linhas.slice(0, 1) },
                duracaoMs: duracaoConsulta(),
              },
            ];
            setMensagens(historico);
            setErro("");
            avisarConclusao("Primeira linha pronta para conferir.", false);
            return;
          }
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
          if (modoRelatorioRef.current && relatorioGrande(secoesDaPergunta)) {
            resposta.relatorio = { titulo: pergunta.replace(/\s+/g, " ").slice(0, 90), secoes: secoesDaPergunta };
            resposta.pedidoRelatorio = true;
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
      }
      const faltaPassagem = respostaPassagemIncompleta(pergunta);
      if (faltaPassagem) {
        historico = [...historico, { role: "assistant", content: faltaPassagem, duracaoMs: duracaoConsulta() }];
        setMensagens(historico);
        setErro("");
        avisarConclusao(faltaPassagem, false);
        return;
      }
      for (let passo = 0; passo < MAX_PASSOS; passo++) {
        setStatus(consultaTotalRef.current ? (modoRelatorioRef.current ? "Montando o relatório…" : "Buscando o restante…") : modoRelatorioRef.current ? "Lendo a primeira linha…" : "Pensando…");
        if (canceladoRef.current) throw new DOMException("Cancelado", "AbortError");
        const resp = await fetch(`${api}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          mensagens: historico.map((item) => {
            if (item.role === "tool") return { ...item, content: textoParaIa(item.content) };
            if (item.role === "assistant" && item.content.length > 6000) {
              return { ...item, content: `${item.content.slice(0, 6000)}\n…` };
            }
            return item;
          }),
          completo,
          relatorio: modoRelatorioRef.current,
          etapa: etapaDaRodada(historico, modoRelatorioRef.current, consultaTotalRef.current),
          sqlAprovado: consultaTotalRef.current,
          apresentacao: apresentacaoRef.current,
          email,
          nome,
          conversaId: conversaIdRef.current || "",
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
              } else if (/[|｜]\s*DSML\s*[|｜]/i.test(parcial)) {
                setStatus("Consultando…");
                setMensagens(historico);
              } else {
                setStatus("Escrevendo…");
                const visivel = semChamadaCrua(semBlocoAberto(parcial));
                if (visivel.trim() && !temCartao(visivel) && !catalogoInterno(visivel)) setMensagens([...historico, { role: "assistant", content: visivel }]);
              }
            }
            if (evento.tipo === "fim" && evento.mensagem) {
              resposta = evento.mensagem;
              if (resposta.uso) {
                gasto.entrada += resposta.uso.entrada;
                gasto.saida += resposta.uso.saida;
                gasto.total += resposta.uso.total;
                gasto.janela = Math.max(gasto.janela || 0, resposta.uso.entrada);
                if (resposta.uso.contexto) gasto.contexto = resposta.uso.contexto;
                if (resposta.uso.raciocinio) gasto.raciocinio = (gasto.raciocinio || 0) + resposta.uso.raciocinio;
              }
            }
          }
        }
        if (!resposta) throw new Error("A IA não respondeu.");
        const conteudo = semChamadaCrua(respostaSemPayload((resposta.content?.trim() ? resposta.content : parcial).trim()));
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
        if (!resposta.tool_calls?.length && (soNomesDeTabela(conteudo) || catalogoInterno(conteudo)) && passo < MAX_PASSOS - 1) {
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
        if (pedidoSemProcesso(pergunta) && (resposta.tool_calls ?? []).some((chamada) => !EXPLORACAO.has(chamada.function.name))) {
          const content = "Qual processo? Informe o número, como IM5944-26.";
          historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
          setMensagens(historico);
          setErro("");
          avisarConclusao(content, false);
          return;
        }
        const pedeDado = !pedePassagem(pergunta) && !pedidoSemProcesso(pergunta) && !pedeSoAData(pergunta) && /\b(?:processos?|abert[oa]s?|clientes?|taxas?|atividades?|prazos?|embarques?|desembarques?|propostas?|comiss[oõ]es?|frete|mudan[cç]as?|hist[oó]rico|logs?|hoje|ontem)\b/i.test(pergunta);
        const repeticoes = trechoDaPergunta(historico).filter((item) => item.role === "user" && /Consulte o banco com uma ferramenta agora|Consulte de novo e liste todos/i.test(item.content)).length;
        const pedeLista = pediuNoChat(pergunta);
        const recusouLista = /n[aã]o consigo|n[aã]o me retornou|abr[ae] a tela|outra tela|time de log[ií]stica|n[aã]o devem ser usados/i.test(conteudo);
        const jaConsultou = trechoDaPergunta(historico).some((item) => item.role === "tool");
        if (!resposta.tool_calls?.length && (pedeDado || pedeLista || recusouLista) && !jaConsultou && repeticoes < 1 && passo < MAX_PASSOS - 1) {
          historico = [
            ...historico,
            { ...resposta, content: "" },
            {
              role: "user",
              content: pedeLista || recusouLista
                ? "Consulte de novo e liste todos os registros da pergunta anterior, um por linha. Não recuse e não mande abrir outra tela."
                : "Consulte o banco com uma ferramenta agora e traga os dados reais. Não invente cliente, processo, prazo ou valor.",
            },
          ];
          setMensagens(historico.filter((item) => {
            if (item.role === "user") return item.content === pergunta || !/Consulte de novo|Consulte o banco/i.test(item.content);
            if (item.role === "assistant") return Boolean(item.content.trim() || item.tool_calls?.length);
            return true;
          }));
          continue;
        }
        if (
          consultaTotalRef.current &&
          !resposta.tool_calls?.length &&
          !trechoDaPergunta(historico).some((item) => item.role === "tool") &&
          passo < MAX_PASSOS - 1
        ) {
          const sql = sqlAprovadoInteiro(consultaTotalRef.current);
          setStatus(modoRelatorioRef.current ? "Montando o relatório…" : "Buscando o restante…");
          const resultado = await executar("executar_sql", { sql }, controle.signal);
          const id = `consulta-aprovada-${passo}`;
          const secao = secaoDaFerramenta("executar_sql", resultado);
          if (secao) secoesDaPergunta.push(secao);
          historico = [
            ...historico,
            {
              role: "assistant",
              content: "",
              tool_calls: [{ id, type: "function", function: { name: "executar_sql", arguments: JSON.stringify({ sql }) } }],
            },
            { role: "tool", tool_call_id: id, content: resultado },
          ];
          setMensagens(historico);
          continue;
        }
        historico = [...historico, { ...resposta, content: catalogoInterno(conteudo) ? "" : conteudo }];
        setMensagens(historico);
        if (!resposta.tool_calls?.length) break;
        const rodadaAtual = trechoDaPergunta(historico);
        const porId = new Map(
          rodadaAtual.flatMap((m) => (m.role === "tool" ? [[m.tool_call_id, m.content] as const] : [])),
        );
        const jaFeitas = new Map<string, string>(
          rodadaAtual.flatMap((m) =>
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
            const logIndevido =
              ["consultar_log", "resultado_atual", "log_recente"].includes(chamada.function.name) &&
              !pedeLog(assuntoDaPergunta(pergunta, mensagens));
            try {
              const args = JSON.parse(chamada.function.arguments || "{}");
              const pedido = [...historico].reverse().find((m) => m.role === "user")?.content ?? "";
              if (logIndevido) {
                resultado = "Erro: a pergunta não pediu log nem histórico. Consulte os dados pedidos, sem abrir o log.";
              } else {
                if (chamada.function.name === "consultar_log") {
                  Object.assign(args, completarConsultaLog(args, pedido));
                  chamada.function.arguments = JSON.stringify(args);
                }
                if (chamada.function.name === "executar_sql" && typeof args.sql === "string") {
                  const eraAmostra = Boolean(args.previa);
                  delete args.previa;
                  let sql = consultaTotalRef.current || sqlComPeriodo(sqlSemRepetir(args.sql), pergunta);
                  if (!consultaTotalRef.current) args.pergunta = pergunta;
                  if (consultaTotalRef.current || eraAmostra || perguntaDeConjunto(pergunta)) sql = sqlAprovadoInteiro(sql);
                  if (!consultaTotalRef.current) args.previa = true;
                  args.sql = sql;
                  chamada.function.arguments = JSON.stringify(args);
                }
                if (canceladoRef.current) throw new DOMException("Cancelado", "AbortError");
                resultado = await executar(chamada.function.name, args, controle.signal);
                for (let tentativa = 0; tentativa < 2 && /^Erro:.*(timeout|conex|socket|interrompid|demorou)/i.test(resultado); tentativa += 1) {
                  setStatus("Lendo de novo…");
                  resultado = await executar(chamada.function.name, args, controle.signal);
                }
              }
            } catch (e) {
              if (canceladoRef.current || (e instanceof DOMException && e.name === "AbortError")) throw e;
              resultado = `Erro: ${e instanceof Error ? e.message : String(e)}`;
            }
            if (!logIndevido && (chamada.function.name === "consultar_log" || chamada.function.name === "resultado_atual")) {
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
            return { role: "tool" as const, tool_call_id: chamada.id, content: resultado };
          }),
        );
        if (!consultaTotalRef.current) {
          const amostra = resultados.find((item) => {
            const chamada = resposta.tool_calls?.find((chamada) => chamada.id === item.tool_call_id);
            return chamada?.function.name === "executar_sql" && !item.content.startsWith("Erro:");
          });
          if (amostra) {
            const secao = secaoDaFerramenta("executar_sql", amostra.content);
            const chamada = resposta.tool_calls?.find((chamada) => chamada.id === amostra.tool_call_id);
            let sql = "";
            try {
              sql = String(JSON.parse(chamada?.function.arguments || "{}").sql || "");
            } catch {
              sql = "";
            }
            if (secao?.colunas.length && sql) {
              historico = [
                ...historico,
                ...resultados,
                {
                  role: "assistant",
                  content: "Primeira linha da consulta. Confira se as informações batem antes de seguir.",
                  previa: { sql, colunas: secao.colunas, linhas: secao.linhas.slice(0, 1) },
                  duracaoMs: duracaoConsulta(),
                },
              ];
              setMensagens(historico);
              setErro("");
              avisarConclusao("Primeira linha pronta para conferir.", false);
              return;
            }
          }
        }
        historico = [...historico, ...resultados];
        setMensagens(historico);
        const pronta = respostaProntaDoHistorico(historico);
        if (pronta) {
          const content = graficoSePedido(pronta, assuntoDaPergunta(pergunta, mensagens));
          historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
          setMensagens(historico);
          setErro("");
          avisarConclusao(content, false);
          return;
        }
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
      if (!ultima && logDaPergunta && pedeLog(assuntoDaPergunta(pergunta, mensagens))) {
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
          .find((item) => item && !item.startsWith("Erro:") && !catalogoInterno(item));
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
        const content = "Nenhum registro nessa consulta.";
        historico = [...historico, { role: "assistant", content, duracaoMs: duracaoConsulta() }];
        setMensagens(historico);
        setErro("");
        avisarConclusao(content, false);
        return;
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
          if (limpo) ultima.content = limpo;
          else if (logDaPergunta) ultima.content = resumoDoLog(logDaPergunta);
          else {
            const daFerramenta = [...historico.slice(corte + 1)]
              .reverse()
              .filter((item) => item.role === "tool")
              .map((item) => textoDaConsulta(item.content))
              .find((item) => item && !item.startsWith("Erro:") && !item.startsWith("{"));
            ultima.content = daFerramenta || "Não consegui montar o histórico. Tente de novo.";
          }
        }
        if (completo) {
          const daLista = [...historico.slice(corte + 1)]
            .reverse()
            .filter((item) => item.role === "tool")
            .map((item) => textoDaConsulta(item.content))
            .find((item) => item && item.includes("|") && /\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/.test(item));
          if (daLista) ultima.content = daLista;
        }
        if (gasto.total > 0) ultima.uso = gasto;
        ultima.duracaoMs = duracaoConsulta();
        if (modoRelatorioRef.current && secoesDaPergunta.length) {
          const ultimaSecao = secoesDaPergunta[secoesDaPergunta.length - 1];
          ultima.relatorio = {
            titulo: (historico
              .filter((item) => item.role === "user" && !/^a primeira linha est[aá] certa/i.test(item.content))
              .at(-1)?.content || pergunta).replace(/\s+/g, " ").slice(0, 90),
            secoes: [ultimaSecao],
          };
          ultima.pedidoRelatorio = true;
        }
        const explicacao = textoItensDaRodada(historico, pergunta);
        if (explicacao) ultima.content = explicacao;
        else if (logDaPergunta && pedeLog(assuntoDaPergunta(pergunta, mensagens))) {
          ultima.log = logDaPergunta;
          ultima.content = resumoDoLog(logDaPergunta);
        } else {
          ultima.content = graficoSePedido(ultima.content, assuntoDaPergunta(pergunta, mensagens));
        }
        const novas = receitasDaConversa(historico).filter((item) => {
          if (["consultar_log", "resultado_atual", "log_recente"].includes(item.nome) && !pedeLog(assuntoDaPergunta(pergunta, mensagens))) return false;
          return !pedeLog(textoVisivel(pergunta)) || item.nome === "consultar_log";
        });
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
                      <button
                        type="button"
                        className={valor === "comercial" ? (visao === "comercial" || visao === "inside" ? "ativo" : "") : visao === valor ? "ativo" : ""}
                        onClick={() => onVisao?.(valor)}
                      >
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
                  conversaDeRef.current = "";
                  setConversaDe("");
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
                  <button type="button" className="chat-acao icone" title="Pesquisar nesta conversa" aria-label="Pesquisar nesta conversa" onClick={() => setBuscaAberta(true)}>
                    <Icone nome="busca" tamanho={16} />
                  </button>
                )}
              </div>
            ) : null}
            </div>
          </div>
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
                <div className="chat-conta-quem">
                  <AvatarConta nome={contaAberta.nome} email={contaAberta.email} foto={contaAberta.foto} grande />
                  <div>
                    <strong>{contaAberta.nome || contaAberta.email}</strong>
                    <small>{contaAberta.email}</small>
                  </div>
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
          <div className={`chat-mensagens${abaConfig === "sqlite" ? " chat-mensagens-sqlite" : abaConfig === "consumo" ? " chat-mensagens-consumo" : ""}`}>
            <div className={`chat-coluna${abaConfig === "sqlite" ? " chat-coluna-larga" : ""}`}>
              <div className="chat-config-abas" role="tablist" aria-label="Configurações">
                <button type="button" className={abaConfig === "contas" ? "ativo" : ""} onClick={() => setAbaConfig("contas")}>
                  Contas
                </button>
                <button
                  type="button"
                  className={abaConfig === "consumo" ? "ativo" : ""}
                  onClick={() => {
                    setAbaConfig("consumo");
                    void carregarConsumo(iaConsumo);
                  }}
                >
                  Consumo
                </button>
                <button
                  type="button"
                  className={abaConfig === "sqlite" ? "ativo" : ""}
                  onClick={() => {
                    setAbaConfig("sqlite");
                    void carregarSqlite();
                  }}
                >
                  SQLite
                </button>
              </div>
              {abaConfig === "consumo" ? (
                <section className="chat-secao chat-consumo-aba">
                  <div className="chat-consumo-marca">
                    <span className={`chat-consumo-sigla ${iaConsumo}`} aria-hidden="true">{ROTULO_CONSUMO[iaConsumo].aba.slice(0, 2)}</span>
                    <div className="chat-memoria-topo">
                      <div className="chat-consumo-cabeca">
                        <h3>{ROTULO_CONSUMO[iaConsumo].nome}</h3>
                        <div className="chat-consumo-ias" role="tablist" aria-label="Inteligência do consumo">
                          {IAS_CONSUMO.map((modelo) => (
                            <button
                              key={modelo}
                              type="button"
                              role="tab"
                              aria-selected={iaConsumo === modelo}
                              className={iaConsumo === modelo ? "ativo" : ""}
                              onClick={() => {
                                if (iaConsumo === modelo) return;
                                setConsumoIa(null);
                                setIaConsumo(modelo);
                              }}
                            >
                              {ROTULO_CONSUMO[modelo].aba}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p>{ROTULO_CONSUMO[iaConsumo].texto}</p>
                    </div>
                  </div>
                  <PainelSaldo saldo={saldoIa} />
                  <div className="chat-consumo">
                    <article>
                      <span>Tokens</span>
                      <strong>{numeroTokens(consumoIa?.total || 0)}</strong>
                      <small>
                        {numeroTokens(consumoIa?.entrada || 0)} entrada · {numeroTokens(consumoIa?.saida || 0)} saída
                        {consumoIa?.raciocinio ? ` · ${numeroTokens(consumoIa.raciocinio)} raciocínio` : ""}
                      </small>
                    </article>
                    <article>
                      <span>Janela</span>
                      <strong>{percentualDe(consumoIa?.ocupacao || 0)}</strong>
                      <small>
                        média · pico {percentualDe(consumoIa?.pico || 0)}
                        {consumoIa?.chamadas ? ` · ${numeroTokens(consumoIa.chamadas)} consultas` : ""}
                      </small>
                    </article>
                  </div>
                  <GraficoConsumo
                    conversas={consumoIa?.conversas ?? []}
                    onAbrir={(item) => {
                      if (item.id) void abrirConversa(item.id, item.titulo);
                    }}
                  />
                </section>
              ) : abaConfig === "sqlite" ? (
                <section className="chat-secao chat-sqlite">
                  <div className="chat-memoria-topo">
                    <h3>SQLite do servidor</h3>
                    <p>Tabelas gravadas neste servidor. Chaves, tokens e sessões aparecem mascarados.</p>
                  </div>
                  <div className="chat-sqlite-arquivos" role="tablist" aria-label="Arquivos do SQLite">
                    {bancosSqlite.map((banco) => (
                      <button
                        key={banco.arquivo}
                        type="button"
                        className={arquivoSqlite === banco.arquivo ? "ativo" : ""}
                        onClick={() => void carregarSqlite(banco.arquivo, banco.tabelas[0]?.nome || "", 1)}
                      >
                        {banco.arquivo.replace(".sqlite", "")}
                        <small>{banco.tabelas.reduce((soma, item) => soma + item.total, 0)}</small>
                      </button>
                    ))}
                  </div>
                  <div className="chat-sqlite-corpo">
                    <aside className="chat-sqlite-lista" aria-label="Tabelas">
                      {(bancosSqlite.find((banco) => banco.arquivo === arquivoSqlite)?.tabelas ?? []).map((item) => (
                        <button
                          key={item.nome}
                          type="button"
                          className={tabelaSqlite === item.nome ? "ativo" : ""}
                          onClick={() => void carregarSqlite(arquivoSqlite, item.nome, 1)}
                        >
                          <span>{item.nome}</span>
                          <em>{item.total}</em>
                        </button>
                      ))}
                    </aside>
                    <div className={`chat-sqlite-painel${linhaSqlite ? " com-detalhe" : ""}`}>
                      {erroSqlite ? <p className="chat-sqlite-erro">{erroSqlite}</p> : null}
                      {carregandoSqlite ? <p className="chat-historico-vazio">Lendo o banco…</p> : null}
                      {!carregandoSqlite && gradeSqlite ? (
                        <div className="chat-sqlite-principal">
                          <div className="chat-sqlite-rolagem">
                            <table className="chat-sqlite-tabela">
                              <thead>
                                <tr>
                                  {gradeSqlite.colunas.map((coluna) => <th key={coluna}>{coluna}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {gradeSqlite.linhas.length === 0 ? (
                                  <tr>
                                    <td colSpan={Math.max(1, gradeSqlite.colunas.length)}>Nenhum registro.</td>
                                  </tr>
                                ) : gradeSqlite.linhas.map((linha) => (
                                  <tr
                                    key={linha._linha}
                                    className={linhaSqlite?.id === Number(linha._linha) ? "ativa" : ""}
                                    onClick={() => void abrirLinhaSqlite(Number(linha._linha))}
                                  >
                                    {gradeSqlite.colunas.map((coluna) => (
                                      <td key={coluna} title={linha[coluna]}>{linha[coluna] || "—"}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="chat-sqlite-paginas">
                            <button
                              type="button"
                              className="chat-acao"
                              disabled={gradeSqlite.pagina <= 1 || carregandoSqlite}
                              onClick={() => void carregarSqlite(arquivoSqlite, tabelaSqlite, gradeSqlite.pagina - 1)}
                            >
                              Anterior
                            </button>
                            <span>{gradeSqlite.total.toLocaleString("pt-BR")} registros · página {gradeSqlite.pagina} de {gradeSqlite.paginas}</span>
                            <button
                              type="button"
                              className="chat-acao"
                              disabled={gradeSqlite.pagina >= gradeSqlite.paginas || carregandoSqlite}
                              onClick={() => void carregarSqlite(arquivoSqlite, tabelaSqlite, gradeSqlite.pagina + 1)}
                            >
                              Próxima
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {linhaSqlite ? (
                        <aside className="chat-sqlite-detalhe" aria-label="Conteúdo do registro">
                          <header>
                            <strong>{tabelaSqlite}</strong>
                            <button type="button" onClick={() => setLinhaSqlite(null)} aria-label="Fechar">×</button>
                          </header>
                          {[...linhaSqlite.colunas].sort((a, b) => Number(/^sql$/i.test(b)) - Number(/^sql$/i.test(a))).map((coluna) => {
                            const texto = linhaSqlite.valores[coluna] || "";
                            const consulta = /^sql$/i.test(coluna) || /^\s*(select|with|insert|update|delete)\b/i.test(texto);
                            return (
                              <section key={coluna}>
                                <h4>{coluna}</h4>
                                {consulta && texto ? <SqlDestaque texto={texto} /> : <pre>{texto || "—"}</pre>}
                              </section>
                            );
                          })}
                        </aside>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : (
              <>
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
                            <AvatarConta nome={nome} email={conta.email} foto={conta.foto} />
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
                <h3>Chaves do DeepSeek</h3>
                <p>Se a chave em uso estourar o limite, a próxima da lista é usada na mesma pergunta.</p>
              </div>
              <ul className="chat-chaves">
                {chaves.length === 0 ? <li>Nenhuma chave cadastrada. A do servidor continua valendo.</li> : null}
                {chaves.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.rotulo || "DeepSeek"}</strong>
                      <small>DeepSeek · ····{item.final}</small>
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
                <p>Perguntas marcadas com 👎 nos últimos 7 dias. Na próxima pergunta parecida, a IA corrige a resposta sozinha. "Virar regra" deixa essa correção valendo em todo pedido.</p>
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
              </>
              )}
            </div>
          </div>
        ) : memoriaAberta ? (
          <div className="chat-mensagens">
            <div className="chat-coluna">
              <div className="chat-memoria-topo">
                <h3>Memória do assistente</h3>
                <p>
                  Preferências que a IA segue em todas as conversas. Exporte o arquivo e importe no Maicon da rede. Para ensinar algo novo, diga no chat, por exemplo:
                  <em> "quando eu falar house, use a mov_Logistica_House"</em>.
                </p>
                {avisoMemoria ? <p className="chat-memoria-aviso">{avisoMemoria}</p> : null}
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
                <div className="chat-memoria-rodape">
                <label className="chat-memoria-obs">
                  <span>Observação</span>
                  <input
                    placeholder="Quando usar essa tabela"
                    value={rascunho.observacao}
                    onChange={(e) => setRascunho({ ...rascunho, observacao: e.target.value })}
                  />
                </label>
                <div className="chat-memoria-form-acoes">
                  <button type="button" className="chat-memoria-io" onClick={exportarMemoria}>
                    Exportar
                  </button>
                  <button type="button" className="chat-memoria-io" onClick={() => arquivoMemoriaRef.current?.click()}>
                    Importar
                  </button>
                  <input
                    ref={arquivoMemoriaRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      e.target.value = "";
                      if (arquivo) void importarMemoria(arquivo);
                    }}
                  />
                  <button type="submit">
                    {editando == null ? "Adicionar" : "Salvar"}
                  </button>
                  {editando != null ? (
                    <button type="button" className="chat-memoria-cancelar" onClick={limparRascunho}>
                      Cancelar
                    </button>
                  ) : null}
                </div>
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
                  </div>
                </div>
              ) : null}

              {blocos.map((bloco, i) => {
                const pedidoUsuario =
                  blocos
                    .slice(0, i)
                    .reverse()
                    .find((item) => item.mensagem.role === "user")?.mensagem.content ?? "";
                const pediuRelatorio =
                  bloco.mensagem.role === "assistant" &&
                  Boolean(bloco.mensagem.relatorio) &&
                  (("pedidoRelatorio" in bloco.mensagem && bloco.mensagem.pedidoRelatorio) ||
                    /^\s*pedir relat[oó]rio/i.test(pedidoUsuario));
                return bloco.mensagem.role === "assistant" &&
                !("log" in bloco.mensagem && bloco.mensagem.log) &&
                !pediuRelatorio &&
                (!normalizarCartoes(bloco.mensagem.content) || catalogoInterno(bloco.mensagem.content)) ? null : bloco.mensagem.role === "assistant" ? (
                  <div key={i} id={`chat-msg-${i}`} className={`chat-linha${buscaAlvo === i ? " busca-alvo" : ""}`}>
                    <div className="chat-msg chat-assistant">
                      {"previa" in bloco.mensagem && bloco.mensagem.previa ? (
                        <PreviaRelatorio
                          previa={bloco.mensagem.previa}
                          podeAprovar={i === blocos.length - 1 && !ocupado}
                          onAprovar={() => aprovarPrevia(bloco.mensagem.role === "assistant" && bloco.mensagem.previa ? bloco.mensagem.previa.sql : "")}
                        />
                      ) : null}
                      {"log" in bloco.mensagem && bloco.mensagem.log ? (
                        <LogCard log={cartaoDoHistorico(bloco.mensagem.log)} />
                      ) : pediuRelatorio || ("previa" in bloco.mensagem && bloco.mensagem.previa) ? null : (
                        <>
                          {bloco.linhas.length > 12 ? <ListaConsulta linhas={bloco.linhas} calculos={bloco.calculos} /> : null}
                          <Markdown
                            ocultarSql={!admin}
                            textoCorrido={pediuTextoParaEnviar(pedidoUsuario)}
                            texto={semMençãoPdf(
                              graficoSePedido(
                                (bloco.linhas.length > 12 ? textoSemListaGrande : (texto: string) => texto)(
                                  garantirEncartes(respostaSemPayload(bloco.mensagem.content), bloco.encartes),
                                ),
                                blocos
                                  .slice(0, i)
                                  .filter((item) => item.mensagem.role === "user")
                                  .map((item) => item.mensagem.content)
                                  .join("\n"),
                              ),
                            )}
                          />
                        </>
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
                      {pediuRelatorio && bloco.mensagem.role === "assistant" && bloco.mensagem.relatorio ? (
                        <>
                        <button type="button" className="chat-ver-consulta" onClick={() => guardarRelatorio(pedidoUsuario)}>
                          {relatoriosSalvos.some((item) => item.pergunta === pedidoUsuario.trim()) ? "Filtro guardado" : "Guardar este filtro"}
                        </button>
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
                        </>
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
                          {admin && "uso" in bloco.mensagem && bloco.mensagem.uso && bloco.mensagem.uso.total > 0 ? (
                            <span className="chat-uso" title={tituloUso(bloco.mensagem.uso)}>
                              <b>{numeroTokens(bloco.mensagem.uso.total)}</b>
                              <span>tokens</span>
                              {bloco.mensagem.uso.contexto ? <em>{textoPercentual(bloco.mensagem.uso)}</em> : null}
                            </span>
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
                );
              })}

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

        {inicioAberto || configAberta ? null : (
          <div className={`chat-gaveta${consultasAbertas ? " aberta" : ""}${blocos.length > 0 && !consultasAbertas ? " so-seta" : ""}`}>
            <button
              type="button"
              className="chat-gaveta-seta"
              aria-expanded={consultasAbertas}
              aria-controls="chat-consultas"
              aria-label={consultasAbertas ? "Recolher consultas" : "Mostrar consultas"}
              onClick={() => setConsultasAbertas((aberta) => !aberta)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M6 14l6-6 6 6" />
              </svg>
            </button>
            <div className="chat-gaveta-miolo" id="chat-consultas">
              <div className="chat-coluna">
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
                        {relatoriosSalvos.length ? (
                          <div className="chat-abertura-grupo">
                            <span>Guardados</span>
                            <div className="chat-abertura-opcoes">
                              {relatoriosSalvos.map((item) => (
                                <div key={item.pergunta} className="chat-relatorio-salvo">
                                  <button
                                    type="button"
                                    disabled={ocupado}
                                    onClick={() => {
                                      modoRelatorioRef.current = true;
                                      void enviar(item.pergunta);
                                    }}
                                  >
                                    <span className="chat-abertura-icone">
                                      <Icone nome="relatorio" tamanho={19} />
                                    </span>
                                    <span className="chat-abertura-texto">
                                      <strong>{item.titulo}</strong>
                                      <small>Abrir de novo com o mesmo filtro</small>
                                    </span>
                                  </button>
                                  <button type="button" className="chat-relatorio-esquecer" onClick={() => esquecerRelatorio(item.pergunta)} aria-label={`Esquecer ${item.titulo}`}>
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
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
                      [
                        {
                          nome: "",
                          itens:
                            SUGESTOES_SETOR[admin ? (visao === "inside" ? "comercial" : visao === "tudo" ? "gerencia" : visao) : setor] ??
                            (pode.log ? SUGESTOES : SUGESTOES.filter((s) => s.titulo === "Cliente do processo")),
                        },
                      ].map((grupo) => {
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
          </div>
        )}

        {inicioAberto || configAberta ? null : <form
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
                placeholder={conversaDe ? `Conversa de ${conversaDe}. Só leitura.` : "Pergunte sobre um processo, cliente, atividade ou período…"}
                disabled={Boolean(conversaDe)}
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
              <button type="submit" className="chat-enviar" disabled={ocupado || Boolean(conversaDe) || !texto.trim()} title="Enviar">
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
