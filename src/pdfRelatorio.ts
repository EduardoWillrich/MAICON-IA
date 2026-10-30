import type { PDFFont } from "pdf-lib";

type PdfLib = typeof import("pdf-lib");
let pdfLib: PdfLib;

function rgb(r: number, g: number, b: number) {
  return pdfLib.rgb(r, g, b);
}

export type SecaoRelatorio = { titulo: string; colunas: string[]; linhas: string[][] };

export type RelatorioChat = { titulo: string; secoes: SecaoRelatorio[] };

type Cor = ReturnType<typeof rgb>;

function corHex(valor: string): Cor {
  const hex = valor.trim().replace("#", "");
  const canais = hex.length === 3 ? hex.split("").map((c) => c + c) : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
  const [r, g, b] = canais.map((canal) => parseInt(canal, 16) / 255);
  return rgb(r, g, b);
}

function temaDe(fonte: string) {
  const valores: Record<string, string> = {};
  for (const item of fonte.matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)) valores[item[1]] = item[2].trim();
  return {
    num(nome: string, padrao: number) {
      const n = Number(valores[nome]);
      return Number.isFinite(n) ? n : padrao;
    },
    cor(nome: string, padrao: string) {
      const bruto = valores[nome];
      return corHex(bruto && bruto.startsWith("#") ? bruto : padrao);
    },
  };
}

async function fonteDoTema(): Promise<string> {
  const url = new URL("./pdfRelatorio.css", import.meta.url);
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(url, "utf8");
  } catch {
    const resposta = await fetch(url);
    return await resposta.text();
  }
}

const FERRAMENTAS_DADOS = new Set([
  "executar_sql",
  "consultar_dados",
  "resumo_processo",
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
  "fila_setor",
  "painel_financeiro",
  "taxas_processo",
]);

export function pediuNoChat(texto: string): boolean {
  return /no chat|na conversa|aqui mesmo|mostra(r)? (tudo|todos|completo|a lista)|detalha(r)?|lista completa|passa (no|pelo|aqui|os)|quero ver (tudo|todos|a lista|os dados)|completo no chat/i.test(
    texto,
  );
}

function textoPdf(valor: string): string {
  return valor
    .replace(/\u2014|\u2013/g, "-")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/\u2192/g, "->")
    .replace(/[^\n\r\t\u0020-\u00ff]/g, "");
}

const NOMES_COLUNA: Record<string, string> = {
  "Numero Processo": "Número processo",
  "Referencia Cliente": "Referência",
  Cliente: "Cliente",
  Situacao: "Situação",
  Ultimo: "Último acompanhamento",
  Atividade: "Atividade",
  "Previsao Termino": "Previsão",
  "Data Previsao Embarque": "Prev. embarque",
  "Data Embarque": "Embarque",
  "Data Previsao Desembarque": "Prev. desembarque",
  "Data Desembarque": "Desembarque",
  "Data Previsao Entrega": "Prev. entrega",
  "Data Entrega": "Entrega",
  "Numero DI RE": "DI",
  Comissionado: "Comissionado",
  "Valor Comissao": "Comissão",
  Detalhe: "Detalhe da divergência",
};

function rotulo(nome: string): string {
  const limpo = nome.replaceAll("_", " ").replace(/\s+/g, " ").trim();
  return NOMES_COLUNA[limpo] ?? limpo;
}

function tituloLimpo(titulo: string): string {
  const texto = titulo
    .replace(/se eu não informei[\s\S]*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?.!,:;]+$/, "");
  return texto || "Consulta";
}

function celula(valor: unknown): string {
  if (valor == null) return "";
  const texto = String(valor).replace(/\s+/g, " ").trim();
  const data = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!data) return texto;
  return data[4] ? `${data[3]}/${data[2]}/${data[1]} ${data[4]}:${data[5]}` : `${data[3]}/${data[2]}/${data[1]}`;
}

const EVENTOS_DATA = ["desembarque", "embarque", "entrega", "coleta", "atracacao", "prontidao"];
const ORDEM_FRASE = ["embarque", "desembarque", "entrega", "coleta", "atracacao", "prontidao"];

const ROTULO_EVENTO: Record<string, string> = {
  embarque: "Embarque",
  desembarque: "Desembarque",
  entrega: "Entrega",
  coleta: "Coleta",
  atracacao: "Atracação",
  prontidao: "Prontidão",
};

function nomeColuna(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function papelDaColuna(nome: string) {
  const texto = nomeColuna(nome);
  const evento = EVENTOS_DATA.find((item) => texto.includes(item));
  if (!evento) return null;
  return { evento, previsto: /\bprev/.test(texto) || texto.includes("previsto") };
}

function diaDaCelula(valor: string): number | null {
  const texto = valor.trim();
  if (!texto || /^(vazio|null|n\/a|-)$/i.test(texto)) return null;
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  return null;
}

function fraseDaDivergencia(evento: string, previsto: number | null, realizado: number | null) {
  const nome = ROTULO_EVENTO[evento] ?? evento;
  if (previsto == null && realizado != null) return `${nome} realizado sem data de previsão`;
  if (previsto == null || realizado == null) return "";
  const dias = Math.round((realizado - previsto) / 86_400_000);
  if (dias === 0) return "";
  const quantidade = Math.abs(dias);
  const unidade = quantidade === 1 ? "dia" : "dias";
  return dias < 0 ? `${nome} antecipado em ${quantidade} ${unidade}` : `${nome} atrasado em ${quantidade} ${unidade}`;
}

function secaoComDetalhe(secao: SecaoRelatorio): SecaoRelatorio {
  if (secao.colunas.some((coluna) => /detalhe|diverg/i.test(coluna))) return secao;
  const pares = new Map<string, { prev?: number; real?: number }>();
  secao.colunas.forEach((coluna, indice) => {
    const papel = papelDaColuna(coluna);
    if (!papel) return;
    const atual = pares.get(papel.evento) ?? {};
    if (papel.previsto) atual.prev ??= indice;
    else atual.real ??= indice;
    pares.set(papel.evento, atual);
  });
  const comparacoes = [...pares.entries()]
    .filter((entrada): entrada is [string, { prev: number; real: number }] => entrada[1].prev != null && entrada[1].real != null)
    .sort((a, b) => ORDEM_FRASE.indexOf(a[0]) - ORDEM_FRASE.indexOf(b[0]));
  if (!comparacoes.length) return secao;
  const detalhes = secao.linhas.map((linha) =>
    comparacoes
      .map(([evento, par]) => fraseDaDivergencia(evento, diaDaCelula(linha[par.prev] ?? ""), diaDaCelula(linha[par.real] ?? "")))
      .filter(Boolean)
      .join(" / "),
  );
  if (!detalhes.some(Boolean)) return secao;
  return {
    ...secao,
    colunas: [...secao.colunas, "Detalhe da divergência"],
    linhas: secao.linhas.map((linha, indice) => [...linha, detalhes[indice]]),
  };
}

export function relatorioComDetalhe(relatorio: RelatorioChat): RelatorioChat {
  return { ...relatorio, secoes: relatorio.secoes.map(secaoComDetalhe) };
}

function codigoInterno(nome: string) {
  return /^id([A-Z_]|$)/.test(nome);
}

function tabelaDe(linhas: Record<string, unknown>[], titulo: string): SecaoRelatorio | null {
  const uteis = linhas.filter((linha) => linha && typeof linha === "object");
  if (!uteis.length) return null;
  const colunas = [...new Set(uteis.flatMap((linha) => Object.keys(linha)))].filter(
    (coluna) => !codigoInterno(coluna) && uteis.some((linha) => celula(linha[coluna])),
  );
  if (!colunas.length) return null;
  return {
    titulo,
    colunas: colunas.map(rotulo),
    linhas: uteis.map((linha) => colunas.map((coluna) => celula(linha[coluna]))),
  };
}

function secaoTexto(titulo: string, texto: string): SecaoRelatorio | null {
  const linhas = texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith("SQL:"));
  if (linhas.length < 8 && texto.length < 1800) return null;
  return { titulo, colunas: ["Registro"], linhas: linhas.map((linha) => [linha]) };
}

export function secaoDaFerramenta(nome: string, conteudo: string): SecaoRelatorio | null {
  if (!FERRAMENTAS_DADOS.has(nome) || conteudo.startsWith("Erro:")) return null;
  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    return secaoTexto(nome === "consultar_log" ? "Histórico" : "Consulta", conteudo);
  }
  if (!dados || typeof dados !== "object") return null;
  const registro = dados as {
    linhas?: Record<string, unknown>[];
    house?: Record<string, unknown>[];
    master?: Record<string, unknown>[];
  };
  if (Array.isArray(registro.linhas) && registro.linhas.length) {
    const deProcesso = registro.linhas.some((linha) => linha && ("Numero_Processo" in linha || "Processo" in linha));
    return tabelaDe(registro.linhas, deProcesso ? "Processos" : "Registros");
  }
  if (Array.isArray(registro.house) && registro.house.length) return tabelaDe(registro.house, "Processo");
  if (Array.isArray(registro.master) && registro.master.length) return tabelaDe(registro.master, "Master");
  return null;
}

export function relatorioGrande(secoes: SecaoRelatorio[]): boolean {
  const linhas = secoes.reduce((n, secao) => n + secao.linhas.length, 0);
  const caracteres = secoes.reduce(
    (n, secao) => n + secao.linhas.reduce((m, linha) => m + linha.join(" ").length, 0),
    0,
  );
  return linhas > 8 || caracteres > 1800;
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const palavras = textoPdf(texto).split(" ").flatMap((palavra) => {
    if (fonte.widthOfTextAtSize(palavra, tamanho) <= largura) return [palavra];
    const pedacos: string[] = [];
    let pedaco = "";
    for (const letra of palavra) {
      if (fonte.widthOfTextAtSize(pedaco + letra, tamanho) > largura && pedaco) {
        pedacos.push(pedaco);
        pedaco = letra;
      } else pedaco += letra;
    }
    if (pedaco) pedacos.push(pedaco);
    return pedacos;
  });
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const candidato = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(candidato, tamanho) <= largura) atual = candidato;
    else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

function larguraEspacada(texto: string, fonte: PDFFont, tamanho: number, espaco: number) {
  return fonte.widthOfTextAtSize(texto, tamanho) + Math.max(0, texto.length - 1) * espaco;
}

function desenharEspacado(
  pagina: { drawText: (texto: string, opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> }) => void },
  texto: string,
  x: number,
  y: number,
  tamanho: number,
  fonte: PDFFont,
  cor: ReturnType<typeof rgb>,
  espaco: number,
) {
  let cursor = x;
  for (const letra of texto) {
    pagina.drawText(letra, { x: cursor, y, size: tamanho, font: fonte, color: cor });
    cursor += fonte.widthOfTextAtSize(letra, tamanho) + espaco;
  }
}

function faixaGradiente(
  pagina: { drawRectangle: (opts: { x: number; y: number; width: number; height: number; color: Cor }) => void },
  x: number,
  y: number,
  largura: number,
  altura: number,
  centro: Cor,
  ponta: Cor,
) {
  const passos = Math.max(24, Math.ceil(largura / 4));
  const fatia = largura / passos;
  for (let i = 0; i < passos; i++) {
    const dist = Math.abs(i / (passos - 1) - 0.5) * 2;
    const cauda = Math.min(1, Math.max(0, (dist - 0.28) / 0.72));
    const peso = 1 - cauda * cauda;
    pagina.drawRectangle({
      x: x + i * fatia,
      y,
      width: fatia + 0.25,
      height: altura,
      color: rgb(
        ponta.red + (centro.red - ponta.red) * peso,
        ponta.green + (centro.green - ponta.green) * peso,
        ponta.blue + (centro.blue - ponta.blue) * peso,
      ),
    });
  }
}

function pareceData(coluna: string, amostra: string): boolean {
  return /data|hora|in[ií]cio|t[eé]rmino|quando/i.test(coluna) || /^\d{2}\/\d{2}\/\d{4}/.test(amostra);
}

async function bytesDaMarca(): Promise<Uint8Array> {
  const url = new URL("./assets/marca-fundo.png", import.meta.url);
  try {
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(url));
  } catch {
    const resposta = await fetch(url);
    return new Uint8Array(await resposta.arrayBuffer());
  }
}

export async function bytesDoPdf(relatorioOriginal: RelatorioChat, resumo: string): Promise<Uint8Array> {
  pdfLib ??= await import("pdf-lib");
  const { PDFDocument, StandardFonts } = pdfLib;
  const relatorio = relatorioComDetalhe(relatorioOriginal);
  const tema = temaDe(await fonteDoTema());
  const paisagem = relatorio.secoes.some((secao) => secao.colunas.length > tema.num("colunas-paisagem", 5));
  const ladoA = tema.num("largura", 595.28);
  const ladoB = tema.num("altura", 841.89);
  const LARGURA = paisagem ? ladoB : ladoA;
  const ALTURA = paisagem ? ladoA : ladoB;
  const MARGEM = tema.num("margem", 36);
  const RESERVA = tema.num("reserva-rodape", 46);
  const VINHO = tema.cor("vinho", "#6b121a");
  const VERMELHO = tema.cor("vermelho", "#b22129");
  const ROSA = tema.cor("rosa", "#edcccc");
  const CINZA = tema.cor("cinza", "#6b6666");
  const LINHA = tema.cor("linha", "#e6dbdb");
  const ZEBRA = tema.cor("zebra", "#f6f1f0");
  const FUNDO = tema.cor("fundo", "#f9f4f3");
  const BRANCO = tema.cor("branco", "#ffffff");
  const TINTA = tema.cor("tinta", "#1f242e");
  const tituloTamanho = tema.num("titulo", 18);
  const capaBase = tema.num("capa-base", 78);
  const capaLinha = tema.num("capa-linha", 22);
  const marcaTamanho = tema.num("marca", 8);
  const marcaEspaco = tema.num("marca-espaco", 1.6);
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const marcaFundo = await doc.embedPng(await bytesDaMarca());
  const agora = new Date().toLocaleString("pt-BR");
  const totalRegistros = relatorio.secoes.reduce((n, secao) => n + secao.linhas.length, 0);
  const larguraUtil = LARGURA - MARGEM * 2;
  const titulo = tituloLimpo(relatorio.titulo || "Consulta");
  const temTabela = relatorio.secoes.some((secao) => secao.colunas.length > 1 || secao.linhas.length > 8);
  let pagina = doc.addPage([LARGURA, ALTURA]);
  let y = ALTURA;
  let primeira = true;

  const cabecalho = () => {
    if (primeira) {
      const linhasTitulo = quebrar(titulo, negrito, tituloTamanho, larguraUtil).slice(0, 2);
      const alturaFaixa = capaBase + linhasTitulo.length * capaLinha;
      pagina.drawRectangle({ x: 0, y: ALTURA - alturaFaixa, width: LARGURA, height: alturaFaixa, color: VINHO });
      const alturaMarca = alturaFaixa * tema.num("marca-escala", 1.45);
      const larguraMarca = alturaMarca * (marcaFundo.width / marcaFundo.height);
      pagina.drawImage(marcaFundo, {
        x: LARGURA - larguraMarca + tema.num("marca-folga", 24),
        y: ALTURA - alturaFaixa + (alturaFaixa - alturaMarca) / 2,
        width: larguraMarca,
        height: alturaMarca,
        opacity: tema.num("marca-opacidade", 0.42),
      });
      desenharEspacado(pagina, "MAICON AI", MARGEM, ALTURA - 28, marcaTamanho, negrito, ROSA, marcaEspaco);
      const marcaLargura = larguraEspacada("MAICON AI", negrito, marcaTamanho, marcaEspaco);
      pagina.drawLine({
        start: { x: MARGEM, y: ALTURA - 34 },
        end: { x: MARGEM + marcaLargura, y: ALTURA - 34 },
        thickness: 1,
        color: VERMELHO,
      });
      linhasTitulo.forEach((linha, i) => {
        pagina.drawText(textoPdf(linha), { x: MARGEM, y: ALTURA - 60 - i * capaLinha, size: tituloTamanho, font: negrito, color: BRANCO });
      });
      pagina.drawText("Relatório de consulta", { x: MARGEM, y: ALTURA - alturaFaixa + 16, size: tema.num("meta", 8), font: regular, color: ROSA });
      const faixa = tema.num("faixa", 6);
      faixaGradiente(pagina, 0, ALTURA - alturaFaixa - faixa, LARGURA, faixa, VINHO, BRANCO);
      y = ALTURA - alturaFaixa - faixa - 18;

      const indicadores = [
        { rotulo: "Registros", valor: totalRegistros.toLocaleString("pt-BR") },
        { rotulo: relatorio.secoes.length === 1 ? "Seção" : "Seções", valor: String(relatorio.secoes.length) },
        { rotulo: "Emitido em", valor: agora.slice(0, 17).replace(",", "") },
      ];
      const alturaKpi = tema.num("kpi-altura", 40);
      const vao = 10;
      const larguraKpi = (larguraUtil - vao * (indicadores.length - 1)) / indicadores.length;
      indicadores.forEach((kpi, i) => {
        const x = MARGEM + i * (larguraKpi + vao);
        pagina.drawRectangle({ x, y: y - alturaKpi, width: larguraKpi, height: alturaKpi, color: FUNDO, borderColor: LINHA, borderWidth: 0.6 });
        pagina.drawRectangle({ x, y: y - alturaKpi, width: 3, height: alturaKpi, color: i === 0 ? VERMELHO : VINHO });
        desenharEspacado(pagina, kpi.rotulo.toUpperCase(), x + 12, y - 14, 6.5, negrito, CINZA, 0.8);
        pagina.drawText(textoPdf(kpi.valor), { x: x + 12, y: y - 31, size: tema.num("kpi-valor", 12), font: negrito, color: TINTA });
      });
      y -= alturaKpi + 26;
      primeira = false;
      return;
    }
    desenharEspacado(pagina, "MAICON AI", MARGEM, ALTURA - 26, 7, negrito, VINHO, 1.4);
    const curto = quebrar(titulo, regular, 8, larguraUtil * 0.6)[0];
    const larguraCurto = regular.widthOfTextAtSize(textoPdf(curto), 8);
    pagina.drawText(textoPdf(curto), { x: LARGURA - MARGEM - larguraCurto, y: ALTURA - 26, size: 8, font: regular, color: CINZA });
    pagina.drawRectangle({ x: MARGEM, y: ALTURA - 34, width: larguraUtil, height: 1.2, color: VINHO });
    pagina.drawRectangle({ x: MARGEM, y: ALTURA - 35.2, width: 60, height: 1.2, color: VERMELHO });
    y = ALTURA - 56;
  };

  const nova = () => {
    pagina = doc.addPage([LARGURA, ALTURA]);
    y = ALTURA;
    cabecalho();
  };

  const precisa = (altura: number) => {
    if (y - altura < RESERVA) nova();
  };

  cabecalho();
  const resumoLimpo = temTabela
    ? ""
    : resumo
        .replace(/[#*`]/g, "")
        .split("\n")
        .map((linha) => linha.trim())
        .filter((linha) => linha && !/pdf|relat[oó]rio completo/i.test(linha))
        .join("\n")
        .trim()
        .slice(0, 500);
  if (resumoLimpo) {
    const linhasResumo = resumoLimpo
      .split("\n")
      .filter((l) => l.trim())
      .flatMap((paragrafo) => quebrar(paragrafo, regular, tema.num("resumo", 9.5), larguraUtil - 22));
    const alturaCaixa = 22 + linhasResumo.length * 13;
    precisa(alturaCaixa + 8);
    pagina.drawRectangle({ x: MARGEM, y: y - alturaCaixa + 12, width: larguraUtil, height: alturaCaixa, color: FUNDO });
    pagina.drawRectangle({ x: MARGEM, y: y - alturaCaixa + 12, width: 3, height: alturaCaixa, color: VERMELHO });
    pagina.drawText("RESUMO", { x: MARGEM + 12, y, size: tema.num("resumo-rotulo", 7.5), font: negrito, color: VERMELHO });
    linhasResumo.forEach((linha, i) => {
      pagina.drawText(textoPdf(linha), { x: MARGEM + 12, y: y - 16 - i * 13, size: tema.num("resumo", 9.5), font: regular, color: TINTA });
    });
    y -= alturaCaixa + 16;
  }

  for (const secao of relatorio.secoes) {
    precisa(36);
    pagina.drawRectangle({ x: MARGEM, y: y - 3, width: 3, height: 12, color: VERMELHO });
    desenharEspacado(pagina, textoPdf(secao.titulo.toUpperCase()), MARGEM + 10, y, tema.num("secao", 8), negrito, VINHO, tema.num("secao-espaco", 1.4));
    const contagem = `${secao.linhas.length}`;
    const larguraSelo = negrito.widthOfTextAtSize(contagem, 8) + 16;
    pagina.drawSvgPath(`M 7 0 H ${larguraSelo - 7} A 7 7 0 0 1 ${larguraSelo} 7 V 7 A 7 7 0 0 1 ${larguraSelo - 7} 14 H 7 A 7 7 0 0 1 0 7 V 7 A 7 7 0 0 1 7 0 Z`, {
      x: LARGURA - MARGEM - larguraSelo,
      y: y + 10,
      color: FUNDO,
    });
    pagina.drawText(contagem, {
      x: LARGURA - MARGEM - larguraSelo + 8,
      y: y - 1,
      size: 8,
      font: negrito,
      color: VERMELHO,
    });
    y -= 18;

    const emCards = secao.colunas.length > tema.num("colunas-cards", 10);
    if (!emCards) {
      const cabecaTamanho = tema.num("tabela-cabeca", 7);
      const cabecaEspaco = tema.num("tabela-cabeca-espaco", 0.7);
      const textoTamanho = tema.num("tabela-texto", 8.5);
      const textoLinha = tema.num("tabela-linha", 12);
      const respiro = 18;
      const minimo = tema.num("coluna-minima", 46);
      const amostra = secao.linhas.slice(0, 200);
      const numerica = secao.colunas.map((_, i) => {
        const valores = amostra.map((linha) => (linha[i] ?? "").trim()).filter(Boolean);
        return valores.length > 0 && valores.every((v) => /^-?(R\$\s?)?[\d.,]+%?$/.test(v));
      });
      const fixa = secao.colunas.map((coluna, i) => numerica[i] || pareceData(coluna, amostra[0]?.[i] ?? ""));
      const pisos = secao.colunas.map(
        (coluna) =>
          Math.max(...coluna.toUpperCase().split(" ").map((p) => larguraEspacada(textoPdf(p), negrito, cabecaTamanho, cabecaEspaco))) + respiro,
      );
      const desejadas = secao.colunas.map((_, i) => {
        const palavraCabeca = pisos[i] - respiro;
        const medidas = amostra.map((linha) => regular.widthOfTextAtSize(textoPdf(linha[i] || "-"), textoTamanho)).sort((a, b) => a - b);
        const tipica = fixa[i] ? (medidas[medidas.length - 1] ?? 0) : (medidas[Math.floor(medidas.length * 0.85)] ?? 0);
        return Math.max(minimo, Math.min(tema.num("coluna-maxima", 240), Math.max(palavraCabeca, tipica) + respiro));
      });
      const somaFixa = desejadas.reduce((n, v, i) => n + (fixa[i] ? v : 0), 0);
      const somaFlex = desejadas.reduce((n, v, i) => n + (fixa[i] ? 0 : v), 0);
      const total = somaFixa + somaFlex;
      let larguras: number[];
      if (total <= larguraUtil) {
        const base = somaFlex || total;
        larguras = desejadas.map((v, i) => v + (somaFlex && fixa[i] ? 0 : ((larguraUtil - total) * v) / base));
      } else if (somaFlex && somaFixa < larguraUtil - minimo * fixa.filter((f) => !f).length) {
        const escala = (larguraUtil - somaFixa) / somaFlex;
        larguras = desejadas.map((v, i) => (fixa[i] ? v : v * escala));
      } else {
        larguras = desejadas.map((v) => (v * larguraUtil) / total);
      }
      const travadas = larguras.map((v, i) => v < pisos[i]);
      if (travadas.some(Boolean)) {
        const ocupado = pisos.reduce((n, piso, i) => n + (travadas[i] ? piso : 0), 0);
        const livres = larguras.reduce((n, v, i) => n + (travadas[i] ? 0 : v), 0);
        if (livres > 0 && ocupado < larguraUtil) {
          larguras = larguras.map((v, i) => (travadas[i] ? pisos[i] : (v * (larguraUtil - ocupado)) / livres));
        }
      }

      const cabecas = secao.colunas.map((coluna, i) => {
        const linhas: string[] = [];
        for (const palavra of textoPdf(coluna.toUpperCase()).split(" ")) {
          const candidato = linhas.length ? `${linhas[linhas.length - 1]} ${palavra}` : palavra;
          if (linhas.length && larguraEspacada(candidato, negrito, cabecaTamanho, cabecaEspaco) <= larguras[i] - respiro) linhas[linhas.length - 1] = candidato;
          else linhas.push(palavra);
        }
        return linhas.slice(0, 2);
      });
      const alturaCabeca = Math.max(...cabecas.map((c) => c.length)) * 9 + 14;
      const desenharCabeca = () => {
        precisa(alturaCabeca + 24);
        const topo = y + 12;
        pagina.drawRectangle({ x: MARGEM, y: topo - alturaCabeca, width: larguraUtil, height: alturaCabeca, color: VINHO });
        pagina.drawRectangle({ x: MARGEM, y: topo - alturaCabeca - 1.5, width: larguraUtil, height: 1.5, color: VERMELHO });
        let x = MARGEM;
        cabecas.forEach((partes, i) => {
          partes.forEach((parte, n) => {
            const texto = textoPdf(parte);
            const largo = larguraEspacada(texto, negrito, cabecaTamanho, cabecaEspaco);
            const px = numerica[i] ? x + larguras[i] - respiro / 2 - largo : x + respiro / 2;
            desenharEspacado(pagina, texto, px, topo - 12.5 - n * 9, cabecaTamanho, negrito, BRANCO, cabecaEspaco);
          });
          x += larguras[i];
        });
        y -= alturaCabeca + 2;
      };
      desenharCabeca();
      secao.linhas.forEach((linha, indice) => {
        const quebradas = linha.map((valor, i) => (numerica[i] ? [valor || "-"] : quebrar(valor || "-", regular, textoTamanho, larguras[i] - respiro)));
        const altura = Math.max(...quebradas.map((q) => q.length)) * textoLinha + 10;
        if (y - altura < RESERVA) {
          nova();
          desenharCabeca();
        }
        const topo = y + 12;
        if (indice % 2 === 1) {
          pagina.drawRectangle({ x: MARGEM, y: topo - altura, width: larguraUtil, height: altura, color: ZEBRA });
        }
        pagina.drawRectangle({ x: MARGEM, y: topo - altura, width: larguraUtil, height: 0.5, color: LINHA });
        let x = MARGEM;
        quebradas.forEach((partes, i) => {
          const destaque = i === 0 && /^[A-Za-z]{1,4}\d/.test(partes[0] ?? "");
          const fonte = destaque ? negrito : regular;
          partes.forEach((parte, n) => {
            const texto = textoPdf(parte);
            const vazio = texto === "-";
            const px = numerica[i] ? x + larguras[i] - respiro / 2 - fonte.widthOfTextAtSize(texto, textoTamanho) : x + respiro / 2;
            pagina.drawText(texto, {
              x: px,
              y: y - 2 - n * textoLinha,
              size: textoTamanho,
              font: fonte,
              color: vazio ? LINHA : destaque ? VINHO : TINTA,
            });
          });
          x += larguras[i];
        });
        y -= altura;
      });
      pagina.drawRectangle({ x: MARGEM, y: y + 12, width: larguraUtil, height: 1, color: VINHO });
      y -= 22;
      continue;
    }

    const porFileira = tema.num("cards-colunas", paisagem ? 4 : 3);
    const vaoCampo = 14;
    const larguraCampo = (larguraUtil - 24 - vaoCampo * (porFileira - 1)) / porFileira;
    secao.linhas.forEach((linha) => {
      const pares = secao.colunas.map((coluna, i) => ({ coluna, valor: linha[i] })).filter((par) => par.valor);
      if (!pares.length) return;
      const [principal, ...resto] = pares;
      const campos = resto.map((par) => ({
        rotulo: quebrar(par.coluna.toUpperCase(), negrito, 6.5, larguraCampo)[0],
        partes: quebrar(par.valor, regular, 8.5, larguraCampo).slice(0, 6),
      }));
      const fileiras: (typeof campos)[] = [];
      for (let i = 0; i < campos.length; i += porFileira) fileiras.push(campos.slice(i, i + porFileira));
      const alturas = fileiras.map((f) => 14 + Math.max(...f.map((c) => c.partes.length)) * 11);
      const alturaTopo = 24;
      const altura = alturaTopo + 8 + alturas.reduce((n, v) => n + v, 0);
      precisa(altura);
      const topo = y + 12;
      pagina.drawRectangle({ x: MARGEM, y: topo - altura, width: larguraUtil, height: altura, color: BRANCO, borderColor: LINHA, borderWidth: 0.6 });
      pagina.drawRectangle({ x: MARGEM, y: topo - alturaTopo, width: larguraUtil, height: alturaTopo, color: FUNDO });
      pagina.drawRectangle({ x: MARGEM, y: topo - altura, width: 3, height: altura, color: VERMELHO });
      const rotuloPrincipal = textoPdf(principal.coluna.toUpperCase());
      desenharEspacado(pagina, rotuloPrincipal, MARGEM + 12, topo - 15, 6.5, negrito, CINZA, 0.6);
      const xValor = MARGEM + 12 + larguraEspacada(rotuloPrincipal, negrito, 6.5, 0.6) + 8;
      const valorPrincipal = quebrar(principal.valor, negrito, 10, LARGURA - MARGEM - 12 - xValor)[0];
      pagina.drawText(textoPdf(valorPrincipal), { x: xValor, y: topo - 15.5, size: 10, font: negrito, color: VINHO });
      let cursor = topo - alturaTopo - 6;
      fileiras.forEach((fileira, k) => {
        fileira.forEach((campo, j) => {
          const x = MARGEM + 12 + j * (larguraCampo + vaoCampo);
          pagina.drawText(textoPdf(campo.rotulo), { x, y: cursor - 7, size: 6.5, font: negrito, color: CINZA });
          campo.partes.forEach((parte, n) => {
            pagina.drawText(textoPdf(parte), { x, y: cursor - 18 - n * 11, size: 8.5, font: regular, color: TINTA });
          });
        });
        cursor -= alturas[k];
      });
      y -= altura + 8;
    });
    y -= 10;
  }

  const paginas = doc.getPages();
  paginas.forEach((item, i) => {
    const marca = `Página ${i + 1} de ${paginas.length}`;
    item.drawRectangle({ x: MARGEM, y: 32, width: larguraUtil, height: 0.6, color: LINHA });
    const rodape = tema.num("rodape", 8);
    desenharEspacado(item, "MAICON AI", MARGEM, 16, rodape, negrito, CINZA, tema.num("rodape-espaco", 1.5));
    const emitido = textoPdf(`Emitido em ${agora.slice(0, 17).replace(",", "")}`);
    item.drawText(emitido, { x: (LARGURA - regular.widthOfTextAtSize(emitido, rodape - 1)) / 2, y: 16, size: rodape - 1, font: regular, color: CINZA });
    item.drawText(marca, { x: LARGURA - MARGEM - negrito.widthOfTextAtSize(marca, rodape), y: 16, size: rodape, font: negrito, color: VERMELHO });
  });
  doc.setTitle(textoPdf(titulo));
  doc.setCreator("Consulta de log");
  return doc.save();
}

export async function baixarPdf(relatorio: RelatorioChat, resumo: string) {
  const bytes = await bytesDoPdf(relatorio, resumo);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dia = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `relatorio-${dia}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
