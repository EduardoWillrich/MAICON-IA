const IGNORAR = /^(ano|indice|index|codigo|situacao|tipo|tipo_carga|numero_processo)$/i;

export function numeroDe(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "bigint") {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof valor !== "string") return null;
  let texto = valor.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!texto || texto === "-" || texto === "—") return null;
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(texto) || /^-?\d+,\d+$/.test(texto)) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(texto)) {
    texto = texto.replace(/,/g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(texto)) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

export function colunaDeConta(nome) {
  const n = String(nome ?? "").trim();
  if (!n) return false;
  if (/^id/i.test(n)) return false;
  if (/(?:^|_)id$/i.test(n)) return false;
  if (IGNORAR.test(n)) return false;
  if (/codigo/i.test(n)) return false;
  if (/processo/i.test(n) && !/valor|quant|qtd/i.test(n)) return false;
  return true;
}

function percentual(nome) {
  return /percent|porcent|margem|\bpct\b/i.test(nome);
}

function dinheiro(nome) {
  return /valor|pagamento|recebimento|comiss|frete|pre[cç]o|custo|taxa|lucro|profit|seguro|import[aâ]ncia/i.test(nome);
}

function arredondar(n, casas) {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
}

function repetidoNaLinha(nome, minimo, maximo, qtd, janela) {
  return Boolean(janela) && minimo === maximo && qtd > 1 && /total|qtd|quantidade|contagem/i.test(nome);
}

export function resumirCalculos(linhas, opcoes = {}) {
  const lista = (Array.isArray(linhas) ? linhas : []).filter((linha) => linha && typeof linha === "object");
  const total = lista.length;
  if (total < 2) return { linhas: total, colunas: [], derivados: [] };
  const nomes = [];
  for (const linha of lista) {
    for (const nome of Object.keys(linha)) {
      if (!nomes.includes(nome) && colunaDeConta(nome)) nomes.push(nome);
    }
  }
  const colunas = [];
  for (const nome of nomes) {
    const numeros = [];
    let outros = 0;
    for (const linha of lista) {
      const bruto = linha[nome];
      if (bruto == null || String(bruto).trim() === "") continue;
      const n = numeroDe(bruto);
      if (n == null) outros += 1;
      else numeros.push(n);
    }
    const cheios = numeros.length + outros;
    if (!numeros.length || numeros.length / Math.max(cheios, 1) < 0.8) continue;
    const distintos = [...new Set(numeros.map((n) => String(n)))];
    if (distintos.length <= 2 && distintos.every((n) => n === "0" || n === "1") && /situacao|tipo|flag|ativo|cancel|fechad/i.test(nome)) {
      continue;
    }
    const soma = numeros.reduce((acc, n) => acc + n, 0);
    const minimo = Math.min(...numeros);
    const maximo = Math.max(...numeros);
    colunas.push({
      nome,
      qtd: numeros.length,
      soma: arredondar(soma, 2),
      media: arredondar(soma / numeros.length, 2),
      minimo: arredondar(minimo, 2),
      maximo: arredondar(maximo, 2),
      dinheiro: dinheiro(nome),
      percentual: percentual(nome),
      repetido: repetidoNaLinha(nome, minimo, maximo, numeros.length, opcoes.janela),
    });
    if (colunas.length >= 8) break;
  }
  const derivados = [];
  if (!opcoes.janela) {
    const pag = colunas.find((coluna) => /pagamento/i.test(coluna.nome) && !coluna.percentual && !coluna.repetido);
    const rec = colunas.find((coluna) => /recebimento/i.test(coluna.nome) && !coluna.percentual && !coluna.repetido);
    if (pag && rec) {
      const lucro = arredondar(rec.soma - pag.soma, 2);
      derivados.push({ nome: "Lucro", detalhe: `${rec.nome} − ${pag.nome}`, valor: lucro, dinheiro: true });
      if (rec.soma > 0) {
        derivados.push({
          nome: "Margem",
          detalhe: "lucro / recebimento",
          valor: arredondar((lucro / rec.soma) * 100, 1),
          percentual: true,
        });
      }
    }
  }
  return { linhas: total, colunas, derivados, truncado: Boolean(opcoes.truncado) };
}

function fmt(n, emDinheiro, emPercentual) {
  if (emPercentual) return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  if (emDinheiro) return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function textoCalculos(linhas, opcoes = {}) {
  const resumo = resumirCalculos(linhas, opcoes);
  if (resumo.linhas < 2) return "";
  const texto = [
    `CÁLCULOS sobre ${resumo.linhas.toLocaleString("pt-BR")} linhas. Use estes números; a tabela é só uma amostra e não serve para somar.`,
  ];
  if (resumo.truncado) texto.push("- A lista enviada foi cortada em 5000 linhas. Estes cálculos usam o conjunto inteiro.");
  texto.push(`- Total de linhas: ${resumo.linhas.toLocaleString("pt-BR")}`);
  for (const coluna of resumo.colunas) {
    if (coluna.repetido) {
      texto.push(`- ${coluna.nome}: ${fmt(coluna.maximo, coluna.dinheiro, coluna.percentual)} em cada linha (já é o total do conjunto; não multiplique).`);
      continue;
    }
    if (coluna.percentual) {
      texto.push(`- ${coluna.nome}: média ${fmt(coluna.media, false, true)}; mínimo ${fmt(coluna.minimo, false, true)}; máximo ${fmt(coluna.maximo, false, true)}. Não some percentual.`);
      continue;
    }
    const base = coluna.qtd === resumo.linhas ? "" : ` sobre ${coluna.qtd.toLocaleString("pt-BR")} valores`;
    texto.push(
      `- ${coluna.nome}: soma ${fmt(coluna.soma, coluna.dinheiro, false)}${base}; média ${fmt(coluna.media, coluna.dinheiro, false)}; mínimo ${fmt(coluna.minimo, coluna.dinheiro, false)}; máximo ${fmt(coluna.maximo, coluna.dinheiro, false)}.`,
    );
  }
  for (const item of resumo.derivados) {
    texto.push(`- ${item.nome} (${item.detalhe}): ${fmt(item.valor, item.dinheiro, item.percentual)}.`);
  }
  return texto.join("\n");
}
