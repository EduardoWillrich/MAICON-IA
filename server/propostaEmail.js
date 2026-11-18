import sql from "mssql";
import { mensagensDaConsulta } from "./gmail.js";
import { escolherCliente } from "./funcoes.js";

const ABERTAS = new Set([1, 4, 5, 6]);
const SITUACAO = {
  1: "Aguardando aprovação",
  2: "Aprovada",
  3: "Não aprovada",
  4: "Não enviada",
  5: "Pré-proposta",
  6: "Enviada",
};

function texto(valor) {
  return String(valor ?? "").replace(/\s+/g, " ").trim();
}

function normalizar(valor) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dataCurta(valor) {
  if (valor == null || valor === "") return "";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
}

function lugar(nome, sigla) {
  const cidade = texto(nome);
  const codigo = texto(sigla);
  if (cidade && codigo) return `${cidade} (${codigo})`;
  return cidade || codigo;
}

function emailsDe(valor) {
  return (String(valor ?? "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((item) => item.toLowerCase());
}

export function escolherProposta(propostas, mensagens = []) {
  const lista = (Array.isArray(propostas) ? propostas : []).filter((item) => item?.numero);
  if (!lista.length) return null;
  const corpo = normalizar(mensagens.map((item) => `${item?.assunto || ""} ${item?.trecho || ""}`).join("\n"));
  let melhor = null;
  let notaMaior = -1;
  for (const proposta of lista) {
    const ofertas = proposta.ofertas?.length ? proposta.ofertas : [{}];
    for (const oferta of ofertas) {
      let nota = ABERTAS.has(Number(proposta.situacao)) ? 2 : 0;
      let motivo = "recente";
      const numero = normalizar(proposta.numero);
      if (numero.length >= 3 && corpo.includes(numero)) {
        nota += 8;
        motivo = "email";
      }
      const origem = normalizar(oferta.origem).replace(/\([^)]*\)/g, "").trim();
      const destino = normalizar(oferta.destino).replace(/\([^)]*\)/g, "").trim();
      const temOrigem = origem.length >= 4 && corpo.includes(origem);
      const temDestino = destino.length >= 4 && corpo.includes(destino);
      if (temOrigem && temDestino) {
        nota += 6;
        motivo = "email";
      } else if ((temOrigem || temDestino) && corpo) {
        nota += 2;
        motivo = "email";
      }
      if (nota > notaMaior) {
        notaMaior = nota;
        melhor = { proposta, oferta, motivo };
      }
    }
  }
  return melhor;
}

function numeroTaxa(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dinheiroTaxa(valor, moeda) {
  const corpo = numeroTaxa(valor);
  if (!corpo) return "";
  return texto(moeda) ? `${texto(moeda)} ${corpo}` : corpo;
}

function escapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const NOME_GRUPO = { frete: "Taxa de frete", origem: "Taxa de origem", destino: "Taxa de destino" };

function grupoDaTaxa(linha) {
  const trecho = Number(linha.trecho) || 0;
  const categoria = Number(linha.categoria) || 0;
  if (categoria === 1 || trecho === 2) return "frete";
  if (trecho === 3) return "destino";
  if (trecho === 1 || categoria === 2) return "origem";
  if (!trecho && !categoria && Number(linha.origem) === 1) return "frete";
  return "origem";
}

export function taxasComerciais(linhas) {
  const itens = (Array.isArray(linhas) ? linhas : []).map((linha) => {
    const pagamento = Number(linha.pagamento) || 0;
    const recebimento = Number(linha.recebimento) || 0;
    const mesma = texto(linha.moedaPagamento) && texto(linha.moedaPagamento) === texto(linha.moedaRecebimento);
    return {
      nome: texto(linha.nome) || "Taxa",
      pagamento: dinheiroTaxa(pagamento, linha.moedaPagamento),
      recebimento: dinheiroTaxa(recebimento, linha.moedaRecebimento),
      resultado: mesma ? dinheiroTaxa(recebimento - pagamento, linha.moedaRecebimento) : "",
      moedaPagamento: texto(linha.moedaPagamento),
      moedaRecebimento: texto(linha.moedaRecebimento),
      valorPagamento: pagamento,
      valorRecebimento: recebimento,
      grupo: grupoDaTaxa(linha),
    };
  });
  const somar = (campoMoeda, campoValor) => {
    const mapa = new Map();
    for (const item of itens) {
      const moeda = item[campoMoeda];
      if (!moeda) continue;
      mapa.set(moeda, (mapa.get(moeda) || 0) + item[campoValor]);
    }
    return [...mapa.entries()].map(([moeda, valor]) => dinheiroTaxa(valor, moeda));
  };
  const resumo = [];
  for (const grupo of ["frete", "origem", "destino"]) {
    const mapa = new Map();
    for (const item of itens.filter((item) => item.grupo === grupo)) {
      const mesma = item.moedaRecebimento && item.moedaRecebimento === item.moedaPagamento;
      const moeda = mesma ? item.moedaRecebimento : item.moedaRecebimento || item.moedaPagamento;
      if (!moeda || (!mesma && item.moedaPagamento && item.moedaRecebimento)) continue;
      mapa.set(moeda, (mapa.get(moeda) || 0) + (item.valorRecebimento - item.valorPagamento));
    }
    for (const [moeda, valor] of mapa) resumo.push({ nome: NOME_GRUPO[grupo], valor: dinheiroTaxa(valor, moeda) });
  }
  return {
    itens,
    pagamento: somar("moedaPagamento", "valorPagamento"),
    recebimento: somar("moedaRecebimento", "valorRecebimento"),
    resumo,
  };
}

function probabilidadeDe(aprovadas, reprovadas) {
  if (!aprovadas) return "Sem probabilidade";
  const decididas = aprovadas + reprovadas;
  if (!decididas) return "Sem probabilidade";
  return `${((aprovadas / decididas) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

const FONTE = "font-family:'Manrope','Segoe UI',Arial,Helvetica,sans-serif;";

function contagem(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR");
}

function moedasHtml(valor) {
  const partes = texto(valor).split(" · ").filter(Boolean);
  return partes.map((parte) => `<div style="color:#b81f1d;font-size:12px;line-height:17px;"> ${escapar(parte)}</div>`).join("");
}

function barraProbabilidade(percentual) {
  if (!String(percentual).includes("%")) return escapar(percentual);
  const n = Number(String(percentual).replace(/\./g, "").replace(",", ".").replace("%", ""));
  const px = Number.isFinite(n) ? Math.max(0, Math.min(54, Math.round((n / 100) * 54))) : 0;
  return `<table cellpadding="0" cellspacing="0" border="0" align="right"><tr><td valign="middle"><table cellpadding="0" cellspacing="0" border="0" width="54" bgcolor="#eef0f6"><tr><td width="${px}" height="6" bgcolor="#e8312f" style="font-size:0;line-height:0;">&nbsp;</td><td style="font-size:0;line-height:0;">&nbsp;</td></tr></table></td><td style="${FONTE}font-size:12px;font-weight:bold;color:#14161f;padding-left:8px;">${escapar(percentual)}</td></tr></table>`;
}

function linhaPar(rotulo, valorHtml) {
  return `<tr><td style="${FONTE}font-size:12px;color:#6b7080;padding:5px 0;vertical-align:top;white-space:nowrap;">${escapar(rotulo)}</td><td align="right" style="${FONTE}font-size:12px;color:#14161f;font-weight:bold;padding:5px 0 5px 8px;vertical-align:top;">${valorHtml}</td></tr>`;
}

function valorTaxaHtml(valor, moeda) {
  const n = Number(valor) || 0;
  const estilo = `${FONTE}font-size:13px;padding:10px 8px;border-bottom:1px solid #e6e8ee;white-space:nowrap;`;
  if (!n) return `<td align="right" style="${estilo}color:#9aa0b2;">0,00</td>`;
  return `<td align="right" style="${estilo}color:#14161f;">${escapar(dinheiroTaxa(n, moeda))}</td>`;
}

function resultadoHtml(item) {
  const estilo = `${FONTE}font-size:13px;padding:8px 8px;border-bottom:1px solid #e6e8ee;white-space:nowrap;`;
  const mesma = item.moedaPagamento && item.moedaPagamento === item.moedaRecebimento;
  if (!mesma || !item.valorPagamento || !item.valorRecebimento) return `<td align="right" style="${estilo}"></td>`;
  const diff = item.valorRecebimento - item.valorPagamento;
  if (!diff) return `<td align="right" style="${estilo}"><span style="color:#9aa0b2;">${escapar(dinheiroTaxa(0, item.moedaRecebimento))}</span></td>`;
  const positivo = diff > 0;
  const corpo = dinheiroTaxa(Math.abs(diff), item.moedaRecebimento);
  const fundo = positivo ? "#e3f5ec" : "#fdecec";
  const cor = positivo ? "#0f7a4a" : "#b81f1d";
  const sinal = positivo ? "+" : "-";
  return `<td align="right" style="${estilo}"><span style="${FONTE}display:inline-block;background:${fundo};color:${cor};font-size:12px;font-weight:bold;padding:3px 9px;border-radius:12px;">${sinal} ${escapar(corpo)}</span></td>`;
}

export function corpoDaProposta(dados) {
  const marca = `<img src="cid:logo-conline" alt="Conline" height="32" style="display:block;height:32px;width:auto;border:0;">`;
  const taxas = taxasComerciais(dados.taxas);
  const modais = ["Aéreo", "FCL", "LCL"].map((nome) => (dados.modais || []).find((item) => item.nome === nome) || { nome });
  const estatistica = modais
    .map((item, indice) => {
      const aprovadas = Number(item.aprovadas) || 0;
      const reprovadas = Number(item.reprovadas) || 0;
      const processo = item.processo
        ? `${escapar(item.processo)} <div style="font-weight:normal;color:#6b7080;">${escapar(item.dataProcesso)}</div>`
        : "";
      const borda = indice ? "border-left:1px solid #e6e8ee;" : "";
      return `<td class="col" width="33%" valign="top" style="padding:16px 16px 18px;${borda}">
<div style="${FONTE}font-size:18px;font-weight:bold;color:#e8312f;padding-bottom:8px;">${escapar(item.nome)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0">
${linhaPar("Última proposta", escapar(item.ultima || ""))}
${linhaPar("Pendentes", contagem(item.pendentes))}
${linhaPar("Aprovadas", contagem(item.aprovadas))}
${linhaPar("Reprovadas", contagem(item.reprovadas))}
<tr><td colspan="2" style="border-top:1px dashed #d5d8e0;font-size:0;line-height:0;height:6px;">&nbsp;</td></tr>
${linhaPar("Último processo", processo)}
${linhaPar("Profit do processo", moedasHtml(item.profit))}
${linhaPar("Prob. de aprovação", barraProbabilidade(probabilidadeDe(aprovadas, reprovadas)))}
${linhaPar("Média de profit", moedasHtml(item.media))}
</table></td>`;
    })
    .join("");
  const linhasTaxa = taxas.itens
    .map(
      (item) => `<tr><td align="left" style="${FONTE}font-size:13px;color:#14161f;padding:10px 8px;border-bottom:1px solid #e6e8ee;font-weight:bold;">${escapar(item.nome)}</td>${valorTaxaHtml(item.valorPagamento, item.moedaPagamento)}${valorTaxaHtml(item.valorRecebimento, item.moedaRecebimento)}${resultadoHtml(item)}</tr>`,
    )
    .join("");
  const moedas = [];
  for (const item of taxas.itens) {
    if (item.moedaPagamento && !moedas.includes(item.moedaPagamento)) moedas.push(item.moedaPagamento);
    if (item.moedaRecebimento && !moedas.includes(item.moedaRecebimento)) moedas.push(item.moedaRecebimento);
  }
  const totais = moedas
    .map((moeda) => {
      const pagamento = taxas.itens.filter((item) => item.moedaPagamento === moeda).reduce((soma, item) => soma + item.valorPagamento, 0);
      const recebimento = taxas.itens.filter((item) => item.moedaRecebimento === moeda).reduce((soma, item) => soma + item.valorRecebimento, 0);
      const celula = `${FONTE}font-size:13px;font-weight:bold;padding:10px 8px;white-space:nowrap;`;
      return `<tr><td bgcolor="#eef0f6" style="${celula}">Total</td><td bgcolor="#eef0f6" align="right" style="${celula}">${escapar(dinheiroTaxa(pagamento, moeda))}</td><td bgcolor="#eef0f6" align="right" style="${celula}">${escapar(dinheiroTaxa(recebimento, moeda))}</td><td bgcolor="#eef0f6" style="padding:10px 8px;">&nbsp;</td></tr>`;
    })
    .join("");
  const larguraResumo = taxas.resumo.length > 3 ? "25%" : taxas.resumo.length === 2 ? "50%" : taxas.resumo.length === 1 ? "100%" : "33%";
  const resumo = taxas.resumo
    .map(
      (item) => `<td class="col" width="${larguraResumo}" style="padding:4px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#fdecec" style="background:#fdecec;border-radius:10px;padding:12px 14px;"><div style="${FONTE}font-size:12px;color:#6b7080;font-weight:bold;">${escapar(item.nome)}</div><div style="${FONTE}font-size:20px;color:#14161f;font-weight:bold;padding-top:3px;">${escapar(item.valor)}</div></td></tr></table></td>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap" rel="stylesheet">
<title>Proposta ${escapar(dados.numero || "")}</title>
<style>@media only screen and (max-width:620px){.col{display:block!important;width:100%!important;box-sizing:border-box;border-left:0!important;border-top:1px solid #e6e8ee;}.pad{padding:10px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#f3f4f8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f8"><tr><td align="center" class="pad" style="padding:20px 12px;">
<table width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;">
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #e6e8ee;border-radius:16px;border-collapse:separate;overflow:hidden;"><tr><td style="border-bottom:4px solid #e8312f;padding:22px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="col" valign="bottom">${marca}<div style="${FONTE}font-size:26px;font-weight:bold;color:#14161f;padding-top:12px;">${escapar(dados.numero || "Proposta")}</div></td>
<td class="col" align="right" valign="bottom" style="${FONTE}font-size:13px;line-height:20px;color:#6b7080;">Cliente <b style="color:#14161f;">${escapar(dados.cliente || "")}</b><br>CNPJ <b style="color:#14161f;">${escapar(dados.cnpj || "")}</b><br>País <b style="color:#14161f;">${escapar(dados.pais || "")}</b></td>
</tr></table></td></tr></table></td></tr>
<tr><td height="16" style="font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #e6e8ee;border-radius:16px;border-collapse:separate;overflow:hidden;">
<tr><td bgcolor="#e8312f" style="background:#e8312f;${FONTE}font-size:15px;font-weight:bold;color:#ffffff;padding:14px 20px;">Estatística do cliente</td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${estatistica}</tr></table></td></tr>
</table></td></tr>
<tr><td height="16" style="font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #e6e8ee;border-radius:16px;border-collapse:separate;overflow:hidden;">
<tr><td bgcolor="#e8312f" style="background:#e8312f;${FONTE}font-size:15px;font-weight:bold;color:#ffffff;padding:14px 20px;">Taxas</td></tr>
<tr><td style="padding:0 12px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="left" style="${FONTE}font-size:12px;color:#6b7080;font-weight:bold;padding:10px 8px;border-bottom:1px solid #e6e8ee;">Taxa</td><td align="right" style="${FONTE}font-size:12px;color:#6b7080;font-weight:bold;padding:10px 8px;border-bottom:1px solid #e6e8ee;">Pagamento</td><td align="right" style="${FONTE}font-size:12px;color:#6b7080;font-weight:bold;padding:10px 8px;border-bottom:1px solid #e6e8ee;">Recebimento</td><td align="right" style="${FONTE}font-size:12px;color:#6b7080;font-weight:bold;padding:10px 8px;border-bottom:1px solid #e6e8ee;">Resultado</td></tr>
${linhasTaxa}${totais}
</table></td></tr>
<tr><td style="padding:14px 8px 16px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${resumo}</tr></table></td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>`;
}

function transitDe(minimo, maximo) {
  const a = Number(minimo);
  const b = Number(maximo);
  const temA = Number.isFinite(a) && a > 0;
  const temB = Number.isFinite(b) && b > 0 && b !== a;
  if (temA && temB) return `${a} a ${b} dias`;
  if (temA) return `${a} dias`;
  if (Number.isFinite(b) && b > 0) return `${b} dias`;
  return "";
}

function termoCliente(valor) {
  return texto(valor)
    .replace(/\b(s\s*\/\s*a|s\.a\.?|ltda\.?|eireli|epp)\b/gi, " ")
    .replace(/[./]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function clientePorNome(pool, nome, carteira) {
  const termo = termoCliente(nome);
  if (termo.length < 2) return "Qual cliente recebe essa proposta?";
  const pedido = () => {
    const req = pool.request().input("t", sql.NVarChar(82), `%${termo}%`);
    if (carteira) req.input("id", sql.Int, carteira);
    return req;
  };
  const filtro = carteira ? "AND Pro.IdVendedor = @id" : "";
  const grupos = await pedido().query(`
    SELECT TOP 5 LTRIM(RTRIM(Cli.Nome)) AS Nome, COUNT(*) AS Abertos
    FROM mov_Proposta_Frete Pro
    JOIN cad_Pessoa Cli ON Cli.IdPessoa = Pro.IdCliente
    WHERE Cli.Nome LIKE @t ${filtro}
    GROUP BY LTRIM(RTRIM(Cli.Nome))
    ORDER BY MAX(Pro.Data_Proposta) DESC`);
  const escolha = escolherCliente(grupos.recordset, termo);
  if (escolha.tipo === "ambiguo") {
    const linhas = escolha.opcoes.map((item) => `- ${item.nome}`);
    return `Encontrei mais de um cliente para "${termo}":\n${linhas.join("\n")}\nQual deles recebe a proposta?`;
  }
  if (escolha.tipo === "unico") return { nome: escolha.cliente.nome };
  return `Nenhuma proposta encontrada para "${termo}".`;
}

async function clienteDoProcesso(pool, numero, carteira) {
  const req = pool.request().input("n", sql.VarChar(30), numero);
  if (carteira) req.input("id", sql.Int, carteira);
  const filtro = carteira ? "AND (Lhs.IdVendedor = @id OR Pro.IdVendedor = @id)" : "";
  const r = await req.query(`
    SELECT TOP 1 LTRIM(RTRIM(Cli.Nome)) AS Nome, Pro.IdProposta_Frete
    FROM mov_Logistica_House Lhs
    JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN mov_Oferta_Frete Ofe ON Ofe.IdOferta_Frete = Lhs.IdOferta_Frete
    OUTER APPLY (
      SELECT TOP 1 P.IdProposta_Frete, P.IdVendedor, P.Data_Proposta
      FROM mov_Proposta_Frete P
      WHERE P.IdProposta_Frete = Ofe.IdProposta_Frete
         OR P.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
      ORDER BY P.Data_Proposta DESC
    ) Pro
    WHERE Lhs.Numero_Processo = @n ${filtro}`);
  const linha = r.recordset[0];
  if (!linha) return `Processo ${numero} não encontrado na sua carteira.`;
  if (!linha.IdProposta_Frete) return `O processo ${numero} não tem proposta ligada.`;
  return { nome: texto(linha.Nome), idProposta: Number(linha.IdProposta_Frete) };
}

async function propostasDoCliente(pool, nome, carteira) {
  const req = pool.request().input("nome", sql.NVarChar(200), nome);
  if (carteira) req.input("id", sql.Int, carteira);
  const filtro = carteira ? "AND Pro.IdVendedor = @id" : "";
  const r = await req.query(`
    SELECT TOP 8
      Pro.IdProposta_Frete,
      Pro.Numero_Proposta,
      Pro.Situacao,
      Pro.Data_Proposta,
      Pro.Data_Solicitacao_Cliente,
      Cli.IdPessoa,
      Cli.Nome AS Cliente,
      Cli.EMail,
      Cli.EMail_Pessoal,
      Cto.EMail AS Email_Contato,
      Cto.EMail_Pessoal AS Email_Contato_Pessoal
    FROM mov_Proposta_Frete Pro
    JOIN cad_Pessoa Cli ON Cli.IdPessoa = Pro.IdCliente
    LEFT JOIN cad_Pessoa_Contato Cto ON Cto.IdPessoa_Contato = Pro.IdCliente_Contato
    WHERE LTRIM(RTRIM(Cli.Nome)) = @nome ${filtro}
    ORDER BY Pro.Data_Proposta DESC, Pro.IdProposta_Frete DESC`);
  return r.recordset;
}

async function ofertasDasPropostas(pool, ids) {
  if (!ids.length) return [];
  const req = pool.request();
  const marcas = ids.map((id, indice) => {
    req.input(`p${indice}`, sql.Int, id);
    return `@p${indice}`;
  });
  const r = await req.query(`
    SELECT
      Ofe.IdOferta_Frete,
      Ofe.IdProposta_Frete,
      Ofe.Numero_Oferta,
      Ofe.Data_Validade,
      Ofe.Transit_Time,
      Ofe.Transit_Time_Maximo,
      Ofe.Referencia_Cliente,
      Ofe.Ativo,
      Ori.Nome AS Origem,
      Ori.Sigla AS Origem_Sigla,
      Des.Nome AS Destino,
      Des.Sigla AS Destino_Sigla,
      Inc.Codigo AS Incoterm,
      Exp.Nome AS Exportador,
      Imp.Nome AS Importador
    FROM mov_Oferta_Frete Ofe
    LEFT JOIN cad_Origem_Destino Ori ON Ori.IdOrigem_Destino = Ofe.IdOrigem
    LEFT JOIN cad_Origem_Destino Des ON Des.IdOrigem_Destino = Ofe.IdDestino
    LEFT JOIN cad_Incoterm Inc ON Inc.IdIncoterm = Ofe.IdIncoterm
    LEFT JOIN cad_Pessoa Exp ON Exp.IdPessoa = Ofe.IdExportador
    LEFT JOIN cad_Pessoa Imp ON Imp.IdPessoa = Ofe.IdImportador
    WHERE Ofe.IdProposta_Frete IN (${marcas.join(", ")})
    ORDER BY CASE WHEN ISNULL(Ofe.Ativo, 1) = 1 THEN 0 ELSE 1 END, Ofe.IdOferta_Frete DESC`);
  return r.recordset;
}

async function taxasDaOferta(pool, idOferta) {
  const r = await pool.request().input("id", sql.Int, idOferta).query(`
    SELECT
      Exb.Nome AS Taxa,
      MoeP.Sigla AS MoedaPagamento,
      MoeR.Sigla AS MoedaRecebimento,
      Tax.Valor_Pagamento_Total AS Pagamento,
      Tax.Valor_Recebimento_Total AS Recebimento,
      Tax.Origem_Taxa AS Origem,
      Tax.Categoria AS Categoria,
      Tax.Trecho AS Trecho
    FROM mov_Oferta_Frete_Taxa Tax
    LEFT JOIN cad_Taxa_Logistica_Exibicao Exb ON Exb.IdTaxa_Logistica_Exibicao = Tax.IdTaxa_Logistica_Exibicao
    LEFT JOIN cad_Moeda MoeP ON MoeP.IdMoeda = Tax.IdMoeda_Pagamento
    LEFT JOIN cad_Moeda MoeR ON MoeR.IdMoeda = Tax.IdMoeda_Recebimento
    WHERE Tax.IdOferta_Frete = @id
      AND ISNULL(Tax.Restrita, 0) = 0
    ORDER BY Exb.Nome`);
  return r.recordset.map((linha) => ({
    nome: texto(linha.Taxa) || "Taxa",
    moedaPagamento: texto(linha.MoedaPagamento),
    moedaRecebimento: texto(linha.MoedaRecebimento),
    pagamento: Number(linha.Pagamento) || 0,
    recebimento: Number(linha.Recebimento) || 0,
    origem: Number(linha.Origem) || 0,
    categoria: Number(linha.Categoria) || 0,
    trecho: Number(linha.Trecho) || 0,
  }));
}

function modalSql(expressao) {
  return `CASE
    WHEN ${expressao}.Tipo_Carga = 3 THEN 'FCL'
    WHEN ${expressao}.Tipo_Carga = 2 OR ${expressao}.Modalidade_Processo = 2 THEN 'LCL'
    ELSE 'Aereo'
  END`;
}

async function fichaDoCliente(pool, idPessoa) {
  const vazio = ["Aéreo", "FCL", "LCL"].map((nome) => ({ nome }));
  const id = Number(idPessoa);
  if (!id) return { cnpj: "", pais: "", modais: vazio };
  const pessoa = await pool.request().input("id", sql.Int, id).query(`
    SELECT Cli.Cpf_Cnpj, Pai.Nome AS Pais
    FROM cad_Pessoa Cli
    LEFT JOIN cad_Pais Pai ON Pai.IdPais = Cli.IdPais
    WHERE Cli.IdPessoa = @id`);
  const contagem = await pool.request().input("id", sql.Int, id).query(`
    SELECT Modal, Situacao, COUNT(*) AS Qtd, MAX(Data_Proposta) AS Ultima
    FROM (
      SELECT Pro.IdProposta_Frete, Pro.Situacao, Pro.Data_Proposta,
        ${modalSql("O")} AS Modal
      FROM mov_Proposta_Frete Pro
      JOIN mov_Oferta_Frete O ON O.IdProposta_Frete = Pro.IdProposta_Frete
      WHERE Pro.IdCliente = @id
      GROUP BY Pro.IdProposta_Frete, Pro.Situacao, Pro.Data_Proposta, ${modalSql("O")}
    ) Base
    GROUP BY Modal, Situacao`);
  const processos = await pool.request().input("id", sql.Int, id).query(`
    WITH Recente AS (
      SELECT Modal, Numero_Processo, Data_Abertura, IdOferta_Frete
      FROM (
        SELECT
          ${modalSql("O")} AS Modal,
          H.Numero_Processo,
          H.Data_Abertura_Processo AS Data_Abertura,
          O.IdOferta_Frete,
          ROW_NUMBER() OVER (
            PARTITION BY ${modalSql("O")}
            ORDER BY H.Data_Abertura_Processo DESC, H.IdLogistica_House DESC
          ) AS rn
        FROM mov_Logistica_House H
        JOIN mov_Oferta_Frete O ON O.IdOferta_Frete = H.IdOferta_Frete
        WHERE H.IdCliente = @id AND NULLIF(H.Numero_Processo, '') IS NOT NULL
      ) Escolha
      WHERE rn = 1
    )
    SELECT R.Modal, R.Numero_Processo, R.Data_Abertura, M.Sigla, SUM(F.Lucro_Estimado) AS Lucro
    FROM Recente R
    LEFT JOIN mov_Oferta_Frete_Fechamento F ON F.IdOferta_Frete = R.IdOferta_Frete
    LEFT JOIN cad_Moeda M ON M.IdMoeda = F.IdMoeda
    GROUP BY R.Modal, R.Numero_Processo, R.Data_Abertura, M.Sigla`);
  const medias = await pool.request().input("id", sql.Int, id).query(`
    SELECT ${modalSql("O")} AS Modal, M.Sigla, AVG(F.Lucro_Estimado) AS Media
    FROM mov_Logistica_House H
    JOIN mov_Oferta_Frete O ON O.IdOferta_Frete = H.IdOferta_Frete
    JOIN mov_Oferta_Frete_Fechamento F ON F.IdOferta_Frete = O.IdOferta_Frete
    LEFT JOIN cad_Moeda M ON M.IdMoeda = F.IdMoeda
    WHERE H.IdCliente = @id
    GROUP BY ${modalSql("O")}, M.Sigla`);
  const nomes = { Aereo: "Aéreo", FCL: "FCL", LCL: "LCL" };
  const porModal = new Map(vazio.map((item) => [item.nome, { ...item }]));
  for (const linha of contagem.recordset) {
    const nome = nomes[linha.Modal] || "Aéreo";
    const item = porModal.get(nome);
    const qtd = Number(linha.Qtd) || 0;
    const situacao = Number(linha.Situacao);
    if (situacao === 2) item.aprovadas = (item.aprovadas || 0) + qtd;
    else if (situacao === 3) item.reprovadas = (item.reprovadas || 0) + qtd;
    else if ([1, 4, 5, 6, 9].includes(situacao)) item.pendentes = (item.pendentes || 0) + qtd;
    const ultimaMs = linha.Ultima instanceof Date ? linha.Ultima.getTime() : 0;
    if (ultimaMs && (!item.ultimaMs || ultimaMs > item.ultimaMs)) {
      item.ultimaMs = ultimaMs;
      item.ultima = dataCurta(linha.Ultima);
    }
  }
  for (const linha of processos.recordset) {
    const item = porModal.get(nomes[linha.Modal] || "Aéreo");
    if (!item) continue;
    item.processo = texto(linha.Numero_Processo);
    item.dataProcesso = dataCurta(linha.Data_Abertura);
    const lucro = dinheiroTaxa(linha.Lucro, linha.Sigla);
    if (lucro) item.profit = item.profit ? `${item.profit} · ${lucro}` : lucro;
  }
  for (const linha of medias.recordset) {
    const item = porModal.get(nomes[linha.Modal] || "Aéreo");
    const media = dinheiroTaxa(linha.Media, linha.Sigla);
    if (item && media) item.media = item.media ? `${item.media} · ${media}` : media;
  }
  return {
    cnpj: texto(pessoa.recordset[0]?.Cpf_Cnpj),
    pais: texto(pessoa.recordset[0]?.Pais),
    modais: [...porModal.values()],
  };
}

async function emailsDoCadastro(pool, idPessoa, extras) {
  const lista = extras.flatMap(emailsDe);
  const id = Number(idPessoa);
  if (id > 0) {
    const contatos = await pool.request().input("id", sql.Int, id).query(`
      SELECT EMail, EMail_Pessoal
      FROM cad_Pessoa_Contato
      WHERE IdPessoa = @id AND ISNULL(Ativo, 1) = 1`);
    for (const contato of contatos.recordset) lista.push(...emailsDe(contato.EMail), ...emailsDe(contato.EMail_Pessoal));
  }
  return [...new Set(lista)];
}

async function processoDaProposta(pool, idProposta) {
  const r = await pool.request().input("id", sql.Int, idProposta).query(`
    SELECT TOP 1 H.Numero_Processo
    FROM mov_Oferta_Frete O
    JOIN mov_Logistica_House H ON H.IdOferta_Frete = O.IdOferta_Frete
    WHERE O.IdProposta_Frete = @id AND NULLIF(H.Numero_Processo, '') IS NOT NULL
    ORDER BY H.IdLogistica_House DESC`);
  return texto(r.recordset[0]?.Numero_Processo);
}

function baseDoEmail(escolha, mensagens, pedidoEm) {
  const numero = texto(escolha.proposta.numero);
  const data = dataCurta(escolha.proposta.data);
  if (escolha.motivo === "email" && mensagens[0]) {
    const assunto = texto(mensagens[0].assunto).slice(0, 120);
    const quando = texto(mensagens[0].data).slice(0, 16);
    return `Proposta ${numero} alinhada ao e-mail do cliente${quando ? ` de ${quando}` : ""}${assunto ? `, assunto ${assunto}` : ""}.`;
  }
  if (pedidoEm) return `Proposta ${numero} de ${data}, com base no pedido do cliente em ${pedidoEm}.`;
  return `Proposta ${numero}${data ? ` de ${data}` : ""}, a mais recente deste cliente.`;
}

export async function montarPropostaEmail(pool, args, ctx = {}) {
  if (ctx.recorte?.semComercial) return "Proposta é informação do comercial.";
  if (ctx.carteira === 0) return "Não localizei seu cadastro para filtrar a carteira.";
  const carteira = Number(ctx.carteira) > 0 ? Number(ctx.carteira) : null;
  const numeroProcesso = texto(args.numero).toUpperCase();
  const pedidoNome = texto(args.cliente);
  let alvo = null;
  if (/^[A-Z]{1,4}\d{2,6}-\d{2}$/.test(numeroProcesso)) {
    const doProcesso = await clienteDoProcesso(pool, numeroProcesso, carteira || null);
    if (typeof doProcesso === "string") return doProcesso;
    alvo = doProcesso;
  } else if (pedidoNome) {
    const achado = await clientePorNome(pool, pedidoNome, carteira || null);
    if (typeof achado === "string") return achado;
    alvo = achado;
  } else {
    return "Qual cliente recebe essa proposta?";
  }
  const linhas = await propostasDoCliente(pool, alvo.nome, carteira || null);
  if (!linhas.length) return `Nenhuma proposta encontrada para ${alvo.nome}.`;
  const ids = [...new Set(linhas.map((linha) => Number(linha.IdProposta_Frete)).filter((id) => id > 0))];
  const ofertas = await ofertasDasPropostas(pool, ids);
  const porProposta = new Map();
  for (const oferta of ofertas) {
    const id = Number(oferta.IdProposta_Frete);
    const lista = porProposta.get(id) || [];
    lista.push({
      id: Number(oferta.IdOferta_Frete),
      numero: texto(oferta.Numero_Oferta),
      origem: lugar(oferta.Origem, oferta.Origem_Sigla),
      destino: lugar(oferta.Destino, oferta.Destino_Sigla),
      validade: dataCurta(oferta.Data_Validade),
      transit: transitDe(oferta.Transit_Time, oferta.Transit_Time_Maximo),
      incoterm: texto(oferta.Incoterm),
      exportador: texto(oferta.Exportador),
      importador: texto(oferta.Importador),
      referencia: texto(oferta.Referencia_Cliente),
    });
    porProposta.set(id, lista);
  }
  const propostas = linhas.map((linha) => ({
    id: Number(linha.IdProposta_Frete),
    numero: texto(linha.Numero_Proposta),
    situacao: Number(linha.Situacao),
    data: linha.Data_Proposta,
    pedido: linha.Data_Solicitacao_Cliente,
    cliente: texto(linha.Cliente),
    idPessoa: Number(linha.IdPessoa),
    emails: [...emailsDe(linha.EMail), ...emailsDe(linha.EMail_Pessoal), ...emailsDe(linha.Email_Contato), ...emailsDe(linha.Email_Contato_Pessoal)],
    ofertas: porProposta.get(Number(linha.IdProposta_Frete)) || [],
  }));
  const focada = alvo.idProposta ? propostas.filter((item) => item.id === alvo.idProposta) : propostas;
  const baseLista = focada.length ? focada : propostas;
  const idPessoa = baseLista[0]?.idPessoa;
  const caixa = await emailsDoCadastro(pool, idPessoa, baseLista.flatMap((item) => item.emails));
  let mensagens = [];
  const token = texto(ctx.gmailToken);
  if (token && caixa.length) {
    const consulta = `from:(${caixa.slice(0, 6).join(" OR ")}) newer_than:120d`;
    try {
      mensagens = await mensagensDaConsulta(token, consulta, 4);
    } catch {
      mensagens = [];
    }
  }
  const escolha = escolherProposta(baseLista, mensagens);
  if (!escolha) return `Nenhuma proposta encontrada para ${alvo.nome}.`;
  const especificos = [...new Set(escolha.proposta.emails)];
  const destinatarios = especificos.length ? especificos : caixa;
  const oferta = escolha.oferta || {};
  const numeroDocumento = oferta.numero || escolha.proposta.numero;
  const [taxas, ficha] = await Promise.all([
    oferta.id ? taxasDaOferta(pool, oferta.id) : [],
    fichaDoCliente(pool, escolha.proposta.idPessoa),
  ]);
  const processo = numeroProcesso || (await processoDaProposta(pool, escolha.proposta.id));
  const rota = [oferta.origem, oferta.destino].filter(Boolean).join(" X ");
  const assunto = ["PROPOSTA COMERCIAL", numeroDocumento, escolha.proposta.cliente].filter(Boolean).join(" - ");
  const html = corpoDaProposta({
    cliente: escolha.proposta.cliente,
    cnpj: ficha.cnpj,
    pais: ficha.pais,
    numero: numeroDocumento,
    modais: ficha.modais,
    taxas,
    base: baseDoEmail(escolha, mensagens, dataCurta(escolha.proposta.pedido)),
  });
  const cartao = {
    assunto,
    de: "Proposta comercial",
    data: dataCurta(new Date()),
    processo,
    atividade: "Proposta comercial",
    para: destinatarios,
    html,
  };
  const origemTxt = escolha.motivo === "email"
    ? "Usei o e-mail do cliente para escolher a proposta."
    : token
      ? "Não havia e-mail recente desse cliente. Usei a proposta mais recente."
      : "Usei a proposta mais recente deste cliente.";
  const intro = [`Proposta de ${escolha.proposta.cliente}.`, origemTxt, rota ? `Rota ${rota}.` : ""].filter(Boolean).join(" ");
  return `${intro}\n\n\`\`\`email\n${JSON.stringify(cartao)}\n\`\`\``;
}
