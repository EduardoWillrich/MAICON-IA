import ExcelJS from "exceljs";
import { relatorioComDetalhe, type RelatorioChat, type SecaoRelatorio } from "./pdfRelatorio";

const VINHO = "FF6B121A";
const VERMELHO = "FFB22129";
const ROSA = "FFEDCCCC";
const ZEBRA = "FFF9F4F3";
const BORDA = "FFE6DBDB";
const TEXTO = "FF1F242E";
const CINZA = "FF6B6666";
const BRANCO = "FFFFFFFF";
const FONTE = "Calibri";

const linhaFina = { style: "thin" as const, color: { argb: BORDA } };

function colunaDinheiro(nome: string) {
  return /valor|pagamento|recebimento|comiss|frete|pre[cç]o|custo|lucro|profit|moeda|seguro|taxa/i.test(nome);
}

function colunaIdentificador(nome: string) {
  return /n[uú]mero|processo|refer|c[oó]digo|\bdi\b|\bce\b|cnpj|cpf|telefone|cep|conhecimento|container/i.test(nome);
}

function numeroMoeda(texto: string): number | null {
  const limpo = texto.trim().replace(/R\$\s?/gi, "").trim();
  if (!limpo) return null;
  if (/^-?\d{1,3}(?:\.\d{3})+,\d+$/.test(limpo) || /^-?\d+,\d+$/.test(limpo)) {
    const n = Number(limpo.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(limpo)) {
    const n = Number(limpo);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function numeroSimples(texto: string): number | null {
  const limpo = texto.trim();
  if (/^-?(?:0|[1-9]\d{0,8})$/.test(limpo)) return Number(limpo);
  if (/^-?\d+,\d+$/.test(limpo)) return Number(limpo.replace(",", "."));
  return null;
}

function dataDe(texto: string): { valor: Date; comHora: boolean } | null {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const valor = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0)));
  return Number.isNaN(valor.getTime()) ? null : { valor, comHora: m[4] != null };
}

function largura(coluna: string, linhas: string[][], indice: number) {
  const tamanhos = linhas.slice(0, 300).map((linha) => (linha[indice] ?? "").length).sort((a, b) => a - b);
  const tipico = tamanhos[Math.floor(tamanhos.length * 0.9)] ?? 0;
  return Math.min(50, Math.max(12, Math.ceil(Math.max(coluna.length, tipico) * 1.05) + 3));
}

function preencher(celula: ExcelJS.Cell, cor: string) {
  celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cor } };
}

function escreverSecao(aba: ExcelJS.Worksheet, secao: SecaoRelatorio, inicio: number) {
  const colunas = secao.colunas.length;
  const titulo = aba.getRow(inicio);
  titulo.height = 22;
  const celulaTitulo = titulo.getCell(1);
  celulaTitulo.value = {
    richText: [
      { text: secao.titulo.toUpperCase(), font: { name: FONTE, bold: true, size: 11, color: { argb: VINHO } } },
      {
        text: `   ${secao.linhas.length} registro${secao.linhas.length === 1 ? "" : "s"}`,
        font: { name: FONTE, size: 9, color: { argb: CINZA } },
      },
    ],
  };
  celulaTitulo.alignment = { vertical: "bottom" };
  if (colunas > 1) aba.mergeCells(inicio, 1, inicio, colunas);
  for (let i = 1; i <= colunas; i++) {
    titulo.getCell(i).border = { bottom: { style: "medium", color: { argb: VERMELHO } } };
  }

  const cabeca = aba.getRow(inicio + 1);
  cabeca.height = 30;
  secao.colunas.forEach((coluna, i) => {
    const celula = cabeca.getCell(i + 1);
    celula.value = coluna;
    celula.font = { name: FONTE, bold: true, size: 10, color: { argb: BRANCO } };
    preencher(celula, VINHO);
    celula.alignment = {
      vertical: "middle",
      horizontal: colunaDinheiro(coluna) ? "right" : "left",
      indent: 1,
      wrapText: true,
    };
    celula.border = {
      left: { style: "thin", color: { argb: "FF8A2A31" } },
      right: { style: "thin", color: { argb: "FF8A2A31" } },
    };
    aba.getColumn(i + 1).width = Math.max(aba.getColumn(i + 1).width ?? 0, largura(coluna, secao.linhas, i));
  });

  const somas = secao.colunas.map(() => false);
  secao.linhas.forEach((linha, indice) => {
    const row = aba.getRow(inicio + 2 + indice);
    const linhasTexto = Math.max(1, ...linha.map((valor, i) => Math.ceil((valor || "").length / Math.max(10, (aba.getColumn(i + 1).width ?? 12) - 2))));
    row.height = Math.max(20, Math.min(90, linhasTexto * 14 + 4));
    linha.forEach((valor, i) => {
      const celula = row.getCell(i + 1);
      const texto = valor || "";
      const nome = secao.colunas[i] ?? "";
      const moeda = colunaDinheiro(nome) ? numeroMoeda(texto) : null;
      const data = moeda == null ? dataDe(texto) : null;
      const numero = moeda == null && !data && !colunaIdentificador(nome) ? numeroSimples(texto) : null;
      let horizontal: "left" | "right" | "center" = "left";
      if (moeda != null) {
        celula.value = moeda;
        celula.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
        horizontal = "right";
        somas[i] = true;
      } else if (data) {
        celula.value = data.valor;
        celula.numFmt = data.comHora ? "dd/mm/yyyy hh:mm" : "dd/mm/yyyy";
        horizontal = "center";
      } else if (numero != null) {
        celula.value = numero;
        celula.numFmt = Number.isInteger(numero) ? "#,##0" : "#,##0.00";
        horizontal = "right";
      } else {
        celula.value = texto;
      }
      const destaque = i === 0 && /^[A-Za-z]{1,4}\d/.test(texto);
      celula.font = { name: FONTE, size: 10, bold: destaque, color: { argb: destaque ? VINHO : TEXTO } };
      celula.alignment = { vertical: "middle", horizontal, indent: horizontal === "center" ? 0 : 1, wrapText: horizontal === "left" };
      if (indice % 2 === 1) preencher(celula, ZEBRA);
      celula.border = { bottom: linhaFina, left: linhaFina, right: linhaFina };
    });
  });

  const primeiraDados = inicio + 2;
  const ultimaDados = inicio + 1 + secao.linhas.length;
  if (secao.linhas.length > 1 && somas.some(Boolean)) {
    const total = aba.getRow(ultimaDados + 1);
    total.height = 22;
    secao.colunas.forEach((_, i) => {
      const celula = total.getCell(i + 1);
      const letra = aba.getColumn(i + 1).letter;
      if (i === 0) celula.value = "Total";
      else if (somas[i]) {
        celula.value = { formula: `SUM(${letra}${primeiraDados}:${letra}${ultimaDados})` };
        celula.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
      }
      celula.font = { name: FONTE, bold: true, size: 10, color: { argb: VINHO } };
      celula.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", indent: 1 };
      preencher(celula, ROSA);
      celula.border = { top: { style: "medium", color: { argb: VINHO } } };
    });
    return ultimaDados + 4;
  }
  return ultimaDados + 3;
}

export async function baixarExcel(relatorioOriginal: RelatorioChat) {
  const relatorio = relatorioComDetalhe(relatorioOriginal);
  const livro = new ExcelJS.Workbook();
  livro.creator = "Maicon AI";
  livro.created = new Date();
  const primeira = relatorio.secoes[0];
  const inicioPrimeira = 5;
  const aba = livro.addWorksheet("Relatório", {
    views: [{ state: "frozen", ySplit: primeira ? inicioPrimeira + 1 : 3, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
    },
    properties: { tabColor: { argb: VINHO } },
  });
  const colunas = Math.max(2, ...relatorio.secoes.map((secao) => secao.colunas.length));
  const total = relatorio.secoes.reduce((n, secao) => n + secao.linhas.length, 0);

  aba.mergeCells(1, 1, 1, colunas);
  const capa = aba.getCell(1, 1);
  capa.value = relatorio.titulo || "Relatório";
  capa.font = { name: FONTE, bold: true, size: 16, color: { argb: BRANCO } };
  capa.alignment = { vertical: "middle", indent: 1 };
  aba.getRow(1).height = 36;

  aba.mergeCells(2, 1, 2, colunas);
  const meta = aba.getCell(2, 1);
  meta.value = `MAICON AI   ·   Emitido em ${new Date().toLocaleString("pt-BR")}   ·   ${total} registro${total === 1 ? "" : "s"}`;
  meta.font = { name: FONTE, size: 9, color: { argb: ROSA } };
  meta.alignment = { vertical: "top", indent: 1 };
  aba.getRow(2).height = 20;
  aba.getRow(3).height = 4;
  for (let i = 1; i <= colunas; i++) {
    preencher(aba.getCell(1, i), VINHO);
    preencher(aba.getCell(2, i), VINHO);
    preencher(aba.getCell(3, i), VERMELHO);
  }

  let cursor = inicioPrimeira;
  for (const secao of relatorio.secoes) cursor = escreverSecao(aba, secao, cursor);
  if (primeira) {
    aba.autoFilter = {
      from: { row: inicioPrimeira + 1, column: 1 },
      to: { row: inicioPrimeira + 1 + primeira.linhas.length, column: primeira.colunas.length },
    };
    aba.pageSetup.printTitlesRow = `${inicioPrimeira + 1}:${inicioPrimeira + 1}`;
  }

  aba.headerFooter = {
    oddFooter: "&L&8&K6B6666Maicon AI · Consulta de log&R&8&KB22129Página &P de &N",
  };

  const bytes = await livro.xlsx.writeBuffer();
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
