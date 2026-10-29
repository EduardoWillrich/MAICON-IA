import sql from "mssql";
import { enriquecerNomes } from "./nomes.js";
import { nomeDe, pessoasPorLogin, relogioLog } from "./pessoas.js";
import { nomeProprio } from "./itensCarga.js";
import { montarSelect, parseCamposXml, parseTabelasXml } from "./query.js";
import { explicarCampoLivre } from "./campoLivre.js";
import { explicarItensCarga } from "./itensCarga.js";

const NUMERO = /^[A-Za-z0-9./-]{3,30}$/;
const cacheConsulta = new Map();
const VALIDADE_CONSULTA_MS = 2 * 60 * 1000;

export function chaveConsulta(nome, args, visao) {
  const dados = args && typeof args === "object" ? args : {};
  const pares = Object.keys(dados)
    .sort()
    .map((chave) => `${chave}:${JSON.stringify(dados[chave])}`);
  return `${visao || "geral"}|${nome}|${pares.join("|")}`;
}

export function consultaEmCache(chave) {
  return cacheConsulta.get(chave) ?? null;
}

export function guardarConsulta(chave, valor) {
  cacheConsulta.set(chave, { valor, quando: Date.now(), atualizando: false });
}

export function consultaFresca(item) {
  return Boolean(item) && Date.now() - item.quando < VALIDADE_CONSULTA_MS;
}

const FUNCOES = new Set([
  "resumo_processo",
  "buscar_processos",
  "processos_abertos",
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
  "explicar_itens_carga",
  "explicar_campo_livre",
  "andamento_atividade",
]);

function dataDoPeriodo(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  if (data.getUTCHours() === 0 && data.getUTCMinutes() === 0 && data.getUTCSeconds() === 0) {
    return `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
  }
  return `${p(data.getDate())}/${p(data.getMonth() + 1)}/${data.getFullYear()}`;
}

function dataCurta(valor) {
  if (valor == null || valor === "") return "";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  const p = (n) => String(n).padStart(2, "0");
  if (data.getUTCHours() === 0 && data.getUTCMinutes() === 0 && data.getUTCSeconds() === 0) {
    return `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
  }
  const dia = `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
  const hora = data.getUTCHours();
  const minuto = data.getUTCMinutes();
  if (hora === 0 && minuto === 0 && data.getUTCSeconds() === 0) return dia;
  return `${dia} ${p(hora)}:${p(minuto)}`;
}

function previsaoDe(inicio, termino) {
  const a = dataCurta(inicio);
  const b = dataCurta(termino);
  if (a && b) {
    const [diaA, horaA = ""] = a.split(" ");
    const [diaB, horaB = ""] = b.split(" ");
    if (diaA === diaB && horaA && horaB) return `Previsão ${diaA} ${horaA}–${horaB}`;
    return `Previsão ${a} a ${b}`;
  }
  if (a || b) return `Previsão ${a || b}`;
  return "";
}

function dinheiro(valor) {
  if (valor == null || valor === "") return "";
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseData(valor) {
  const texto = String(valor ?? "").trim();
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function filtroModalidadeSql(recorte) {
  const modalidade = String(recorte?.modalidade ?? "");
  if (!["IA", "EA", "IM", "EM"].includes(modalidade)) return "";
  return `AND Lhs.Numero_Processo LIKE '${modalidade}%'`;
}

function diasDe(valor, padrao) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(60, Math.max(1, Math.round(n)));
}

function termoSeguro(valor) {
  return String(valor ?? "")
    .replace(/[%_[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function numeroDe(valor) {
  const numero = String(valor ?? "").trim();
  if (!NUMERO.test(numero)) throw new Error("Informe o número do processo, como IM5328-26.");
  return numero;
}

function juntar(partes) {
  return partes.filter(Boolean).join("\n");
}

function marcoResumo(real, previsto, nome) {
  if (real) return `${nome[0].toUpperCase()}${nome.slice(1)}: ${dataCurta(real)}`;
  if (previsto) return `Previsão de ${nome}: ${dataCurta(previsto)}`;
  return "";
}

function lista(linhas, vazio) {
  if (!linhas.length) return vazio;
  return linhas.map((linha) => `- ${String(linha).replace(/^[-*]\s*/, "")}`).join("\n");
}

function diaIso(data) {
  const p = (n) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

function consultaPronta(texto, comando, linhas, params = {}) {
  let sqlVisivel = String(comando).replace(/[ \t]+\n/g, "\n").trim();
  for (const [chave, valor] of Object.entries(params)) {
    const literal =
      valor instanceof Date
        ? `'${diaIso(valor)}'`
        : typeof valor === "number"
          ? String(valor)
          : `N'${String(valor).replace(/'/g, "''")}'`;
    sqlVisivel = sqlVisivel.replaceAll(`@${chave}`, literal);
  }
  const registros = (linhas ?? []).map((linha) =>
    Object.fromEntries(
      Object.entries(linha)
        .filter(([chave]) => !/^id/i.test(chave))
        .map(([chave, valor]) => [chave, valor instanceof Date ? dataCurta(valor) : valor == null ? "" : valor]),
    ),
  );
  return { texto, sql: sqlVisivel, linhas: registros };
}

async function houseDoProcesso(pool, numero) {
  const r = await pool.request().input("n", sql.VarChar(30), numero).query(`
    SELECT TOP 1 IdLogistica_House, IdLogistica_Master, IdProjeto_Atividade, Numero_Processo
    FROM mov_Logistica_House
    WHERE Numero_Processo = @n`);
  return r.recordset[0] ?? null;
}

function tokens(nome, email) {
  const limpo = String(nome ?? "")
    .split(" - ")[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .trim();
  let partes = limpo.split(/\s+/).filter((p) => p.length > 1);
  if (partes.length < 2) {
    const local = String(email ?? "").split("@")[0] ?? "";
    partes = local
      .split(/[._-]+/)
      .map((p) => p.replace(/[^A-Za-z]/g, ""))
      .filter((p) => p.length > 1);
  }
  if (partes.length < 2) return null;
  const limpar = (valor) => valor.replace(/[%_[\]]/g, "");
  return { primeiro: limpar(partes[0]), ultimo: limpar(partes[partes.length - 1]) };
}

async function pessoaDaConta(pool, email, nome) {
  const conta = String(email ?? "").trim().toLowerCase();
  const porEmail = await pool.request().input("email", sql.VarChar(180), conta).query(`
    SELECT TOP 1 IdPessoa, Nome
    FROM cad_Pessoa
    WHERE LOWER(LTRIM(RTRIM(ISNULL(EMail, '')))) = @email
       OR LOWER(LTRIM(RTRIM(ISNULL(EMail_Pessoal, '')))) = @email`);
  if (porEmail.recordset[0]) return porEmail.recordset[0];
  const nomeSistema = tokens(nome, conta);
  if (!nomeSistema) return null;
  const porNome = await pool
    .request()
    .input("primeiro", sql.VarChar(80), nomeSistema.primeiro)
    .input("ultimo", sql.VarChar(80), nomeSistema.ultimo)
    .query(`
      SELECT TOP 1 IdPessoa, Nome
      FROM cad_Pessoa
      WHERE Nome LIKE @primeiro + ' %' AND Nome LIKE '% ' + @ultimo
      ORDER BY LEN(Nome)`);
  return porNome.recordset[0] ?? null;
}

async function resumoProcesso(pool, args, recorte) {
  const numero = numeroDe(args.numero);
  const r = await pool.request().input("n", sql.VarChar(30), numero).query(`
    SELECT TOP 1
      Lhs.Numero_Processo,
      Lhs.Referencia_Cliente,
      Cli.Nome AS Cliente,
      Ven.Nome AS Vendedor,
      Sta.Descricao AS Situacao,
      Lms.Data_Previsao_Embarque,
      Lms.Data_Embarque,
      Lms.Data_Previsao_Desembarque,
      Lms.Data_Desembarque,
      Lhs.Data_Previsao_Entrega,
      Lhs.Data_Entrega,
      Lhs.Data_DI_RE,
      Lhs.Numero_DI_RE,
      Lhs.Data_Averbacao,
      Pen.Atividade AS Pendencia,
      Pen.Previsao AS Previsao_Pendencia,
      Aco.Data AS Acompanhamento_Data,
      Aco.Descricao AS Acompanhamento,
      Aco.Responsavel AS Acompanhamento_Responsavel
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    OUTER APPLY (
      SELECT TOP 1 Tar.Descricao AS Atividade, Ati.Previsao_Termino AS Previsao
      FROM mov_Atividade Ati
      LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
      WHERE Ati.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
        AND Ati.Data_Termino IS NULL
        AND Ati.Situacao NOT IN (4, 6)
      ORDER BY Ati.Previsao_Termino
    ) Pen
    OUTER APPLY (
      SELECT TOP 1 A.Data, A.Descricao, R.Nome AS Responsavel
      FROM mov_Acompanhamento A
      LEFT JOIN cad_Pessoa R ON R.IdPessoa = A.IdResponsavel
      WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
      ORDER BY A.Data DESC
    ) Aco
    WHERE Lhs.Numero_Processo = @n`);
  const linha = r.recordset[0];
  if (!linha) return `Processo ${numero} não encontrado.`;
  const operacional = recorte?.semOperacional
    ? ""
    : [
        marcoResumo(linha.Data_Embarque, linha.Data_Previsao_Embarque, "embarque"),
        marcoResumo(linha.Data_Desembarque, linha.Data_Previsao_Desembarque, "desembarque"),
        linha.Data_Averbacao ? `Averbação: ${dataCurta(linha.Data_Averbacao)}` : "",
        marcoResumo(linha.Data_Entrega, linha.Data_Previsao_Entrega, "entrega"),
      ]
        .filter(Boolean)
        .join("\n");
  const nota = String(linha.Acompanhamento ?? "").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  return juntar([
    `Processo ${linha.Numero_Processo}`,
    linha.Cliente ? `Cliente: ${String(linha.Cliente).trim()}` : "",
    linha.Referencia_Cliente ? `Referência: ${String(linha.Referencia_Cliente).trim()}` : "",
    !recorte?.semComercial && linha.Vendedor ? `Vendedor: ${String(linha.Vendedor).trim()}` : "",
    linha.Situacao ? `Situação: ${String(linha.Situacao).trim()}` : "",
    operacional,
    linha.Pendencia
      ? `Pendência: ${String(linha.Pendencia).trim()}${linha.Previsao_Pendencia ? ` (previsão ${dataCurta(linha.Previsao_Pendencia)})` : ""}`
      : "Pendência: nenhuma em aberto.",
    nota
      ? `Último acompanhamento (${dataCurta(linha.Acompanhamento_Data)}${linha.Acompanhamento_Responsavel ? `, ${String(linha.Acompanhamento_Responsavel).trim()}` : ""}): ${nota}`
      : "Último acompanhamento: nenhum.",
  ]);
}

async function buscarProcessos(pool, args, recorte) {
  const termo = termoSeguro(args.termo || args.cliente || args.referencia);
  if (termo.length < 2) throw new Error("Informe ao menos 2 letras do cliente, da referência ou do processo.");
  const comando = `
    SELECT TOP 50
      Lhs.Numero_Processo,
      Lhs.Referencia_Cliente,
      Cli.Nome AS Cliente,
      Sta.Descricao AS Situacao
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    WHERE (Lhs.Numero_Processo LIKE @t
       OR Lhs.Referencia_Cliente LIKE @t
       OR Cli.Nome LIKE @t)
      ${/^[A-Za-z]{2}\d/.test(termo) ? "" : filtroModalidadeSql(recorte)}
    ORDER BY Lhs.Data_Abertura_Processo DESC`;
  const r = await pool.request().input("t", sql.NVarChar(80), `%${termo}%`).query(comando);
  return consultaPronta(
    lista(
    r.recordset.map((linha) => {
      const ref = String(linha.Referencia_Cliente ?? "").trim();
      const situacao = String(linha.Situacao ?? "").trim();
      return [
        linha.Numero_Processo,
        String(linha.Cliente ?? "").trim(),
        ref && `ref. ${ref}`,
        situacao,
      ]
        .filter(Boolean)
        .join(" · ");
    }),
    `Nenhum processo encontrado para "${termo}".`,
    ),
    comando,
    r.recordset,
    { t: `%${termo}%` },
  );
}

async function processosAbertos(pool, args, recorte) {
  const hoje = String(args.quando ?? "") === "hoje" || args.hoje === true;
  const titulo = hoje ? "Processos abertos hoje" : "Processos abertos nos últimos 6 meses";
  const periodo = hoje
    ? "CAST(Lhs.Data_Abertura_Processo AS date) = CAST(GETDATE() AS date)"
    : "Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))";
  const comando = `
    SELECT TOP 40
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Sta.Descricao AS Situacao,
      Lhs.Data_Abertura_Processo
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    WHERE Lhs.Data_Cancelamento IS NULL
      AND Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
      AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
      AND ${periodo}
      ${filtroModalidadeSql(recorte)}
    ORDER BY Lhs.Data_Abertura_Processo DESC`;
  const r = await pool.request().query(comando);
  const linhas = r.recordset.map((linha) =>
    [linha.Numero_Processo, String(linha.Cliente ?? "").trim(), String(linha.Situacao ?? "").trim(), dataCurta(linha.Data_Abertura_Processo)]
      .filter(Boolean)
      .join(" · "),
  );
  const aviso = r.recordset.length === 40 ? "\n\nMostrei 40 registros." : "";
  return consultaPronta(`${titulo}\n${lista(linhas, "Nenhum processo aberto nesse recorte.")}${aviso}`, comando, r.recordset);
}

async function acompanhamentosProcesso(pool, args) {
  const numero = numeroDe(args.numero);
  const house = await houseDoProcesso(pool, numero);
  if (!house) return `Processo ${numero} não encontrado.`;
  const ultimo = args.ultimo === true || args.ultimo === "true" || args.ultimo === 1;
  const r = await pool.request().input("id", sql.Int, house.IdProjeto_Atividade).query(`
    SELECT ${ultimo ? "TOP 1" : "TOP 15"}
      A.Data,
      A.Descricao,
      R.Nome AS Responsavel
    FROM mov_Acompanhamento A
    LEFT JOIN cad_Pessoa R ON R.IdPessoa = A.IdResponsavel
    WHERE A.IdProjeto_Atividade = @id
    ORDER BY A.Data DESC`);
  if (!r.recordset.length) return `Não há acompanhamento para o processo ${numero}.`;
  const texto = r.recordset
    .map((linha) => {
      const nota = String(linha.Descricao ?? "").replace(/\s+/g, " ").trim();
      const quem = String(linha.Responsavel ?? "").trim();
      return [dataCurta(linha.Data), nota, quem && `(${quem})`].filter(Boolean).join(" ");
    })
    .join("\n");
  return ultimo || r.recordset.length < 15 ? texto : `${texto}\n\nMostrei os 15 mais recentes.`;
}

async function pendencias(pool, args, ctx) {
  const pessoa = await pessoaDaConta(pool, ctx.email, ctx.nome);
  if (!pessoa) return "Não localizei seu cadastro de pessoa para listar as pendências.";
  const escopo = ["hoje", "atrasadas", "semana", "abertas"].includes(args.escopo) ? args.escopo : "semana";
  const filtro =
    escopo === "hoje"
      ? "CAST(Ati.Previsao_Termino AS date) = CAST(GETDATE() AS date)"
      : escopo === "atrasadas"
        ? "CAST(Ati.Previsao_Termino AS date) < CAST(GETDATE() AS date)"
        : escopo === "abertas"
          ? "CAST(Ati.Previsao_Termino AS date) < DATEADD(day, 8, CAST(GETDATE() AS date))"
          : "CAST(Ati.Previsao_Termino AS date) >= CAST(GETDATE() AS date) AND CAST(Ati.Previsao_Termino AS date) < DATEADD(day, 8, CAST(GETDATE() AS date))";
  const r = await pool.request().input("id", sql.Int, pessoa.IdPessoa).query(`
    SELECT TOP 30
      Tar.Descricao AS Atividade,
      Lhs.Numero_Processo,
      Ati.Previsao_Termino
    FROM mov_Atividade Ati
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    WHERE Ati.IdResponsavel = @id
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND Ati.Previsao_Termino IS NOT NULL
      AND ${filtro}
    ORDER BY Ati.Previsao_Termino`);
  const titulo =
    escopo === "hoje"
      ? "Pendências de hoje"
      : escopo === "atrasadas"
        ? "Pendências atrasadas"
        : escopo === "abertas"
          ? "Pendências atrasadas, de hoje e da semana"
          : "Pendências dos próximos 7 dias";
  const linhas = r.recordset.map(
    (linha) =>
      `${dataCurta(linha.Previsao_Termino)} · ${String(linha.Numero_Processo ?? "sem processo").trim()} · ${String(linha.Atividade ?? "Atividade").trim()}`,
  );
  return `${titulo} de ${String(pessoa.Nome).trim()}\n${lista(linhas, "Nenhuma pendência nesse recorte.")}`;
}

async function oQueMudou(pool, args, ctx) {
  if (ctx.acesso?.fazerLog === false && ctx.acesso?.papel !== "admin") {
    return "Este acesso não inclui o histórico de alterações.";
  }
  const numero = numeroDe(args.numero);
  const house = await houseDoProcesso(pool, numero);
  if (!house) return `Processo ${numero} não encontrado.`;
  const desde = parseData(args.desde) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const campo = termoSeguro(args.campo).toLowerCase().replace(/_/g, "");
  const xpath = `/Log/Tabela[@Nome="mov_Logistica_House"][Campo[@Nome="IdLogistica_House"][@Value="${Number(house.IdLogistica_House)}"]]`;
  const request = pool.request();
  request.input("Data_Inicio", sql.Date, desde);
  request.input("Data_Termino", sql.Date, null);
  request.input("IdUsuario", sql.Int, 0);
  const resultado = await request.query(montarSelect([xpath]));
  const eventos = [];
  for (const linha of resultado.recordset) {
    for (const tabela of parseTabelasXml(linha.Trecho)) {
      eventos.push({
        usuario: linha.Usuario,
        data: linha.Data_Inicio_Transacao,
        tipo: tabela.tipo,
        campos: tabela.campos,
      });
    }
  }
  await enriquecerNomes(pool, eventos, null);
  const mudancas = [];
  for (const evento of eventos) {
    const campos = (evento.campos ?? []).filter((item) => {
      if (item.nome === "IdLogistica_House") return false;
      if (!campo) return true;
      return String(item.nome).toLowerCase().replace(/_/g, "").includes(campo);
    });
    for (const item of campos) {
      const agora = item.valorExibicao || item.valor || "(vazio)";
      const anterior = item.valorAnteriorExibicao || item.valorAnterior;
      const antes = anterior != null && anterior !== "" ? `${anterior} → ` : "";
      mudancas.push(`${dataCurta(evento.data)} · ${nomeProprio(evento.usuario) || "usuário"} · ${item.nome}: ${antes}${agora}`);
      if (mudancas.length >= 20) break;
    }
    if (mudancas.length >= 20) break;
  }
  const titulo = `Alterações de ${numero} desde ${dataCurta(desde)}${args.campo ? ` no campo ${String(args.campo).trim()}` : ""}`;
  return `${titulo}\n${lista(mudancas, "Nenhuma alteração nesse recorte.")}`;
}

async function propostaProcesso(pool, args, recorte) {
  if (recorte?.semComercial) return "Proposta e oferta são informação do comercial.";
  const numero = numeroDe(args.numero);
  const r = await pool.request().input("n", sql.VarChar(30), numero).query(`
    SELECT TOP 1
      Lhs.Numero_Processo,
      Ofe.Numero_Oferta,
      Ofe.Situacao AS Situacao_Oferta,
      Ofe.Data_Validade,
      Pro.Numero_Proposta,
      Pro.Situacao AS Situacao_Proposta,
      Pro.Data_Proposta,
      Pro.Data_Aprovacao
    FROM mov_Logistica_House Lhs
    LEFT JOIN mov_Oferta_Frete Ofe ON Ofe.IdOferta_Frete = Lhs.IdOferta_Frete
    LEFT JOIN mov_Proposta_Frete Pro ON Pro.IdProposta_Frete = Ofe.IdProposta_Frete
    WHERE Lhs.Numero_Processo = @n`);
  const linha = r.recordset[0];
  if (!linha) return `Processo ${numero} não encontrado.`;
  if (!linha.Numero_Oferta && !linha.Numero_Proposta) return `O processo ${numero} não tem proposta nem oferta ligada.`;
  return juntar([
    `Processo ${linha.Numero_Processo}`,
    linha.Numero_Proposta ? `Proposta: ${linha.Numero_Proposta}` : "Proposta: não ligada.",
    linha.Data_Proposta ? `Data da proposta: ${dataCurta(linha.Data_Proposta)}` : "",
    linha.Data_Aprovacao ? `Aprovada em: ${dataCurta(linha.Data_Aprovacao)}` : linha.Numero_Proposta ? "Aprovação: ainda não registrada." : "",
    linha.Situacao_Proposta != null && linha.Situacao_Proposta !== "" ? `Situação da proposta (código): ${linha.Situacao_Proposta}` : "",
    linha.Numero_Oferta ? `Oferta: ${linha.Numero_Oferta}` : "Oferta: não ligada.",
    linha.Data_Validade ? `Validade da oferta: ${dataCurta(linha.Data_Validade)}` : "",
    linha.Situacao_Oferta != null && linha.Situacao_Oferta !== "" ? `Situação da oferta (código): ${linha.Situacao_Oferta}` : "",
  ]);
}

async function comissaoPeriodo(pool, args, recorte, ctx) {
  if (recorte?.semComercial || recorte?.semComissao) return "Comissão não faz parte deste acesso.";
  const inicio = parseData(args.inicio) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fim = parseData(args.fim) || new Date();
  const request = pool.request();
  request.input("ini", sql.Date, inicio);
  request.input("fim", sql.Date, fim);
  let filtroPessoa = "";
  if (!["tudo", "financeiro", "gerencia"].includes(recorte?.visao)) {
    const pessoa = await pessoaDaConta(pool, ctx.email, ctx.nome);
    if (!pessoa) return "Não localizei seu cadastro para filtrar a comissão.";
    request.input("id", sql.Int, pessoa.IdPessoa);
    filtroPessoa = "AND (Lhs.IdVendedor = @id OR Com.IdPessoa = @id)";
  }
  const r = await request.query(`
    SELECT TOP 20
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Pes.Nome AS Comissionado,
      Com.Valor_Comissao,
      Com.Tipo_Comissao
    FROM mov_Logistica_House Lhs
    JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Pessoa Pes ON Pes.IdPessoa = Com.IdPessoa
    WHERE Lhs.Data_Abertura_Processo >= @ini
      AND Lhs.Data_Abertura_Processo < DATEADD(day, 1, @fim)
      ${filtroPessoa}
    ORDER BY Lhs.Data_Abertura_Processo DESC`);
  const linhas = r.recordset.map(
    (linha) =>
      `${linha.Numero_Processo} · ${String(linha.Cliente ?? "").trim()} · ${String(linha.Comissionado ?? "comissionado").trim()} · ${dinheiro(linha.Valor_Comissao) || "R$ 0,00"}`,
  );
  return `Comissões de processos abertos entre ${dataDoPeriodo(inicio)} e ${dataDoPeriodo(fim)}\n${lista(linhas, "Nenhuma comissão nesse período.")}${linhas.length === 20 ? "\n\nMostrei 20 registros." : ""}`;
}

async function idDaCarteira(pool, recorte, ctx) {
  if (ctx?.acesso?.papel === "admin") return null;
  if (!["comercial", "inside"].includes(recorte?.visao)) return null;
  const pessoa = await pessoaDaConta(pool, ctx?.email, ctx?.nome);
  return pessoa ? Number(pessoa.IdPessoa) || 0 : 0;
}

async function resumoCarteira(pool, foco, recorte, ctx) {
  const visao = String(recorte?.visao ?? "");
  const admin = ctx?.acesso?.papel === "admin" || ["tudo", "gerencia", "admin"].includes(visao);
  const carteira = await idDaCarteira(pool, recorte, ctx);
  if (carteira === 0) return "Não localizei seu cadastro para filtrar a carteira.";
  if (!carteira && !admin && !["comercial", "inside"].includes(visao)) return "A carteira de clientes aparece no comercial.";
  const filtro = carteira ? "AND Lhs.IdVendedor = @id" : "";
  const real = "Lhs.Data_Cancelamento IS NULL AND Lhs.Numero_Processo NOT LIKE '%TESTE%' AND Lhs.Numero_Processo NOT LIKE 'DEMU%'";
  const aberto = `${real} AND Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`;
  const pedido = pool.request();
  if (carteira) pedido.input("id", sql.Int, carteira);
  const titulo =
    foco === "sem_proposta"
      ? "Clientes com processo aberto sem proposta"
      : foco === "sem_movimento"
        ? "Clientes sem abrir processo há 90 dias ou mais"
        : "Clientes com mais processos abertos";
  const comando =
    foco === "sem_movimento"
      ? `
    SELECT TOP 20 Nome, Dias AS Qtd
    FROM (
      SELECT LTRIM(RTRIM(Cli.Nome)) AS Nome,
        DATEDIFF(day, MAX(Lhs.Data_Abertura_Processo), CAST(GETDATE() AS date)) AS Dias
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE ${real} ${filtro}
      GROUP BY LTRIM(RTRIM(Cli.Nome))
      HAVING MAX(Lhs.Data_Abertura_Processo) < DATEADD(day, -90, CAST(GETDATE() AS date))
    ) C
    WHERE Nome <> ''
    ORDER BY Dias DESC, Nome`
      : `
    SELECT TOP 20 Nome, Qtd
    FROM (
      SELECT LTRIM(RTRIM(Cli.Nome)) AS Nome, COUNT(*) AS Qtd
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE ${aberto} ${foco === "sem_proposta" ? "AND Lhs.IdOferta_Frete IS NULL" : ""} ${filtro}
      GROUP BY LTRIM(RTRIM(Cli.Nome))
    ) C
    WHERE Nome <> ''
    ORDER BY Qtd DESC, Nome`;
  const r = await pedido.query(comando);
  const linhas = r.recordset.map((linha) => {
    const nome = String(linha.Nome ?? "").trim();
    const qtd = Number(linha.Qtd) || 0;
    if (foco === "sem_movimento") return `${nome} · ${qtd} dias sem abrir`;
    return `${nome} · ${qtd} ${foco === "sem_proposta" ? "sem proposta" : "abertos"}`;
  });
  return consultaPronta(`${titulo}\n${lista(linhas, "Nenhum cliente nesse recorte.")}`, comando, r.recordset, carteira ? { id: carteira } : {});
}

async function processosAbertosCliente(pool, args, recorte, ctx) {
  const foco = String(args.foco ?? "");
  if (foco === "abertos" || foco === "sem_proposta" || foco === "sem_movimento") {
    return resumoCarteira(pool, foco, recorte, ctx);
  }
  const termo = termoSeguro(args.cliente || args.termo);
  if (termo.length < 2) throw new Error("Informe o nome do cliente.");
  const termoLivre = termo
    .replace(/\b(s\s*\/\s*a|s\.a\.?|ltda\.?|eireli|epp)\b/gi, " ")
    .replace(/[./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const carteira = await idDaCarteira(pool, recorte, ctx);
  if (carteira === 0) return "Não localizei seu cadastro para filtrar a carteira.";
  const filtro = carteira ? "AND Lhs.IdVendedor = @id" : "";
  const modal = filtroModalidadeSql(recorte);
  const real = "Lhs.Data_Cancelamento IS NULL AND Lhs.Numero_Processo NOT LIKE '%TESTE%' AND Lhs.Numero_Processo NOT LIKE 'DEMU%'";
  const aberto = `${real} AND Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`;
  const pedido = () => {
    const req = pool.request();
    if (carteira) req.input("id", sql.Int, carteira);
    return req;
  };
  const grupos = await pedido().input("t", sql.NVarChar(80), `%${termo}%`).query(`
    SELECT TOP 5 Nome, Abertos, SemProposta
    FROM (
      SELECT LTRIM(RTRIM(Cli.Nome)) AS Nome,
        COUNT(*) AS Abertos,
        SUM(CASE WHEN Lhs.IdOferta_Frete IS NULL THEN 1 ELSE 0 END) AS SemProposta
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE Cli.Nome LIKE @t AND ${aberto} ${filtro} ${modal}
      GROUP BY LTRIM(RTRIM(Cli.Nome))
    ) C
    WHERE Nome <> ''
    ORDER BY Abertos DESC, Nome`);
  let nome = String(grupos.recordset[0]?.Nome ?? "").trim();
  let abertos = Number(grupos.recordset[0]?.Abertos) || 0;
  let semProposta = Number(grupos.recordset[0]?.SemProposta) || 0;
  const outros = grupos.recordset.slice(1).map((linha) => String(linha.Nome ?? "").trim()).filter(Boolean);
  if (!nome) {
    const achado = await pedido().input("t", sql.NVarChar(80), `%${termo}%`).query(`
      SELECT TOP 1 LTRIM(RTRIM(Cli.Nome)) AS Nome
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE Cli.Nome LIKE @t AND ${real} ${filtro} ${modal}
      ORDER BY Lhs.Data_Abertura_Processo DESC`);
    nome = String(achado.recordset[0]?.Nome ?? "").trim();
  }
  if (!nome && termoLivre && termoLivre.toLowerCase() !== termo.toLowerCase()) {
    const amplo = await pedido().input("t", sql.NVarChar(80), `%${termoLivre}%`).query(`
      SELECT TOP 1 LTRIM(RTRIM(Cli.Nome)) AS Nome
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE Cli.Nome LIKE @t AND ${real} ${filtro} ${modal}
      ORDER BY Lhs.Data_Abertura_Processo DESC`);
    nome = String(amplo.recordset[0]?.Nome ?? "").trim();
  }
  if (!nome) return `Nenhum cliente encontrado para "${termo}".`;
  if (!abertos) {
    const contagem = await pedido().input("nome", sql.NVarChar(200), nome).query(`
      SELECT COUNT(*) AS Abertos,
        SUM(CASE WHEN Lhs.IdOferta_Frete IS NULL THEN 1 ELSE 0 END) AS SemProposta
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE LTRIM(RTRIM(Cli.Nome)) = @nome AND ${aberto} ${filtro} ${modal}`);
    abertos = Number(contagem.recordset[0]?.Abertos) || 0;
    semProposta = Number(contagem.recordset[0]?.SemProposta) || 0;
  }

  const comando = `
    SELECT TOP 30
      Lhs.Numero_Processo,
      Lhs.Referencia_Cliente,
      Cli.Nome AS Cliente,
      Ven.Nome AS Vendedor,
      Sta.Descricao AS Situacao,
      Lhs.Data_Abertura_Processo
    FROM mov_Logistica_House Lhs
    JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    WHERE LTRIM(RTRIM(Cli.Nome)) = @nome
      AND ${aberto} ${filtro} ${modal}
    ORDER BY Lhs.Data_Abertura_Processo DESC`;
  const [abertosLista, ultimo, vendedores, comissao] = await Promise.all([
    pedido().input("nome", sql.NVarChar(200), nome).query(comando),
    pedido().input("nome", sql.NVarChar(200), nome).query(`
      SELECT TOP 1 Lhs.Numero_Processo, Lhs.Data_Abertura_Processo, Ven.Nome AS Vendedor
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      LEFT JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
      WHERE LTRIM(RTRIM(Cli.Nome)) = @nome AND ${real} ${filtro} ${modal}
      ORDER BY Lhs.Data_Abertura_Processo DESC`),
    pedido().input("nome", sql.NVarChar(200), nome).query(`
      SELECT TOP 3 LTRIM(RTRIM(Ven.Nome)) AS Nome, COUNT(*) AS Qtd
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
      WHERE LTRIM(RTRIM(Cli.Nome)) = @nome AND ${aberto} ${filtro} ${modal}
      GROUP BY LTRIM(RTRIM(Ven.Nome))
      ORDER BY COUNT(*) DESC`),
    recorte?.semComissao
      ? Promise.resolve(null)
      : pedido().input("nome", sql.NVarChar(200), nome).query(`
          SELECT SUM(Com.Valor_Comissao) AS Comissao
          FROM mov_Logistica_House Lhs
          JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
          JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
          WHERE LTRIM(RTRIM(Cli.Nome)) = @nome
            AND Lhs.Data_Abertura_Processo >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
            AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
            ${carteira ? "AND (Lhs.IdVendedor = @id OR Com.IdPessoa = @id)" : ""} ${modal}`),
  ]);
  const nomesVendedor = vendedores.recordset.map((linha) => String(linha.Nome ?? "").trim()).filter(Boolean);
  const vendedorUltimo = String(ultimo.recordset[0]?.Vendedor ?? "").trim();
  const vendedor = nomesVendedor.length > 1
    ? `Vendedores: ${nomesVendedor.join(", ")}`
    : `Vendedor: ${nomesVendedor[0] || vendedorUltimo || "não informado"}`;
  const casa = ultimo.recordset[0];
  const linhas = abertosLista.recordset.map((linha) =>
    [linha.Numero_Processo, String(linha.Referencia_Cliente ?? "").trim(), String(linha.Situacao ?? "").trim()].filter(Boolean).join(" · "),
  );
  const texto = [
    `Ficha de ${nome}`,
    outros.length ? `Também encontrei: ${outros.join(", ")}.` : "",
    vendedor,
    `Abertos: ${abertos}`,
    `Sem proposta: ${semProposta}`,
    casa?.Numero_Processo
      ? `Último processo: ${String(casa.Numero_Processo).trim()}${casa.Data_Abertura_Processo ? `, aberto em ${dataCurta(casa.Data_Abertura_Processo)}` : ""}`
      : "Último processo: não encontrado.",
    recorte?.semComissao ? "" : `Comissão deste mês: ${dinheiro(comissao?.recordset[0]?.Comissao) || "R$ 0,00"}`,
    "",
    linhas.length ? `Processos abertos\n${linhas.map((linha) => `- ${linha}`).join("\n")}` : "Nenhum processo aberto nos últimos 6 meses.",
  ].filter((linha) => linha !== "").join("\n");
  return consultaPronta(texto, comando, abertosLista.recordset, { nome, ...(carteira ? { id: carteira } : {}) });
}

function marcosDoPrazo(args) {
  const bruto = String(args.marco ?? "").toLowerCase().split(",").map((item) => item.trim());
  const lista = ["embarque", "desembarque", "entrega"].filter((item) => bruto.includes(item));
  return lista.length ? lista : ["embarque", "desembarque", "entrega"];
}

function modoDoPrazo(args) {
  const modo = String(args.modo ?? "").toLowerCase();
  if (modo === "realizado" || modo === "realizados") return "realizado";
  if (modo === "hoje") return "hoje";
  return "janela";
}

function filtroModalidadePedido(args, recorte) {
  const doRecorte = filtroModalidadeSql(recorte);
  if (doRecorte) return doRecorte;
  const modalidade = String(args.modalidade ?? "").toUpperCase();
  if (!["IA", "EA", "IM", "EM"].includes(modalidade)) return "";
  return `AND Lhs.Numero_Processo LIKE '${modalidade}%'`;
}

function condicaoDoPrazo(marco, modo, dias) {
  const colunas = {
    embarque: ["Lms.Data_Embarque", "Lms.Data_Previsao_Embarque"],
    desembarque: ["Lms.Data_Desembarque", "Lms.Data_Previsao_Desembarque"],
    entrega: ["Lhs.Data_Entrega", "Lhs.Data_Previsao_Entrega"],
  };
  const [real, previsto] = colunas[marco];
  if (modo === "realizado") {
    if (dias <= 1) return `CAST(${real} AS date) = CAST(GETDATE() AS date)`;
    return `CAST(${real} AS date) BETWEEN DATEADD(day, 1 - ${dias}, CAST(GETDATE() AS date)) AND CAST(GETDATE() AS date)`;
  }
  if (modo === "hoje") return `CAST(COALESCE(${real}, ${previsto}) AS date) = CAST(GETDATE() AS date)`;
  return `(${real} IS NULL AND ${previsto} IS NOT NULL AND ${previsto} < DATEADD(day, @dias, CAST(GETDATE() AS date)))`;
}

async function prazos(pool, args, recorte) {
  const dias = diasDe(args.dias, 7);
  const modo = modoDoPrazo(args);
  const marcos = marcosDoPrazo(args);
  const condicoes = marcos.map((marco) => condicaoDoPrazo(marco, modo, dias)).join("\n        OR ");
  const recorteAberto =
    modo === "janela"
      ? `Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Cancelamento IS NULL
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`
      : `Lhs.Data_Cancelamento IS NULL
      AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
      AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -18, CAST(GETDATE() AS date))`;
  const comando = `
    SELECT TOP 200
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Lms.Data_Previsao_Embarque,
      Lms.Data_Embarque,
      Lms.Data_Previsao_Desembarque,
      Lms.Data_Desembarque,
      Lhs.Data_Previsao_Entrega,
      Lhs.Data_Entrega
    FROM mov_Logistica_House Lhs
    LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    WHERE ${recorteAberto}
      ${filtroModalidadePedido(args, recorte)}
      AND (
        ${condicoes}
      )
    ORDER BY ABS(DATEDIFF(day, CAST(GETDATE() AS date), COALESCE(Lms.Data_Previsao_Embarque, Lms.Data_Previsao_Desembarque, Lhs.Data_Previsao_Entrega)))`;
  const r = await pool.request().input("dias", sql.Int, dias).query(comando);
  const linhas = r.recordset.map((linha) => {
    const marco = (real, previsto, nome) => {
      if (real) return `${nome} ${dataCurta(real)}`;
      if (previsto) return `previsão de ${nome} ${dataCurta(previsto)}`;
      return "";
    };
    const marcas = [
      marco(linha.Data_Embarque, linha.Data_Previsao_Embarque, "embarque"),
      marco(linha.Data_Desembarque, linha.Data_Previsao_Desembarque, "desembarque"),
      marco(linha.Data_Entrega, linha.Data_Previsao_Entrega, "entrega"),
    ].filter(Boolean);
    return `${linha.Numero_Processo} · ${String(linha.Cliente ?? "").trim()} · ${marcas.join(", ")}`;
  });
  const aviso = r.recordset.length === 200 ? "\n\nA lista foi limitada a 200 processos." : "";
  const assunto = marcos.join(", ");
  const titulo =
    modo === "realizado"
      ? dias <= 1
        ? `Processos com ${assunto} realizado hoje`
        : `Processos com ${assunto} realizado nos últimos ${dias} dias`
      : modo === "hoje"
        ? `Processos com ${assunto} hoje`
        : `Prazos vencidos ou nos próximos ${dias} dias (processos dos últimos 6 meses)`;
  const vazio = modo === "janela" ? "Nenhum prazo nesse recorte." : "Nenhum processo nesse recorte.";
  return consultaPronta(`${titulo}\n${lista(linhas, vazio)}${aviso}`, comando, r.recordset, { dias });
}

async function processosParados(pool, args, recorte) {
  const dias = diasDe(args.dias, 7);
  const comando = `
    SELECT TOP 200
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Ult.Data AS Ultimo
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    OUTER APPLY (
      SELECT MAX(A.Data) AS Data
      FROM mov_Acompanhamento A
      WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
    ) Ult
    WHERE Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Cancelamento IS NULL
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))
      ${filtroModalidadeSql(recorte)}
      AND (Ult.Data IS NULL OR Ult.Data < DATEADD(day, -@dias, GETDATE()))
    ORDER BY CASE WHEN Ult.Data IS NULL THEN 1 ELSE 0 END, Ult.Data`;
  const r = await pool.request().input("dias", sql.Int, dias).query(comando);
  const linhas = r.recordset.map(
    (linha) => `${linha.Numero_Processo} · ${String(linha.Cliente ?? "").trim()} · ${linha.Ultimo ? `último acompanhamento ${dataCurta(linha.Ultimo)}` : "sem acompanhamento"}`,
  );
  const aviso = r.recordset.length === 200 ? "\n\nA lista foi limitada a 200 processos." : "";
  return consultaPronta(
    `Processos abertos nos últimos 6 meses sem acompanhamento há ${dias} dias ou mais\n${lista(linhas, "Nenhum processo parado nesse recorte.")}${aviso}`,
    comando,
    r.recordset.map((linha) => ({
      Numero_Processo: linha.Numero_Processo,
      Cliente: linha.Cliente,
      Ultimo: linha.Ultimo ?? "sem acompanhamento",
    })),
    { dias },
  );
}

const PAPEL_DOCUMENTAL_CE = 7;
const PAPEIS_DOCUMENTAL_IM = "6, 18";

function casoDocumental(valor) {
  return ["ce", "im", "ambos"].includes(valor) ? valor : "ce";
}

function filtroDoCaso(caso) {
  if (caso === "im") return `Pap.IdPapel_Projeto IN (${PAPEIS_DOCUMENTAL_IM}) AND Lhs.Numero_Processo LIKE 'IM%'`;
  if (caso === "ambos") {
    return `(Pap.IdPapel_Projeto = ${PAPEL_DOCUMENTAL_CE} OR (Pap.IdPapel_Projeto IN (${PAPEIS_DOCUMENTAL_IM}) AND Lhs.Numero_Processo LIKE 'IM%'))`;
  }
  return `Pap.IdPapel_Projeto = ${PAPEL_DOCUMENTAL_CE}`;
}

function notaCurta(valor) {
  return String(valor ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function faltaDaAtividade(linha, ceLiberado) {
  const partes = [];
  if (Number(linha.Situacao_Atividade) === 1) partes.push("ainda não iniciada");
  if (!ceLiberado) partes.push("CE ainda não liberado");
  const nota = notaCurta(linha.Observacao);
  if (nota) partes.push(nota);
  if (!partes.length) partes.push("concluir a atividade");
  return partes.join(" · ");
}

function textoCampoLivre(linha) {
  const tipo = Number(linha.Tipo_Valor);
  const bruto = String(linha.Valor ?? "").replace(/\s+/g, " ").trim();
  if (!bruto) return "";
  if (tipo === 3) return bruto === "1" || bruto.toLowerCase() === "true" ? "Sim" : "";
  if (tipo === 4) {
    const mapa = new Map();
    for (const parte of String(linha.Itens ?? "").split(/\r?\n/)) {
      const item = parte.match(/^\s*(\d+)\s*=\s*(.*)$/);
      if (item) mapa.set(item[1], item[2].trim());
    }
    const rotulo = mapa.get(bruto) ?? "";
    return rotulo || (bruto === "0" ? "" : bruto);
  }
  return bruto;
}

async function documentalCe(pool, args) {
  const foco = ["fila", "sem_liberacao", "processo", "campos", "pendencias"].includes(args.foco) ? args.foco : "fila";
  const caso = casoDocumental(args.caso || (foco === "pendencias" ? "ambos" : "ce"));
  if (foco === "fila" || foco === "sem_liberacao" || foco === "pendencias") {
    const comando = `
      SELECT
        Lhs.Numero_Processo,
        Cli.Nome AS Cliente,
        Sta.Descricao AS Situacao,
        Tar.Descricao AS Atividade,
        Res.Nome AS Responsavel,
        Ati.Previsao_Inicio,
        Ati.Previsao_Termino,
        Ati.Situacao AS Situacao_Atividade,
        LEFT(CAST(Ati.Observacao AS nvarchar(300)), 180) AS Observacao,
        CASE WHEN EXISTS (
          SELECT 1
          FROM mov_Projeto_Atividade_Responsavel Ce
          WHERE Ce.IdProjeto_Atividade = Ati.IdProjeto_Atividade
            AND Ce.IdPapel_Projeto = ${PAPEL_DOCUMENTAL_CE}
            AND Ce.IdResponsavel = Ati.IdResponsavel
        ) THEN 'CE' ELSE 'IM' END AS Caso
      FROM mov_Atividade Ati
      JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      LEFT JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
      LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
      LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
      WHERE Ati.Data_Termino IS NULL
        AND Ati.Situacao NOT IN (4, 6)
        AND Lhs.Data_Fechamento_Processo IS NULL
        AND Lhs.Data_Cancelamento IS NULL
        AND Lhs.Numero_Processo LIKE '%-26'
        AND EXISTS (
          SELECT 1
          FROM mov_Projeto_Atividade_Responsavel Pap
          WHERE Pap.IdProjeto_Atividade = Ati.IdProjeto_Atividade
            AND Pap.IdResponsavel = Ati.IdResponsavel
            AND ${filtroDoCaso(caso)}
        )
        AND (@sem = 0 OR ISNULL(Sta.Descricao, '') <> 'CE LIBERADO')
      ORDER BY Lhs.Data_Abertura_Processo DESC, Lhs.Numero_Processo, Tar.Descricao`;
    const sem = foco === "sem_liberacao" ? 1 : 0;
    const r = await pool.request().input("sem", sql.Int, sem).query(comando);
    const titulo =
      foco === "pendencias"
        ? "Pendências do documental CE e do IM"
        : foco === "sem_liberacao"
          ? caso === "im"
            ? "IM ainda sem CE liberado"
            : caso === "ambos"
              ? "CE e IM ainda sem CE liberado"
              : "CE ainda não liberado"
          : caso === "im"
            ? "Atividades com o documental IM"
            : caso === "ambos"
              ? "Atividades do documental CE e do IM"
              : "Atividades com o documental CE";
    const cartoes = r.recordset.map((linha) => {
      const situacao = String(linha.Situacao ?? "").trim();
      const liberado = situacao.toUpperCase() === "CE LIBERADO";
      const ce = liberado ? "CE liberado" : situacao ? `CE não liberado · ${situacao}` : "CE sem situação";
      const previsao = previsaoDe(linha.Previsao_Inicio, linha.Previsao_Termino);
      const marca = linha.Caso === "IM" ? "IM" : "CE";
      const detalhes = [
        String(linha.Cliente ?? "").trim(),
        [`${marca} · ${String(linha.Atividade ?? "Atividade").trim()}`, String(linha.Responsavel ?? "").trim()].filter(Boolean).join(" · "),
        ce,
        previsao,
        foco === "pendencias" ? `Falta: ${faltaDaAtividade(linha, liberado)}` : "",
      ].filter(Boolean);
      return `- **${linha.Numero_Processo}**\n${detalhes.map((item) => `  - ${item}`).join("\n")}`;
    });
    const amostra = cartoes.slice(0, 8);
    const total = cartoes.length;
    const texto = `#### ${titulo}\n\n${amostra.length ? amostra.join("\n") : "Nenhuma atividade nesse recorte."}${total > 8 ? `\n\nMostrei 8 de ${total}. A lista do chat traz até 200.` : ""}`;
    const linhas = r.recordset.slice(0, 200).map((linha) => ({
      Processo: linha.Numero_Processo,
      Cliente: String(linha.Cliente ?? "").trim(),
      Atividade: String(linha.Atividade ?? "").trim(),
      Caso: linha.Caso === "IM" ? "IM" : "CE",
      Responsavel: String(linha.Responsavel ?? "").trim(),
      Situacao: String(linha.Situacao ?? "").trim(),
      Inicio: dataCurta(linha.Previsao_Inicio),
      Termino: dataCurta(linha.Previsao_Termino),
      Falta: foco === "pendencias" ? faltaDaAtividade(linha, String(linha.Situacao ?? "").trim().toUpperCase() === "CE LIBERADO") : "",
    }));
    return consultaPronta(texto, comando, linhas, { sem });
  }

  const numero = numeroDe(args.numero);
  const house = await pool.request().input("n", sql.VarChar(30), numero).query(`
    SELECT TOP 1
      Lhs.IdLogistica_House,
      Lhs.IdProjeto_Atividade,
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Sta.Descricao AS Situacao
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    WHERE Lhs.Numero_Processo = @n`);
  const processo = house.recordset[0];
  if (!processo) return `Processo ${numero} não encontrado.`;

  const atividades = await pool.request().input("id", sql.Int, processo.IdProjeto_Atividade).query(`
    SELECT
      Tar.Descricao AS Atividade,
      Res.Nome AS Responsavel,
      Ati.Previsao_Inicio,
      Ati.Previsao_Termino,
      Ati.Situacao AS Situacao_Atividade,
      LEFT(CAST(Ati.Observacao AS nvarchar(300)), 180) AS Observacao,
      CASE WHEN EXISTS (
        SELECT 1 FROM mov_Projeto_Atividade_Responsavel Ce
        WHERE Ce.IdProjeto_Atividade = Ati.IdProjeto_Atividade
          AND Ce.IdPapel_Projeto = ${PAPEL_DOCUMENTAL_CE}
          AND Ce.IdResponsavel = Ati.IdResponsavel
      ) THEN 'CE' ELSE 'IM' END AS Caso
    FROM mov_Atividade Ati
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
    WHERE Ati.IdProjeto_Atividade = @id
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND EXISTS (
        SELECT 1
        FROM mov_Projeto_Atividade_Responsavel Pap
        WHERE Pap.IdProjeto_Atividade = Ati.IdProjeto_Atividade
          AND Pap.IdResponsavel = Ati.IdResponsavel
          AND Pap.IdPapel_Projeto IN (${PAPEL_DOCUMENTAL_CE}, ${PAPEIS_DOCUMENTAL_IM})
      )
    ORDER BY Tar.Descricao`);
  const envolvidos = await pool.request().input("id", sql.Int, processo.IdProjeto_Atividade).query(`
    SELECT Papel.Nome AS Papel, Pes.Nome AS Nome
    FROM mov_Projeto_Atividade_Responsavel Rel
    JOIN cad_Papel_Projeto Papel ON Papel.IdPapel_Projeto = Rel.IdPapel_Projeto
    JOIN cad_Pessoa Pes ON Pes.IdPessoa = Rel.IdResponsavel
    WHERE Rel.IdProjeto_Atividade = @id
    ORDER BY Papel.Nome, Pes.Nome`);
  const campos = await pool.request().input("id", sql.Int, processo.IdLogistica_House).query(`
    SELECT
      Cfg.Descricao AS Campo,
      Cfg.Tipo_Valor,
      CAST(Cfg.Itens AS nvarchar(max)) AS Itens,
      CASE
        WHEN Cfg.Tipo_Valor = 1 THEN NULLIF(LTRIM(RTRIM(Mcl.Valor_Alfanumerico)), '')
        WHEN Cfg.Tipo_Valor = 2 THEN NULLIF(LTRIM(RTRIM(CAST(Mcl.Valor_Texto AS nvarchar(400)))), '')
        WHEN Cfg.Tipo_Valor = 3 THEN CAST(Mcl.Valor_Boleano AS varchar(10))
        WHEN Cfg.Tipo_Valor = 4 THEN CAST(Mcl.Valor_Tipo_Fixo AS varchar(20))
        WHEN Cfg.Tipo_Valor = 5 THEN CAST(Mcl.Valor_Inteiro AS varchar(20))
        WHEN Cfg.Tipo_Valor = 6 THEN CONVERT(varchar(10), Mcl.Valor_Data, 103)
        WHEN Cfg.Tipo_Valor = 7 THEN CAST(Mcl.Valor_Real4 AS varchar(40))
        ELSE NULLIF(LTRIM(RTRIM(Mcl.Valor_Alfanumerico)), '')
      END AS Valor
    FROM mov_Logistica_Campo_Livre Lcl
    JOIN mov_Campo_Livre Mcl ON Mcl.IdCampo_Livre = Lcl.IdCampo_Livre
    JOIN cad_Configuracao_Campo_Livre Cfg ON Cfg.IdConfiguracao_Campo_Livre = Mcl.IdConfiguracao_Campo_Livre
    WHERE Lcl.IdLogistica_House = @id
    ORDER BY Cfg.Descricao`);
  const preenchidos = campos.recordset
    .map((linha) => {
      const valor = textoCampoLivre(linha);
      return valor ? `- **${String(linha.Campo ?? "Campo").trim()}:** ${valor}` : "";
    })
    .filter(Boolean);
  const situacao = String(processo.Situacao ?? "").trim();
  const ce = situacao.toUpperCase() === "CE LIBERADO" ? "CE liberado" : situacao ? `CE não liberado · ${situacao}` : "CE sem situação informada";
  const papelExato = (nome) => String(nome ?? "").trim().toUpperCase();
  const documental = envolvidos.recordset.filter((linha) => papelExato(linha.Papel) === "DOCUMENTAL [CE]");
  const documentalIm = envolvidos.recordset.filter((linha) => papelExato(linha.Papel) === "DOCUMENTAL");
  const liberado = situacao.toUpperCase() === "CE LIBERADO";
  const blocoAtividades = atividades.recordset.length
    ? atividades.recordset
        .map((linha) => {
          const previsao = previsaoDe(linha.Previsao_Inicio, linha.Previsao_Termino);
          const marca = linha.Caso === "IM" ? "IM" : "CE";
          const detalhes = [String(linha.Responsavel ?? "").trim(), previsao, `Falta: ${faltaDaAtividade(linha, liberado)}`].filter(Boolean);
          return `- **${marca} · ${String(linha.Atividade ?? "Atividade").trim()}**${detalhes.length ? `\n${detalhes.map((item) => `  - ${item}`).join("\n")}` : ""}`;
        })
        .join("\n")
    : "- Nenhuma atividade aberta com o documental CE ou IM.";
  const blocoEnvolvidos = envolvidos.recordset.length
    ? envolvidos.recordset.map((linha) => `- **${String(linha.Papel).trim()}:** ${String(linha.Nome).trim()}`).join("\n")
    : "- Nenhum envolvido cadastrado.";
  const emBranco = campos.recordset
    .filter((linha) => !textoCampoLivre(linha) && String(linha.Campo ?? "").trim())
    .map((linha) => `- ${String(linha.Campo).trim()}`);
  const blocoCampos = preenchidos.length ? preenchidos.join("\n") : "- Nenhum campo livre preenchido.";
  const blocoBranco = emBranco.length ? emBranco.slice(0, 12).join("\n") + (emBranco.length > 12 ? `\n- e mais ${emBranco.length - 12}` : "") : "- Nenhum campo livre em branco.";
  const cabeca = [
    `#### ${processo.Numero_Processo}`,
    "",
    processo.Cliente ? `- **Cliente:** ${String(processo.Cliente).trim()}` : "",
    `- **${ce}**`,
    `- **Documental CE:** ${documental.length ? documental.map((linha) => String(linha.Nome).trim()).join(", ") : "ninguém nesse papel"}`,
    `- **Documental IM:** ${documentalIm.length ? documentalIm.map((linha) => String(linha.Nome).trim()).join(", ") : "ninguém nesse papel"}`,
  ].filter((item) => item !== undefined);
  if (foco === "campos") {
    return juntar([...cabeca, "", "#### Campos livres", "", blocoCampos, "", "#### Campos livres em branco", "", blocoBranco]);
  }
  return juntar([
    ...cabeca,
    "",
    "#### Atividades",
    "",
    blocoAtividades,
    "",
    "#### Envolvidos",
    "",
    blocoEnvolvidos,
    "",
    "#### Campos livres",
    "",
    blocoCampos,
    "",
    "#### Campos livres em branco",
    "",
    blocoBranco,
  ]);
}

const PAPEIS_PENDENCIA = {
  operacional: "2, 16, 17",
  inside: "12",
  comercial: "3, 9",
};

async function atividadesPendentes(pool, args, recorte) {
  const setor = ["operacional", "inside", "comercial"].includes(args.setor) ? args.setor : "operacional";
  const faixa = setor === "operacional" && recorte?.modalidade ? ` ${recorte.modalidade}` : "";
  const titulo = setor === "inside" ? "Pendências do inside" : setor === "comercial" ? "Pendências do comercial" : `Pendências do operacional${faixa}`;
  const comando = `
    SELECT
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Tar.Descricao AS Atividade,
      Res.Nome AS Responsavel,
      Pap.Nome AS Papel,
      Ati.Previsao_Inicio,
      Ati.Previsao_Termino,
      LEFT(CAST(Ati.Observacao AS nvarchar(300)), 180) AS Motivo
    FROM mov_Atividade Ati
    JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    CROSS APPLY (
      SELECT TOP 1 P.Nome
      FROM mov_Projeto_Atividade_Responsavel Rel
      JOIN cad_Papel_Projeto P ON P.IdPapel_Projeto = Rel.IdPapel_Projeto
      WHERE Rel.IdProjeto_Atividade = Ati.IdProjeto_Atividade
        AND Rel.IdResponsavel = Ati.IdResponsavel
        AND Rel.IdPapel_Projeto IN (${PAPEIS_PENDENCIA[setor]})
      ORDER BY Rel.IdPapel_Projeto
    ) Pap
    WHERE Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Cancelamento IS NULL
      AND Lhs.Numero_Processo LIKE '%-26'
      ${setor === "operacional" ? filtroModalidadeSql(recorte) : ""}
    ORDER BY Lhs.Data_Abertura_Processo DESC, Lhs.Numero_Processo, Tar.Descricao`;
  const r = await pool.request().query(comando);
  const cartoes = r.recordset.map((linha) => {
    const previsao = previsaoDe(linha.Previsao_Inicio, linha.Previsao_Termino);
    const motivo = notaCurta(linha.Motivo) || "Motivo não informado";
    const detalhes = [
      String(linha.Cliente ?? "").trim(),
      [String(linha.Papel ?? "").trim(), String(linha.Atividade ?? "Atividade").trim(), String(linha.Responsavel ?? "").trim()].filter(Boolean).join(" · "),
      previsao,
      `Motivo: ${motivo}`,
    ].filter(Boolean);
    return `- **${linha.Numero_Processo}**\n${detalhes.map((item) => `  - ${item}`).join("\n")}`;
  });
  const amostra = cartoes.slice(0, 8);
  const total = cartoes.length;
  const texto = `#### ${titulo}\n\n${amostra.length ? amostra.join("\n") : "Nenhuma atividade pendente em 2026."}${total > 8 ? `\n\nMostrei 8 de ${total}. A lista do chat traz até 200.` : ""}`;
  const linhas = r.recordset.slice(0, 200).map((linha) => ({
    Processo: linha.Numero_Processo,
    Cliente: String(linha.Cliente ?? "").trim(),
    Papel: String(linha.Papel ?? "").trim(),
    Atividade: String(linha.Atividade ?? "").trim(),
    Responsavel: String(linha.Responsavel ?? "").trim(),
    Inicio: dataCurta(linha.Previsao_Inicio),
    Termino: dataCurta(linha.Previsao_Termino),
    Motivo: notaCurta(linha.Motivo) || "Motivo não informado",
  }));
  return consultaPronta(texto, comando, linhas);
}

function diasDaViagem(previsto, realizado) {
  if (!previsto || !realizado) return null;
  const a = previsto instanceof Date ? previsto : new Date(previsto);
  const b = realizado instanceof Date ? realizado : new Date(realizado);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const inicio = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const fim = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((fim - inicio) / 86_400_000);
}

function fraseDaViagem(evento, dias) {
  if (!dias) return "";
  const quantidade = Math.abs(dias);
  const unidade = quantidade === 1 ? "dia" : "dias";
  return dias < 0 ? `${evento} antecipado em ${quantidade} ${unidade}` : `${evento} atrasado em ${quantidade} ${unidade}`;
}

function diasDeDivergencia(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.min(120, Math.max(7, Math.round(n)));
}

async function divergenciasViagem(pool, args, recorte) {
  if (recorte?.semOperacional) return "Divergência de desembarque é informação do operacional.";
  const dias = diasDeDivergencia(args.dias);
  const faixa = recorte?.modalidade ? ` ${recorte.modalidade}` : "";
  const comando = `
    SELECT
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Lms.Data_Previsao_Embarque,
      Lms.Data_Embarque,
      Lms.Data_Previsao_Desembarque,
      Lms.Data_Desembarque,
      DATEDIFF(day, CAST(Lms.Data_Previsao_Desembarque AS date), CAST(Lms.Data_Desembarque AS date)) AS Dias
    FROM mov_Logistica_House Lhs
    JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    WHERE Lhs.Numero_Processo LIKE '%-26'
      ${filtroModalidadeSql(recorte)}
      AND Lms.Data_Previsao_Desembarque IS NOT NULL
      AND Lms.Data_Desembarque IS NOT NULL
      AND ABS(DATEDIFF(day, CAST(Lms.Data_Previsao_Desembarque AS date), CAST(Lms.Data_Desembarque AS date))) >= @dias
    ORDER BY ABS(DATEDIFF(day, CAST(Lms.Data_Previsao_Desembarque AS date), CAST(Lms.Data_Desembarque AS date))) DESC, Lhs.Numero_Processo`;
  const r = await pool.request().input("dias", sql.Int, dias).query(comando);
  const cartoes = r.recordset.map((linha) => {
    const embarque = diasDaViagem(linha.Data_Previsao_Embarque, linha.Data_Embarque);
    const detalhe = [fraseDaViagem("Desembarque", Number(linha.Dias) || 0), embarque != null && Math.abs(embarque) >= dias ? fraseDaViagem("Embarque", embarque) : ""]
      .filter(Boolean)
      .join(" / ");
    const partes = [
      String(linha.Cliente ?? "").trim(),
      `Previsto ${dataCurta(linha.Data_Previsao_Desembarque)} · Real ${dataCurta(linha.Data_Desembarque)}`,
      detalhe,
    ].filter(Boolean);
    return `- **${linha.Numero_Processo}**\n${partes.map((item) => `  - ${item}`).join("\n")}`;
  });
  const amostra = cartoes.slice(0, 8);
  const resto = cartoes.length - amostra.length;
  const texto = `#### Divergências de desembarque${faixa}\n\nProcessos${faixa} de 2026 em que o desembarque real difere ${dias} dias ou mais da previsão.\n\n${amostra.length ? amostra.join("\n") : `Nenhuma divergência grande de desembarque${faixa} em 2026.`}${resto > 0 ? `\n\nMais ${resto} na lista completa, em Ver tudo no chat.` : ""}`;
  const linhas = r.recordset.map((linha) => {
    const embarque = diasDaViagem(linha.Data_Previsao_Embarque, linha.Data_Embarque);
    const detalhe = [fraseDaViagem("Desembarque", Number(linha.Dias) || 0), embarque != null && Math.abs(embarque) >= dias ? fraseDaViagem("Embarque", embarque) : ""]
      .filter(Boolean)
      .join(" / ");
    return {
      Numero_Processo: linha.Numero_Processo,
      Cliente: String(linha.Cliente ?? "").trim(),
      Data_Previsao_Embarque: dataCurta(linha.Data_Previsao_Embarque),
      Data_Embarque: dataCurta(linha.Data_Embarque),
      Data_Previsao_Desembarque: dataCurta(linha.Data_Previsao_Desembarque),
      Data_Desembarque: dataCurta(linha.Data_Desembarque),
      Detalhe: detalhe,
    };
  });
  return consultaPronta(texto, comando, linhas, { dias });
}

async function filaSetor(pool, recorte) {
  if (recorte?.visao !== "tudo" && recorte?.visao !== "gerencia") return "A fila dos setores aparece só na visão de todos os setores e na gerência.";
  const r = await pool.request().query(`
    SELECT
      SUM(CASE WHEN Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Cancelamento IS NULL THEN 1 ELSE 0 END) AS Abertos,
      SUM(CASE WHEN Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Cancelamento IS NULL AND Lhs.IdOferta_Frete IS NULL THEN 1 ELSE 0 END) AS Sem_Proposta
    FROM mov_Logistica_House Lhs
    WHERE Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`);
  const atrasadas = await pool.request().query(`
    SELECT COUNT(*) AS Total
    FROM mov_Atividade Ati
    WHERE Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND Ati.Previsao_Termino IS NOT NULL
      AND CAST(Ati.Previsao_Termino AS date) < CAST(GETDATE() AS date)
      AND Ati.Previsao_Termino >= DATEADD(month, -6, CAST(GETDATE() AS date))`);
  const parados = await pool.request().query(`
    SELECT COUNT(*) AS Total
    FROM mov_Logistica_House Lhs
    OUTER APPLY (
      SELECT MAX(A.Data) AS Data
      FROM mov_Acompanhamento A
      WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
    ) Ult
    WHERE Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Cancelamento IS NULL
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))
      AND (Ult.Data IS NULL OR Ult.Data < DATEADD(day, -7, GETDATE()))`);
  const prazosVencidos = await pool.request().query(`
    SELECT COUNT(*) AS Total
    FROM mov_Logistica_House Lhs
    LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    WHERE Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Cancelamento IS NULL
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))
      AND (
        (Lms.Data_Embarque IS NULL AND Lms.Data_Previsao_Embarque < CAST(GETDATE() AS date))
        OR (Lms.Data_Desembarque IS NULL AND Lms.Data_Previsao_Desembarque < CAST(GETDATE() AS date))
        OR (Lhs.Data_Entrega IS NULL AND Lhs.Data_Previsao_Entrega < CAST(GETDATE() AS date))
      )`);
  const casa = r.recordset[0] ?? {};
  const linhas = [
    { Medida: "Processos abertos", Total: Number(casa.Abertos) || 0 },
    { Medida: "Sem proposta", Total: Number(casa.Sem_Proposta) || 0 },
    { Medida: "Atividades atrasadas", Total: Number(atrasadas.recordset[0]?.Total) || 0 },
    { Medida: "Sem acompanhamento há 7 dias", Total: Number(parados.recordset[0]?.Total) || 0 },
    { Medida: "Prazo vencido", Total: Number(prazosVencidos.recordset[0]?.Total) || 0 },
  ];
  const texto = [
    "Fila dos últimos 6 meses",
    ...linhas.map((linha) => `${linha.Medida}: ${linha.Total}`),
  ].join("\n");
  return consultaPronta(texto, "", linhas);
}

function horasDe(valor, padrao) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return padrao;
  return Math.min(168, Math.round(n));
}

function tipoLog(valor) {
  const n = Number(valor);
  if (n === 1) return "inclusão";
  if (n === 2) return "exclusão";
  if (n === 3) return "atualização";
  return "operação";
}

function soTi(recorte) {
  if (recorte?.visao === "ti") return "";
  return "Essa consulta é exclusiva da aba TI.";
}

async function painelTi(pool, args, ctx) {
  const bloqueio = soTi(ctx.recorte);
  if (bloqueio) return bloqueio;
  const horas = horasDe(args.horas, 24);
  const banco = await pool.request().query("SELECT DB_NAME() AS Banco");
  const totais = await pool.request().input("horas", sql.Int, horas).query(`
    SELECT COUNT(*) AS Transacoes, COUNT(DISTINCT Ltb.IdUsuario) AS Usuarios
    FROM sys_Log_Tabela Ltb
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())`);
  const pessoas = await pool.request().input("horas", sql.Int, horas).query(`
    SELECT TOP 8 Usr.Nome, COUNT(*) AS Transacoes
    FROM sys_Log_Tabela Ltb
    JOIN sys_Usuario Usr ON Usr.IdUsuario = Ltb.IdUsuario
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())
    GROUP BY Usr.Nome
    ORDER BY COUNT(*) DESC`);
  const tipos = await pool.request().input("horas", sql.Int, horas).query(`
    SELECT
      SUM(CASE WHEN Tab.Tipo = 1 THEN 1 ELSE 0 END) AS Inclusoes,
      SUM(CASE WHEN Tab.Tipo = 2 THEN 1 ELSE 0 END) AS Exclusoes,
      SUM(CASE WHEN Tab.Tipo = 3 THEN 1 ELSE 0 END) AS Atualizacoes
    FROM sys_Log_Tabela Ltb
    CROSS APPLY Ltb.Dados_Log.nodes('/Log/Tabela[1]') T(N)
    CROSS APPLY (SELECT N.value('@Tipo', 'smallint') AS Tipo) Tab
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())`);
  const tabelas = await pool.request().input("horas", sql.Int, horas).query(`
    SELECT TOP 8 Tab.Tabela, COUNT(*) AS Qtd
    FROM sys_Log_Tabela Ltb
    CROSS APPLY Ltb.Dados_Log.nodes('/Log/Tabela[1]') T(N)
    CROSS APPLY (SELECT N.value('@Nome', 'varchar(128)') AS Tabela) Tab
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())
    GROUP BY Tab.Tabela
    ORDER BY COUNT(*) DESC`);
  const casa = totais.recordset[0] ?? {};
  const tipo = tipos.recordset[0] ?? {};
  const nomesPainel = await pessoasPorLogin(pool, pessoas.recordset.map((linha) => linha.Nome));
  const painel = {
    titulo: `Painel do TI — últimas ${horas} horas`,
    sub: "Atividade de gravação no banco de dados",
    banco: String(banco.recordset[0]?.Banco ?? "").trim() || "conectado",
    transacoes: Number(casa.Transacoes) || 0,
    usuarios: Number(casa.Usuarios) || 0,
    amostra: 0,
    chips: [
      { valor: Number(tipo.Inclusoes) || 0, rotulo: "inclusões" },
      { valor: Number(tipo.Exclusoes) || 0, rotulo: "exclusões" },
      { valor: Number(tipo.Atualizacoes) || 0, rotulo: "atualizações" },
    ],
    rankings: [
      {
        titulo: "Quem mais gravou",
        itens: pessoas.recordset.map((linha) => ({ nome: nomeDe(nomesPainel, linha.Nome), valor: Number(linha.Transacoes) || 0 })),
      },
      {
        titulo: "Tabelas mais alteradas",
        itens: tabelas.recordset.map((linha) => ({ nome: String(linha.Tabela ?? "").trim(), valor: Number(linha.Qtd) || 0 })),
      },
    ].filter((grupo) => grupo.itens.length),
  };
  return "```painel\n" + JSON.stringify(painel) + "\n```";
}

async function usuariosDoTermo(pool, termo) {
  const texto = String(termo ?? "").trim();
  if (!/^[\p{L}0-9._ -]{2,60}$/u.test(texto)) return [];
  const variantes = [...new Set([texto, texto.replace(/\s+/g, ".")])];
  const pedido = pool.request();
  const partes = variantes.map((item, indice) => {
    pedido.input(`exato${indice}`, sql.VarChar(120), item);
    pedido.input(`like${indice}`, sql.VarChar(140), `%${item.replace(/[%_[\]]/g, "")}%`);
    return `(Nome = @exato${indice} OR Nome LIKE @like${indice})`;
  });
  const linhas = (
    await pedido.query(`
      SELECT TOP 8 IdUsuario, Nome
      FROM sys_Usuario
      WHERE ${partes.join(" OR ")}
      ORDER BY CASE WHEN Nome = @exato0 THEN 0 ELSE 1 END, Nome`)
  ).recordset;
  const exato = linhas.find((linha) => String(linha.Nome).toLowerCase() === texto.toLowerCase());
  if (exato && /[.\s]/.test(texto)) return [exato];
  return linhas;
}

function perguntaQualUsuario(termo, linhas, hoje) {
  const lista = linhas.map((linha) => `- ${String(linha.Nome).trim()}`).join("\n");
  const quando = hoje ? " de hoje" : "";
  return `Encontrei ${linhas.length} usuários com "${termo}" no login:\n\n${lista}\n\nQual deles você quer ver o histórico${quando}?`;
}

async function logRecente(pool, args, ctx) {
  const bloqueio = soTi(ctx.recorte);
  if (bloqueio) return bloqueio;
  const horas = horasDe(args.horas, 24);
  const tipo = [1, 2, 3].includes(Number(args.tipo)) ? Number(args.tipo) : 0;
  const tabela = String(args.tabela ?? "").trim();
  const hoje = args.hoje === true || String(args.hoje ?? "") === "true" || String(args.periodo ?? "") === "hoje";
  const termoUsuario = String(args.usuario ?? "").trim();
  if (tabela && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(tabela)) throw new Error("Tabela inválida.");
  const limite = Math.min(40, Math.max(5, Number(args.limite) || 20));
  let idUsuario = 0;
  let exibicao = "";
  if (termoUsuario) {
    const encontrados = await usuariosDoTermo(pool, termoUsuario);
    if (!encontrados.length) return `Não encontrei usuário com "${termoUsuario}" no login.`;
    if (encontrados.length > 1) return perguntaQualUsuario(termoUsuario, encontrados, hoje);
    idUsuario = Number(encontrados[0].IdUsuario) || 0;
    const login = String(encontrados[0].Nome).trim();
    const nomesUsuario = await pessoasPorLogin(pool, [login]);
    exibicao = nomeDe(nomesUsuario, login) || login;
  }
  const filtroData = hoje
    ? "Data_Inicio >= CAST(GETDATE() AS date) AND Data_Inicio < DATEADD(day, 1, CAST(GETDATE() AS date))"
    : "Data_Inicio >= DATEADD(hour, -@horas, GETDATE())";
  const total = Number(
    (
      await pool
        .request()
        .input("horas", sql.Int, horas)
        .input("tipo", sql.SmallInt, tipo)
        .input("tabela", sql.VarChar(128), tabela)
        .input("idUsuario", sql.Int, idUsuario)
        .query(`
          SELECT COUNT(*) AS Total
          FROM sys_Log_Tabela Ltb
          CROSS APPLY Ltb.Dados_Log.nodes('/Log/Tabela[1]') T(N)
          CROSS APPLY (SELECT N.value('@Tipo', 'smallint') AS Tipo, N.value('@Nome', 'varchar(128)') AS Tabela) Tab
          WHERE ${filtroData.replaceAll("Data_Inicio", "Ltb.Data_Inicio")}
            AND (@tipo = 0 OR Tab.Tipo = @tipo)
            AND (@tabela = '' OR Tab.Tabela = @tabela)
            AND (@idUsuario = 0 OR Ltb.IdUsuario = @idUsuario)`)
    ).recordset[0]?.Total,
  ) || 0;
  const comando = `
    SELECT TOP (@limite)
      Usr.Nome AS Usuario,
      Recente.Data_Inicio,
      Tab.Tabela,
      Tab.Tipo,
      Tab.CamposXml,
      Atr.Computador,
      Atr.WindowsUser
    FROM sys_Log_Tabela Recente
    JOIN sys_Usuario Usr ON Usr.IdUsuario = Recente.IdUsuario
    CROSS APPLY Recente.Dados_Log.nodes('/Log') L(LogNode)
    CROSS APPLY Recente.Dados_Log.nodes('/Log/Tabela[1]') T(TabNode)
    CROSS APPLY (
      SELECT
        LogNode.value('@ComputerName', 'varchar(80)') AS Computador,
        LogNode.value('@WindowsUser', 'varchar(80)') AS WindowsUser
    ) Atr
    CROSS APPLY (
      SELECT
        TabNode.value('@Nome', 'varchar(128)') AS Tabela,
        TabNode.value('@Tipo', 'smallint') AS Tipo,
        CONVERT(nvarchar(max), TabNode.query('Campo')) AS CamposXml
    ) Tab
    WHERE ${filtroData.replaceAll("Data_Inicio", "Recente.Data_Inicio")}
      AND (@tipo = 0 OR Tab.Tipo = @tipo)
      AND (@tabela = '' OR Tab.Tabela = @tabela)
      AND (@idUsuario = 0 OR Recente.IdUsuario = @idUsuario)
    ORDER BY Recente.Data_Inicio DESC`;
  const r = await pool
    .request()
    .input("horas", sql.Int, horas)
    .input("tipo", sql.SmallInt, tipo)
    .input("tabela", sql.VarChar(128), tabela)
    .input("idUsuario", sql.Int, idUsuario)
    .input("limite", sql.Int, limite)
    .query(comando);
  const classe = (n) => (Number(n) === 2 ? "del" : Number(n) === 3 ? "upd" : "add");
  const eventosRecentes = r.recordset.map((linha) => ({
    usuario: linha.Usuario,
    data: linha.Data_Inicio,
    tipo: Number(linha.Tipo) || 0,
    campos: parseCamposXml(linha.CamposXml),
    tabela: linha.Tabela,
    windows: linha.WindowsUser,
    computador: linha.Computador,
  }));
  await enriquecerNomes(pool, eventosRecentes, null);
  const nomesRecentes = await pessoasPorLogin(pool, eventosRecentes.map((evento) => evento.usuario));
  const textoRecente = (campo, qual) => {
    const exibicao = qual === "antes" ? campo.valorAnteriorExibicao : campo.valorExibicao;
    const valor = qual === "antes" ? campo.valorAnterior : campo.valor;
    if (exibicao) return String(exibicao);
    if (campo.nome === "Valor_Boleano") {
      if (String(valor) === "1") return "Sim";
      if (String(valor) === "0") return "Não";
    }
    return String(valor ?? "");
  };
  const itens = eventosRecentes.map((evento) => {
    const momento = relogioLog(evento.data);
    const tipoItem = classe(evento.tipo);
    const mudancas = (evento.campos ?? [])
      .filter((campo) => campo.nome && !/^Id[A-Za-z0-9_]*$/.test(campo.nome) && !/^(xml|Dados_Registro|Hash)$/i.test(campo.nome))
      .filter((campo) => tipoItem === "add" || campo.valorAnterior != null)
      .filter((campo) => textoRecente(campo, "antes").trim() !== textoRecente(campo, "agora").trim())
      .slice(0, 6)
      .map((campo) => ({
        campo: String(campo.nome).replace(/^Id(?=[A-Z])/, "").replaceAll("_", " "),
        de: encurtar(textoRecente(campo, "antes").replace(/\s+/g, " ").trim(), 80),
        para: encurtar(textoRecente(campo, "agora").replace(/\s+/g, " ").trim(), 80),
      }));
    return {
      hora: momento.hora,
      dia: momento.dia,
      tabela: String(evento.tabela ?? "").trim(),
      tipo: tipoItem,
      rotulo: tipoLog(evento.tipo),
      quem: nomeDe(nomesRecentes, evento.usuario),
      windows: String(evento.windows ?? "").trim(),
      computador: String(evento.computador ?? "").trim(),
      mudancas,
    };
  });
  const quando = hoje ? "Hoje" : `Últimas ${horas} horas`;
  const filtro = [quando, tipo ? tipoLog(tipo) : "", tabela ? `tabela ${tabela}` : "", exibicao].filter(Boolean).join(" · ");
  const dia = itens[0]?.dia || "";
  if (!itens.length && exibicao) {
    return consultaPronta(`Nenhuma alteração de ${exibicao} ${hoje ? "hoje" : `nas últimas ${horas} horas`}.`, comando, [], { horas, tipo, tabela, limite, idUsuario });
  }
  const log = {
    titulo: exibicao ? `Log de ${exibicao}` : "Log recente",
    sub: [filtro, dia].filter(Boolean).join(" · "),
    itens,
    total,
    aviso: total > itens.length ? `Mostrei ${itens.length} de ${total}. O total do período é ${total}.` : "",
  };
  const linhasSemXml = r.recordset.map(({ CamposXml, ...resto }) => resto);
  return consultaPronta("```log\n" + JSON.stringify(log) + "\n```", comando, linhasSemXml, { horas, tipo, tabela, limite });
}

const CAMPOS_SIM_NAO = new Set([
  "Ativo",
  "Ao_Inserir",
  "Ao_Excluir",
  "Ao_Atualizar",
  "Geracao_Atividades",
  "Geracao_Atividade",
]);

function textoXml(valor) {
  return String(valor ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function valorCampo(campos, nome) {
  const item = campos.find((campo) => campo.nome === nome);
  return item ? textoXml(item.valor) : "";
}

function idPositivo(texto) {
  const n = Number(texto);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function simOuNao(nome, valor) {
  if (!CAMPOS_SIM_NAO.has(nome)) return valor || "(vazio)";
  if (valor === "1" || valor.toLowerCase() === "true") return "sim";
  if (valor === "0" || valor.toLowerCase() === "false") return "não";
  return valor || "(vazio)";
}

function decodificarXml(valor) {
  return textoXml(valor)
    .replaceAll("&#x0D;", "\n")
    .replaceAll("&#x0A;", "\n")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hexa) => String.fromCodePoint(parseInt(hexa, 16)))
    .replace(/&#(\d+);/g, (_, numero) => String.fromCodePoint(Number(numero)));
}

function camposDoComando(texto) {
  const comando = decodificarXml(texto);
  const corpo = comando.match(/<CommandText>([\s\S]*?)<\/CommandText>/i)?.[1] || comando;
  const nomes = new Set();
  for (const bloco of corpo.matchAll(/\bin\s*\(([^)]*)\)/gi)) {
    for (const achado of bloco[1].matchAll(/'([A-Za-z_][A-Za-z0-9_]*)'/g)) nomes.add(achado[1]);
  }
  return [...nomes];
}

function encurtar(texto, limite = 64) {
  const limpo = String(texto ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 1).trim()}…`;
}

function nomeMonitor(descricao) {
  return encurtar(
    String(descricao ?? "")
      .trim()
      .replace(/^T[A-Za-z0-9]+\s*-\s*/, ""),
    64,
  );
}

function nomePessoa(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return "usuário";
  return nomeProprio(texto);
}

function celula(valor) {
  const texto = String(valor ?? "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim();
  return texto || "—";
}

function tabelaMarkdown(colunas, linhas) {
  const cabeca = `| ${colunas.join(" | ")} |`;
  const traco = `| ${colunas.map(() => "---").join(" | ")} |`;
  const corpo = linhas.map((linha) => `| ${colunas.map((coluna) => celula(linha[coluna])).join(" | ")} |`);
  return [cabeca, traco, ...corpo].join("\n");
}

function camposMonitorados(campos, comandoAtual) {
  const registro = campos.find((item) => item.nome === "Dados_Registro" || item.nome === "xml");
  const atual = registro ? camposDoComando(registro.valor) : [];
  if (atual.length) return atual.join(", ");
  const anterior = registro?.valorAnterior != null ? camposDoComando(registro.valorAnterior) : [];
  if (anterior.length) return anterior.join(", ");
  return camposDoComando(comandoAtual).join(", ");
}

function diffCurto(antes, depois) {
  if (depois.startsWith(antes) && depois.length > antes.length) return `acrescentou "${depois.slice(antes.length).trim()}"`;
  if (antes.startsWith(depois) && antes.length > depois.length) return `removeu "${antes.slice(depois.length).trim()}"`;
  const corte = (texto) => (texto.length > 50 ? `${texto.slice(0, 47)}...` : texto);
  return `${corte(antes)} → ${corte(depois)}`;
}

function alteracaoDaLinha(campos) {
  const partes = [];
  for (const item of campos) {
    if (item.nome === "Descricao") {
      const antes = textoXml(item.valorAnterior);
      const depois = textoXml(item.valor);
      if (antes && antes !== depois) partes.push(`Descrição ${diffCurto(antes, depois)}`);
      continue;
    }
    if (item.nome === "Dados_Registro" || item.nome === "xml") {
      const antes = item.valorAnterior != null ? decodificarXml(item.valorAnterior) : "";
      const depois = decodificarXml(item.valor);
      if (antes && depois && antes !== depois) partes.push("Comando");
      continue;
    }
    if (!["Classe", "Ativo", "Ao_Inserir", "Ao_Excluir", "Ao_Atualizar", "Geracao_Atividades", "Geracao_Atividade"].includes(item.nome)) {
      continue;
    }
    const antes = item.valorAnterior != null ? textoXml(item.valorAnterior) : "";
    const depois = textoXml(item.valor);
    if (antes && antes !== depois) {
      partes.push(`${item.nome.replaceAll("_", " ")}: ${simOuNao(item.nome, antes)} → ${simOuNao(item.nome, depois)}`);
    }
  }
  return partes.join("; ");
}

async function mapaPorIds(pool, ids, comando, coluna) {
  const unicos = [...new Set(ids.filter((id) => id > 0))].slice(0, 80);
  if (!unicos.length) return new Map();
  const request = pool.request();
  const marcas = unicos.map((id, indice) => {
    request.input(`id${indice}`, sql.Int, id);
    return `@id${indice}`;
  });
  const r = await request.query(comando.replace("/*IDS*/", marcas.join(", ")));
  return new Map(r.recordset.map((linha) => [Number(linha[coluna]), linha]));
}

async function monitoramentosAlterados(pool, args, ctx) {
  const bloqueio = soTi(ctx.recorte);
  if (bloqueio) return bloqueio;
  const dias = diasDe(args.dias, 7);
  const limite = Math.min(12, Math.max(5, Number(args.limite) || 8));
  const comando = `
    SELECT TOP 80
      Usr.Nome AS Usuario,
      Recente.Data_Inicio,
      Tab.Tabela,
      Tab.Tipo,
      CONVERT(nvarchar(max), MonitorNode.query('<Campos>{Campo}</Campos>')) AS Campos
    FROM (
      SELECT TOP 400 IdUsuario, Data_Inicio, Dados_Log
      FROM sys_Log_Tabela
      WHERE Data_Inicio >= DATEADD(day, -@dias, GETDATE())
        AND (
          Dados_Log.exist('/Log/Tabela[@Nome="cad_Projeto_Tarefa_Monitor"]') = 1
          OR Dados_Log.exist('/Log/Tabela[@Nome="cad_Tarefa_Monitor"]') = 1
        )
      ORDER BY Data_Inicio DESC
    ) Recente
    JOIN sys_Usuario Usr ON Usr.IdUsuario = Recente.IdUsuario
    CROSS APPLY Recente.Dados_Log.nodes('/Log/Tabela') T(MonitorNode)
    CROSS APPLY (
      SELECT
        MonitorNode.value('@Nome', 'varchar(128)') AS Tabela,
        MonitorNode.value('@Tipo', 'smallint') AS Tipo
    ) Tab
    WHERE Tab.Tabela IN ('cad_Projeto_Tarefa_Monitor', 'cad_Tarefa_Monitor')
    ORDER BY Recente.Data_Inicio DESC`;
  const r = await pool.request().input("dias", sql.Int, dias).query(comando);
  const eventos = r.recordset.map((linha) => ({
    ...linha,
    campos: parseCamposXml(linha.Campos),
  }));
  const projetos = await mapaPorIds(
    pool,
    eventos.map((linha) => idPositivo(valorCampo(linha.campos, "IdProjeto_Tarefa_Monitor"))),
    `SELECT
       M.IdProjeto_Tarefa_Monitor,
       M.Descricao,
       P.Codigo,
       P.Nome AS Projeto,
       M.Dados_Registro.value('(Dados_Registro/Monitoramento/CommandText)[1]', 'nvarchar(max)') AS CommandText
     FROM cad_Projeto_Tarefa_Monitor M
     LEFT JOIN cad_Projeto_Tarefa P ON P.IdProjeto_Tarefa = M.IdProjeto_Tarefa
     WHERE M.IdProjeto_Tarefa_Monitor IN (/*IDS*/)`,
    "IdProjeto_Tarefa_Monitor",
  );
  const projetosPeloCodigo = await mapaPorIds(
    pool,
    eventos
      .filter((linha) => linha.Tabela === "cad_Projeto_Tarefa_Monitor")
      .map((linha) => idPositivo(valorCampo(linha.campos, "IdProjeto_Tarefa"))),
    `SELECT IdProjeto_Tarefa, Codigo, Nome AS Projeto
     FROM cad_Projeto_Tarefa
     WHERE IdProjeto_Tarefa IN (/*IDS*/)`,
    "IdProjeto_Tarefa",
  );
  const tarefas = await mapaPorIds(
    pool,
    eventos
      .filter((linha) => linha.Tabela === "cad_Tarefa_Monitor")
      .map((linha) => idPositivo(valorCampo(linha.campos, "IdTarefa"))),
    `SELECT IdTarefa, Codigo, Descricao AS Atividade
     FROM cad_Tarefa
     WHERE IdTarefa IN (/*IDS*/)`,
    "IdTarefa",
  );

  const doProjeto = [];
  const daAtividade = [];
  const nomesMonitor = await pessoasPorLogin(pool, eventos.map((linha) => linha.Usuario));
  for (const linha of eventos) {
    const quando = dataCurta(linha.Data_Inicio);
    const usuario = nomeDe(nomesMonitor, linha.Usuario);
    const operacao = tipoLog(linha.Tipo);
    if (linha.Tabela === "cad_Projeto_Tarefa_Monitor" && doProjeto.length < limite) {
      const atual = projetos.get(idPositivo(valorCampo(linha.campos, "IdProjeto_Tarefa_Monitor")));
      const peloProjeto = projetosPeloCodigo.get(idPositivo(valorCampo(linha.campos, "IdProjeto_Tarefa")));
      const projeto = String(atual?.Projeto || peloProjeto?.Projeto || "").trim();
      const codigo = String(atual?.Codigo || peloProjeto?.Codigo || "").trim();
      const descricao = String(atual?.Descricao || valorCampo(linha.campos, "Descricao") || "").trim();
      doProjeto.push({
        Data: quando,
        Quem: nomePessoa(usuario),
        Ação: operacao.charAt(0).toUpperCase() + operacao.slice(1),
        Projeto: [codigo, projeto].filter(Boolean).join(" "),
        Monitor: nomeMonitor(descricao),
        Campo: camposMonitorados(linha.campos, atual?.CommandText),
        Alteração: alteracaoDaLinha(linha.campos),
      });
    }
    if (linha.Tabela === "cad_Tarefa_Monitor" && daAtividade.length < limite) {
      const tarefa = tarefas.get(idPositivo(valorCampo(linha.campos, "IdTarefa")));
      const monitor = projetos.get(idPositivo(valorCampo(linha.campos, "IdProjeto_Tarefa_Monitor")));
      const atividade = String(tarefa?.Atividade ?? "").trim();
      const codigoTarefa = String(tarefa?.Codigo ?? "").trim();
      const projeto = String(monitor?.Projeto ?? "").trim();
      const codigoProjeto = String(monitor?.Codigo ?? "").trim();
      daAtividade.push({
        Data: quando,
        Quem: nomePessoa(usuario),
        Ação: operacao.charAt(0).toUpperCase() + operacao.slice(1),
        Atividade: encurtar([codigoTarefa, atividade].filter(Boolean).join(" "), 48),
        Projeto: [codigoProjeto, projeto].filter(Boolean).join(" "),
        Monitor: nomeMonitor(monitor?.Descricao),
        Campo: camposMonitorados(linha.campos, monitor?.CommandText),
      });
    }
  }

  const colunasProjeto = ["Data", "Quem", "Ação", "Projeto", "Monitor", "Campo", "Alteração"];
  const colunasAtividade = ["Data", "Quem", "Ação", "Atividade", "Projeto", "Monitor", "Campo"];
  const texto = juntar([
    `Monitoramentos alterados — últimos ${dias} dias`,
    doProjeto.length ? `Projeto de tarefas\n${tabelaMarkdown(colunasProjeto, doProjeto)}` : "Projeto de tarefas: nenhuma alteração nesse período.",
    daAtividade.length ? `Atividade\n${tabelaMarkdown(colunasAtividade, daAtividade)}` : "Atividade: nenhuma alteração nesse período.",
  ]);
  return consultaPronta(texto, comando, [...doProjeto, ...daAtividade], { dias });
}

async function taxasProcesso(pool, args) {
  const numero = String(args.numero ?? "").trim().toUpperCase();
  if (!numero) throw new Error("Informe o número do processo.");
  const house = await houseDoProcesso(pool, numero);
  if (!house) return `Processo ${numero} não encontrado.`;
  const comando = `
    SELECT
      Exb.Nome AS Taxa,
      Tax.Valor_Pagamento_Total AS Pagamento,
      Tax.Valor_Recebimento_Total AS Recebimento
    FROM mov_Logistica_Taxa Tax
    LEFT JOIN cad_Taxa_Logistica_Exibicao Exb ON Exb.IdTaxa_Logistica_Exibicao = Tax.IdTaxa_Logistica_Exibicao
    WHERE Tax.IdLogistica_House = @id
    ORDER BY Exb.Nome`;
  const r = await pool.request().input("id", sql.Int, house.IdLogistica_House).query(comando);
  const linhas = r.recordset.map(
    (linha) =>
      `${String(linha.Taxa ?? "Taxa").trim()} · pagamento ${dinheiro(linha.Pagamento) || "R$ 0,00"} · recebimento ${dinheiro(linha.Recebimento) || "R$ 0,00"}`,
  );
  return consultaPronta(
    `Taxas do processo ${numero}\n${lista(linhas, "Não há taxas lançadas nesse processo.")}`,
    comando,
    r.recordset,
    { id: Number(house.IdLogistica_House) },
  );
}

async function painelFinanceiro(pool, args = {}) {
  const sqlComissao = `
    SELECT
      SUM(Com.Valor_Comissao) AS Comissao,
      COUNT(*) AS Qtd_Comissao
    FROM mov_Logistica_House Lhs
    JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
    WHERE Lhs.Data_Abertura_Processo >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
      AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))`;
  const sqlTaxas = `
    SELECT TOP 12
      Exb.Nome AS Taxa,
      SUM(Tax.Valor_Pagamento_Total) AS Pagamento,
      SUM(Tax.Valor_Recebimento_Total) AS Recebimento
    FROM mov_Logistica_Taxa Tax
    JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Tax.IdLogistica_House
    LEFT JOIN cad_Taxa_Logistica_Exibicao Exb ON Exb.IdTaxa_Logistica_Exibicao = Tax.IdTaxa_Logistica_Exibicao
    WHERE Lhs.Data_Abertura_Processo >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
      AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    GROUP BY Exb.Nome
    ORDER BY SUM(Tax.Valor_Recebimento_Total) DESC`;
  const sqlPrazos = `
    SELECT COUNT(*) AS Qtd
    FROM mov_Logistica_House Lhs
    LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    WHERE Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Cancelamento IS NULL
      AND (
        (Lms.Data_Embarque IS NULL AND Lms.Data_Previsao_Embarque IS NOT NULL AND Lms.Data_Previsao_Embarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
        OR (Lms.Data_Desembarque IS NULL AND Lms.Data_Previsao_Desembarque IS NOT NULL AND Lms.Data_Previsao_Desembarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
        OR (Lhs.Data_Entrega IS NULL AND Lhs.Data_Previsao_Entrega IS NOT NULL AND Lhs.Data_Previsao_Entrega < DATEADD(day, 7, CAST(GETDATE() AS date)))
      )`;
  const totais = await pool.request().query(sqlComissao);
  const taxas = await pool.request().query(sqlTaxas);
  const prazos = await pool.request().query(sqlPrazos);
  const cabeca = totais.recordset[0] ?? {};
  const listaTaxas = taxas.recordset.map(
    (linha) =>
      `${String(linha.Taxa ?? "Taxa").trim()} · pagamento ${dinheiro(linha.Pagamento) || "R$ 0,00"} · recebimento ${dinheiro(linha.Recebimento) || "R$ 0,00"}`,
  );
  if (args?.foco === "taxas") {
    return consultaPronta(`Taxas deste mês\n${lista(listaTaxas, "Nenhuma taxa neste mês.")}`, sqlTaxas, taxas.recordset, {});
  }
  const texto = [
    "Painel financeiro deste mês",
    `- Comissões: ${dinheiro(cabeca.Comissao) || "R$ 0,00"} em ${Number(cabeca.Qtd_Comissao) || 0} lançamentos`,
    `- Prazos de embarque, desembarque ou entrega nos próximos 7 dias: ${Number(prazos.recordset[0]?.Qtd) || 0}`,
    "",
    lista(listaTaxas, "Nenhuma taxa neste mês."),
  ].join("\n");
  const pronto = consultaPronta(texto, "", taxas.recordset, {});
  pronto.sql = [sqlComissao, sqlTaxas, sqlPrazos].map((item) => item.trim()).join("\n\n");
  return pronto;
}

function diaNumero(valor) {
  if (valor == null || valor === "") return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

function hojeNumero() {
  const agora = new Date();
  return Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function lugarDe(nome, sigla) {
  const lugar = String(nome ?? "").trim();
  const codigo = String(sigla ?? "").trim();
  return {
    lugar,
    sigla: codigo && codigo.toLowerCase() !== lugar.toLowerCase() ? codigo : "",
  };
}

function mesmoLugar(parada, lugar) {
  return parada.lugar.trim().toLowerCase() === lugar.lugar.trim().toLowerCase();
}

function marcoRota(lugar, papel, real, previsto, detalhe) {
  const feita = dataCurta(real);
  const prevista = dataCurta(previsto);
  const atraso = !feita && diaNumero(previsto) != null && diaNumero(previsto) < hojeNumero();
  return {
    lugar: lugar.lugar,
    sigla: lugar.sigla,
    papel,
    quando: feita ? `${detalhe} ${feita}` : prevista ? `${detalhe} previsto ${prevista}` : "",
    estado: feita ? "feito" : atraso ? "atraso" : "previsto",
    navio: "",
    viagem: "",
  };
}

function dataRota(valor) {
  const cheia = dataCurta(valor);
  const encontrada = String(cheia).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!encontrada) return "";
  return `${encontrada[1]}/${encontrada[2]}/${encontrada[3].slice(2)}`;
}

function codigoPorto(nome, sigla) {
  const lugar = String(nome ?? "").trim();
  const codigo = String(sigla ?? "").trim();
  if (codigo && codigo.length <= 8) return codigo.toUpperCase();
  const primeiro = lugar.split(/[\s./-]+/).find((parte) => parte.length >= 2) || "";
  if (primeiro && primeiro.length <= 12) return primeiro.toUpperCase();
  return lugar;
}

function estadoTrecho(linha) {
  const situacao = Number(linha.Situacao_Embarque);
  const reserva = situacao === 1 || situacao === 2;
  if (dataCurta(linha.Data_Desembarque) || situacao === 8 || situacao === 11 || situacao === 13) return "feito";
  if (situacao === 6) return "atraso";
  if (!reserva && (situacao === 3 || situacao === 4 || situacao === 5 || (!situacao && dataCurta(linha.Data_Embarque)))) {
    const previsto = diaNumero(linha.Data_Previsao_Desembarque);
    return previsto != null && previsto < hojeNumero() ? "atraso" : "agora";
  }
  const saida = diaNumero(linha.Data_Previsao_Embarque);
  if (!reserva && saida != null && saida < hojeNumero() && !dataCurta(linha.Data_Embarque)) return "atraso";
  return "previsto";
}

function aereoProcesso(processo, carga, modalidadeProcesso) {
  const prefixo = String(processo || "").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  return prefixo === "IA" || prefixo === "EA" || Number(carga) === 1 || Number(modalidadeProcesso) === 1;
}

function meioTrecho(linha, processo, carga, modalidadeProcesso) {
  const transporte = Number(linha.Modalidade_Transporte);
  if (transporte === 1) return "aviao";
  if (transporte === 2) return "navio";
  if (transporte === 3 || transporte === 4) return "caminhao";
  if (aereoProcesso(processo, carga, modalidadeProcesso)) return "aviao";
  if (Number(carga) === 6 || Number(modalidadeProcesso) === 3) return "caminhao";
  return "navio";
}

function papelTrecho(linha, indice, linhas, aereo) {
  const tipo = Number(linha.Tipo_Viagem);
  if (tipo === 1 || tipo === 2) return "Coleta";
  if (tipo === 6) return "Entrega";
  if (tipo === 7 || tipo === 8) return "Pós embarque";
  if (tipo === 3 || tipo === 5) return aereo ? "Escala" : "Transbordo";
  if (tipo === 4) {
    const jaTeveEmbarque = linhas.slice(0, indice).some((item) => Number(item.Tipo_Viagem) === 4);
    if (jaTeveEmbarque) return aereo ? "Escala" : "Transbordo";
    return aereo ? "Escala" : "Embarque inicial";
  }
  if (indice === 0) return "Embarque inicial";
  return aereo ? "Escala" : "Transbordo";
}

function datasTrecho(linha) {
  return [
    ["Prev. embarque", dataRota(linha.Data_Previsao_Embarque)],
    ["Embarque", dataRota(linha.Data_Embarque)],
    ["Prev. desembarque", dataRota(linha.Data_Previsao_Desembarque)],
    ["Desembarque", dataRota(linha.Data_Desembarque)],
  ]
    .filter(([, valor]) => valor)
    .map(([rotulo, valor]) => ({ rotulo, valor }));
}

function terrestreProcesso(processo, carga, modalidadeProcesso) {
  if (aereoProcesso(processo, carga, modalidadeProcesso)) return false;
  const prefixo = String(processo || "").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  return prefixo === "IT" || prefixo === "ET" || Number(carga) === 6 || Number(modalidadeProcesso) === 3;
}

function numeroPositivo(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function textoPeso(valor) {
  const n = numeroPositivo(valor);
  if (n == null) return "";
  const arred = Math.round(n * 1000) / 1000;
  const texto = Number.isInteger(arred) ? String(arred) : arred.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  return `${texto} kg`;
}

function textoVolumes(valor) {
  const n = numeroPositivo(valor);
  if (n == null) return "";
  const arred = Math.round(n * 1000) / 1000;
  const texto = Number.isInteger(arred) ? String(arred) : arred.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  return Number(arred) === 1 ? `${texto} volume` : `${texto} volumes`;
}

function textoContainers(c20, c40) {
  const partes = [];
  const vinte = numeroPositivo(c20);
  const quarenta = numeroPositivo(c40);
  if (vinte) partes.push(`${vinte} x 20'`);
  if (quarenta) partes.push(`${quarenta} x 40'`);
  return partes.join(" · ");
}

function nomeCurto(nome) {
  const texto = String(nome ?? "").replace(/\s+/g, " ").trim();
  if (!texto) return "";
  const alias = texto.split(" - ").map((parte) => parte.trim()).filter(Boolean).pop() || "";
  if (alias && alias.length <= 24 && alias.length < texto.length) return alias;
  return texto
    .replace(/\b(ltda|s\.?a\.?|eireli|me|epp)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

function linhaLocal(texto) {
  const linha = String(texto ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item && !/^(phone|tel\.?|fone|contact|contato)\b/i.test(item));
  return String(linha ?? "").replace(/\s+/g, " ").trim();
}

function resumoLocal(texto) {
  const linha = linhaLocal(texto);
  if (!linha) return "";
  return linha.length <= 56 ? linha : `${linha.slice(0, 53)}…`;
}

function textoDias(valor) {
  const n = numeroPositivo(valor);
  if (n == null) return "";
  const dias = Math.round(n);
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function transitoTrecho(linha) {
  const efetivo = textoDias(linha.Tempo_Efetivo);
  const previsto = textoDias(linha.Tempo_Estimado);
  if (efetivo && previsto && efetivo !== previsto) return `${efetivo} (prev. ${previsto})`;
  return efetivo || (previsto ? `prev. ${previsto}` : "");
}

function detalheTrecho(linha) {
  const cia = nomeCurto(linha.Companhia_Trecho);
  const navio = String(linha.Navio ?? "").trim();
  const voo = String(linha.Viagem_Voo ?? "").trim();
  const transito = transitoTrecho(linha);
  return [cia, navio && navio.toLowerCase() !== cia.toLowerCase() ? navio : "", voo, transito].filter(Boolean).join(" · ");
}

function fichaProcesso(linha, processo) {
  const aereo = aereoProcesso(processo, linha.Tipo_Carga, linha.Modalidade_Processo);
  const terrestre = terrestreProcesso(processo, linha.Tipo_Carga, linha.Modalidade_Processo);
  const ctrc = String(linha.Numero_CTRC ?? "").trim();
  const conhecimento = String(linha.Numero_Conhecimento ?? "").trim();
  const documento = terrestre && ctrc ? ctrc : conhecimento;
  const peso = textoPeso(numeroPositivo(linha.Peso_House) ?? linha.Peso_Master);
  const volumes = textoVolumes(numeroPositivo(linha.Volumes_House) ?? linha.Volumes_Master);
  const fatos = [
    documento ? { rotulo: aereo ? "AWB" : terrestre ? "CTRC" : "BL", valor: documento } : null,
    !aereo && !terrestre && String(linha.Numero_CE ?? "").trim() ? { rotulo: "CE", valor: String(linha.Numero_CE).trim() } : null,
    String(linha.Referencia_Cliente ?? "").trim() ? { rotulo: "Ref.", valor: String(linha.Referencia_Cliente).trim() } : null,
    volumes ? { rotulo: "Volumes", valor: volumes } : null,
    peso ? { rotulo: "Peso", valor: peso } : null,
    textoContainers(linha.Total_Container_20, linha.Total_Container_40) ? { rotulo: "Cntr", valor: textoContainers(linha.Total_Container_20, linha.Total_Container_40) } : null,
    nomeCurto(linha.Companhia) ? { rotulo: "Cia", valor: nomeCurto(linha.Companhia) } : null,
  ].filter(Boolean);
  return fatos;
}

function montarTrechos(linhas, processo, carga, modalidadeProcesso) {
  const aereo = aereoProcesso(processo, carga, modalidadeProcesso);
  return linhas
    .map((linha, indice) => {
      let origem = codigoPorto(linha.Origem, linha.Origem_Sigla);
      let destino = codigoPorto(linha.Destino, linha.Destino_Sigla);
      let origemLivre = false;
      let destinoLivre = false;
      let origemTitulo = "";
      let destinoTitulo = "";
      if (!origem) {
        const livre = linhaLocal(linha.Local_Coleta);
        if (livre) {
          origem = resumoLocal(livre);
          origemTitulo = livre;
          origemLivre = true;
        }
      }
      if (!destino) {
        const livre = linhaLocal(linha.Local_Entrega);
        if (livre) {
          destino = resumoLocal(livre);
          destinoTitulo = livre;
          destinoLivre = true;
        }
      }
      if (!origem && !destino) return null;
      return {
        papel: papelTrecho(linha, indice, linhas, aereo),
        origem,
        destino,
        origemLivre,
        destinoLivre,
        origemTitulo,
        destinoTitulo,
        meio: meioTrecho(linha, processo, carga, modalidadeProcesso),
        datas: datasTrecho(linha),
        estado: estadoTrecho(linha),
        navio: String(linha.Navio ?? "").trim(),
        detalhe: detalheTrecho(linha),
      };
    })
    .filter(Boolean);
}

function paradasDasViagens(linhas) {
  const paradas = [];
  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i];
    const origem = lugarDe(linha.Origem, linha.Origem_Sigla);
    const destino = lugarDe(linha.Destino, linha.Destino_Sigla);
    const ultima = paradas[paradas.length - 1];
    if (origem.lugar && !(ultima && mesmoLugar(ultima, origem))) {
      paradas.push(marcoRota(origem, i === 0 ? "Origem" : "Transbordo", linha.Data_Embarque, linha.Data_Previsao_Embarque, "Embarque"));
    } else if (ultima && origem.lugar && mesmoLugar(ultima, origem)) {
      const saida = marcoRota(origem, ultima.papel, linha.Data_Embarque, linha.Data_Previsao_Embarque, "Embarque");
      if (saida.quando) ultima.quando = [ultima.quando, saida.quando].filter(Boolean).join(" · ");
      if (saida.estado !== "feito") ultima.estado = saida.estado;
    }
    if (!destino.lugar) continue;
    const chegada = marcoRota(
      destino,
      i === linhas.length - 1 ? "Destino" : "Transbordo",
      linha.Data_Desembarque,
      linha.Data_Previsao_Desembarque,
      "Desembarque",
    );
    chegada.navio = String(linha.Navio ?? "").trim();
    chegada.viagem = String(linha.Viagem_Voo ?? "").trim();
    paradas.push(chegada);
  }
  return paradas;
}

const SITUACAO_EMBARQUE_PROCESSO = {
  0: "Pré-processo",
  1: "Aguardando embarque",
  2: "Embarcado",
  3: "Desembarcado",
  4: "Cancelado",
  5: "Pendente",
  6: "Autorizado",
  7: "Coletado",
  8: "Entregue",
  9: "Aguardando prontidão da mercadoria",
  10: "Aguardando booking",
  11: "Finalizado",
  12: "Aguardando coleta",
  13: "Aguardando entrega",
};

function situacaoEmbarqueProcesso(valor) {
  if (valor == null || valor === "") return "";
  const n = Number(valor);
  return SITUACAO_EMBARQUE_PROCESSO[n] || "";
}

async function linhasOpcionais(pool, master, comando) {
  if (!master) return [];
  try {
    const r = await pool.request().input("master", sql.Int, master).query(comando);
    return r.recordset;
  } catch {
    return [];
  }
}

async function rotaProcesso(pool, args) {
  const numero = numeroDe(args.numero);
  const house = await houseDoProcesso(pool, numero);
  if (!house) return `Processo ${numero} não encontrado.`;
  const sqlCabeca = `
    SELECT TOP 1
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Sta.Descricao AS Situacao,
      Ori.Nome AS Origem,
      Ori.Sigla AS Origem_Sigla,
      Des.Nome AS Destino,
      Des.Sigla AS Destino_Sigla,
      Nav.Nome AS Navio,
      Lmm.Viagem_Navio,
      Lmm.Data_Previsao_Chegada_Navio,
      Lmm.Data_Chegada_Navio,
      Lms.Situacao_Embarque,
      Lms.Data_Previsao_Embarque,
      Lms.Data_Embarque,
      Lms.Data_Previsao_Desembarque,
      Lms.Data_Desembarque,
      Lms.Numero_Conhecimento,
      Lms.Modalidade_Processo,
      Lhs.Tipo_Carga,
      Lhs.Referencia_Cliente,
      Lhs.Peso_Bruto AS Peso_House,
      Lhs.Quantidade_Volumes AS Volumes_House,
      Lms.Peso_Bruto AS Peso_Master,
      Lms.Quantidade_Volumes AS Volumes_Master,
      Lmh.Numero_CE,
      Lmh.Total_Container_20,
      Lmh.Total_Container_40,
      Lth.Numero_CTRC,
      Cia.Nome AS Companhia
    FROM mov_Logistica_House Lhs
    LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    LEFT OUTER JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    LEFT OUTER JOIN mov_Logistica_Maritima_Master Lmm ON Lmm.IdLogistica_Master = Lhs.IdLogistica_Master
    LEFT OUTER JOIN cad_Navio Nav ON Nav.IdNavio = Lmm.IdNavio
    LEFT OUTER JOIN cad_Origem_Destino Ori ON Ori.IdOrigem_Destino = Lms.IdOrigem
    LEFT OUTER JOIN cad_Origem_Destino Des ON Des.IdOrigem_Destino = Lms.IdDestino
    LEFT OUTER JOIN cad_Pessoa Cia ON Cia.IdPessoa = Lms.IdCompanhia_Transporte
    LEFT OUTER JOIN mov_Logistica_Maritima_House Lmh ON Lmh.IdLogistica_House = Lhs.IdLogistica_House
    LEFT OUTER JOIN mov_Logistica_Terrestre_House Lth ON Lth.IdLogistica_House = Lhs.IdLogistica_House
    WHERE Lhs.IdLogistica_House = @house`;
  const sqlViagem = `
    SELECT
      V.Sequencia,
      V.Viagem_Voo,
      V.Situacao_Embarque,
      V.Modalidade_Transporte,
      V.Tipo_Viagem,
      V.Data_Previsao_Embarque,
      V.Data_Embarque,
      V.Data_Previsao_Desembarque,
      V.Data_Desembarque,
      V.Tempo_Estimado,
      V.Tempo_Efetivo,
      V.Local_Coleta,
      V.Local_Entrega,
      O.Nome AS Origem,
      O.Sigla AS Origem_Sigla,
      D.Nome AS Destino,
      D.Sigla AS Destino_Sigla,
      N.Nome AS Navio,
      P.Nome AS Companhia_Trecho
    FROM mov_Logistica_Viagem V
    LEFT OUTER JOIN cad_Origem_Destino O ON O.IdOrigem_Destino = V.IdOrigem
    LEFT OUTER JOIN cad_Origem_Destino D ON D.IdOrigem_Destino = V.IdDestino
    LEFT OUTER JOIN cad_Navio N ON N.IdNavio = V.IdNavio
    LEFT OUTER JOIN cad_Pessoa P ON P.IdPessoa = V.IdCompanhia_Transporte
    WHERE V.IdLogistica_House = @house
    ORDER BY V.Sequencia, V.Data_Previsao_Embarque, V.IdLogistica_Viagem`;
  const pedido = pool.request().input("house", sql.Int, house.IdLogistica_House);
  const cabeca = await pedido.query(sqlCabeca);
  const linha = cabeca.recordset[0];
  if (!linha) return `Processo ${numero} não encontrado.`;
  const viagens = await linhasOpcionais(
    pool,
    house.IdLogistica_House,
    sqlViagem.replaceAll("@house", "@master"),
  );
  let trechos = viagens.filter((item) => Number(item.Situacao_Embarque) !== 9);
  const cancelada = viagens.length > 0 && trechos.length === 0;
  if (cancelada) trechos = viagens;
  let origemSql = "viagem";
  if (!trechos.length) {
    trechos = await linhasOpcionais(
      pool,
      house.IdLogistica_Master,
      `
      SELECT
        Tv.Sequencia,
        Tv.Origem_Descricao AS Origem,
        Tv.Origem_Locode AS Origem_Sigla,
        Tv.Destino_Descricao AS Destino,
        Tv.Destino_Locode AS Destino_Sigla,
        Tv.Embarque_Data_Efetiva AS Data_Embarque,
        Tv.Embarque_Data_Prevista AS Data_Previsao_Embarque,
        Tv.Desembarque_Data_Efetiva AS Data_Desembarque,
        Tv.Desembarque_Data_Prevista AS Data_Previsao_Desembarque,
        Tv.Veiculo_Nome AS Navio,
        Tv.Viagem_Numero AS Viagem_Voo
      FROM mov_Tracking_Carga Tc
      INNER JOIN mov_Tracking_Carga_Viagem Tv ON Tv.IdTracking_Carga = Tc.IdTracking_Carga
      WHERE Tc.IdTracking_Carga = (
        SELECT TOP 1 IdTracking_Carga
        FROM mov_Tracking_Carga
        WHERE IdLogistica_Master = @master
        ORDER BY Data_Ultima_Alteracao DESC
      )
      ORDER BY Tv.Sequencia`,
    );
    if (trechos.length) origemSql = "tracking";
  }
  if (!trechos.length) {
    const transbordos = await linhasOpcionais(
      pool,
      house.IdLogistica_Master,
      `
      SELECT
        T.Viagem AS Viagem_Voo,
        T.Data_Embarque,
        T.Data_Previsao_Embarque,
        T.Data_Desembarque,
        T.Data_Previsao_Desembarque,
        N.Nome AS Navio,
        Pt.Nome AS Origem,
        Pt.Sigla AS Origem_Sigla,
        Pd.Nome AS Destino,
        Pd.Sigla AS Destino_Sigla
      FROM mov_Logistica_Maritima_Transbordo T
      LEFT OUTER JOIN cad_Navio N ON N.IdNavio = T.IdNavio
      LEFT OUTER JOIN cad_Origem_Destino Pt ON Pt.IdOrigem_Destino = T.IdPorto_Transbordo
      LEFT OUTER JOIN cad_Origem_Destino Pd ON Pd.IdOrigem_Destino = T.IdPorto_Desembarque
      WHERE T.IdLogistica_Master = @master
      ORDER BY T.Data_Previsao_Embarque, T.IdLogistica_Maritima_Transbordo`,
    );
    if (transbordos.length) {
      const primeira = String(transbordos[0].Origem ?? "").trim().toLowerCase();
      const origemMaster = String(linha.Origem ?? "").trim();
      trechos =
        origemMaster && primeira !== origemMaster.toLowerCase()
          ? [
              {
                Origem: linha.Origem,
                Origem_Sigla: linha.Origem_Sigla,
                Destino: transbordos[0].Origem,
                Destino_Sigla: transbordos[0].Origem_Sigla,
                Data_Embarque: linha.Data_Embarque,
                Data_Previsao_Embarque: linha.Data_Previsao_Embarque,
                Data_Desembarque: transbordos[0].Data_Embarque,
                Data_Previsao_Desembarque: transbordos[0].Data_Previsao_Embarque,
                Navio: linha.Navio,
                Viagem_Voo: linha.Viagem_Navio,
              },
              ...transbordos,
            ]
          : transbordos;
      origemSql = "transbordo";
    }
  }
  if (!trechos.length && (linha.Origem || linha.Destino)) {
    trechos = [
      {
        Origem: linha.Origem,
        Origem_Sigla: linha.Origem_Sigla,
        Destino: linha.Destino,
        Destino_Sigla: linha.Destino_Sigla,
        Data_Embarque: linha.Data_Embarque,
        Data_Previsao_Embarque: linha.Data_Previsao_Embarque,
        Data_Desembarque: linha.Data_Desembarque || linha.Data_Chegada_Navio,
        Data_Previsao_Desembarque: linha.Data_Previsao_Desembarque || linha.Data_Previsao_Chegada_Navio,
        Navio: linha.Navio,
        Viagem_Voo: linha.Viagem_Navio,
      },
    ];
    origemSql = "master";
  }
  const legs = montarTrechos(trechos, linha.Numero_Processo || numero, linha.Tipo_Carga, linha.Modalidade_Processo);
  const navioPadrao = String(linha.Navio ?? "").trim();
  const viagemPadrao = String(linha.Viagem_Navio ?? "").trim();
  if (navioPadrao && legs.length && legs.every((item) => !item.navio)) {
    const atual = legs.find((item) => item.estado === "agora" || item.estado === "atraso") || legs[0];
    atual.navio = navioPadrao;
  }
  const cartao = {
    processo: String(linha.Numero_Processo || numero).trim(),
    cliente: String(linha.Cliente ?? "").trim(),
    processoSituacao: String(linha.Situacao ?? "").trim(),
    situacao: situacaoEmbarqueProcesso(linha.Situacao_Embarque),
    navio: legs.find((item) => item.navio)?.navio || navioPadrao,
    viagem: viagemPadrao,
    cia: String(linha.Companhia ?? "").trim(),
    conhecimento: String(linha.Numero_Conhecimento ?? "").trim(),
    fatos: fichaProcesso(linha, linha.Numero_Processo || numero),
    aviso: legs.length ? "" : "Não há rota lançada neste processo.",
    trechos: legs,
  };
  const texto = `\`\`\`rota\n${JSON.stringify(cartao)}\n\`\`\``;
  const pronto = consultaPronta(texto, [sqlCabeca, sqlViagem].join("\n\n"), trechos, {
    house: house.IdLogistica_House,
  });
  if (origemSql !== "viagem") pronto.sql = `${pronto.sql}\n\n-- trechos usados: ${origemSql}`;
  return pronto;
}

export function ferramentaDaVisao(nome, setor) {
  if (setor === "gerencia") return !["painel_ti", "log_recente", "monitoramentos_alterados"].includes(nome);
  if (nome === "painel_financeiro" || nome === "taxas_processo") return setor === "financeiro";
  if (setor === "financeiro") {
    return [
      "painel_financeiro",
      "taxas_processo",
      "comissao_periodo",
      "prazos",
      "proposta_processo",
      "resumo_processo",
      "rota_processo",
      "buscar_processos",
      "executar_sql",
      "consultar_dados",
      "localizar_processo",
      "processos_abertos_cliente",
      "processos_abertos",
      "buscar_tabelas",
      "listar_colunas",
    ].includes(nome);
  }
  if (nome === "painel_ti" || nome === "log_recente" || nome === "monitoramentos_alterados") return setor === "ti";
  if (setor === "ti") {
    return !["fila_setor", "proposta_processo", "comissao_periodo", "processos_parados", "documental_ce", "atividades_pendentes", "divergencias_viagem"].includes(nome);
  }
  if (nome === "fila_setor") return setor === "admin";
  if (nome === "prazos") return true;
  if (nome === "divergencias_viagem") return setor === "operacional" || setor === "admin" || setor === "financeiro";
  if (nome === "documental_ce") return setor === "documental" || setor === "admin";
  if (nome === "atividades_pendentes") return ["operacional", "inside", "comercial", "admin"].includes(setor);
  if (nome === "proposta_processo" || nome === "comissao_periodo") return setor !== "operacional" && setor !== "documental";
  return true;
}

async function andamentoAtividade(pool, args) {
  const numero = String(args.numero ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const codigo = String(args.codigo ?? "").trim().slice(0, 60);
  if (!numero) throw new Error("Informe o número do processo, como IM5328-26.");
  const r = await pool.request().input("n", sql.VarChar(40), numero).input("c", sql.VarChar(60), codigo).query(`
    SELECT TOP 5
      Lhs.Numero_Processo,
      Tar.Codigo,
      Tar.Descricao AS Atividade,
      Res.Nome AS Responsavel,
      Ati.Situacao,
      Ati.Previsao_Inicio,
      Ati.Previsao_Termino,
      Ati.Data_Inicio,
      Ati.Data_Termino,
      LEFT(CAST(Ati.Observacao AS nvarchar(600)), 400) AS Observacao,
      Aco.Data AS Acompanhamento_Data,
      LEFT(CAST(Aco.Descricao AS nvarchar(600)), 400) AS Acompanhamento,
      Aco.Responsavel AS Acompanhamento_Responsavel
    FROM mov_Logistica_House Lhs
    JOIN mov_Atividade Ati ON Ati.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
    OUTER APPLY (
      SELECT TOP 1 A.Data, A.Descricao, P.Nome AS Responsavel
      FROM mov_Acompanhamento A
      LEFT JOIN cad_Pessoa P ON P.IdPessoa = A.IdResponsavel
      WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
      ORDER BY A.Data DESC
    ) Aco
    WHERE Lhs.Numero_Processo = @n
      AND (@c = '' OR CAST(Tar.Codigo AS varchar(60)) = @c OR Tar.Descricao LIKE '%' + @c + '%')
    ORDER BY CASE WHEN Ati.Situacao IN (4, 5, 6) THEN 1 ELSE 0 END, Ati.Previsao_Termino DESC`);
  const linhas = r.recordset;
  if (!linhas.length) {
    return codigo
      ? `Não encontrei a atividade ${codigo} no processo ${numero}.`
      : `Não encontrei atividades no processo ${numero}.`;
  }
  const blocos = linhas.map((linha) => {
    const nome = [String(linha.Codigo ?? "").trim(), String(linha.Atividade ?? "").trim()].filter(Boolean).join(" · ");
    const situacao = Number(linha.Situacao);
    const quando = dataCurta(linha.Data_Termino || linha.Data_Inicio);
    const status =
      situacao === 4
        ? `Concluída${quando ? ` em ${quando}` : ""}`
        : situacao === 5
          ? `Cancelada${quando ? ` em ${quando}` : ""}`
          : situacao === 6
            ? `Encerrada${quando ? ` em ${quando}` : ""}`
            : situacao === 2 || linha.Data_Inicio
              ? `Em andamento${linha.Data_Inicio ? ` desde ${dataCurta(linha.Data_Inicio)}` : ""}`
              : situacao === 3
                ? "Em espera"
                : "Ainda não iniciada";
    const inicio = dataCurta(linha.Previsao_Inicio);
    const termino = dataCurta(linha.Previsao_Termino);
    const previsao = inicio && termino && inicio !== termino ? previsaoDe(linha.Previsao_Inicio, linha.Previsao_Termino) : termino || inicio ? `Previsão ${termino || inicio}` : "";
    const atrasada = ![4, 5, 6].includes(situacao) && linha.Previsao_Termino && new Date(linha.Previsao_Termino) < new Date();
    const itens = [
      `- **Situação:** ${status}${atrasada ? " · **atrasada**" : ""}`,
      linha.Responsavel ? `- **Responsável:** ${String(linha.Responsavel).trim()}` : "",
      previsao ? `- **${previsao}**` : "",
      notaCurta(linha.Observacao) ? `- **Observação:** ${notaCurta(linha.Observacao)}` : "",
    ].filter(Boolean);
    return `**${nome || "Atividade"}**\n${itens.join("\n")}`;
  });
  const ultimo = linhas[0];
  const acompanhamento = ultimo.Acompanhamento_Data
    ? `\n\n**Último acompanhamento do processo** (${dataCurta(ultimo.Acompanhamento_Data)}${ultimo.Acompanhamento_Responsavel ? `, ${String(ultimo.Acompanhamento_Responsavel).trim()}` : ""}):\n${notaCurta(ultimo.Acompanhamento) || "sem descrição"}`
    : "";
  return `### Processo ${String(ultimo.Numero_Processo).trim()}\n\n${blocos.join("\n\n")}${acompanhamento}`;
}

function embalagem(resultado) {
  if (resultado && typeof resultado === "object" && "texto" in resultado) return resultado;
  return { texto: String(resultado ?? ""), sql: "", linhas: [] };
}

export async function executarFuncao(pool, nome, args, ctx) {
  if (!FUNCOES.has(nome)) throw new Error("Função desconhecida.");
  const dados = args && typeof args === "object" ? args : {};
  const recorte = ctx.recorte ?? {};
  if (nome === "resumo_processo") return embalagem(await resumoProcesso(pool, dados, recorte));
  if (nome === "buscar_processos") return embalagem(await buscarProcessos(pool, dados, recorte));
  if (nome === "processos_abertos") return embalagem(await processosAbertos(pool, dados, recorte));
  if (nome === "acompanhamentos_processo") return embalagem(await acompanhamentosProcesso(pool, dados));
  if (nome === "pendencias") return embalagem(await pendencias(pool, dados, ctx));
  if (nome === "o_que_mudou") return embalagem(await oQueMudou(pool, dados, ctx));
  if (nome === "proposta_processo") return embalagem(await propostaProcesso(pool, dados, recorte));
  if (nome === "comissao_periodo") return embalagem(await comissaoPeriodo(pool, dados, recorte, ctx));
  if (nome === "processos_abertos_cliente") return embalagem(await processosAbertosCliente(pool, dados, recorte, ctx));
  if (nome === "prazos") return embalagem(await prazos(pool, dados, recorte));
  if (nome === "processos_parados") return embalagem(await processosParados(pool, dados, recorte));
  if (nome === "documental_ce") return embalagem(await documentalCe(pool, dados));
  if (nome === "atividades_pendentes") return embalagem(await atividadesPendentes(pool, dados, recorte));
  if (nome === "divergencias_viagem") return embalagem(await divergenciasViagem(pool, dados, recorte));
  if (nome === "rota_processo") return embalagem(await rotaProcesso(pool, dados));
  if (nome === "andamento_atividade") return embalagem(await andamentoAtividade(pool, dados));
  if (nome === "painel_ti") return embalagem(await painelTi(pool, dados, ctx));
  if (nome === "log_recente") return embalagem(await logRecente(pool, dados, ctx));
  if (nome === "monitoramentos_alterados") return embalagem(await monitoramentosAlterados(pool, dados, ctx));
  if (nome === "painel_financeiro") return embalagem(await painelFinanceiro(pool, dados));
  if (nome === "taxas_processo") return embalagem(await taxasProcesso(pool, dados));
  if (nome === "explicar_itens_carga") return embalagem(await explicarItensCarga(pool, dados));
  if (nome === "explicar_campo_livre") return embalagem(await explicarCampoLivre(pool, dados));
  return embalagem(await filaSetor(pool, recorte));
}
