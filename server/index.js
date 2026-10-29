import { emailsAdmin } from "./env.js";
import { listarSqlite, lerLinhaSqlite, lerTabelaSqlite } from "./sqliteVisao.js";
import { adotarTokenGoogle, apagarSessao, contaDoToken } from "./identidade.js";
import express from "express";
import os from "os";
import sql from "mssql";
import { nomeProprio } from "./itensCarga.js";
import { montarSelect, montarXpaths, parseTabelasXml } from "./query.js";
import { enriquecerNomes, nomearSql } from "./nomes.js";
import { compararComCadastro } from "./atual.js";
import { conversar } from "./ia.js";
import { resumirGmail } from "./gmail.js";
import { pedeHistorico, responderPorRegra } from "./regras.js";
import { executarFuncao, chaveConsulta, consultaEmCache, consultaFresca, guardarConsulta } from "./funcoes.js";
import { painelDoUsuario, resumoInicial } from "./inicio.js";
import { apagarConta, listarContas, permissaoDe, registrarConta, salvarConta } from "./acesso.js";
import { perfilDaConta } from "./setor.js";
import { filtrarLinhas, motivoBloqueio, recorteDaVisao } from "./recorte.js";
import { protegerPool } from "./seguranca.js";
import { editar, esquecer, lembrar, lerMemoria, registrarUso } from "./memoria.js";
import {
  apagarGlossario,
  guardarReceitaServidor,
  editarUsuario,
  limparCacheAprendizado,
  esquecerUsuario,
  lembrarUsuario,
  listarGlossario,
  listarPreferencias,
  ordenarTabelas,
  pareceCorrecao,
  placarAvaliacoes,
  registrarAvaliacao,
  revisarAvaliacoes,
  receitaServidor,
  registrarCorrecao,
  registrarFalha,
  registrarUsoVisao,
  revisarFalhas,
  salvarGlossario,
} from "./aprendizado.js";
import { salvarConsulta } from "./consultas.js";
import {
  apagarChave,
  apagarConversa,
  apagarConversas,
  chavesParaUso,
  criarChave,
  criarConversa,
  lerConversa,
  listarChaves,
  listarConversas,
  provedoresCompartilhados,
  registrarConsultaFeita,
  salvarConversa,
} from "./conversas.js";

const app = express();

function origemPermitida(origem) {
  if (!origem) return "";
  let url;
  try {
    url = new URL(origem);
  } catch {
    return "";
  }
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "maicon.conlinebr.com.br") return origem;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return origem;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return origem;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return origem;
  return "";
}

app.use((req, res, next) => {
  const permitida = origemPermitida(req.headers.origin);
  if (permitida) {
    res.setHeader("Access-Control-Allow-Origin", permitida);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "X-Sessao");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(permitida ? 204 : 403);
    return;
  }
  next();
});
app.use(express.json({ limit: "4mb" }));
app.get("/api/ia/saude", (_req, res) => {
  const compartilhados = new Set(provedoresCompartilhados());
  res.json({
    ok: true,
    commit: process.env.MAICON_GIT_SHA || "",
    provedores: {
      gemini: Boolean(String(process.env.GEMINI_API_KEY || "").trim()) || compartilhados.has("gemini"),
      openrouter: Boolean(String(process.env.OPENROUTER_API_KEY || "").trim()) || compartilhados.has("openrouter"),
      ollama: Boolean(String(process.env.OLLAMA_API_KEY || "").trim()) || compartilhados.has("ollama"),
    },
  });
});

app.use("/api", async (req, res, next) => {
  const header = String(req.headers.authorization ?? "");
  const token = /^Bearer\s+\S+/i.test(header) ? header.replace(/^Bearer\s+/i, "").trim() : "";
  try {
    req.conta = await contaDoToken(token);
    if (req.conta.entregarSessao) res.setHeader("X-Sessao", req.conta.entregarSessao);
    next();
  } catch (erro) {
    res.status(401).json({ erro: erro?.message || "Entre de novo com o Google." });
  }
});

function configSql() {
  const servidor = process.env.SQL_SERVER || "localhost";
  const banco = process.env.SQL_DATABASE || "";
  const usuario = process.env.SQL_USER || "";
  const senha = process.env.SQL_PASSWORD || "";
  const instancia = process.env.SQL_INSTANCE || "";
  const server = instancia ? `${servidor}\\${instancia}` : servidor;

  if (!banco || !usuario) {
    throw new Error(
      "Preencha SQL_DATABASE, SQL_USER e SQL_PASSWORD no arquivo .env e reinicie a API.",
    );
  }

  return {
    server,
    port: Number(process.env.SQL_PORT || 1433),
    database: banco,
    user: usuario,
    password: senha,
    options: {
      encrypt: process.env.SQL_ENCRYPT !== "false",
      trustServerCertificate: process.env.SQL_TRUST_CERT !== "false",
      enableArithAbort: true,
      readOnlyIntent: true,
    },
    requestTimeout: 120000,
    connectionTimeout: 15000,
  };
}

let poolFixo = null;
let abrindoPool = null;

async function abrirPool() {
  const pool = new sql.ConnectionPool(configSql());
  await pool.connect();
  const protegido = protegerPool(pool);
  const encerrar = pool.close.bind(pool);
  protegido.encerrar = encerrar;
  protegido.close = () => Promise.resolve();
  pool.on("error", () => {
    if (poolFixo === protegido) poolFixo = null;
    encerrar().catch(() => {});
  });
  return protegido;
}

async function poolCompartilhado() {
  if (poolFixo?.connected) return poolFixo;
  if (!abrindoPool) {
    const anterior = poolFixo;
    poolFixo = null;
    abrindoPool = abrirPool()
      .then((pool) => {
        poolFixo = pool;
        abrindoPool = null;
        return pool;
      })
      .catch((erro) => {
        abrindoPool = null;
        throw erro;
      });
    if (anterior) anterior.encerrar?.().catch(() => {});
  }
  return abrindoPool;
}

async function conectar() {
  return poolCompartilhado();
}

async function testar(_req, res) {
  let pool;
  try {
    pool = await conectar();
    const r = await pool
      .request()
      .query("Select DB_NAME() as Banco, SUSER_SNAME() as Login");
    res.json({ ok: true, ...r.recordset[0] });
  } catch (erro) {
    res.status(400).json({ ok: false, erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
}

app.delete("/api/sessao", (req, res) => {
  apagarSessao(req.conta.email);
  res.json({ ok: true });
});

app.get("/api/conexao/teste", testar);

app.post("/api/conexao/teste", testar);

app.get("/api/inicio", async (req, res) => {
  let pool;
  try {
    const email = emailDaSessao(req);
    pool = await conectar();
    res.json(await painelDoUsuario(pool, email, nomeDaSessao(req), permissaoDe(email).papel === "admin"));
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

async function tokenParaGmail(req) {
  const enviado = String(req.body?.token ?? "").trim();
  if (enviado) {
    const novo = await adotarTokenGoogle(emailDaSessao(req), enviado);
    if (novo) return novo;
  }
  return String(req.conta?.token ?? "");
}

app.post("/api/inicio/resumo", async (req, res) => {
  const email = emailDaSessao(req);
  const acesso = permissaoDe(email);
  let pool;
  try {
    pool = await conectar();
    res.json(await resumoInicial(pool, {
      email,
      nome: nomeDaSessao(req),
      token: await tokenParaGmail(req),
      visao: String(req.body?.visao ?? ""),
      admin: acesso.papel === "admin",
      setorManual: acesso.setorManual,
      modalidadeManual: acesso.modalidadeManual,
    }));
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

app.get("/api/usuarios", async (_req, res) => {
  let pool;
  try {
    pool = await conectar();
    const resultado = await pool.request().query(
      `SELECT IdUsuario, Nome
       FROM sys_Usuario
       WHERE Nome IS NOT NULL AND LTRIM(RTRIM(Nome)) <> ''
       ORDER BY Nome`,
    );
    res.json({
      usuarios: resultado.recordset.map((linha) => ({
        id: Number(linha.IdUsuario) || 0,
        nome: String(linha.Nome ?? "").trim(),
      })),
    });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

function valoresDoContainer(chaves) {
  const ids = [];
  const numeros = [];
  for (const chave of chaves ?? []) {
    const nome = String(chave?.nome ?? "");
    for (const parte of String(chave?.valor ?? "").split(/[,;]/)) {
      const valor = parte.trim();
      if (!valor) continue;
      if (/^number$/i.test(nome) || /^[A-Z]{4}\d{7}$/i.test(valor)) numeros.push(valor.toUpperCase());
      else if (/^\d+$/.test(valor)) ids.push(Number(valor));
    }
  }
  return { ids: [...new Set(ids)].slice(0, 40), numeros: [...new Set(numeros)].slice(0, 40) };
}

async function aberturaDosContainers(pool, chaves) {
  const { ids, numeros } = valoresDoContainer(chaves);
  if (!ids.length && !numeros.length) return null;
  const pedido = pool.request();
  const filtros = [];
  ids.forEach((id, i) => {
    pedido.input(`id${i}`, sql.Int, id);
    filtros.push(`C.IdLogistica_Maritima_Container = @id${i}`);
  });
  numeros.forEach((numero, i) => {
    pedido.input(`n${i}`, sql.VarChar(20), numero);
    filtros.push(`C.Number = @n${i}`);
  });
  const r = await pedido.query(`
    SELECT MIN(H.Data_Abertura_Processo) AS Abertura
    FROM mov_Logistica_Maritima_Container C
    JOIN mov_Logistica_House H ON H.IdLogistica_House = C.IdLogistica_House
    WHERE ${filtros.join(" OR ")}
  `);
  const abertura = r.recordset[0]?.Abertura;
  if (!abertura) return null;
  const inicio = new Date(abertura);
  if (Number.isNaN(inicio.getTime())) return null;
  const fim = new Date(inicio.getTime());
  fim.setDate(fim.getDate() + 75);
  return { inicio, fim };
}

const ABERTURA_POR_CHAVE = {
  idlogistica_house: "SELECT MIN(H.Data_Abertura_Processo) AS Abertura FROM mov_Logistica_House H WHERE H.IdLogistica_House IN (/*IDS*/)",
  idlogistica_master:
    "SELECT MIN(H.Data_Abertura_Processo) AS Abertura FROM mov_Logistica_House H WHERE H.IdLogistica_Master IN (/*IDS*/)",
  idlogistica_taxa:
    "SELECT MIN(H.Data_Abertura_Processo) AS Abertura FROM mov_Logistica_Taxa T JOIN mov_Logistica_House H ON H.IdLogistica_House = T.IdLogistica_House WHERE T.IdLogistica_Taxa IN (/*IDS*/)",
  idprojeto_atividade:
    "SELECT MIN(H.Data_Abertura_Processo) AS Abertura FROM mov_Logistica_House H WHERE H.IdProjeto_Atividade IN (/*IDS*/)",
};

function dataValida(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

async function aberturaDoProcesso(pool, processo, chaves) {
  const numeros = [...new Set(String(processo ?? "").toUpperCase().match(/\b[A-Z]{1,4}\d{2,6}-\d{2}\b/g) ?? [])].slice(0, 20);
  if (numeros.length) {
    const pedido = pool.request();
    numeros.forEach((n, i) => pedido.input(`p${i}`, sql.VarChar(30), n));
    const r = await pedido.query(
      `SELECT MIN(Data_Abertura_Processo) AS Abertura FROM mov_Logistica_House WHERE Numero_Processo IN (${numeros.map((_, i) => `@p${i}`).join(", ")})`,
    );
    const abertura = dataValida(r.recordset[0]?.Abertura);
    if (abertura) return abertura;
  }
  for (const chave of chaves ?? []) {
    const consulta = ABERTURA_POR_CHAVE[String(chave?.nome ?? "").trim().toLowerCase()];
    const ids = String(chave?.valor ?? "")
      .split(/[,;]/)
      .map((v) => v.trim())
      .filter((v) => /^\d+$/.test(v))
      .slice(0, 40);
    if (!consulta || !ids.length) continue;
    const pedido = pool.request();
    ids.forEach((id, i) => pedido.input(`i${i}`, sql.Int, Number(id)));
    const r = await pedido.query(consulta.replace("/*IDS*/", ids.map((_, i) => `@i${i}`).join(", ")));
    const abertura = dataValida(r.recordset[0]?.Abertura);
    if (abertura) return abertura;
  }
  return null;
}

function fatiarPeriodo(inicio, fim, dias) {
  const partes = [];
  const limite = new Date(fim);
  let cursor = new Date(inicio);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(limite.getTime()) || cursor > limite) return partes;
  while (cursor <= limite) {
    const proximo = new Date(cursor);
    proximo.setDate(proximo.getDate() + dias - 1);
    const ate = proximo < limite ? proximo : new Date(limite);
    partes.push([new Date(cursor), ate]);
    cursor = new Date(ate);
    cursor.setDate(cursor.getDate() + 1);
  }
  return partes;
}

function fatiarDoFim(inicio, fim) {
  const partes = [];
  const limite = new Date(inicio);
  let ate = new Date(fim);
  if (Number.isNaN(limite.getTime()) || Number.isNaN(ate.getTime()) || limite > ate) return partes;
  let dias = 7;
  while (ate >= limite) {
    const de = new Date(ate);
    de.setDate(de.getDate() - dias + 1);
    partes.push([de > limite ? de : new Date(limite), new Date(ate)]);
    ate = new Date(de);
    ate.setDate(ate.getDate() - 1);
    dias = 21;
  }
  return partes;
}

function mapearEventos(recordset) {
  const eventos = [];
  for (const linha of recordset) {
    for (const tabela of parseTabelasXml(linha.Trecho)) {
      eventos.push({
        id: String(eventos.length + 1),
        usuario: nomeProprio(linha.Usuario),
        dataInicioTransacao: iso(linha.Data_Inicio_Transacao),
        dataTerminoTransacao: iso(linha.Data_Termino_Transacao),
        tempoTransacao: Number(linha.Tempo_Transacao) || 0,
        usuarioWindows: linha.Usuario_Windows ?? "",
        computador: linha.Computador ?? "",
        tabela: tabela.nome,
        tipo: tabela.tipo,
        data: iso(tabela.data) || iso(linha.Data_Inicio_Transacao),
        indice: tabela.indice,
        campos: tabela.campos,
      });
    }
  }
  eventos.sort((a, b) => {
    const da = new Date(a.data || a.dataInicioTransacao).getTime();
    const db = new Date(b.data || b.dataInicioTransacao).getTime();
    return da - db || a.indice - b.indice;
  });
  return eventos;
}

async function lerEventosLog(pool, xpaths, inicio, fim, idUsuario) {
  const request = pool.request();
  request.timeout = 25000;
  request.input("Data_Inicio", sql.Date, inicio);
  request.input("Data_Termino", sql.Date, fim);
  request.input("IdUsuario", sql.Int, Number(idUsuario) || 0);
  const resultado = await request.query(montarSelect(xpaths));
  return mapearEventos(resultado.recordset);
}

function estourouTempo(erro) {
  return erro?.code === "ETIMEOUT" || /timeout/i.test(String(erro?.message ?? erro));
}

async function lerEventosComFolga(pool, xpaths, inicio, fim, idUsuario, profundidade = 0) {
  try {
    return await lerEventosLog(pool, xpaths, inicio, fim, idUsuario);
  } catch (erro) {
    const dias = Math.round((fim.getTime() - inicio.getTime()) / 86400000);
    if (!estourouTempo(erro) || dias < 2 || profundidade > 3) throw erro;
    const meio = new Date(inicio);
    meio.setDate(meio.getDate() + Math.ceil(dias / 2));
    const antes = new Date(meio);
    antes.setDate(antes.getDate() - 1);
    const esquerda = await lerEventosComFolga(pool, xpaths, inicio, antes, idUsuario, profundidade + 1);
    const direita = await lerEventosComFolga(pool, xpaths, meio, fim, idUsuario, profundidade + 1);
    return [...esquerda, ...direita];
  }
}

function chavesNumericas(chaves) {
  const pares = [];
  for (const chave of chaves ?? []) {
    const nome = String(chave?.nome ?? "").trim();
    if (!/^Id[A-Za-z0-9_]*$/.test(nome)) return [];
    const valores = String(chave?.valor ?? "")
      .split(/[,;]+/)
      .map((valor) => valor.trim())
      .filter(Boolean);
    if (!valores.length || valores.some((valor) => !/^\d+$/.test(valor))) return [];
    for (const valor of valores) pares.push({ nome, valor });
  }
  return pares;
}

function achouInclusao(eventos, pares) {
  return pares.every((par) =>
    eventos.some(
      (evento) =>
        evento.tipo === 1 &&
        (evento.campos ?? []).some((campo) => campo.nome === par.nome && String(campo.valor ?? "") === par.valor),
    ),
  );
}

async function lerEventosNoPeriodo(pool, xpaths, inicio, fim, idUsuario, tipo, chaves, tabela) {
  const doInicio = Number(tipo) === 1 && /^mov_logistica_(house|master)$/i.test(String(tabela ?? ""));
  const ordem = doInicio ? fatiarPeriodo(inicio, fim, 21) : fatiarDoFim(inicio, fim);
  const pares = Number(tipo) === 0 ? chavesNumericas(chaves) : [];
  const eventos = [];
  for (const [de, ate] of ordem) {
    const lote = await lerEventosComFolga(pool, xpaths, de, ate, idUsuario);
    if (Number(tipo) === 1) {
      if (lote.length) return lote;
      continue;
    }
    eventos.push(...lote);
    if (eventos.length >= 60) break;
    if (pares.length && achouInclusao(eventos, pares)) break;
  }
  return eventos;
}

app.post("/api/consulta", async (req, res) => {
  let pool;
  try {
    const filtros = req.body?.filtros ?? {};
    const xpaths = montarXpaths({
      tabela: filtros.tabela,
      tipo: filtros.tipo,
      chaves: filtros.chaves,
    });
    pool = await conectar();
    const container = /maritima_container/i.test(String(filtros.tabela ?? ""));
    const hoje = new Date();
    const inicioPedido = filtros.dataInicio ? new Date(`${filtros.dataInicio}T00:00:00`) : null;
    const fimPedido = filtros.dataTermino ? new Date(`${filtros.dataTermino}T00:00:00`) : hoje;
    let ancora = null;
    const abertura = await aberturaDoProcesso(pool, filtros.processo, filtros.chaves).catch(() => null);
    if (abertura) {
      const inicioAncora = new Date(abertura);
      inicioAncora.setDate(inicioAncora.getDate() - 1);
      ancora = { inicio: inicioAncora, fim: hoje };
    } else if (container) {
      ancora = await aberturaDosContainers(pool, filtros.chaves);
    }
    const inicio = filtros.ancorar && ancora ? ancora.inicio : inicioPedido ?? new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 21);
    const fim = filtros.ancorar && ancora ? ancora.fim : fimPedido;
    let eventos = await lerEventosNoPeriodo(pool, xpaths, inicio, fim, filtros.idUsuario, filtros.tipo, filtros.chaves, filtros.tabela);
    let periodo = { inicio, fim };
    const janelaDiferente = ancora && (!filtros.ancorar || inicio.getTime() !== ancora.inicio.getTime());
    if (!eventos.length && ancora && janelaDiferente) {
      eventos = await lerEventosNoPeriodo(pool, xpaths, ancora.inicio, ancora.fim, filtros.idUsuario, filtros.tipo, filtros.chaves, filtros.tabela);
      periodo = ancora;
    }
    const cadastroAtual = await compararComCadastro(pool, {
      tabela: filtros.tabela,
      chaves: filtros.chaves,
      eventos,
    });
    await enriquecerNomes(pool, eventos, cadastroAtual);
    res.json({
      eventos,
      xpath: xpaths.join(" | "),
      cadastroAtual,
      periodo: { inicio: periodo.inicio.toISOString().slice(0, 10), fim: periodo.fim.toISOString().slice(0, 10) },
      abertura: abertura ? abertura.toISOString().slice(0, 10) : null,
    });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

async function escreverAosPoucos(enviar, texto) {
  const partes = String(texto).match(/\s+|\S+/g) ?? [String(texto)];
  let bloco = "";
  for (const parte of partes) {
    bloco += parte;
    if (bloco.length >= 16 || parte.includes("\n")) {
      enviar({ tipo: "texto", texto: bloco });
      bloco = "";
      await new Promise((resolver) => setTimeout(resolver, 18));
    }
  }
  if (bloco) enviar({ tipo: "texto", texto: bloco });
}

function numeroPedidoRota(mensagens) {
  const usuarios = (Array.isArray(mensagens) ? mensagens : []).filter((item) => item?.role === "user");
  const ultimo = String(usuarios.at(-1)?.content ?? "");
  const numero = ultimo.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i);
  if (!numero) return "";
  const contexto = usuarios.slice(-3).map((item) => String(item.content ?? "")).join("\n");
  const soNumero = ultimo.trim().length <= numero[1].length + 8;
  if (pedeHistorico(ultimo)) return "";
  if (/rota|navio|rastre/i.test(ultimo) || (soNumero && /rota|navio|rastre/i.test(contexto))) return numero[1].toUpperCase();
  return "";
}

function termoDaPessoa(texto) {
  const limpo = String(texto ?? "").trim();
  const login = limpo.match(/^([a-z0-9]+(?:[._][a-z0-9]+)+)$/i);
  if (login) return login[1];
  const naoPessoa = /^(hoje|ontem|agora|todos|todas|tarefa|tarefas|atividade|atividades|projeto|projetos|processo|processos|log|monitoramento|monitoramentos|embarque|desembarque|entrega|proposta|taxa|taxas|fatura|faturas|cliente|clientes|navio|rota|sistema|tabela|campo|semana|m[eê]s|dia)$/i;
  const re = /\b(?:da|do|de)\s+([\p{L}][\p{L}.-]{1,40}(?:\s+[\p{L}][\p{L}.-]{1,40})?)/giu;
  for (const achado of limpo.matchAll(re)) {
    const nome = achado[1].replace(/\s+(?:de|do|da|hoje|ontem)$/iu, "").trim();
    if (nome && !naoPessoa.test(nome)) return nome;
  }
  return "";
}

function pedidoLogDePessoa(mensagens) {
  const falas = (Array.isArray(mensagens) ? mensagens : [])
    .filter((item) => item?.role === "user")
    .map((item) => String(item.content ?? "").trim())
    .filter(Boolean);
  const ultimo = falas.at(-1) ?? "";
  if (!ultimo || /\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/.test(ultimo)) return null;
  if (/monitorament|projeto de tarefas|\batividades?\b/i.test(ultimo)) return null;
  const contexto = falas.slice(-4).join("\n");
  if (!/hist[oó]rico|\blog\b|altera/i.test(contexto)) return null;
  const usuario = termoDaPessoa(ultimo);
  if (!usuario) return null;
  return { usuario, hoje: /\bhoje\b/i.test(contexto) };
}

function pedidoContinuacao(mensagens) {
  const lista = Array.isArray(mensagens) ? mensagens : [];
  const usuarios = lista.filter((item) => item?.role === "user");
  const ultimo = String(usuarios.at(-1)?.content ?? "");
  const numero = ultimo.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i);
  if (!numero || ultimo.trim().length > numero[1].length + 8) return null;
  let assunto = "";
  for (let i = usuarios.length - 2; i >= 0; i--) {
    const texto = String(usuarios[i]?.content ?? "");
    const achado = texto.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i);
    const soNumero = achado && texto.trim().length <= achado[1].length + 8;
    if (!soNumero && texto.trim()) {
      assunto = texto;
      break;
    }
  }
  if (!assunto) return null;
  const n = numero[1].toUpperCase();
  if (/campo(?:s)? livres?/i.test(assunto) && !/quem (?:alter|inclu|mud)|hist[oó]rico/i.test(assunto)) {
    return { nome: "documental_ce", args: { foco: "campos", numero: n } };
  }
  if (/documental/i.test(assunto) && /atividade|envolvid|liberad|falta para concluir/i.test(assunto)) {
    return { nome: "documental_ce", args: { foco: "processo", caso: "ambos", numero: n } };
  }
  if (pedeHistorico(assunto)) return null;
  if (/rota|navio|rastre/i.test(assunto)) return { nome: "rota_processo", args: { numero: n } };
  if (/acompanhament/i.test(assunto)) return { nome: "acompanhamentos_processo", args: { numero: n } };
  if (/proposta|oferta/i.test(assunto)) return { nome: "proposta_processo", args: { numero: n } };
  if (/\btaxas?\b/i.test(assunto)) return { nome: "taxas_processo", args: { numero: n } };
  if (/o que mudou|últimos 30 dias|ultimos 30 dias/i.test(assunto)) return { nome: "o_que_mudou", args: { numero: n } };
  if (/resumo/i.test(assunto)) return { nome: "resumo_processo", args: { numero: n } };
  return null;
}

app.post("/api/chat", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const enviar = (evento) => res.write(`data: ${JSON.stringify(evento)}\n\n`);
  const controle = new AbortController();
  let encerrado = false;
  res.on("close", () => {
    if (!encerrado) controle.abort();
  });
  try {
    const emailChat = emailDaSessao(req);
    const acessoChat = permissaoDe(emailChat);
    if (acessoChat.removida) {
      encerrado = true;
      enviar({ tipo: "erro", erro: "Seu acesso à IA foi removido." });
      res.end();
      return;
    }
    if (req.body?.relatorio && !acessoChat.fazerRelatorio) {
      encerrado = true;
      enviar({ tipo: "erro", erro: "Seu acesso não permite ver nem extrair relatórios." });
      res.end();
      return;
    }
    const mensagens = Array.isArray(req.body?.mensagens) ? req.body.mensagens : [];
    const jaConsultou = mensagens.some((m) => m.role === "tool");
    const pedido = [...mensagens].reverse().find((m) => m.role === "user")?.content;
    if (!jaConsultou && pedido && !req.body?.relatorio) {
      const direta = await responderPorRegra(conectar, pedido);
      if (direta) {
        encerrado = true;
        await escreverAosPoucos(enviar, direta);
        enviar({ tipo: "fim", mensagem: { role: "assistant", content: direta } });
        res.end();
        return;
      }
      const continua = pedidoContinuacao(mensagens);
      const numeroRota = continua ? "" : numeroPedidoRota(mensagens);
      if (continua) {
        const poolDoc = await conectar();
        try {
          const resultado = await executarFuncao(poolDoc, continua.nome, continua.args, {
            recorte: {},
            email: emailChat,
            nome: nomeDaSessao(req),
            acesso: acessoChat,
          });
          const texto = typeof resultado?.texto === "string" ? resultado.texto : "";
          if (texto) {
            encerrado = true;
            await escreverAosPoucos(enviar, texto);
            enviar({ tipo: "fim", mensagem: { role: "assistant", content: texto } });
            res.end();
            return;
          }
        } finally {
          await poolDoc.close().catch(() => {});
        }
      }
      if (numeroRota) {
        const poolRota = await conectar();
        try {
          const resultado = await executarFuncao(poolRota, "rota_processo", { numero: numeroRota }, {
            recorte: {},
            email: emailChat,
            nome: nomeDaSessao(req),
            acesso: acessoChat,
          });
          const texto = typeof resultado?.texto === "string" ? resultado.texto : "";
          if (texto) {
            encerrado = true;
            await escreverAosPoucos(enviar, texto);
            enviar({ tipo: "fim", mensagem: { role: "assistant", content: texto } });
            res.end();
            return;
          }
        } finally {
          await poolRota.close().catch(() => {});
        }
      }
    }
    let perfil = { encontrado: false, setor: "geral", cargo: "", semComissao: false, papeis: [] };
    try {
      const poolSetor = await conectar();
      try {
        perfil = await perfilDaConta(poolSetor, emailChat, nomeDaSessao(req));
      } finally {
        await poolSetor.close().catch(() => {});
      }
    } catch {
      perfil = { encontrado: false, setor: "geral", cargo: "", semComissao: false, papeis: [] };
    }
    const pedida = String(req.body?.visao ?? "");
    const visao = setorEfetivo(acessoChat, perfil.setor, pedida);
    const ultimaPergunta = [...mensagens].reverse().find((m) => m.role === "user")?.content ?? "";
    const anterior = mensagens.filter((m) => m.role === "user").slice(-2, -1)[0]?.content;
    if (pareceCorrecao(ultimaPergunta) && anterior) registrarCorrecao(emailChat, anterior, ultimaPergunta);
    const pedeMonitoramento = /monitorament/i.test(ultimaPergunta) && /tarefa|atividade/i.test(ultimaPergunta);
    if (!jaConsultou && pedeMonitoramento && visao === "ti" && !req.body?.relatorio) {
      const poolMonitor = await conectar();
      try {
        const resultado = await executarFuncao(poolMonitor, "monitoramentos_alterados", { dias: 7 }, {
          recorte: recorteDaVisao(visao, perfil),
          email: emailChat,
          nome: nomeDaSessao(req),
          acesso: acessoChat,
        });
        const texto = typeof resultado?.texto === "string" ? resultado.texto : "";
        if (texto) {
          encerrado = true;
          await escreverAosPoucos(enviar, texto);
          enviar({ tipo: "fim", mensagem: { role: "assistant", content: texto } });
          res.end();
          return;
        }
      } finally {
        await poolMonitor.close().catch(() => {});
      }
    }
    const pedidoLog = pedidoLogDePessoa(mensagens);
    if (!jaConsultou && pedidoLog && visao === "ti" && !req.body?.relatorio) {
      const poolLog = await conectar();
      try {
        const resultado = await executarFuncao(poolLog, "log_recente", pedidoLog, {
          recorte: recorteDaVisao(visao, perfil),
          email: emailChat,
          nome: nomeDaSessao(req),
          acesso: acessoChat,
        });
        const texto = typeof resultado?.texto === "string" ? resultado.texto : "";
        if (texto) {
          encerrado = true;
          await escreverAosPoucos(enviar, texto);
          enviar({ tipo: "fim", mensagem: { role: "assistant", content: texto } });
          res.end();
          return;
        }
      } finally {
        await poolLog.close().catch(() => {});
      }
    }
    const mensagem = await conversar(mensagens, (texto) => enviar({ tipo: "texto", texto }), {
      completo: Boolean(req.body?.completo),
      relatorio: Boolean(req.body?.relatorio),
      apresentacao: Boolean(req.body?.apresentacao),
      sinal: controle.signal,
      chaves: chavesParaUso(emailChat),
      papel: acessoChat.papel,
      acesso: acessoChat,
      email: emailChat,
      setor: visao === "tudo" ? "admin" : visao,
      modalidade: modalidadeEfetiva(acessoChat, perfil, visao),
    });
    gravarPreferenciaDita(emailChat, mensagem?.content, ultimaPergunta);
    encerrado = true;
    enviar({ tipo: "fim", mensagem });
    res.end();
  } catch (erro) {
    encerrado = true;
    if (!res.writableEnded) {
      if (erro?.name !== "AbortError") enviar({ tipo: "erro", erro: mensagemErro(erro) });
      res.end();
    }
  }
});

const ATALHOS_PRONTOS = [
  ["monitoramentos_alterados", { dias: 7 }, "ti"],
  ["painel_ti", { horas: 24 }, "ti"],
  ["log_recente", { horas: 24 }, "ti"],
  ["log_recente", { horas: 24, tipo: 2 }, "ti"],
  ["fila_setor", {}, "tudo"],
  ["processos_parados", { dias: 7 }, "tudo"],
  ["processos_parados", { dias: 7 }, "operacional"],
  ["prazos", { dias: 7 }, "tudo"],
  ["prazos", { dias: 7 }, "operacional"],
  ["documental_ce", { foco: "fila", caso: "ce" }, "documental"],
  ["documental_ce", { foco: "fila", caso: "im" }, "documental"],
];

async function calcularAtalho(nome, args, visao) {
  const pool = await poolCompartilhado();
  const recorte = recorteDaVisao(visao, { semComissao: false });
  return executarFuncao(pool, nome, args, {
    recorte,
    email: "",
    nome: "",
    acesso: { papel: "admin", fazerLog: true },
    contas: nome === "painel_ti" ? listarContas() : [],
  });
}

let aquecendo = false;
async function aquecerAtalhos() {
  if (aquecendo) return;
  aquecendo = true;
  try {
    for (const [nome, args, visao] of ATALHOS_PRONTOS) {
      const chave = chaveConsulta(nome, args, visao);
      try {
        guardarConsulta(chave, await calcularAtalho(nome, args, visao));
      } catch (erro) {
        console.error(`Atalho ${nome}:`, erro?.message || erro);
      }
    }
    console.log("Atalhos prontos.");
  } finally {
    aquecendo = false;
  }
}

app.post("/api/ia/funcoes", async (req, res) => {
  try {
    const funcao = String(req.body?.funcao ?? "");
    const args = req.body?.args ?? {};
    const visaoPedida = String(req.body?.visao ?? "");
    const email = emailDaSessao(req);
    const acesso = permissaoDe(email);
    const visaoCache = acesso.papel === "admin" ? visaoPedida : "";
    const chave = chaveConsulta(funcao, args, visaoCache);
    const guardado = visaoCache ? consultaEmCache(chave) : null;
    if (guardado?.valor) {
      if (typeof guardado.valor?.sql === "string") registrarConsultaDoPedido(req, funcao, guardado.valor.sql);
      if (!consultaFresca(guardado) && !guardado.atualizando) {
        guardado.atualizando = true;
        calcularAtalho(funcao, args, visaoCache)
          .then((valor) => guardarConsulta(chave, valor))
          .catch(() => {})
          .finally(() => {
            const atual = consultaEmCache(chave);
            if (atual) atual.atualizando = false;
          });
      }
      res.json(guardado.valor);
      return;
    }
    const pool = await poolCompartilhado();
    const recorte = await recorteDoPedido(pool, email, nomeDaSessao(req), visaoPedida);
    const resultado = await executarFuncao(pool, funcao, args, {
      recorte,
      email,
      nome: nomeDaSessao(req),
      acesso,
      contas: funcao === "painel_ti" ? listarContas() : [],
    });
    const visaoReal = recorte.visao === "tudo" ? "tudo" : recorte.visao;
    if (ATALHOS_PRONTOS.some(([nome, , visao]) => nome === funcao && visao === visaoReal)) {
      guardarConsulta(chaveConsulta(funcao, args, visaoReal), resultado);
    }
    const areaUso = visaoReal && visaoReal !== "tudo" ? visaoReal : visaoPedida || "geral";
    const tabelasUso = new Set();
    if (args?.tabela) tabelasUso.add(String(args.tabela));
    const sqlTexto = typeof args?.sql === "string" ? args.sql : "";
    for (const achado of sqlTexto.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/gi)) tabelasUso.add(achado[1]);
    for (const tabela of tabelasUso) registrarUsoVisao(areaUso, tabela, args?.campo);
    if (typeof resultado?.sql === "string") registrarConsultaDoPedido(req, funcao, resultado.sql);
    res.json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.get("/api/processo", async (req, res) => {
  let pool;
  try {
    const numero = String(req.query.numero ?? "").trim();
    if (!/^[A-Za-z0-9./-]{3,30}$/.test(numero)) throw new Error("Número de processo inválido.");
    pool = await conectar();
    const houseReq = pool.request();
    houseReq.input("n", sql.VarChar(30), numero);
    const sqlHouse =
      `SELECT DISTINCT TOP 5
    Lhs.IdLogistica_House AS IdLogistica_House,
    Lhs.IdLogistica_Master AS IdLogistica_Master,
    Lhs.IdProjeto_Atividade AS IdProjeto_Atividade,
    Lhs.Numero_Processo AS Numero_Processo,
    Lhs.Referencia_Cliente AS Referencia_Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    Cli.Nome AS Cliente,
    Imp.Nome AS Importador,
    Exp.Nome AS Exportador,
    Ven.Nome AS Vendedor,
    Sta.Descricao AS Situacao
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Pessoa Imp ON Imp.IdPessoa = Lhs.IdImportador
LEFT OUTER JOIN cad_Pessoa Exp ON Exp.IdPessoa = Lhs.IdExportador
LEFT OUTER JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Lhs.Numero_Processo = @n`;
    const house = await houseReq.query(sqlHouse);
    salvarConsulta(sqlHouse, "localizar_processo");
    registrarConsultaDoPedido(req, "localizar_processo", sqlHouse);
    const masterReq = pool.request();
    masterReq.input("n", sql.VarChar(30), numero);
    const master = await masterReq.query(
      `Select Top 5 IdLogistica_Master, Numero_Processo
       From mov_Logistica_Master Where Numero_Processo = @n`,
    );
    const recorte = await recorteDoPedido(pool, emailDaSessao(req), nomeDaSessao(req), req.query.visao);
    const houseFiltrado = filtrarLinhas(house.recordset, recorte);
    res.json({
      numero,
      sql: sqlHouse.replace("@n", `N'${numero.replace(/'/g, "''")}'`),
      house: houseFiltrado,
      master: master.recordset,
    });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const OCULTAS = /^(xml|Dados|Dados_Arquivo|Dados_Registro|Hash|Senha.*|Arquivo|Imagem|Foto)$/i;
const LIMITE_LINHAS_DADOS = 20;

app.post("/api/dados", async (req, res) => {
  let pool;
  try {
    const tabela = String(req.body?.tabela ?? "").trim();
    if (!IDENT.test(tabela)) throw new Error("Tabela inválida.");
    const filtros = Array.isArray(req.body?.filtros) ? req.body.filtros : [];
    if (!filtros.length) throw new Error("Informe ao menos um filtro campo = valor.");
    pool = await conectar();

    const colsReq = pool.request();
    colsReq.input("t", sql.NVarChar(128), tabela);
    const cols = await colsReq.query(
      `Select Column_Name as Nome, Data_Type as Tipo From Information_Schema.Columns Where Table_Name = @t Order By Ordinal_Position`,
    );
    if (!cols.recordset.length) throw new Error(`Tabela ${tabela} não existe.`);
    const existentes = new Map(cols.recordset.map((c) => [c.Nome.toLowerCase(), c]));

    const pedidas = (Array.isArray(req.body?.colunas) ? req.body.colunas : [])
      .map((c) => existentes.get(String(c).trim().toLowerCase())?.Nome)
      .filter(Boolean)
      .filter((n) => !OCULTAS.test(n) && !/binary|image/i.test(existentes.get(n.toLowerCase()).Tipo))
      .slice(0, 8);
    if (!pedidas.length) {
      throw new Error("Informe até 8 colunas de negócio. Não peça a tabela inteira nem uma lista de códigos Id*.");
    }
    const selecionadas = pedidas;
    const recorte = await recorteDoPedido(pool, emailDaSessao(req), nomeDaSessao(req), req.body?.visao);
    const bloqueio = motivoBloqueio(selecionadas.join(" "), recorte);
    if (bloqueio) throw new Error(bloqueio);

    const consulta = pool.request();
    const where = [];
    const whereVisivel = [];
    filtros.forEach((f, i) => {
      const col = existentes.get(String(f?.campo ?? "").trim().toLowerCase());
      if (!col) throw new Error(`Campo ${f?.campo} não existe em ${tabela}.`);
      const valor = String(f?.valor ?? "").trim();
      if (!valor) throw new Error(`Valor vazio para ${col.Nome}.`);
      consulta.input(`f${i}`, sql.NVarChar(200), valor);
      const literal = `N'${valor.replace(/'/g, "''")}'`;
      where.push(f?.contem ? `Tab.[${col.Nome}] Like '%' + @f${i} + '%'` : `Tab.[${col.Nome}] = @f${i}`);
      whereVisivel.push(f?.contem ? `Tab.${col.Nome} Like '%' + ${literal} + '%'` : `Tab.${col.Nome} = ${literal}`);
    });
    const comando = `SELECT TOP ${LIMITE_LINHAS_DADOS}
    ${selecionadas.map((n) => `Tab.[${n}]`).join(",\n    ")}
FROM [${tabela}] Tab
WHERE ${where.join("\n    AND ")}`;
    const r = await consulta.query(comando.replace(/\n/g, " "));
    const sqlVisivel = `SELECT TOP ${LIMITE_LINHAS_DADOS}
    ${selecionadas.map((n) => `Tab.${n} AS ${n}`).join(",\n    ")}
FROM ${tabela} Tab
WHERE ${whereVisivel.join("\n    AND ")}`;
    salvarConsulta(sqlVisivel, "consultar_dados");
    registrarConsultaDoPedido(req, "consultar_dados", sqlVisivel);

    const linhas = r.recordset.map((linha, i) => ({
      id: String(i + 1),
      campos: selecionadas.map((nome) => ({ nome, valor: linha[nome] == null ? "" : linha[nome] instanceof Date ? iso(linha[nome]) : String(linha[nome]).trim() })),
    }));
    await enriquecerNomes(pool, linhas, null);
    res.json({
      tabela,
      sql: sqlVisivel,
      total: linhas.length,
      limite: LIMITE_LINHAS_DADOS,
      linhas: filtrarLinhas(
        linhas.map((l) =>
          Object.fromEntries(
            l.campos
              .filter((c) => c.valor !== "")
              .map((c) => [c.nome, c.valorExibicao ? `${c.valorExibicao} (${c.valor})` : c.valor]),
          ),
        ),
        recorte,
      ),
    });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

app.get("/api/catalogo/tabelas", async (req, res) => {
  let pool;
  try {
    const termo = String(req.query.termo ?? "").trim();
    if (!/^[A-Za-z0-9_]{2,60}$/.test(termo)) throw new Error("Termo inválido (use letras, números ou _).");
    pool = await conectar();
    const r = pool.request();
    r.input("termo", sql.NVarChar(80), `%${termo}%`);
    const tabelas = await r.query(
      `Select TABLE_NAME as Tabela From INFORMATION_SCHEMA.TABLES
       Where TABLE_TYPE = 'BASE TABLE' And TABLE_SCHEMA = 'dbo' And TABLE_NAME Like @termo
       Order By TABLE_NAME`,
    );
    const visao = String(req.query.visao ?? "geral");
    res.json({ tabelas: ordenarTabelas(visao, tabelas.recordset.map((t) => t.Tabela)) });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

app.post("/api/catalogo/colunas", async (req, res) => {
  let pool;
  try {
    const tabelas = (Array.isArray(req.body?.tabelas) ? req.body.tabelas : [])
      .map((t) => String(t).trim().replace(/^dbo\./i, ""))
      .filter((t) => IDENT.test(t))
      .slice(0, 6);
    if (!tabelas.length) throw new Error("Informe ao menos uma tabela.");
    pool = await conectar();
    const r = pool.request();
    const ph = tabelas.map((t, i) => {
      r.input(`t${i}`, sql.NVarChar(128), t);
      return `@t${i}`;
    });
    const colunas = await r.query(
      `Select c.TABLE_NAME as Tabela, c.COLUMN_NAME as Coluna, c.DATA_TYPE as Tipo,
         c.CHARACTER_MAXIMUM_LENGTH as Tamanho, c.IS_NULLABLE as Nulo,
         Case When pk.COLUMN_NAME Is Not Null Then 'PK' Else '' End as Chave,
         fk.REFERENCED_TABLE as Ref_Tabela, fk.REFERENCED_COLUMN as Ref_Coluna
       From INFORMATION_SCHEMA.COLUMNS c
       Left Join (
         Select ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
         From INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
         Join INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
           On tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME And tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
         Where tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
       ) pk On pk.TABLE_SCHEMA = c.TABLE_SCHEMA And pk.TABLE_NAME = c.TABLE_NAME And pk.COLUMN_NAME = c.COLUMN_NAME
       Left Join (
         Select OBJECT_SCHEMA_NAME(fk.parent_object_id) as TABLE_SCHEMA, OBJECT_NAME(fk.parent_object_id) as TABLE_NAME,
           pc.name as COLUMN_NAME, OBJECT_NAME(fk.referenced_object_id) as REFERENCED_TABLE, rc.name as REFERENCED_COLUMN
         From sys.foreign_keys fk
         Join sys.foreign_key_columns fkc On fkc.constraint_object_id = fk.object_id
         Join sys.columns pc On pc.object_id = fkc.parent_object_id And pc.column_id = fkc.parent_column_id
         Join sys.columns rc On rc.object_id = fkc.referenced_object_id And rc.column_id = fkc.referenced_column_id
       ) fk On fk.TABLE_SCHEMA = c.TABLE_SCHEMA And fk.TABLE_NAME = c.TABLE_NAME And fk.COLUMN_NAME = c.COLUMN_NAME
       Where c.TABLE_SCHEMA = 'dbo' And c.TABLE_NAME In (${ph.join(",")})
       Order By c.TABLE_NAME, c.ORDINAL_POSITION`,
    );
    res.json({ colunas: colunas.recordset });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

const LIMITE_LINHAS_SQL = 5000;

function registrarConsultaDoPedido(req, origem, sql) {
  try {
    registrarConsultaFeita({
      email: emailDaSessao(req),
      conversaId: req.body?.conversaId || req.query?.conversaId,
      origem,
      sql,
    });
  } catch {
    /* o registro da consulta não impede a resposta */
  }
}

function semTopDeLista(sql) {
  return sql.replace(/\btop\s+(?!1\b)\d+\s+/gi, "");
}

app.post("/api/sql", async (req, res) => {
  let pool;
  try {
    const texto = semTopDeLista(String(req.body?.sql ?? "").trim().replace(/;\s*$/, ""));
    if (!texto) throw new Error("SQL vazio.");
    if (/\blimit\s+\d/i.test(texto)) throw new Error("No SQL Server use TOP, não LIMIT.");
    if (/select\s+(top\s+\d+\s+)?\*\s+from/i.test(texto)) {
      throw new Error("Não use SELECT *. Leia as colunas com listar_colunas e selecione só as necessárias.");
    }
    pool = await conectar();
    const recorte = await recorteDoPedido(pool, emailDaSessao(req), nomeDaSessao(req), req.body?.visao);
    const bloqueio = motivoBloqueio(texto, recorte);
    if (bloqueio) throw new Error(bloqueio);
    const nomeado = await nomearSql(pool, texto).catch(() => texto);
    const consultar = async (comando) => {
      const pedido = pool.request();
      pedido.timeout = 60000;
      const aoFechar = () => {
        if (!res.writableEnded) pedido.cancel();
      };
      res.on("close", aoFechar);
      try {
        return await pedido.query(comando);
      } finally {
        res.off("close", aoFechar);
      }
    };
    let r;
    let sqlExecutado = nomeado;
    try {
      r = await consultar(nomeado);
    } catch (erro) {
      if (nomeado !== texto) {
        sqlExecutado = texto;
        r = await consultar(texto);
      } else if (/cannot be selected as DISTINCT/i.test(erro?.message || "")) {
        sqlExecutado = texto.replace(/\bdistinct\b/i, "");
        r = await consultar(sqlExecutado);
      } else {
        throw erro;
      }
    }
    salvarConsulta(sqlExecutado, "executar_sql");
    registrarConsultaDoPedido(req, "executar_sql", sqlExecutado);
    const linhas = r.recordset ?? [];
    res.json({
      sql: sqlExecutado,
      total: linhas.length,
      truncado: linhas.length > LIMITE_LINHAS_SQL,
      linhas: filtrarLinhas(
        linhas.slice(0, LIMITE_LINHAS_SQL).map((l) =>
          Object.fromEntries(Object.entries(l).map(([k, v]) => [k, v instanceof Date ? iso(v) : v])),
        ),
        recorte,
      ),
    });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  } finally {
    await pool?.close().catch(() => {});
  }
});

app.get("/api/ia/uso", async (req, res) => {
  if (permissaoDe(emailDaSessao(req)).papel !== "admin") {
    return res.status(403).json({ disponivel: false });
  }
  const chave = process.env.OLLAMA_API_KEY;
  if (!chave) return res.json({ disponivel: false });
  try {
    const resp = await fetch("https://ollama.com/api/usage?range=30d", {
      headers: { Authorization: `Bearer ${chave}` },
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(resp.status).json({ disponivel: false });
    const totais = dados.totals ?? {};
    const entrada = Number(totais.input_tokens) || 0;
    const saida = Number(totais.output_tokens) || 0;
    res.json({
      disponivel: true,
      periodo: "30 dias",
      pedidos: Number(totais.request_count) || 0,
      entrada,
      saida,
      cache: Number(totais.cached_input_tokens) || 0,
      total: entrada + saida,
      usd: Number(totais.usage_usd) || 0,
    });
  } catch {
    res.json({ disponivel: false });
  }
});

function modalidadeEfetiva(acesso, perfil, visao) {
  if (acesso?.papel === "admin") return "";
  const manual = String(acesso?.modalidadeManual ?? "auto");
  if (visao === "gerencia") return ["IA", "EA", "IM", "EM"].includes(manual) ? manual : "";
  if (visao !== "operacional") return "";
  if (manual === "todas") return "";
  if (["IA", "EA", "IM", "EM"].includes(manual)) return manual;
  const detectada = String(perfil?.modalidade ?? "");
  return ["IA", "EA", "IM", "EM"].includes(detectada) ? detectada : "";
}

function setorEfetivo(acesso, perfilSetor, visaoPedida) {
  if (acesso?.papel === "admin") {
    const pedida = String(visaoPedida ?? "");
    return ["inside", "comercial", "operacional", "documental", "tudo", "ti", "financeiro", "gerencia"].includes(pedida) ? pedida : "tudo";
  }
  if (["inside", "comercial", "operacional", "documental", "financeiro", "gerencia"].includes(acesso?.setorManual)) return acesso.setorManual;
  return perfilSetor || "geral";
}

function emailDaConta(valor) {
  const email = String(valor ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 180) return "";
  return email;
}

function emailDaSessao(req) {
  return req.conta.email;
}

function nomeDaSessao(req) {
  return req.conta.nome;
}

async function recorteDoPedido(pool, email, nome, visaoPedida) {
  const conta = emailDaConta(email);
  const acesso = conta ? permissaoDe(conta) : { papel: "usuario" };
  let perfil = { setor: "geral", semComissao: false };
  if (conta) {
    try {
      perfil = await perfilDaConta(pool, conta, nome);
    } catch {
      perfil = { setor: "geral", semComissao: false };
    }
  }
  const pedida = String(visaoPedida ?? "");
  const visao = setorEfetivo(acesso, perfil.setor, pedida);
  return { ...recorteDaVisao(visao, perfil), modalidade: modalidadeEfetiva(acesso, perfil, visao) };
}

app.get("/api/conversas", (req, res) => {
  const email = emailDaSessao(req);
  res.json({ conversas: listarConversas(email, req.query.q) });
});

app.post("/api/conversas", (req, res) => {
  const email = emailDaSessao(req);
  res.json(criarConversa(email, String(req.body?.titulo ?? "Nova conversa")));
});

app.get("/api/conversas/:id", (req, res) => {
  const email = emailDaSessao(req);
  const conversa = lerConversa(req.params.id, email);
  if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada." });
  res.json(conversa);
});

app.put("/api/conversas/:id", (req, res) => {
  const email = emailDaSessao(req);
  const salva = salvarConversa(req.params.id, email, req.body?.titulo, req.body?.mensagens);
  if (!salva) return res.status(404).json({ erro: "Conversa não encontrada." });
  res.json(salva);
});

app.delete("/api/conversas", (req, res) => {
  apagarConversas(emailDaSessao(req));
  res.json({ ok: true });
});

app.delete("/api/conversas/:id", (req, res) => {
  const email = emailDaSessao(req);
  if (!apagarConversa(req.params.id, email)) return res.status(404).json({ erro: "Conversa não encontrada." });
  res.json({ ok: true });
});

app.get("/api/acesso", async (req, res) => {
  let email;
  let acesso;
  try {
    email = emailDaSessao(req);
    acesso = permissaoDe(email);
    registrarConta(email, nomeDaSessao(req));
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
    return;
  }
  if (acesso.removida) return res.status(403).json({ erro: "Seu acesso à IA foi removido.", removida: true });
  let perfil = { encontrado: false, setor: "geral", cargo: "", semComissao: false, papeis: [] };
  let pool;
  try {
    pool = await conectar();
    perfil = await perfilDaConta(pool, email, nomeDaSessao(req));
  } catch {
    perfil = { encontrado: false, setor: "geral", cargo: "", semComissao: false, papeis: [] };
  } finally {
    await pool?.close().catch(() => {});
  }
  const setor = acesso.papel === "admin" ? perfil.setor : setorEfetivo(acesso, perfil.setor, "");
  const modalidade = modalidadeEfetiva(acesso, perfil, setor);
  res.json({ ...perfil, ...acesso, setor, modalidade, papel: acesso.papel });
});

app.get("/api/contas", (req, res) => {
  const email = emailDaSessao(req);
  if (permissaoDe(email).papel !== "admin") return res.status(403).json({ erro: "Só o administrador gerencia as contas." });
  res.json({ contas: listarContas() });
});

app.delete("/api/contas", (req, res) => {
  const email = emailDaSessao(req);
  if (permissaoDe(email).papel !== "admin") return res.status(403).json({ erro: "Só o administrador gerencia as contas." });
  if (emailDaConta(req.query.email) === email) return res.status(400).json({ erro: "Você não pode remover a própria conta." });
  try {
    res.json({ contas: apagarConta(req.query.email) });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.put("/api/contas", (req, res) => {
  const email = emailDaSessao(req);
  if (permissaoDe(email).papel !== "admin") return res.status(403).json({ erro: "Só o administrador gerencia as contas." });
  try {
    res.json({ contas: salvarConta(req.body?.email, req.body ?? {}) });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.get("/api/chaves", (req, res) => {
  const email = emailDaSessao(req);
  res.json({ chaves: listarChaves(email) });
});

app.post("/api/chaves", (req, res) => {
  const email = emailDaSessao(req);
  if (permissaoDe(email).papel !== "admin") return res.status(403).json({ erro: "Só o administrador gerencia as chaves." });
  try {
    res.json({ chaves: criarChave(email, req.body ?? {}) });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.delete("/api/chaves/:id", (req, res) => {
  const email = emailDaSessao(req);
  if (permissaoDe(email).papel !== "admin") return res.status(403).json({ erro: "Só o administrador gerencia as chaves." });
  if (!apagarChave(req.params.id, email)) return res.status(404).json({ erro: "Chave não encontrada." });
  res.json({ chaves: listarChaves(email) });
});

app.get("/api/sqlite", (req, res) => {
  if (permissaoDe(emailDaSessao(req)).papel !== "admin") return res.status(403).json({ erro: "Só o administrador vê o SQLite." });
  res.json({ bancos: listarSqlite() });
});

app.get("/api/sqlite/linhas", (req, res) => {
  if (permissaoDe(emailDaSessao(req)).papel !== "admin") return res.status(403).json({ erro: "Só o administrador vê o SQLite." });
  try {
    res.json(lerTabelaSqlite(req.query.arquivo, req.query.tabela, req.query.pagina));
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.get("/api/sqlite/linha", (req, res) => {
  if (permissaoDe(emailDaSessao(req)).papel !== "admin") return res.status(403).json({ erro: "Só o administrador vê o SQLite." });
  try {
    res.json(lerLinhaSqlite(req.query.arquivo, req.query.tabela, req.query.linha));
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

function gravarPreferenciaDita(email, texto, pergunta) {
  const dito = String(texto ?? "");
  if (!email || !/salvei|guardei|anotei|prefer[eê]ncia salva/i.test(dito)) return;
  const regra = dito.replace(/^[\s\S]*?prefer[eê]ncia:\s*/i, "").replace(/\s+/g, " ").trim().slice(0, 400);
  const observacao = regra && regra.length < dito.length ? regra : String(pergunta ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!observacao) return;
  try {
    lembrarUsuario(email, { termo: observacao.slice(0, 80), observacao });
  } catch {
    /* a memória da conversa não pode derrubar a resposta */
  }
}

function soAdmin(email) {
  return permissaoDe(email).papel === "admin";
}

async function pendenciasDosEmails(numeros) {
  const lista = [...new Set((numeros ?? []).map((item) => String(item).trim()).filter(Boolean))].slice(0, 12);
  if (!lista.length) return "#### Pendências no processo\n\nNenhum número de processo apareceu nesses e-mails.";
  const pool = await poolCompartilhado();
  const pedido = pool.request();
  lista.forEach((numero, indice) => pedido.input(`n${indice}`, sql.VarChar(30), numero));
  const filtro = lista.map((_, indice) => `@n${indice}`).join(", ");
  const r = await pedido.query(`
    SELECT Lhs.Numero_Processo, Tar.Descricao AS Atividade, Res.Nome AS Responsavel
    FROM mov_Atividade Ati
    JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
    WHERE Lhs.Numero_Processo IN (${filtro})
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND Lhs.Data_Fechamento_Processo IS NULL
    ORDER BY Lhs.Numero_Processo, Tar.Descricao`);
  if (!r.recordset.length) return `#### Pendências no processo\n\nNenhuma atividade aberta em ${lista.join(", ")}.`;
  const porProcesso = new Map();
  for (const linha of r.recordset) {
    const numero = String(linha.Numero_Processo);
    const atual = porProcesso.get(numero) ?? [];
    atual.push(`- ${String(linha.Atividade ?? "Atividade").trim()}${linha.Responsavel ? ` · ${String(linha.Responsavel).trim()}` : ""}`);
    porProcesso.set(numero, atual);
  }
  const blocos = [...porProcesso.entries()].map(([numero, itens]) => `- **${numero}**\n${itens.map((item) => `  ${item}`).join("\n")}`);
  return `#### Pendências no processo\n\n${blocos.join("\n")}`;
}

function saudacaoDoDia(nome) {
  const hora = new Date().getHours();
  const periodo = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = String(nome ?? "").trim().split(" ")[0];
  return primeiro ? `${periodo}, ${primeiro}.` : `${periodo}.`;
}

app.post("/api/gmail/resumo", async (req, res) => {
  try {
    const visao = String(req.body?.visao ?? "");
    const lido = await resumirGmail(await tokenParaGmail(req), visao);
    let pendencias = "";
    if (lido.processos?.length) {
      try {
        pendencias = await pendenciasDosEmails(lido.processos);
      } catch {
        pendencias = "#### Pendências no processo\n\nNão consegui consultar as atividades desses processos agora.";
      }
    }
    const corpo = [lido.texto, pendencias].filter(Boolean).join("\n\n");
    const texto = req.body?.entrada ? `${saudacaoDoDia(nomeDaSessao(req))}\n\nSeparei o que chegou na caixa e o que ficou parado.\n\n${corpo}` : corpo;
    res.json({ texto });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.get("/api/memoria", (req, res) => {
  const memoria = lerMemoria();
  const email = emailDaSessao(req);
  const daPessoa = listarPreferencias(email);
  const termos = new Set(daPessoa.map((item) => item.termo));
  res.json({
    ...memoria,
    preferencias: [...daPessoa, ...memoria.preferencias.filter((item) => !termos.has(item.termo))],
    glossario: listarGlossario(),
  });
});

app.post("/api/memoria", (req, res) => {
  try {
    const { acao, ...dados } = req.body ?? {};
    if (acao === "uso") {
      registrarUso(dados);
      if (dados.visao) registrarUsoVisao(dados.visao, dados.tabela, dados.campo);
      return res.json({ ok: true });
    }
    const email = emailDaSessao(req);
    if (acao === "esquecer") {
      const salvo = esquecerUsuario(email, dados.termo);
      if (soAdmin(email)) esquecer(dados.termo);
      return res.json(salvo);
    }
    if (acao === "editar") {
      const salvo = editarUsuario(email, dados.indice, dados);
      if (soAdmin(email)) editar(dados.indice, dados);
      return res.json(salvo);
    }
    const salvo = lembrarUsuario(email, dados);
    if (soAdmin(email)) lembrar(dados);
    res.json(salvo);
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.post("/api/memoria/importar", (req, res) => {
  try {
    const email = emailDaSessao(req);
    if (!soAdmin(email)) return res.status(403).json({ erro: "Só o administrador grava memória." });
    const corpo = req.body ?? {};
    const preferencias = Array.isArray(corpo.preferencias) ? corpo.preferencias.slice(0, 500) : [];
    const glossario = Array.isArray(corpo.glossario) ? corpo.glossario.slice(0, 500) : [];
    if (!preferencias.length && !glossario.length) {
      return res.status(400).json({ erro: "Esse arquivo não tem preferências nem glossário." });
    }
    let gravadas = 0;
    for (const bruto of preferencias) {
      const item = {
        termo: String(bruto?.termo ?? "").trim(),
        tabela: String(bruto?.tabela ?? "").trim(),
        campo: String(bruto?.campo ?? "").trim(),
        observacao: String(bruto?.observacao ?? "").trim(),
      };
      if (!item.termo && !item.observacao) continue;
      lembrarUsuario(email, item);
      lembrar(item);
      gravadas += 1;
    }
    let termos = 0;
    for (const bruto of glossario) {
      const termo = String(bruto?.termo ?? "").trim();
      const significado = String(bruto?.significado ?? "").trim();
      if (!termo || !significado) continue;
      salvarGlossario(termo, significado);
      termos += 1;
    }
    if (!gravadas && !termos) return res.status(400).json({ erro: "Nenhuma memória válida nesse arquivo." });
    limparCacheAprendizado();
    res.json({ ok: true, preferencias: gravadas, glossario: termos });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.get("/api/glossario", (_req, res) => res.json({ glossario: listarGlossario() }));

app.post("/api/glossario", (req, res) => {
  try {
    if (!soAdmin(emailDaSessao(req))) return res.status(403).json({ erro: "Só o administrador grava memória." });
    res.json({ glossario: salvarGlossario(req.body?.termo, req.body?.significado) });
    limparCacheAprendizado();
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

app.delete("/api/glossario", (req, res) => {
  if (!soAdmin(emailDaSessao(req))) return res.status(403).json({ erro: "Só o administrador grava memória." });
  res.json({ glossario: apagarGlossario(req.query.termo) });
});

app.get("/api/receitas", (req, res) => {
  const receita = receitaServidor(emailDaSessao(req), req.query.visao, req.query.pergunta);
  res.json({ receita });
});

app.post("/api/receitas", (req, res) => {
  guardarReceitaServidor(emailDaSessao(req), req.body?.visao, req.body?.pergunta, req.body?.ferramentas);
  res.json({ ok: true });
});

app.post("/api/falhas", (req, res) => {
  registrarFalha(emailDaSessao(req), req.body?.visao, req.body?.pergunta, req.body?.motivo);
  res.json({ ok: true });
});

app.get("/api/revisao", (req, res) => {
  if (permissaoDe(emailDaSessao(req)).papel !== "admin") return res.status(403).json({ erro: "Só o administrador vê a revisão." });
  res.json({ falhas: revisarFalhas(7), avaliacoes: revisarAvaliacoes(7), placar: placarAvaliacoes(30) });
});

app.post("/api/avaliacao", (req, res) => {
  try {
    registrarAvaliacao(emailDaSessao(req), req.body ?? {});
    res.json({ ok: true });
  } catch (erro) {
    res.status(400).json({ erro: mensagemErro(erro) });
  }
});

function iso(valor) {
  if (!valor) return "";
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toISOString();
}

function mensagemErro(erro) {
  const texto = erro?.message || String(erro);
  if (/ELOGIN|Login failed/i.test(texto)) {
    return "Login recusado. Confira SQL_USER e SQL_PASSWORD no .env.";
  }
  if (/ETIMEOUT|Timeout|failed to complete in/i.test(texto)) {
    return "A consulta demorou demais. Tente um período menor ou menos códigos de uma vez.";
  }
  if (/ECONNREFUSED|Could not connect|Failed to connect/i.test(texto)) {
    return "Não conectou no SQL Server. Ajuste SQL_SERVER no .env (IP/hostname). A porta 1433 local está fechada neste PC.";
  }
  if (/database is locked|SQLITE_BUSY/i.test(texto)) {
    return "O arquivo local de contas está ocupado. Tente de novo em alguns segundos.";
  }
  if (/usage limit|monthly usage/i.test(texto)) {
    return "A cota mensal do Ollama desta chave acabou. Em Configurações, use outra chave, ou aguarde a renovação.";
  }
  return texto;
}

const porta = Number(process.env.PORT || 8787);
const server = app.listen(porta, "0.0.0.0", () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((e) => e && e.family === "IPv4" && !e.internal)
    .map((e) => e.address);
  console.log(`Administradores lidos do .env: ${emailsAdmin().length}`);
  console.log(`API de log em http://localhost:${porta}`);
  for (const ip of ips) console.log(`API na rede em http://${ip}:${porta}`);
  void aquecerAtalhos();
  setInterval(() => void aquecerAtalhos(), 2 * 60 * 1000);
});
server.on("error", (erro) => {
  console.error(erro?.code === "EADDRINUSE" ? `Porta ${porta} já está em uso.` : erro);
  process.exit(1);
});
server.ref();
