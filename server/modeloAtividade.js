import sql from "mssql";

const PROIBIDO = /\b(insert|update|delete|drop|alter|exec|execute|merge|truncate|grant|revoke|xp_)\b/i;

export function faixasDoModelo(dados) {
  const texto = String(dados ?? "");
  const marcas = [...texto.matchAll(/\[([A-Za-z0-9_.]+)\]/g)];
  if (!marcas.length) return [{ nome: "Report.Detail", texto }];
  return marcas.map((marca, indice) => {
    const inicio = marca.index + marca[0].length;
    const fim = indice + 1 < marcas.length ? marcas[indice + 1].index : texto.length;
    return { nome: marca[1], texto: texto.slice(inicio, fim) };
  });
}

export function datasetsNoTexto(dados) {
  const texto = String(dados ?? "");
  const achados = [];
  const marcas = /<DataSet\b[^>]*?\bName\s*=\s*"([^"]+)"[^>]*?\bSql\s*=\s*"([\s\S]*?)"\s*>/gi;
  let item;
  while ((item = marcas.exec(texto))) achados.push({ nome: item[1], sql: item[2] });
  return achados;
}

export function datasetsDoModelo(dados) {
  const cabeca = String(dados ?? "").split(/\[Acompanhamento\.Detail\]/i)[0] || "";
  return datasetsNoTexto(cabeca);
}

function foraDasAspas(texto) {
  return texto.replace(/'(?:''|[^'])*'/g, "''");
}

export function sqlDoDataset(comando) {
  const texto = String(comando ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/:IdAtividade\b/g, "@IdAtividade")
    .trim();
  const solto = foraDasAspas(texto);
  const partes = solto.split(";").map((parte) => parte.trim()).filter(Boolean);
  if (!partes.length || partes.some((parte) => !/^(declare|select)\b/i.test(parte))) return "";
  if (PROIBIDO.test(solto) || /:[A-Za-z_]/.test(solto)) return "";
  return texto;
}

function atributo(attrs, nome) {
  const achado = new RegExp(`\\b${nome}\\s*=\\s*"([^"]*)"`, "i").exec(attrs || "");
  return achado ? achado[1] : "";
}

function dataNota(valor) {
  const data = valor instanceof Date ? valor : null;
  if (!data || Number.isNaN(data.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  const dia = `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
  if (data.getUTCHours() === 0 && data.getUTCMinutes() === 0) return dia;
  return `${dia} ${p(data.getUTCHours())}:${p(data.getUTCMinutes())}`;
}

function valorNota(valor) {
  if (valor == null) return "";
  const data = dataNota(valor);
  if (data) return data;
  return String(valor).replace(/\s+/g, " ").trim();
}

export function notaDoModelo(dados, linhasPorDataset) {
  const partes = String(dados ?? "").split(/\[Acompanhamento\.Detail\]/i);
  const detalhe = (partes.length > 1 ? partes.slice(1).join(" ") : partes[0] || "")
    .replace(/<DataSet\b[\s\S]*?>/gi, " ")
    .replace(/\[[A-Za-z0-9_.]+\]/g, " ");
  const texto = detalhe
    .replace(/<Print\b([^>]*)>/gi, (_, attrs) => {
      const conjunto = atributo(attrs, "DataSet");
      const campo = atributo(attrs, "FieldName");
      const linha = (linhasPorDataset[conjunto] || [])[0] || {};
      return valorNota(linha[campo]);
    })
    .replace(/<\/?SubReport\b[^>]*>/gi, " ");
  return texto.replace(/\s+/g, " ").trim().slice(0, 900);
}

async function linhasDoDataset(pool, comando, idAtividade) {
  const texto = sqlDoDataset(comando);
  if (!texto) return [];
  const r = await pool.request().input("IdAtividade", sql.Int, idAtividade).query(texto);
  const listas = r.recordsets?.length ? r.recordsets : [r.recordset || []];
  return listas[listas.length - 1] || [];
}

async function notaDaAtividade(pool, dados, idAtividade) {
  const conjuntos = {};
  for (const dataset of datasetsDoModelo(dados)) {
    try {
      conjuntos[dataset.nome] = await linhasDoDataset(pool, dataset.sql, idAtividade);
    } catch {
      conjuntos[dataset.nome] = [];
    }
  }
  return notaDoModelo(dados, conjuntos);
}

export async function atividadesDoProcesso(pool, idProjeto) {
  if (!idProjeto) return [];
  const r = await pool.request().input("id", sql.Int, idProjeto).query(`
    SELECT TOP 12
      Ati.IdAtividade,
      Tar.Descricao AS Atividade,
      Ati.Previsao_Termino,
      Resp.Nome AS Responsavel,
      Mm.Nome AS Modelo_Mensagem,
      Ma.Nome AS Modelo_Acompanhamento,
      CAST(Ma.Dados AS nvarchar(max)) AS Dados
    FROM mov_Atividade Ati
    JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN cad_Pessoa Resp ON Resp.IdPessoa = Ati.IdResponsavel
    LEFT JOIN cad_Modelo_Mensagem Mm ON Mm.IdModelo_Mensagem = Ati.IdModelo_Mensagem
    LEFT JOIN cad_Modelo_Acompanhamento Ma ON Ma.IdModelo_Acompanhamento = Ati.IdModelo_Acompanhamento
    WHERE Ati.IdProjeto_Atividade = @id
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 5, 6)
      AND (Ati.IdModelo_Mensagem IS NOT NULL OR Ati.IdModelo_Acompanhamento IS NOT NULL)
      AND Tar.Descricao NOT LIKE 'INATIVO%'
    ORDER BY CASE WHEN Ma.IdModelo_Acompanhamento IS NULL THEN 1 ELSE 0 END,
      CASE WHEN Ati.Previsao_Termino IS NULL THEN 1 ELSE 0 END,
      Ati.Previsao_Termino`);
  return Promise.all(r.recordset.map(async (linha) => ({
    id: linha.IdAtividade,
    nome: String(linha.Atividade ?? "").trim(),
    previsao: dataNota(linha.Previsao_Termino),
    responsavel: String(linha.Responsavel ?? "").trim(),
    modeloMensagem: String(linha.Modelo_Mensagem ?? "").trim(),
    modeloAcompanhamento: String(linha.Modelo_Acompanhamento ?? "").trim(),
    nota: linha.Dados ? await notaDaAtividade(pool, linha.Dados, linha.IdAtividade) : "",
  })));
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function campoDaLinha(linha, nome) {
  if (!linha || !nome) return undefined;
  if (Object.prototype.hasOwnProperty.call(linha, nome)) return linha[nome];
  const alvo = nome.toLowerCase();
  const chave = Object.keys(linha).find((item) => item.toLowerCase() === alvo);
  return chave ? linha[chave] : undefined;
}

function formatarNumero(valor, formato) {
  const bruto = typeof valor === "number" ? valor : Number(String(valor).trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(bruto)) return "";
  const decimais = (String(formato).match(/0[.,](0+)/) || [, ""])[1].length;
  const texto = bruto.toLocaleString("pt-BR", { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
  return /%\s*$/.test(formato) ? `${texto}%` : texto;
}

function formatarCampo(valor, formato) {
  if (valor == null) return "";
  const data = valor instanceof Date ? valor : null;
  if (data && !Number.isNaN(data.getTime())) {
    const p = (n) => String(n).padStart(2, "0");
    const dia = `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
    if (/h/i.test(formato || "")) return `${dia} ${p(data.getUTCHours())}:${p(data.getUTCMinutes())}`;
    return dia;
  }
  if (/#/.test(formato || "") && /0/.test(formato || "")) {
    const numero = formatarNumero(valor, formato);
    if (numero) return numero;
  }
  return String(valor).replace(/\s+/g, " ").trim();
}

function aplicarPrints(texto, conjuntos, linhaAtual) {
  return String(texto ?? "")
    .replace(/<print\b([^>]*?)(?:\/>|>)/gi, (_, attrs) => {
      const conjunto = atributo(attrs, "DataSet");
      const campo = atributo(attrs, "FieldName");
      const cru = /false/i.test(atributo(attrs, "Html"));
      const formato = atributo(attrs, "DisplayFormat");
      const linha = linhaAtual[conjunto] || (conjuntos[conjunto] || [])[0] || {};
      const valor = formatarCampo(campoDaLinha(linha, campo), formato);
      return cru ? valor : escaparHtml(valor);
    })
    .replace(/<\/print>/gi, "");
}

function renderTrecho(bruto, bandas, conjuntos, linhaAtual, profundidade) {
  if (profundidade > 6 || !bruto) return "";
  const comSub = String(bruto).replace(/<subreport\b([^>]*?)(?:\/>|>)/gi, (_, attrs) => {
    const origem = atributo(attrs, "NameSource");
    const campo = atributo(attrs, "NameField");
    const dataset = atributo(attrs, "DataSet") || origem || "Processo";
    if (origem && campo) {
      const base = linhaAtual[origem] || (conjuntos[origem] || [])[0] || {};
      const alvo = String(campoDaLinha(base, campo) ?? "").trim();
      return alvo ? renderFaixa(alvo, bandas, conjuntos, { ...linhaAtual, [origem]: base }, profundidade + 1) : "";
    }
    const nomeFaixa = atributo(attrs, "Name");
    if (!nomeFaixa) return "";
    let linhas = conjuntos[dataset] || [];
    const inicio = Number(atributo(attrs, "startrecord") || "1");
    const limite = Number(atributo(attrs, "recordcount") || "0");
    if (inicio > 1) linhas = linhas.slice(inicio - 1);
    if (limite > 0) linhas = linhas.slice(0, limite);
    const miolo = linhas
      .map((linha) => renderFaixa(`${nomeFaixa}.Detail`, bandas, conjuntos, { ...linhaAtual, [dataset]: linha }, profundidade + 1))
      .join("");
    return miolo + renderFaixa(`${nomeFaixa}.Footer`, bandas, conjuntos, linhaAtual, profundidade + 1);
  });
  return aplicarPrints(comSub, conjuntos, linhaAtual);
}

function renderFaixa(nome, bandas, conjuntos, linhaAtual, profundidade) {
  return renderTrecho(bandas[nome] || bandas[`${nome}.Detail`] || "", bandas, conjuntos, linhaAtual, profundidade);
}

export function montarEmailDoModelo(corpo, conjuntos) {
  const faixas = faixasDoModelo(corpo);
  const bandas = {};
  for (const faixa of faixas) bandas[faixa.nome] = `${bandas[faixa.nome] || ""}${faixa.texto}`;
  const nomesSub = new Set();
  for (const faixa of faixas) {
    for (const marca of faixa.texto.matchAll(/<subreport\b[^>]*\bname="([^"]+)"/gi)) nomesSub.add(marca[1].toLowerCase());
  }
  let html = "";
  let comecou = false;
  for (const faixa of faixas) {
    let trecho = faixa.texto;
    if (!comecou) {
      const corte = trecho.search(/<html[\s>]/i);
      if (corte < 0) continue;
      comecou = true;
      trecho = trecho.slice(corte);
    }
    const base = faixa.nome.split(".")[0].toLowerCase();
    if (base === "subject" || (nomesSub.has(base) && base !== "report")) continue;
    html += renderTrecho(trecho, bandas, conjuntos, {}, 0);
    if (faixa.nome.toLowerCase() === "report.detail") break;
  }
  if (!comecou) html = renderFaixa("Report.Detail", bandas, conjuntos, {}, 0);
  html += renderFaixa("Report.Footer", bandas, conjuntos, {}, 0);
  const assunto = aplicarPrints(bandas["Subject.Header"] || "", conjuntos, {}).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    assunto,
    html: html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/```/g, ""),
  };
}

async function conjuntosDaMensagem(pool, corpo, idAtividade) {
  const cabeca = String(corpo ?? "").split(/\[Report\.Detail\]/i)[0];
  const conjuntos = {};
  await Promise.all(datasetsNoTexto(cabeca).map(async (dataset) => {
    try {
      conjuntos[dataset.nome] = await linhasDoDataset(pool, dataset.sql, idAtividade);
    } catch {
      conjuntos[dataset.nome] = [];
    }
  }));
  return conjuntos;
}

function textoPlano(valor) {
  return String(valor ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limparValor(valor) {
  return textoPlano(valor).replace(/\s+[-–]\s*$/g, "").replace(/\s{2,}/g, " ").trim();
}

function chaveRotulo(rotulo) {
  return String(rotulo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function dentro(intervalos, inicio, fim = inicio + 1) {
  return intervalos.some(([a, b]) => inicio < b && fim > a);
}

export function estruturaDoEmail(html) {
  const base = String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  const eventos = [];
  const ocupado = [];
  const linhas = /<tr\b[^>]*>\s*<td\b[^>]*>\s*([^<]{1,120}?)\s*<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi;
  let marca;
  while ((marca = linhas.exec(base))) {
    const bruto = textoPlano(marca[1]);
    if (!/:\s*$/.test(bruto)) continue;
    ocupado.push([marca.index, marca.index + marca[0].length]);
    eventos.push({ tipo: "campo", i: marca.index, rotulo: bruto.replace(/:\s*$/, "").trim(), valor: limparValor(marca[2]) });
  }
  const negritos = /<(b|strong)\b[^>]*>\s*([^<]{1,120}?)\s*<\/\1>/gi;
  while ((marca = negritos.exec(base))) {
    if (dentro(ocupado, marca.index)) continue;
    const bruto = textoPlano(marca[2]);
    if (!/:\s*$/.test(bruto)) continue;
    const resto = base.slice(marca.index + marca[0].length);
    const corte = resto.search(/<(?:b|strong|br)\b|<\/t[dr]|<\/p|<\/div/i);
    const pedaco = corte < 0 ? resto.slice(0, 400) : resto.slice(0, corte);
    ocupado.push([marca.index, marca.index + marca[0].length + pedaco.length]);
    eventos.push({ tipo: "campo", i: marca.index, rotulo: bruto.replace(/:\s*$/, "").trim(), valor: limparValor(pedaco) });
  }
  const celulas = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
  while ((marca = celulas.exec(base))) {
    const fim = marca.index + marca[0].length;
    if (dentro(ocupado, marca.index, fim) || /<table\b/i.test(marca[1])) continue;
    const valor = textoPlano(marca[1]);
    if (!valor || /:/.test(valor)) continue;
    const tituloCurto = valor.length <= 80 && valor === valor.toUpperCase() && !/[.]/.test(valor) && /[A-ZÁÉÍÓÚÃÕÇ]/.test(valor);
    if (tituloCurto) {
      eventos.push({ tipo: "secao", i: marca.index, valor });
      continue;
    }
    if (valor.length > 40) eventos.push({ tipo: "texto", i: marca.index, valor });
  }
  eventos.sort((a, b) => a.i - b.i);
  let titulo = "";
  const secoes = [{ titulo: "", campos: [] }];
  const textos = [];
  for (const evento of eventos) {
    if (evento.tipo === "secao") {
      if (!titulo && !secoes.some((secao) => secao.campos.length || secao.titulo)) {
        titulo = evento.valor.replace(/\s+[-–]\s*$/g, "").trim();
        continue;
      }
      secoes.push({ titulo: evento.valor, campos: [] });
      continue;
    }
    if (evento.tipo === "texto") {
      if (!textos.includes(evento.valor)) textos.push(evento.valor);
      continue;
    }
    if (!evento.rotulo) continue;
    secoes[secoes.length - 1].campos.push({ rotulo: evento.rotulo, valor: evento.valor });
  }
  const campos = secoes.reduce((total, secao) => total + secao.campos.length, 0);
  return { titulo, secoes: secoes.filter((secao) => secao.titulo || secao.campos.length), textos, campos };
}


function campoPorChave(secoes, nomes) {
  const alvos = new Set(nomes.map(chaveRotulo));
  for (const secao of secoes) {
    const campo = secao.campos.find((item) => alvos.has(chaveRotulo(item.rotulo)) && item.valor);
    if (campo) return campo;
  }
  return null;
}

function linhasDeCampos(campos) {
  const linhas = [];
  for (let i = 0; i < campos.length; i += 2) {
    const par = [campos[i], campos[i + 1]];
    linhas.push(
      `<tr>${par
        .map((campo) =>
          campo
            ? `<td style="width:50%;padding:16px 22px;border-top:1px solid #e6e9f0;vertical-align:top;"><div style="color:#6b7385;font-size:14px;">${escaparHtml(campo.rotulo)}</div><div style="margin-top:3px;font-weight:700;font-size:16px;color:#1d2433;">${escaparHtml(campo.valor || "—")}</div></td>`
            : `<td style="width:50%;border-top:1px solid #e6e9f0;"></td>`,
        )
        .join("")}</tr>`,
    );
  }
  return linhas.join("");
}

export function apresentarNoFollow(html, info = {}) {
  const estrutura = estruturaDoEmail(html);
  if (!estrutura.campos && !estrutura.textos.length) return "";
  const titulo = estrutura.titulo || String(info.atividade || info.assunto || "E-mail").trim();
  const processo = String(info.processo || "").trim();
  const data = campoPorChave(estrutura.secoes, ["data"]);
  const cliente = campoPorChave(estrutura.secoes, ["beneficiario", "cliente", "consignee"]);
  const meta = [
    processo ? ["Referência", processo] : null,
    cliente ? [cliente.rotulo, cliente.valor] : null,
    data ? ["Data", data.valor] : null,
  ].filter(Boolean);
  const origem = campoPorChave(estrutura.secoes, ["origem", "origin"]);
  const destino = campoPorChave(estrutura.secoes, ["destino", "destination"]);
  const navio = campoPorChave(estrutura.secoes, ["navio", "navioviagem", "vessel"]);
  const rota = origem && destino
    ? `<table role="presentation" width="100%"><tr>
<td style="padding:24px 28px;vertical-align:top;"><div style="color:#6b7385;font-size:14px;">Origem</div><div style="font-size:28px;font-weight:800;">${escaparHtml(origem.valor)}</div></td>
<td style="padding:24px 8px;text-align:center;color:#6b7385;font-size:14px;font-weight:600;" valign="middle">${navio ? escaparHtml(navio.valor) : ""}<div style="margin-top:10px;border-top:2px dashed #e8302d;"></div></td>
<td style="padding:24px 28px;vertical-align:top;" align="right"><div style="color:#6b7385;font-size:14px;">Destino</div><div style="font-size:28px;font-weight:800;">${escaparHtml(destino.valor)}</div></td>
</tr></table>`
    : "";
  const primeira = estrutura.secoes[0] && !estrutura.secoes[0].titulo ? estrutura.secoes[0] : null;
  const restantes = primeira ? estrutura.secoes.slice(1) : estrutura.secoes;
  const gradeInicial = primeira?.campos.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhasDeCampos(primeira.campos)}</table>` : "";
  const cartaoInicial = rota || gradeInicial
    ? `<tr><td style="background:#fff;border:1px solid #e6e9f0;border-radius:20px;overflow:hidden;">${rota}${gradeInicial}</td></tr><tr><td style="height:14px;"></td></tr>`
    : "";
  const cartoes = restantes
    .map((secao) => {
      const grade = secao.campos.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhasDeCampos(secao.campos)}</table>` : "";
      const faixa = secao.titulo
        ? `<div style="background:#e8302d;color:#fff;font-size:18px;font-weight:700;padding:20px 28px;">${escaparHtml(secao.titulo)}</div>`
        : "";
      if (!faixa && !grade) return "";
      return `<tr><td style="background:#fff;border:1px solid #e6e9f0;border-radius:20px;overflow:hidden;">${faixa}${grade}</td></tr><tr><td style="height:14px;"></td></tr>`;
    })
    .join("");
  const aviso = estrutura.textos.length
    ? `<tr><td style="padding:8px 28px 4px;text-align:center;color:#6b7385;font-size:13px;line-height:1.5;">${estrutura.textos.map((item) => escaparHtml(item)).join("<br><br>")}</td></tr>`
    : "";
  const mensagem = !estrutura.campos && estrutura.textos.length
    ? `<tr><td style="background:#fff;border:1px solid #e6e9f0;border-radius:20px;padding:28px 32px;font-size:16px;line-height:1.55;color:#1d2433;">${estrutura.textos.map((item) => escaparHtml(item)).join("<br><br>")}</td></tr><tr><td style="height:14px;"></td></tr>`
    : "";
  const marca = `<img src="cid:logo-conline" alt="Conline" height="72" style="display:block;height:72px;width:auto;border:0;"/>`;
  return `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f4f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#1d2433;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:920px;margin:0 auto;">
<tr><td style="background:#fff;border:1px solid #e6e9f0;border-bottom:6px solid #e8302d;border-radius:20px;padding:32px 36px;">
<table role="presentation" width="100%"><tr>
<td style="vertical-align:top;">${marca}<div style="margin-top:12px;font-size:26px;font-weight:700;">${escaparHtml(titulo)}</div></td>
<td style="vertical-align:top;background:#f4f5f9;border-radius:14px;padding:16px 20px;" align="right">${meta
    .map(([rotulo, valor]) => `<div style="font-size:16px;margin:0 0 6px;"><span style="color:#6b7385;">${escaparHtml(rotulo)}</span> <strong>${escaparHtml(valor)}</strong></div>`)
    .join("")}</td>
</tr></table></td></tr>
<tr><td style="height:14px;"></td></tr>
${mensagem}${estrutura.campos ? `${cartaoInicial}${cartoes}` : ""}${estrutura.campos ? aviso : ""}
<tr><td style="padding:8px 8px 0;text-align:center;color:#6b7385;font-size:14px;">Conline</td></tr>
</table></body></html>`;
}

function emailsDosConjuntos(conjuntos) {
  const achados = [];
  for (const [nome, linhas] of Object.entries(conjuntos || {})) {
    if (!/contato|address|destinat/i.test(nome)) continue;
    for (const linha of linhas || []) {
      for (const valor of Object.values(linha || {})) {
        achados.push(...String(valor ?? "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []);
      }
    }
  }
  return [...new Set(achados.map((item) => item.toLowerCase()))].slice(0, 40);
}

export function ehModeloFollow(nome, corpo) {
  if (/follow[\s-]?up/i.test(String(nome ?? ""))) return true;
  const detalhe = String(corpo ?? "").split(/\[Report\.Detail\]/i).pop() || "";
  const amostra = detalhe.toUpperCase();
  const marcas = ["EXPORTADOR", "IMPORTADOR", "NAVIO/VIAGEM", "REF. CLIENTE", "PREV. DE EMBARQUE"];
  return marcas.filter((item) => amostra.includes(item)).length >= 3;
}

export function limparNomeAtividade(valor) {
  const nome = String(valor ?? "")
    .replace(/\b(?:do|de|da|no|na|para\s+o|para\s+a|nesse|neste|desse|deste)\s+processo\s+[A-Za-z]{1,4}\d{2,6}-\d{2}(?:\s+teste)?\b/gi, " ")
    .replace(/\bprocesso\s+[A-Za-z]{1,4}\d{2,6}-\d{2}(?:\s+teste)?\b/gi, " ")
    .replace(/\b(?:do|de|da|no|na|para\s+o|para\s+a|nesse|neste|desse|deste)\s+[A-Za-z]{1,4}\d{2,6}-\d{2}(?:\s+teste)?\b/gi, " ")
    .replace(/\b[A-Za-z]{1,4}\d{2,6}-\d{2}(?:\s+teste)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:de|do|da|no|na|para|a|o)\s+/i, "")
    .replace(/\s+(?:de|do|da|no|na|para|o|a)$/i, "");
  if (!nome || /^(dess[ae]|dest[ae]|aberta|em aberto|acima|anterior)$/i.test(nome)) return "";
  return nome.slice(0, 120);
}

export function partesDoNomeAtividade(nome) {
  const codigo = String(nome ?? "").match(/^\d{3,4}(?:\.\d+)?/)?.[0] || "";
  const descricao = String(nome ?? "").replace(/^\d{3,4}(?:\.\d+)?\s*/, "").trim();
  return { codigo, descricao };
}

function nomePedido(valor) {
  return limparNomeAtividade(valor);
}

export async function emailDaAtividade(pool, args) {
  const id = Number(args?.id);
  const numero = String(args?.numero ?? "").trim();
  const nome = nomePedido(args?.nome);
  const pedido = pool.request();
  const filtros = ["Mm.Corpo IS NOT NULL"];
  if (Number.isInteger(id) && id > 0) {
    pedido.input("id", sql.Int, id);
    filtros.push("Ati.IdAtividade = @id");
  } else {
    if (!nome) filtros.push("Ati.Data_Termino IS NULL", "Ati.Situacao NOT IN (4, 5, 6)");
    if (numero) {
      pedido.input("numero", sql.VarChar(30), numero);
      filtros.push("Lhs.Numero_Processo = @numero");
    }
    if (nome) {
      const { codigo, descricao } = partesDoNomeAtividade(nome);
      const como = (valor) => `%${valor.replace(/[%_[\]]/g, "").slice(0, 70)}%`;
      if (codigo && descricao) {
        pedido.input("codigo", sql.VarChar(25), codigo);
        pedido.input("descricao", sql.VarChar(120), como(descricao));
        filtros.push("(Tar.Codigo = @codigo OR Tar.Descricao LIKE @descricao)");
      } else if (codigo) {
        pedido.input("codigo", sql.VarChar(25), codigo);
        filtros.push("Tar.Codigo = @codigo");
      } else {
        pedido.input("nome", sql.VarChar(80), como(nome));
        filtros.push("Tar.Descricao LIKE @nome");
      }
    }
    if (!numero && !nome) return "Diga o nome da atividade ou o número do processo.";
  }
  const r = await pedido.query(`
    SELECT TOP 8
      Ati.IdAtividade,
      Ati.Data_Termino,
      Tar.Codigo,
      Tar.Descricao AS Atividade,
      Lhs.Numero_Processo,
      Mm.Nome AS Modelo_Mensagem,
      CAST(Mm.Corpo AS nvarchar(max)) AS Corpo,
      Ma.Nome AS Modelo_Acompanhamento,
      CAST(Ma.Dados AS nvarchar(max)) AS Dados
    FROM mov_Atividade Ati
    JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    LEFT JOIN cad_Modelo_Mensagem Mm ON Mm.IdModelo_Mensagem = COALESCE(Ati.IdModelo_Mensagem, Tar.IdModelo_Mensagem)
    LEFT JOIN cad_Modelo_Acompanhamento Ma ON Ma.IdModelo_Acompanhamento = COALESCE(Ati.IdModelo_Acompanhamento, Tar.IdModelo_Acompanhamento)
    WHERE ${filtros.join(" AND ")}
    ORDER BY CASE WHEN Ati.Data_Termino IS NULL THEN 0 ELSE 1 END, Ati.IdAtividade DESC`);
  if (!r.recordset.length) return "Não encontrei atividade com modelo de mensagem para esse pedido.";
  const { codigo, descricao } = partesDoNomeAtividade(nome);
  const descricaoLimpa = descricao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const porCodigo = codigo ? r.recordset.filter((linha) => String(linha.Codigo ?? "").trim() === codigo) : [];
  const porNome = descricaoLimpa
    ? r.recordset.filter((linha) => String(linha.Atividade ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(descricaoLimpa))
    : [];
  const base = porCodigo.filter((linha) => porNome.includes(linha));
  const candidatas = base.length ? base : porCodigo.length ? porCodigo : porNome.length ? porNome : r.recordset;
  const abertas = candidatas.filter((linha) => linha.Data_Termino == null);
  const escolhidas = abertas.length ? abertas : candidatas;
  if (escolhidas.length > 1 && !(Number.isInteger(id) && id > 0)) {
    const lista = escolhidas.map((linha) => `- ${linha.IdAtividade} · ${String(linha.Atividade ?? "").trim()} · ${String(linha.Numero_Processo ?? "").trim()} · ${String(linha.Modelo_Mensagem ?? "").trim()}`);
    return `Encontrei mais de uma atividade. Diga o nome ou o código.\n${lista.join("\n")}`;
  }
  const linha = escolhidas[0];
  const nota = linha.Dados ? await notaDaAtividade(pool, linha.Dados, linha.IdAtividade) : "";
  const processo = String(linha.Numero_Processo ?? "").trim();
  if (ehModeloFollow(linha.Modelo_Mensagem, linha.Corpo)) {
    const conjuntos = await conjuntosDaMensagem(pool, linha.Corpo, linha.IdAtividade);
    const assunto = montarEmailDoModelo(linha.Corpo, conjuntos).assunto;
    return { follow: true, processo, nota, assunto };
  }
  const conjuntos = await conjuntosDaMensagem(pool, linha.Corpo, linha.IdAtividade);
  if (nota) {
    const atuais = conjuntos.Acompanhamento || [];
    conjuntos.Acompanhamento = [{ ...(atuais[0] || {}), Data: new Date(), Descricao: nota }, ...atuais];
  }
  const email = montarEmailDoModelo(linha.Corpo, conjuntos);
  const atividade = String(linha.Atividade ?? "").trim();
  const visual = apresentarNoFollow(email.html, { processo, atividade, assunto: email.assunto });
  const cartao = {
    assunto: email.assunto || `${atividade} ${processo}`.trim(),
    de: String(linha.Modelo_Mensagem ?? "").trim(),
    data: dataNota(new Date()),
    processo,
    atividade,
    acompanhamento: String(linha.Modelo_Acompanhamento ?? "").trim(),
    para: emailsDosConjuntos(conjuntos),
    html: visual || email.html,
  };
  return `\`\`\`email\n${JSON.stringify(cartao)}\n\`\`\``;
}
