type LinhaEstatistica = { rotulo: string; valor: string; destaque: boolean };
type ModalProposta = { nome: string; linhas: LinhaEstatistica[] };
type TaxaProposta = { nome: string; pagamento: string; recebimento: string; resultado: string; total: boolean };
type ResumoProposta = { nome: string; valor: string };

type DocumentoProposta = {
  numero: string;
  cliente: string;
  cnpj: string;
  pais: string;
  modais: ModalProposta[];
  taxas: TaxaProposta[];
  resumo: ResumoProposta[];
  nota: string;
};

function textoPdf(valor: string) {
  return valor.replace(/\u2014|\u2013/g, "-").replace(/\u2192/g, "->").replace(/[^\n\r\t\u0020-\u00ff]/g, "").trim();
}

function textoDe(no: Element | null | undefined) {
  return (no?.textContent || "").replace(/\s+/g, " ").trim();
}

export function documentoDaProposta(html: string): DocumentoProposta {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const numero = textoDe(doc.querySelector("div[style*='font-size:26px']")) || textoDe(doc.querySelector("div[style*='font-size:28px']"));
  const cabeca = [...doc.querySelectorAll("td")].find((celula) => /^\s*Cliente\b/.test(celula.textContent || "") && (celula.querySelectorAll("b, strong").length >= 3));
  const campos = [...(cabeca?.querySelectorAll("b, strong") || [])].map(textoDe);
  const campo = (indice: number) => campos[indice] || "";
  const modais = [...doc.querySelectorAll("td")].filter((coluna) => /^(Aéreo|FCL|LCL)$/.test(textoDe(coluna.querySelector(":scope > div")))).map((coluna) => {
    const tabela = coluna.querySelector("table");
    const linhas = [...(tabela?.querySelectorAll(":scope > tbody > tr, :scope > tr") || [])].map((linha) => {
      const celulas = [...linha.children].filter((item) => item.tagName === "TD");
      return {
        rotulo: textoDe(celulas[0]),
        valor: textoDe(celulas[1]),
        destaque: (celulas[1]?.innerHTML || "").includes("#b81f1d") || /^Prob/.test(textoDe(celulas[0])),
      };
    }).filter((linha) => linha.rotulo);
    return { nome: textoDe(coluna.querySelector("div")), linhas };
  });
  const tabelaTaxas = [...doc.querySelectorAll("table")].find((tabela) => {
    const celulas = [...(tabela.querySelector("tr")?.children || [])].map(textoDe);
    return celulas[0] === "Taxa" && celulas.includes("Pagamento") && celulas.includes("Recebimento");
  });
  const taxas = [...(tabelaTaxas?.querySelectorAll("tr") || [])]
    .map((linha) => {
      const celulas = [...linha.querySelectorAll("td")].map(textoDe);
      return {
        nome: celulas[0] || "",
        pagamento: celulas[1] || "",
        recebimento: celulas[2] || "",
        resultado: celulas[3] || "",
        total: /^total$/i.test(celulas[0] || ""),
      };
    })
    .filter((linha) => linha.nome && linha.nome !== "Taxa");
  const resumo = [...doc.querySelectorAll("td")]
    .map((celula) => [...celula.querySelectorAll(":scope > div")].map(textoDe))
    .filter((divs) => /^Taxa de /.test(divs[0] || "") && divs[1])
    .map((divs) => ({ nome: divs[0], valor: divs[1] }));
  const nota = [...doc.querySelectorAll("td")].map(textoDe).find((item) => item.startsWith("Proposta ")) || "";
  return {
    numero: numero || "Proposta",
    cliente: campo(0),
    cnpj: campo(1),
    pais: campo(2),
    modais: modais.filter((item) => item.nome),
    taxas,
    resumo,
    nota,
  };
}

export async function baixarPdfProposta(html: string, logoUrl: string) {
  const dados = documentoDaProposta(html);
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const origem = html.match(/src="(data:image\/png;base64,[^"]+)"/)?.[1] || logoUrl;
    const arquivo = await fetch(origem).then((resposta) => resposta.arrayBuffer());
    logo = await doc.embedPng(arquivo);
  } catch {
    logo = null;
  }
  const largura = 595;
  const altura = 842;
  const margem = 28;
  const miolo = largura - margem * 2;
  const preto = rgb(0.11, 0.14, 0.2);
  const cinza = rgb(0.42, 0.45, 0.52);
  const vermelho = rgb(232 / 255, 48 / 255, 45 / 255);
  const branco = rgb(1, 1, 1);
  let pagina = doc.addPage([largura, altura]);
  let y = altura - margem;
  const nova = () => {
    pagina = doc.addPage([largura, altura]);
    y = altura - margem;
  };
  const garantir = (espaco: number) => {
    if (y - espaco < margem) nova();
  };
  const quebrar = (texto: string, fonte: typeof regular, tamanho: number, limite: number) => {
    const palavras = textoPdf(texto).split(/\s+/).filter(Boolean);
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) > limite && atual) {
        linhas.push(atual);
        atual = palavra;
      } else atual = tentativa;
    }
    if (atual) linhas.push(atual);
    return linhas.length ? linhas : [""];
  };
  const direita = (texto: string, x: number, linhaY: number, tamanho: number, fonte: typeof regular, cor = preto) => {
    const limpo = textoPdf(texto);
    pagina.drawText(limpo, { x: x - fonte.widthOfTextAtSize(limpo, tamanho), y: linhaY, size: tamanho, font: fonte, color: cor });
  };

  const alturaLogo = 34;
  if (logo) {
    const logoLargura = (logo.width / logo.height) * alturaLogo;
    pagina.drawImage(logo, { x: margem, y: y - alturaLogo, width: logoLargura, height: alturaLogo });
  } else {
    pagina.drawText("conline", { x: margem, y: y - 22, size: 16, font: negrito, color: vermelho });
  }
  const cabeca = [
    ["Cliente", dados.cliente],
    ["CNPJ", dados.cnpj],
    ["País", dados.pais],
  ].filter(([, valor]) => valor);
  cabeca.forEach((item, indice) => {
    const linha = `${item[0]}  ${item[1]}`;
    direita(linha, largura - margem, y - 10 - indice * 12, 8, negrito);
  });
  y -= Math.max(alturaLogo, cabeca.length * 12) + 8;
  pagina.drawText(textoPdf(dados.numero), { x: margem, y, size: 14, font: negrito, color: preto });
  y -= 16;

  const faixa = (titulo: string) => {
    garantir(22);
    pagina.drawRectangle({ x: margem, y: y - 14, width: miolo, height: 18, color: vermelho });
    pagina.drawText(textoPdf(titulo), { x: margem + 8, y: y - 9, size: 9, font: negrito, color: branco });
    y -= 22;
  };

  faixa("Estatística do cliente");
  const colunas = dados.modais.length || 1;
  const coluna = miolo / colunas;
  const estoura = (linha: { rotulo: string; valor: string }) => {
    const rotulo = textoPdf(linha.rotulo);
    const valor = textoPdf(linha.valor);
    return regular.widthOfTextAtSize(rotulo, 7) + negrito.widthOfTextAtSize(valor, 7) + 14 > coluna;
  };
  const alturaColuna = Math.max(...dados.modais.map((modal) => 16 + modal.linhas.reduce((total, linha) => total + (estoura(linha) ? 21 : 11), 0)), 16);
  garantir(alturaColuna + 8);
  dados.modais.forEach((modal, indice) => {
    const x = margem + indice * coluna;
    const titulo = textoPdf(modal.nome);
    const centro = x + (coluna - negrito.widthOfTextAtSize(titulo, 11)) / 2;
    pagina.drawText(titulo, { x: centro, y, size: 11, font: negrito, color: vermelho });
    let linhaY = y - 16;
    modal.linhas.forEach((linha) => {
      const cor = linha.destaque ? vermelho : cinza;
      const rotulo = textoPdf(linha.rotulo);
      const valor = textoPdf(linha.valor);
      const larguraRotulo = regular.widthOfTextAtSize(rotulo, 7);
      const larguraValor = negrito.widthOfTextAtSize(valor, 7);
      pagina.drawText(rotulo, { x: x + 4, y: linhaY, size: 7, font: regular, color: cor });
      if (larguraRotulo + larguraValor + 14 > coluna) {
        linhaY -= 10;
        direita(valor, x + coluna - 6, linhaY, 7, negrito, linha.destaque ? vermelho : preto);
      } else {
        direita(valor, x + coluna - 6, linhaY, 7, negrito, linha.destaque ? vermelho : preto);
      }
      linhaY -= 11;
    });
  });
  y -= alturaColuna + 10;

  faixa("Taxas");
  const limites = [miolo * 0.4, miolo * 0.2, miolo * 0.2, miolo * 0.2];
  const cabecalhos = ["Taxa", "Pagamento", "Recebimento", "Resultado"];
  garantir(16);
  let xCabeca = margem;
  cabecalhos.forEach((item, indice) => {
    if (indice === 0) pagina.drawText(item, { x: xCabeca + 4, y, size: 7, font: negrito, color: cinza });
    else direita(item, xCabeca + limites[indice] - 4, y, 7, negrito, cinza);
    xCabeca += limites[indice];
  });
  y -= 12;
  for (const taxa of dados.taxas) {
    const nome = quebrar(taxa.nome, taxa.total ? negrito : regular, 8, limites[0] - 8);
    const alturaLinha = Math.max(nome.length, 1) * 10 + 4;
    garantir(alturaLinha);
    pagina.drawLine({ start: { x: margem, y: y + 8 }, end: { x: largura - margem, y: y + 8 }, thickness: 0.4, color: rgb(0.9, 0.91, 0.94) });
    nome.forEach((item, linha) => {
      pagina.drawText(item, { x: margem + 4, y: y - linha * 10, size: 8, font: negrito, color: preto });
    });
    direita(taxa.pagamento, margem + limites[0] + limites[1] - 4, y, 8, taxa.total ? negrito : regular);
    direita(taxa.recebimento, margem + limites[0] + limites[1] + limites[2] - 4, y, 8, taxa.total ? negrito : regular);
    const resultado = textoPdf(taxa.resultado);
    const corResultado = resultado.startsWith("+") ? rgb(15 / 255, 122 / 255, 74 / 255) : resultado.startsWith("-") ? vermelho : cinza;
    direita(resultado, largura - margem - 4, y, 8, negrito, corResultado);
    y -= alturaLinha;
  }
  y -= 8;
  if (dados.resumo.length) {
    garantir(42);
    const espaco = 8;
    const caixa = (miolo - espaco * (dados.resumo.length - 1)) / dados.resumo.length;
    const rosa = rgb(253 / 255, 236 / 255, 236 / 255);
    dados.resumo.forEach((item, indice) => {
      const x = margem + indice * (caixa + espaco);
      pagina.drawRectangle({ x, y: y - 28, width: caixa, height: 36, color: rosa });
      pagina.drawText(textoPdf(item.nome), { x: x + 8, y: y - 2, size: 7, font: negrito, color: cinza });
      pagina.drawText(textoPdf(item.valor), { x: x + 8, y: y - 16, size: 11, font: negrito, color: preto });
    });
    y -= 44;
  }
  if (dados.nota) {
    const linhas = quebrar(dados.nota, regular, 8, miolo);
    garantir(linhas.length * 11 + 8);
    y -= 4;
    linhas.forEach((item) => {
      const centro = margem + (miolo - regular.widthOfTextAtSize(item, 8)) / 2;
      pagina.drawText(item, { x: centro, y, size: 8, font: regular, color: cinza });
      y -= 11;
    });
  }

  const bytes = await doc.save();
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Proposta ${textoPdf(dados.numero).replace(/[\\/:*?"<>|]+/g, "-") || "comercial"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
