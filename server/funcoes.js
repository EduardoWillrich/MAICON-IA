import sql from "mssql";
import { pessoaDaConta } from "./pessoaConta.js";
import { pedidoFichaCliente } from "./pedidoFicha.js";
import { enriquecerNomes } from "./nomes.js";
import { nomeDe, pessoasPorLogin, relogioLog } from "./pessoas.js";
import { nomeProprio } from "./itensCarga.js";
import { montarSelect, parseCamposXml, tabelasDaLinha } from "./query.js";
import { explicarCampoLivre } from "./campoLivre.js";
import { explicarItensCarga } from "./itensCarga.js";
import { relacionamentoFinanceiro, relacionamentoPorClassificacao, relacionamentoPorNomes, textoEncarte, textoEncartes, textoRelacionamento } from "./relacionamento.js";
import { PROCESSO_REAL, SEM_EXCECAO } from "./datasPedido.js";
import { numeroParaConsulta, concluirAtividadeNoHeadCargo, textoDoPreenchimento } from "./headcargoDesktop.js";
import { camposPedidos, guardarExigencia, registrarComandoBot, textoComandosBot, exigenciasDoProcesso } from "./comandosBot.js";
import { requisitosAtividade } from "./requisitosAtividade.js";
import { pesquisarPassagens } from "./passagens.js";
import { atividadesDoProcesso, emailDaAtividade, limparNomeAtividade, partesDoNomeAtividade } from "./modeloAtividade.js";
import { montarPropostaEmail } from "./propostaEmail.js";
import { operacoesBot, textoTarefa } from "./operacoesBot.js";
import { consultaDeAtividade } from "./intencaoAtividade.js";
import { painelExcecoes } from "./inteligenciaOperacional.js";

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
  "tarefa_bot", "rotina_bot", "painel_excecoes", "regras_bot",
  "resumo_processo",
  "ficha_processo",
  "meu_dia",
  "buscar_processos",
  "processos_abertos",
  "acompanhamentos_processo",
  "modelo_followup",
  "email_atividade",
  "pendencias",
  "o_que_mudou",
  "proposta_processo",
  "montar_proposta",
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
  "passagens_aereas",
  "explicar_itens_carga",
  "explicar_campo_livre",
  "andamento_atividade",
  "projeto_tarefas",
  "monitores_campo",
  "gatilhos_atividade",
  "comando_bot",
  "aprendizado_bot",
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

function ehAdmin(ctx) {
  return ctx?.papel === "admin" || ctx?.acesso?.papel === "admin";
}

function numeroDe(valor, ctx) {
  const pedido = numeroParaConsulta(valor, ehAdmin(ctx));
  if (!pedido.ok) throw new Error(pedido.erro);
  if (pedido.numero) return pedido.numero;
  const numero = String(valor ?? "").trim();
  if (!NUMERO.test(numero)) throw new Error("Informe o número do processo, como IM5328-26.");
  return numero;
}

export function sufixoDoAno(valor, agora = new Date()) {
  const bruto = String(valor ?? "").trim();
  if (/^(19|20)\d{2}$/.test(bruto)) return bruto.slice(-2);
  if (/^\d{2}$/.test(bruto)) return bruto;
  return String(agora.getFullYear()).slice(-2);
}

export function anoCheio(sufixo) {
  const n = Number(sufixo);
  if (!Number.isInteger(n) || n < 0 || n > 99) return new Date().getFullYear();
  return n >= 80 ? 1900 + n : 2000 + n;
}

function normalizarCliente(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(s\s*\/\s*a|s\.a\.?|ltda\.?|eireli|epp)\b/gi, " ")
    .replace(/[./]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function escolherCliente(grupos, termo) {
  const lista = (Array.isArray(grupos) ? grupos : [])
    .map((linha) => ({
      nome: String(linha.Nome ?? linha.nome ?? "").trim(),
      abertos: Number(linha.Abertos ?? linha.abertos) || 0,
      semProposta: Number(linha.SemProposta ?? linha.semProposta) || 0,
    }))
    .filter((linha) => linha.nome);
  if (!lista.length) return { tipo: "vazio", cliente: null, outros: [], opcoes: [] };
  const alvo = normalizarCliente(termo);
  const exato = lista.find((linha) => normalizarCliente(linha.nome) === alvo);
  if (exato || lista.length === 1) {
    const cliente = exato || lista[0];
    return { tipo: "unico", cliente, outros: lista.filter((linha) => linha.nome !== cliente.nome), opcoes: [] };
  }
  return { tipo: "ambiguo", cliente: null, outros: [], opcoes: lista };
}

export function textoClientesAmbiguos(termo, opcoes) {
  const linhas = opcoes.map((item) => `- ${item.nome} (${item.abertos} abertos)`);
  return `Encontrei mais de um cliente para "${termo}":\n${linhas.join("\n")}\nQual deles você quer na ficha?`;
}

function chaveDoDia(valor) {
  const curta = dataCurta(valor).slice(0, 10);
  const data = curta.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!data) return null;
  return Date.UTC(Number(data[3]), Number(data[2]) - 1, Number(data[1]));
}

function fraseDoPrazo(dias) {
  if (dias == null) return "Sem previsão";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  if (dias === -1) return "Ontem";
  if (dias < 0) return `Há ${Math.abs(dias)} dias`;
  return `Em ${dias} dias`;
}

export function montarPainelDia(nome, linhas, agora = new Date()) {
  const calendario = calendarioBrasil(agora);
  const hoje = Date.UTC(calendario.ano, calendario.mes - 1, calendario.dia);
  const pessoa = String(nome ?? "").trim();
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" }).format(agora);
  const data = `${String(calendario.dia).padStart(2, "0")}/${String(calendario.mes).padStart(2, "0")}/${calendario.ano}`;
  const grupos = [
    { id: "atrasada", titulo: "Atrasadas", itens: [], ocultos: 0 },
    { id: "hoje", titulo: "Hoje", itens: [], ocultos: 0 },
    { id: "semana", titulo: "Próximos 7 dias", itens: [], ocultos: 0 },
    { id: "depois", titulo: "Mais adiante", itens: [], ocultos: 0 },
    { id: "sem_data", titulo: "Sem previsão", itens: [], ocultos: 0 },
  ];
  const porId = Object.fromEntries(grupos.map((grupo) => [grupo.id, grupo]));
  for (const linha of Array.isArray(linhas) ? linhas : []) {
    const quando = chaveDoDia(linha.Previsao_Termino ?? linha.previsao);
    const dias = quando == null ? null : Math.round((quando - hoje) / 86_400_000);
    const id = dias == null ? "sem_data" : dias < 0 ? "atrasada" : dias === 0 ? "hoje" : dias <= 7 ? "semana" : "depois";
    const grupo = porId[id];
    const item = {
      idAtividade: Number(linha.IdAtividade) || undefined,
      codigo: String(linha.Codigo ?? "").trim(),
      atividade: String(linha.Atividade ?? linha.atividade ?? "Atividade").trim() || "Atividade",
      processo: String(linha.Numero_Processo ?? linha.processo ?? "").trim(),
      cliente: String(linha.Cliente ?? linha.cliente ?? "").trim(),
      quando: quando == null ? "" : dataCurta(linha.Previsao_Termino ?? linha.previsao).slice(0, 10),
      rel: fraseDoPrazo(dias),
      motivo: notaCurta(linha.Motivo ?? linha.motivo),
    };
    grupo.itens.push(item);
  }
  const contar = (id) => {
    const grupo = porId[id];
    return grupo.itens.length + grupo.ocultos;
  };
  return {
    titulo: "Meu dia",
    nome: pessoa,
    sub: pessoa ? `${pessoa} · ${semana}, ${data}` : semana ? `${semana}, ${data}` : data,
    chips: [
      { id: "atrasada", rotulo: "atrasadas", valor: contar("atrasada") },
      { id: "hoje", rotulo: "hoje", valor: contar("hoje") },
      { id: "semana", rotulo: "na semana", valor: contar("semana") },
    ],
    grupos: grupos.filter((grupo) => grupo.itens.length),
    vazio: grupos.every((grupo) => !grupo.itens.length) ? "Nada pendente no seu nome." : "",
  };
}

export function perguntaMeuDia(texto) {
  const chave = String(texto ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "");
  return (
    chave === "como está o meu dia" ||
    chave === "como esta o meu dia" ||
    chave === "o que eu preciso fazer hoje" ||
    chave === "o que preciso fazer hoje"
  );
}

export function textoParaCliente(resumo) {
  const fonte = String(resumo ?? "");
  const processo = fonte.match(/^Processo\s+(\S+)/m)?.[1] || "este processo";
  const cliente = fonte.match(/^Cliente:\s*(.+)$/m)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const situacao = fonte.match(/^Situação:\s*(.+)$/m)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const pendencia = fonte.match(/^Pendência:\s*(?!nenhuma\b)(.+)$/m)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const saudacao = cliente ? `Olá. Sobre o embarque de ${cliente.split(" ")[0]},` : "Olá.";
  const status = situacao ? ` o processo ${processo} está ${situacao}.` : ` segue o processo ${processo}.`;
  const falta = pendencia ? ` Neste momento, ${pendencia}.` : "";
  return `${saudacao}${status}${falta} Se precisar de outra atualização, é só responder esta mensagem.`;
}

function cabecalhoDaFicha(resumo) {
  const fonte = String(resumo ?? "");
  const cliente = fonte.match(/^Cliente:\s*(.+)$/m)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const pendencia = fonte.match(/^Pendência:\s*(.+)$/m)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const nota = fonte.match(/^Último acompanhamento.*$/m)?.[0]?.replace(/\s+/g, " ").trim() || "";
  const data = fonte.match(/^(?:Embarque|Desembarque|Entrega|Previsão de (?:embarque|desembarque|entrega)):\s*.+$/im)?.[0]?.replace(/\s+/g, " ").trim() || "";
  const linhas = [
    cliente ? `Cliente: ${cliente}` : "",
    data ? `Próxima data: ${data}` : "",
    pendencia ? `Pendência: ${pendencia}` : "",
    nota ? nota.replace(/^Último acompanhamento/, "Última nota") : "",
  ].filter(Boolean);
  if (!linhas.length) return "";
  return `Agora\n${linhas.map((item) => `- ${item}`).join("\n")}`;
}

export function passosDaFicha(texto) {
  const fonte = String(texto ?? "");
  const passos = [];
  const pendencia = fonte.match(/^Pendência: (?!nenhuma\b)(.+)$/m);
  if (pendencia) passos.push(`Acompanhar a pendência: ${pendencia[1].replace(/\s+/g, " ").trim()}.`);
  if (/não tem proposta|Proposta: não ligada/i.test(fonte)) passos.push("Vincular a proposta deste processo.");
  if (/CE ainda não liberado|CE não liberado/i.test(fonte)) passos.push("Cobrar a liberação do CE.");
  if (/Último acompanhamento: nenhum/.test(fonte)) passos.push("Registrar um acompanhamento.");
  const previsoes = [...fonte.matchAll(/^Previsão de (embarque|desembarque|entrega):/gim)].map((item) => item[1].toLowerCase());
  if (previsoes.length) passos.push(`Confirmar a previsão de ${previsoes.join(", ")}.`);
  return passos.slice(0, 3);
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

function extrairEmails(valor) {
  const achados = String(valor ?? "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return achados.map((item) => item.toLowerCase());
}

async function emailsDoCliente(pool, idPessoa, extras = []) {
  const lista = extras.flatMap(extrairEmails);
  const id = Number(idPessoa);
  if (Number.isInteger(id) && id > 0) {
    const contatos = await pool.request().input("id", sql.Int, id).query(`
      SELECT EMail, EMail_Pessoal
      FROM cad_Pessoa_Contato
      WHERE IdPessoa = @id
        AND ISNULL(Ativo, 1) = 1`);
    for (const contato of contatos.recordset) {
      lista.push(...extrairEmails(contato.EMail), ...extrairEmails(contato.EMail_Pessoal));
    }
  }
  const vistos = new Set();
  const unicos = [];
  for (const email of lista) {
    if (vistos.has(email)) continue;
    vistos.add(email);
    unicos.push(email);
  }
  return unicos;
}

export async function emailsDoProcesso(pool, numero, ctx) {
  const house = await houseDoProcesso(pool, numeroDe(numero, ctx));
  if (!house) return [];
  const cliente = await pool.request().input("house", sql.Int, house.IdLogistica_House).query(`
    SELECT Cli.EMail, Cli.EMail_Pessoal, Lhs.IdCliente
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    WHERE Lhs.IdLogistica_House = @house`);
  const linha = cliente.recordset[0];
  if (!linha) return [];
  return emailsDoCliente(pool, linha.IdCliente, [linha.EMail, linha.EMail_Pessoal]);
}

async function houseDoProcesso(pool, numero) {
  const r = await pool.request().input("n", sql.VarChar(30), numero).query(`
    SELECT TOP 1 IdLogistica_House, IdLogistica_Master, IdProjeto_Atividade, Numero_Processo
    FROM mov_Logistica_House
    WHERE Numero_Processo = @n`);
  return r.recordset[0] ?? null;
}

async function resumoProcesso(pool, args, recorte, ctx) {
  const numero = numeroDe(args.numero, ctx);
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
  const r = await pool.request().input("t", sql.NVarChar(82), `%${termo}%`).query(comando);
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
    SELECT
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Sta.Descricao AS Situacao,
      Lhs.Data_Abertura_Processo
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    WHERE ${PROCESSO_REAL}
      AND Lhs.Data_Fechamento_Processo IS NULL
      AND ${periodo}
      ${filtroModalidadeSql(recorte)}
    ORDER BY Lhs.Data_Abertura_Processo DESC`;
  const r = await pool.request().query(comando);
  const linhas = r.recordset.map((linha) =>
    [linha.Numero_Processo, String(linha.Cliente ?? "").trim(), String(linha.Situacao ?? "").trim(), dataCurta(linha.Data_Abertura_Processo)]
      .filter(Boolean)
      .join(" · "),
  );
  return consultaPronta(`${titulo}\n${lista(linhas, "Nenhum processo aberto nesse recorte.")}`, comando, r.recordset);
}

async function acompanhamentosProcesso(pool, args, ctx) {
  const numero = numeroDe(args.numero, ctx);
  const house = await houseDoProcesso(pool, numero);
  if (!house) return `Processo ${numero} não encontrado.`;
  const ultimo = args.ultimo === true || args.ultimo === "true" || args.ultimo === 1;
  const r = await pool.request().input("id", sql.Int, house.IdProjeto_Atividade).query(`
    SELECT ${ultimo ? "TOP 1" : ""}
      A.Data,
      A.Descricao,
      R.Nome AS Responsavel
    FROM mov_Acompanhamento A
    LEFT JOIN cad_Pessoa R ON R.IdPessoa = A.IdResponsavel
    WHERE A.IdProjeto_Atividade = @id
    ORDER BY A.Data DESC`);
  if (!r.recordset.length) return `Não há acompanhamento para o processo ${numero}.`;
  const notas = r.recordset.map((linha) => {
    const nota = String(linha.Descricao ?? "").replace(/\s+/g, " ").trim().replace(/\*/g, "\\*");
    const quem = String(linha.Responsavel ?? "").trim();
    const quando = dataCurta(linha.Data);
    const cabeca = [`**${quando || "Nota"}**`, quem].filter(Boolean).join(" · ");
    return [cabeca, nota].filter(Boolean).join("\n\n");
  });
  return [`**Processo ${numero}**`, ...notas].join("\n\n");
}

function lugarFollowup(nome, sigla) {
  const cidade = String(nome ?? "").trim();
  const codigo = String(sigla ?? "").trim();
  if (cidade && codigo) return `${cidade} (${codigo})`;
  return cidade || codigo;
}

function marcoFollowup(nome, real, previsto) {
  const feito = dataCurta(real);
  if (feito) return { nome, valor: feito, previsto: false };
  const previa = dataCurta(previsto);
  if (previa) return { nome, valor: previa, previsto: true };
  return null;
}

async function modeloFollowup(pool, args, ctx) {
  const numero = numeroDe(args.numero, ctx);
  const house = await houseDoProcesso(pool, numero);
  if (!house) return `Processo ${numero} não encontrado.`;
  const cabeca = await pool.request().input("house", sql.Int, house.IdLogistica_House).query(`
    SELECT TOP 1
      Lhs.Numero_Processo,
      Lhs.Referencia_Cliente,
      Lhs.Conhecimentos AS HBL,
      Lhs.Tipo_Frete,
      Lhs.Peso_Bruto,
      Lhs.Quantidade_Volumes,
      Lhs.Metros_Cubicos,
      Cli.Nome AS Cliente,
      Lhs.IdCliente,
      Cli.EMail AS Email_Cliente,
      Cli.EMail_Pessoal AS Email_Pessoal,
      Imp.Nome AS Importador,
      Exp.Nome AS Exportador,
      Sta.Descricao AS Situacao,
      Ori.Nome AS Origem,
      Ori.Sigla AS Origem_Sigla,
      Des.Nome AS Destino,
      Des.Sigla AS Destino_Sigla,
      Fin.Nome AS Destino_Final,
      Nav.Nome AS Navio,
      Lmm.Viagem_Navio,
      Cia.Nome AS Companhia,
      Nvo.Nome AS Nvocc,
      Ter.Nome AS Terminal,
      Mer.Nome AS Mercadoria,
      Mer.Nome_Internacional AS Mercadoria_Ingles,
      Lms.Numero_Conhecimento,
      Lms.Numero_Reserva,
      Lms.Modalidade_Pagamento,
      Lmh.Numero_CE,
      Lmh.Containers,
      Lms.Data_Previsao_Embarque,
      Lms.Data_Embarque,
      Lms.Data_Previsao_Desembarque,
      Lms.Data_Desembarque,
      Lhs.Data_Previsao_Entrega,
      Lhs.Data_Entrega
    FROM mov_Logistica_House Lhs
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Pessoa Imp ON Imp.IdPessoa = Lhs.IdImportador
    LEFT JOIN cad_Pessoa Exp ON Exp.IdPessoa = Lhs.IdExportador
    LEFT JOIN cad_Pessoa Nvo ON Nvo.IdPessoa = Lhs.IdNVOCC
    LEFT JOIN cad_Mercadoria Mer ON Mer.IdMercadoria = Lhs.IdMercadoria
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    LEFT JOIN mov_Logistica_Maritima_Master Lmm ON Lmm.IdLogistica_Master = Lhs.IdLogistica_Master
    LEFT JOIN cad_Navio Nav ON Nav.IdNavio = Lmm.IdNavio
    LEFT JOIN cad_Pessoa Ter ON Ter.IdPessoa = Lmm.IdTerminal_Atracacao
    LEFT JOIN cad_Origem_Destino Ori ON Ori.IdOrigem_Destino = Lms.IdOrigem
    LEFT JOIN cad_Origem_Destino Des ON Des.IdOrigem_Destino = Lms.IdDestino
    LEFT JOIN cad_Origem_Destino Fin ON Fin.IdOrigem_Destino = Lms.IdDestino_Final
    LEFT JOIN cad_Pessoa Cia ON Cia.IdPessoa = Lms.IdCompanhia_Transporte
    LEFT JOIN mov_Logistica_Maritima_House Lmh ON Lmh.IdLogistica_House = Lhs.IdLogistica_House
    WHERE Lhs.IdLogistica_House = @house`);
  const linha = cabeca.recordset[0];
  if (!linha) return `Processo ${numero} não encontrado.`;
  const caixas = await pool.request().input("house", sql.Int, house.IdLogistica_House).query(`
    SELECT Number
    FROM mov_Logistica_Maritima_Container
    WHERE IdLogistica_House = @house
      AND Number IS NOT NULL
      AND LTRIM(RTRIM(Number)) <> ''`);
  const notas = await pool.request().input("id", sql.Int, house.IdProjeto_Atividade).query(`
    SELECT TOP 30
      A.Data,
      A.Descricao,
      R.Nome AS Responsavel
    FROM mov_Acompanhamento A
    LEFT JOIN cad_Pessoa R ON R.IdPessoa = A.IdResponsavel
    WHERE A.IdProjeto_Atividade = @id
    ORDER BY A.Data DESC`);
  const texto = (valor) => String(valor ?? "").replace(/\s+/g, " ").trim();
  const medida = (valor, casas, sufixo) => {
    if (valor == null || valor === "") return "";
    const n = Number(valor);
    if (!Number.isFinite(n)) return texto(valor);
    const corpo = n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    return sufixo ? `${corpo} ${sufixo}` : corpo;
  };
  const fretes = ["COLLECT", "PREPAID", "PREPAID ABROAD", "COLLECT ABROAD", "OUTRO"];
  const modalidade = (() => {
    const bruto = linha.Tipo_Frete == null || linha.Tipo_Frete === "" ? linha.Modalidade_Pagamento : linha.Tipo_Frete;
    const indice = Number(bruto);
    return Number.isInteger(indice) && fretes[indice] ? fretes[indice] : "";
  })();
  const mercadoria = [texto(linha.Mercadoria), texto(linha.Mercadoria_Ingles)].filter(Boolean).join(" / ");
  const containers = caixas.recordset.map((item) => texto(item.Number)).filter(Boolean).join(", ") || texto(linha.Containers);
  const transporte = texto(linha.Nvocc) ? `${texto(linha.Nvocc)} (COLOADER)` : texto(linha.Companhia);
  const hbl = texto(linha.HBL) || texto(linha.Numero_Conhecimento);
  const hoje = new Date();
  const dataDocumento = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const campo = (label, value) => ({ label, value: texto(value) });
  const emailsCliente = await emailsDoCliente(pool, linha.IdCliente, [linha.Email_Cliente, linha.Email_Pessoal]);
  const modelo = {
    modelo: "Followup",
    numero: texto(linha.Numero_Processo) || numero,
    cliente: texto(linha.Cliente),
    emailCliente: emailsCliente[0] || texto(linha.Email_Cliente),
    emailsCliente,
    referencia: texto(linha.Referencia_Cliente),
    situacao: texto(linha.Situacao),
    origem: lugarFollowup(linha.Origem, linha.Origem_Sigla),
    destino: lugarFollowup(linha.Destino, linha.Destino_Sigla),
    navio: texto(linha.Navio),
    viagem: texto(linha.Viagem_Navio),
    companhia: texto(linha.Companhia),
    conhecimento: texto(linha.Numero_Conhecimento),
    ce: texto(linha.Numero_CE),
    data: dataDocumento,
    campos: [
      campo("Exportador", linha.Exportador),
      campo("Importador", linha.Importador),
      campo("HBL", hbl),
      campo("Navio/Viagem", [texto(linha.Navio), texto(linha.Viagem_Navio)].filter(Boolean).join(" / ")),
      campo("Origem", linha.Origem),
      campo("Destino", linha.Destino),
      campo("CE Mercante", linha.Numero_CE),
      campo("Destino final", linha.Destino_Final),
      campo("Prev. de embarque", dataCurta(linha.Data_Previsao_Embarque)),
      campo("Prev. de desembarque", dataCurta(linha.Data_Previsao_Desembarque)),
      campo("Data de embarque", dataCurta(linha.Data_Embarque)),
      campo("Data de desembarque", dataCurta(linha.Data_Desembarque)),
      campo("Modalidade de frete", modalidade),
      campo("Mercadoria", mercadoria),
      campo("Peso bruto", medida(linha.Peso_Bruto, 2, "Kgs")),
      campo("Qtde de volumes", medida(linha.Quantidade_Volumes, 2, "")),
      campo("Cubagem", medida(linha.Metros_Cubicos, 2, "m3")),
      campo("Term. desova", linha.Terminal),
      campo("Cia de transporte", transporte),
      campo("Containers", containers),
      campo("Booking", linha.Numero_Reserva),
    ],
    marcos: [
      marcoFollowup("Embarque", linha.Data_Embarque, linha.Data_Previsao_Embarque),
      marcoFollowup("Desembarque", linha.Data_Desembarque, linha.Data_Previsao_Desembarque),
      marcoFollowup("Entrega", linha.Data_Entrega, linha.Data_Previsao_Entrega),
    ].filter(Boolean),
    acompanhamentos: notas.recordset.map((item) => ({
      data: dataCurta(item.Data),
      responsavel: texto(item.Responsavel),
      texto: texto(item.Descricao).slice(0, 1800),
    })),
    atividades: await atividadesDoProcesso(pool, house.IdProjeto_Atividade).catch(() => []),
  };
  return `\`\`\`modelo\n${JSON.stringify(modelo)}\n\`\`\``;
}

async function followDaAtividade(pool, pedido) {
  const bloco = await modeloFollowup(pool, { numero: pedido.processo });
  const miolo = String(bloco).match(/```modelo\s*([\s\S]*?)```/i)?.[1];
  if (!miolo) return bloco;
  const modelo = JSON.parse(miolo);
  const nota = String(pedido.nota ?? "").trim();
  if (nota) {
    const hoje = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const data = `${p(hoje.getDate())}/${p(hoje.getMonth() + 1)}/${hoje.getFullYear()}`;
    const atual = Array.isArray(modelo.acompanhamentos) ? modelo.acompanhamentos : [];
    if (atual[0]?.texto !== nota) modelo.acompanhamentos = [{ data, texto: nota }, ...atual];
  }
  if (pedido.assunto) modelo.assunto = String(pedido.assunto).trim();
  return `\`\`\`modelo\n${JSON.stringify(modelo)}\n\`\`\``;
}

async function pendencias(pool, args, ctx) {
  const pessoa = await pessoaDaConta(pool, ctx.email);
  if (!pessoa) return `Não localizei no HeadCargo o cadastro do e-mail ${String(ctx.email ?? "").trim() || "desta conta"}.`;
  const escopo = ["hoje", "atrasadas", "semana", "abertas"].includes(args.escopo) ? args.escopo : "abertas";
  const filtro =
    escopo === "hoje"
      ? "Ati.Previsao_Termino IS NOT NULL AND CAST(Ati.Previsao_Termino AS date) = CAST(GETDATE() AS date)"
      : escopo === "atrasadas"
        ? "Ati.Previsao_Termino IS NOT NULL AND CAST(Ati.Previsao_Termino AS date) < CAST(GETDATE() AS date)"
        : escopo === "abertas"
          ? "(Ati.Previsao_Termino IS NULL OR CAST(Ati.Previsao_Termino AS date) < DATEADD(day, 8, CAST(GETDATE() AS date)))"
          : "Ati.Previsao_Termino IS NOT NULL AND CAST(Ati.Previsao_Termino AS date) >= CAST(GETDATE() AS date) AND CAST(Ati.Previsao_Termino AS date) < DATEADD(day, 8, CAST(GETDATE() AS date))";
  const r = await pool.request().input("id", sql.Int, pessoa.IdPessoa).query(`
    SELECT
      Tar.Descricao AS Atividade,
      Lhs.Numero_Processo,
      Ati.Previsao_Termino
    FROM mov_Atividade Ati
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    WHERE Ati.IdResponsavel = @id
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND ${filtro}
    ORDER BY CASE WHEN Ati.Previsao_Termino IS NULL THEN 1 ELSE 0 END, Ati.Previsao_Termino`);
  const titulo =
    escopo === "hoje"
      ? "Pendências de hoje"
      : escopo === "atrasadas"
        ? "Pendências atrasadas"
        : escopo === "abertas"
          ? "Pendências em aberto"
          : "Pendências dos próximos 7 dias";
  const linhas = r.recordset.map(
    (linha) =>
      `${dataCurta(linha.Previsao_Termino)} · ${String(linha.Numero_Processo ?? "sem processo").trim()} · ${String(linha.Atividade ?? "Atividade").trim()}`,
  );
  return `${titulo} de ${String(pessoa.Nome).trim()}\n${lista(linhas, "Nenhuma pendência nesse recorte.")}`;
}

function rotuloCampoLog(nome) {
  return String(nome ?? "")
    .replace(/^Id(?=[A-Z_])/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function valorLegivelLog(valor) {
  const texto = String(valor ?? "").trim();
  const americano = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}:\d{2})(?::\d{2})?)?$/);
  if (!americano) return texto || "(vazio)";
  const mes = americano[1].padStart(2, "0");
  const dia = americano[2].padStart(2, "0");
  if (Number(americano[1]) > 12) return texto;
  return americano[4] ? `${dia}/${mes}/${americano[3]} ${americano[4]}` : `${dia}/${mes}/${americano[3]}`;
}

async function oQueMudou(pool, args, ctx) {
  if (ctx.acesso?.fazerLog === false && ctx.acesso?.papel !== "admin") {
    return "Este acesso não inclui o histórico de alterações.";
  }
  const numero = numeroDe(args.numero, ctx);
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
    for (const tabela of tabelasDaLinha(linha)) {
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
      const agora = valorLegivelLog(item.valorExibicao || item.valor || "(vazio)");
      const anteriorBruto = item.valorAnteriorExibicao || item.valorAnterior;
      const anterior = anteriorBruto != null && anteriorBruto !== "" ? valorLegivelLog(anteriorBruto) : "";
      const antes = anterior ? `${anterior} → ` : "";
      mudancas.push(`${dataCurta(evento.data)} · ${nomeProprio(evento.usuario) || "usuário"} · ${rotuloCampoLog(item.nome)}: ${antes}${agora}`);
      if (mudancas.length >= 20) break;
    }
    if (mudancas.length >= 20) break;
  }
  const titulo = `Alterações de ${numero} desde ${dataCurta(desde)}${args.campo ? ` no campo ${String(args.campo).trim()}` : ""}`;
  return `${titulo}\n${lista(mudancas, "Nenhuma alteração nesse recorte.")}`;
}

async function propostaProcesso(pool, args, recorte, ctx) {
  if (recorte?.semComercial) return "Proposta e oferta são informação do comercial.";
  const numero = numeroDe(args.numero, ctx);
  const r = await pool.request().input("n", sql.VarChar(30), numero).query(`
    SELECT TOP 1
      Lhs.Numero_Processo,
      Ofe.Numero_Oferta,
      Ofe.Situacao AS Situacao_Oferta,
      Ofe.Data_Validade,
      Pro.Numero_Proposta,
      CASE Pro.Situacao
        WHEN 1 THEN 'Aguardando aprovação'
        WHEN 2 THEN 'Aprovada'
        WHEN 3 THEN 'Não aprovada'
        WHEN 4 THEN 'Não enviada'
        WHEN 5 THEN 'Pré-proposta'
        WHEN 6 THEN 'Enviada'
        ELSE CAST(Pro.Situacao AS varchar(20))
      END AS Situacao_Proposta,
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
    linha.Situacao_Proposta ? `Situação da proposta: ${linha.Situacao_Proposta}` : "",
    linha.Numero_Oferta ? `Oferta: ${linha.Numero_Oferta}` : "Oferta: não ligada.",
    linha.Data_Validade ? `Validade da oferta: ${dataCurta(linha.Data_Validade)}` : "",
  ]);
}

function calendarioBrasil(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const numero = (tipo) => Number(partes.find((item) => item.type === tipo)?.value);
  const ano = numero("year");
  const mes = numero("month");
  const dia = numero("day");
  return { ano, mes, dia, hoje: new Date(ano, mes - 1, dia) };
}

function somarDias(data, dias) {
  const copia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  copia.setDate(copia.getDate() + dias);
  return copia;
}

async function processosDasPropostas(pool, linhas) {
  const ids = [...new Set(linhas.map((linha) => Number(linha.IdProposta_Frete)).filter((id) => id > 0))];
  if (!ids.length) return new Map();
  const request = pool.request();
  request.timeout = 15000;
  const marcas = ids.map((id, indice) => {
    request.input(`p${indice}`, sql.Int, id);
    return `@p${indice}`;
  });
  const lista = marcas.join(", ");
  const r = await request.query(`
    SELECT IdProposta, Numero_Processo
    FROM (
      SELECT IdProposta, Numero_Processo,
        ROW_NUMBER() OVER (
          PARTITION BY IdProposta
          ORDER BY CASE WHEN NULLIF(Numero_Processo, '') IS NULL THEN 1 ELSE 0 END, IdLogistica_House DESC
        ) AS rn
      FROM (
        SELECT Pro.IdProposta_Frete AS IdProposta, H.Numero_Processo, H.IdLogistica_House
        FROM mov_Proposta_Frete Pro
        JOIN mov_Logistica_House H ON H.IdProjeto_Atividade = Pro.IdProjeto_Atividade
        WHERE Pro.IdProposta_Frete IN (${lista})
          AND Pro.IdProjeto_Atividade IS NOT NULL
        UNION ALL
        SELECT O.IdProposta_Frete, H.Numero_Processo, H.IdLogistica_House
        FROM mov_Oferta_Frete O
        JOIN mov_Logistica_House H ON H.IdOferta_Frete = O.IdOferta_Frete
        WHERE O.IdProposta_Frete IN (${lista})
      ) Candidatos
    ) Escolha
    WHERE rn = 1`);
  return new Map(r.recordset.map((linha) => [Number(linha.IdProposta), linha.Numero_Processo || ""]));
}

function periodoPropostas(args) {
  const { ano, mes, hoje } = calendarioBrasil();
  const inicioPedido = parseData(args.inicio);
  const fimPedido = parseData(args.fim);
  if (inicioPedido) {
    const fimBase = fimPedido || inicioPedido;
    const mesmoDia = dataDoPeriodo(inicioPedido) === dataDoPeriodo(fimBase);
    return {
      inicio: inicioPedido,
      fim: somarDias(fimBase, 1),
      rotulo: mesmoDia ? dataDoPeriodo(inicioPedido) : `${dataDoPeriodo(inicioPedido)} a ${dataDoPeriodo(fimBase)}`,
    };
  }
  const quando = String(args.quando ?? "mes").toLowerCase();
  if (quando === "ontem") {
    const inicio = somarDias(hoje, -1);
    return { inicio, fim: hoje, rotulo: `ontem (${dataDoPeriodo(inicio)})` };
  }
  if (quando === "hoje") {
    return { inicio: hoje, fim: somarDias(hoje, 1), rotulo: `hoje (${dataDoPeriodo(hoje)})` };
  }
  if (quando === "semana") {
    const dow = hoje.getDay();
    const inicio = somarDias(hoje, -(dow === 0 ? 6 : dow - 1));
    return { inicio, fim: somarDias(hoje, 1), rotulo: `esta semana (${dataDoPeriodo(inicio)} a ${dataDoPeriodo(hoje)})` };
  }
  const inicio = new Date(ano, mes - 1, 1);
  return { inicio, fim: new Date(ano, mes, 1), rotulo: `este mês (${dataDoPeriodo(inicio)} a ${dataDoPeriodo(hoje)})` };
}

async function propostasPeriodo(pool, args, recorte, ctx) {
  if (recorte?.semComercial) return "Proposta é informação do comercial.";
  const carteira = await idDaCarteira(pool, recorte, ctx);
  if (carteira === 0) return "Não localizei seu cadastro para filtrar as propostas.";
  const { inicio, fim, rotulo } = periodoPropostas(args);
  const abertas = String(args.situacao ?? "todas") !== "todas";
  const request = pool.request();
  request.timeout = 20000;
  request.input("ini", sql.Date, inicio);
  request.input("fim", sql.Date, fim);
  if (carteira) request.input("id", sql.Int, carteira);
  const filtroCarteira = carteira ? "AND Pro.IdVendedor = @id" : "";
  const filtroSituacao = abertas ? "AND Pro.Situacao IN (1, 4, 5, 6)" : "";
  const comando = `
    SELECT
      COUNT(*) OVER() AS Total,
      Pro.IdProposta_Frete,
      Pro.Numero_Proposta,
      CASE Pro.Situacao
        WHEN 1 THEN 'Aguardando aprovação'
        WHEN 2 THEN 'Aprovada'
        WHEN 3 THEN 'Não aprovada'
        WHEN 4 THEN 'Não enviada'
        WHEN 5 THEN 'Pré-proposta'
        WHEN 6 THEN 'Enviada'
        ELSE CAST(Pro.Situacao AS varchar(20))
      END AS Situacao,
      Pro.Data_Proposta AS Data,
      Cli.Nome AS Cliente,
      Ven.Nome AS Vendedor
    FROM mov_Proposta_Frete Pro
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Pro.IdCliente
    LEFT JOIN cad_Pessoa Ven ON Ven.IdPessoa = Pro.IdVendedor
    WHERE Pro.Data_Proposta >= @ini AND Pro.Data_Proposta < @fim
      ${filtroSituacao}
      ${filtroCarteira}
    ORDER BY Pro.Data_Proposta DESC, Pro.Numero_Proposta`;
  const r = await request.query(comando);
  const titulo = abertas ? `Propostas abertas de ${rotulo}` : `Propostas de ${rotulo}`;
  if (!r.recordset.length) {
    return consultaPronta(`${titulo}\nNenhuma proposta nesse período.`, comando, [], { ini: inicio, fim: fim, ...(carteira ? { id: carteira } : {}) });
  }
  const total = Number(r.recordset[0].Total) || r.recordset.length;
  const linhas = r.recordset.map(({ Total: _total, ...resto }) => resto);
  const processos = await processosDasPropostas(pool, linhas.slice(0, 30));
  for (const linha of linhas) {
    linha.Processo = processos.get(Number(linha.IdProposta_Frete)) || "";
    delete linha.IdProposta_Frete;
  }
  const amostra = linhas.slice(0, 30);
  const tabela = [
    "| Proposta | Data | Situação | Cliente | Vendedor | Processo |",
    "| --- | --- | --- | --- | --- | --- |",
    ...amostra.map((linha) =>
      `| ${celula(linha.Numero_Proposta)} | ${celula(dataCurta(linha.Data))} | ${celula(linha.Situacao)} | ${celula(linha.Cliente)} | ${celula(linha.Vendedor)} | ${celula(linha.Processo)} |`,
    ),
  ].join("\n");
  const aviso = total > amostra.length ? `\n\nMostrei ${amostra.length} de ${total}, as mais recentes.` : "";
  return consultaPronta(`${titulo}: ${total}\n\n${tabela}${aviso}`, comando, linhas, {
    ini: inicio,
    fim: fim,
    ...(carteira ? { id: carteira } : {}),
  });
}

async function comissaoPeriodo(pool, args, recorte, ctx) {
  if (recorte?.semComercial || recorte?.semComissao) return "Comissão não faz parte deste acesso.";
  const numero = String(args.numero ?? "").trim();
  const inicio = parseData(args.inicio) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fim = parseData(args.fim) || new Date();
  const request = pool.request();
  request.input("ini", sql.Date, inicio);
  request.input("fim", sql.Date, fim);
  if (numero) {
    request.input("n", sql.VarChar(30), String(numero).trim());
  }
  let filtroPessoa = "";
  if (!["tudo", "financeiro", "gerencia"].includes(recorte?.visao)) {
    const pessoa = await pessoaDaConta(pool, ctx.email, ctx.nome);
    if (!pessoa) return "Não localizei seu cadastro para filtrar a comissão.";
    request.input("id", sql.Int, pessoa.IdPessoa);
    filtroPessoa = "AND (Lhs.IdVendedor = @id OR Com.IdPessoa = @id)";
  }
  const r = await request.query(`
    SELECT
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Pes.Nome AS Comissionado,
      Com.Valor_Comissao,
      Com.Tipo_Comissao
    FROM mov_Logistica_House Lhs
    JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    LEFT JOIN cad_Pessoa Pes ON Pes.IdPessoa = Com.IdPessoa
    WHERE ${numero ? "Lhs.Numero_Processo = @n" : "Lhs.Data_Abertura_Processo >= @ini AND Lhs.Data_Abertura_Processo < DATEADD(day, 1, @fim)"}
      ${filtroPessoa}
    ORDER BY Lhs.Data_Abertura_Processo DESC`);
  const linhas = r.recordset.map(
    (linha) =>
      `${linha.Numero_Processo} · ${String(linha.Cliente ?? "").trim()} · ${String(linha.Comissionado ?? "comissionado").trim()} · ${dinheiro(linha.Valor_Comissao) || "R$ 0,00"}`,
  );
  const titulo = numero
    ? `Comissões do processo ${String(numero).trim()}`
    : `Comissões de processos abertos entre ${dataDoPeriodo(inicio)} e ${dataDoPeriodo(fim)}`;
  return `${titulo}\n${lista(linhas, "Nenhuma comissão nesse recorte.")}`;
}

async function idDaCarteira(pool, recorte, ctx) {
  if (ctx?.acesso?.papel === "admin") return null;
  if (!["comercial", "inside"].includes(recorte?.visao)) return null;
  const pessoa = await pessoaDaConta(pool, ctx?.email, ctx?.nome);
  return pessoa ? Number(pessoa.IdPessoa) || 0 : 0;
}

async function resumoCarteira(pool, foco, recorte, ctx, quando = "") {
  const visao = String(recorte?.visao ?? "");
  const admin = ctx?.acesso?.papel === "admin" || ["tudo", "gerencia", "admin"].includes(visao);
  const carteira = await idDaCarteira(pool, recorte, ctx);
  if (carteira === 0) return "Não localizei seu cadastro para filtrar a carteira.";
  if (!carteira && !admin && !["comercial", "inside"].includes(visao)) return "A carteira de clientes aparece no comercial.";
  const filtro = carteira ? "AND Lhs.IdVendedor = @id" : "";
  const real = PROCESSO_REAL;
  const hoje = quando === "hoje";
  const aberto = hoje
    ? `${real} AND CAST(Lhs.Data_Abertura_Processo AS date) = CAST(GETDATE() AS date)`
    : `${real} AND Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`;
  const pedido = pool.request();
  if (carteira) pedido.input("id", sql.Int, carteira);
  const titulo =
    foco === "sem_proposta"
      ? "Clientes com processo aberto sem proposta"
      : foco === "sem_movimento"
        ? "Clientes sem abrir processo há 90 dias ou mais"
        : hoje
          ? "Clientes com mais processos abertos hoje"
          : "Clientes com mais processos abertos";
  const comando =
    foco === "sem_movimento"
      ? `
    SELECT TOP 20
      LTRIM(RTRIM(Cli.Nome)) AS Nome,
      DATEDIFF(day, MAX(Lhs.Data_Abertura_Processo), CAST(GETDATE() AS date)) AS Qtd,
      (
        SELECT TOP 1 LTRIM(RTRIM(Ven.Nome))
        FROM mov_Logistica_House H
        LEFT JOIN cad_Pessoa Ven ON Ven.IdPessoa = H.IdVendedor
        WHERE H.IdCliente = Cli.IdPessoa
        ORDER BY H.Data_Abertura_Processo DESC
      ) AS Vendedor,
      (
        SELECT TOP 1 H.Numero_Processo
        FROM mov_Logistica_House H
        WHERE H.IdCliente = Cli.IdPessoa
        ORDER BY H.Data_Abertura_Processo DESC
      ) AS Ultimo
    FROM mov_Logistica_House Lhs
    JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    WHERE ${real} ${filtro}
    GROUP BY Cli.IdPessoa, LTRIM(RTRIM(Cli.Nome))
    HAVING MAX(Lhs.Data_Abertura_Processo) < DATEADD(day, -90, CAST(GETDATE() AS date))
    ORDER BY Qtd DESC, Nome`
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
    if (foco === "sem_movimento") {
      const vendedor = String(linha.Vendedor ?? "").trim();
      const ultimo = String(linha.Ultimo ?? "").trim();
      const extra = [vendedor ? `vendedor ${vendedor}` : "", ultimo ? `último ${ultimo}` : ""].filter(Boolean).join(", ");
      const frase = `Olá. Faz ${qtd} dias sem um processo novo${ultimo ? `, o último foi ${ultimo}` : ""}. Posso ajudar no próximo embarque?`;
      return `${nome} · ${qtd} dias sem abrir${extra ? ` · ${extra}` : ""}. Próximo passo: ${frase}`;
    }
    return `${nome} · ${qtd} ${foco === "sem_proposta" ? "sem proposta" : "abertos"}`;
  });
  return consultaPronta(`${titulo}\n${lista(linhas, "Nenhum cliente nesse recorte.")}`, comando, r.recordset, carteira ? { id: carteira } : {});
}

async function processosAbertosCliente(pool, args, recorte, ctx) {
  if (pedidoFichaCliente([{ role: "user", content: ctx?.pergunta || args.perguntaOriginal || "" }])?.perguntar) return "Qual cliente você quer na ficha?";
  const foco = String(args.foco ?? "");
  if (foco === "abertos" || foco === "sem_proposta" || foco === "sem_movimento") {
    return resumoCarteira(pool, foco, recorte, ctx, args.quando);
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
  const real = PROCESSO_REAL;
  const aberto = `${real} AND Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`;
  const pedido = () => {
    const req = pool.request();
    if (carteira) req.input("id", sql.Int, carteira);
    return req;
  };
  const grupos = await pedido().input("t", sql.NVarChar(82), `%${termo}%`).query(`
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
  const escolha = escolherCliente(grupos.recordset, termo);
  if (escolha.tipo === "ambiguo") return textoClientesAmbiguos(termo, escolha.opcoes);
  let nome = escolha.tipo === "unico" ? escolha.cliente.nome : "";
  let abertos = escolha.tipo === "unico" ? escolha.cliente.abertos : 0;
  let semProposta = escolha.tipo === "unico" ? escolha.cliente.semProposta : 0;
  const outros = escolha.tipo === "unico" ? escolha.outros.map((linha) => linha.nome) : [];
  if (!nome) {
    const achado = await pedido().input("t", sql.NVarChar(82), `%${termo}%`).query(`
      SELECT TOP 1 LTRIM(RTRIM(Cli.Nome)) AS Nome
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE Cli.Nome LIKE @t AND ${real} ${filtro} ${modal}
      ORDER BY Lhs.Data_Abertura_Processo DESC`);
    nome = String(achado.recordset[0]?.Nome ?? "").trim();
  }
  if (!nome && termoLivre && termoLivre.toLowerCase() !== termo.toLowerCase()) {
    const amplo = await pedido().input("t", sql.NVarChar(82), `%${termoLivre}%`).query(`
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
    SELECT
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
  const relacao = (await relacionamentoPorNomes(pool, [nome]))[0] || {
    nome,
    nivel: "",
    classificacao: "",
    pagamento: "sem",
    pagamentoTexto: "Sem faturas recentes",
  };
  const amostra = linhas.slice(0, 12);
  const restantes = linhas.length - amostra.length;
  const processos = linhas.length
    ? [
        "Processos abertos",
        ...amostra.map((linha) => `- ${linha}`),
        restantes ? `E mais ${restantes} ${restantes === 1 ? "processo aberto" : "processos abertos"}.` : "",
      ].filter(Boolean).join("\n")
    : "Nenhum processo aberto nos últimos 6 meses.";
  const campos = [
    `**Ficha de ${nome}**`,
    `Relacionamento: ${relacao.classificacao || "sem classificação"}. ${relacao.pagamentoTexto}.`,
    outros.length ? `Também encontrei: ${outros.join(", ")}.` : "",
    vendedor,
    `Abertos: ${abertos}`,
    `Sem proposta: ${semProposta}`,
    casa?.Numero_Processo
      ? `Último processo: ${String(casa.Numero_Processo).trim()}${casa.Data_Abertura_Processo ? `, aberto em ${dataCurta(casa.Data_Abertura_Processo)}` : ""}`
      : "Último processo: não encontrado.",
    recorte?.semComissao ? "" : `Comissão deste mês: ${dinheiro(comissao?.recordset[0]?.Comissao) || "R$ 0,00"}`,
  ].filter(Boolean);
  const texto = [textoEncarte(relacao), campos.join("\n\n"), processos].join("\n\n");
  return consultaPronta(texto, comando, abertosLista.recordset.slice(0, 12), { nome, ...(carteira ? { id: carteira } : {}) });
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
      ? `${PROCESSO_REAL}
      AND Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`
      : `${PROCESSO_REAL}
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -18, CAST(GETDATE() AS date))`;
  const comando = `
    SELECT
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
  const assunto = marcos.join(", ");
  const titulo =
    modo === "realizado"
      ? dias <= 1
        ? `Processos com ${assunto} realizado hoje`
        : `Processos com ${assunto} realizado nos últimos ${dias} dias`
      : modo === "hoje"
        ? `Processos com ${assunto} hoje`
        : `Prazos vencidos ou nos próximos ${dias} dias, do mais próximo para o mais distante (processos dos últimos 6 meses)`;
  const vazio = modo === "janela" ? "Nenhum prazo nesse recorte." : "Nenhum processo nesse recorte.";
  return consultaPronta(`${titulo}\n${lista(linhas, vazio)}`, comando, r.recordset, { dias });
}

async function processosParados(pool, args, recorte) {
  const dias = diasDe(args.dias, 7);
  const comando = `
    SELECT
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
      AND ${PROCESSO_REAL}
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))
      ${filtroModalidadeSql(recorte)}
      AND (Ult.Data IS NULL OR Ult.Data < DATEADD(day, -@dias, GETDATE()))
    ORDER BY CASE WHEN Ult.Data IS NULL THEN 1 ELSE 0 END, Ult.Data`;
  const r = await pool.request().input("dias", sql.Int, dias).query(comando);
  const linhas = r.recordset.map(
    (linha) => `${linha.Numero_Processo} · ${String(linha.Cliente ?? "").trim()} · ${linha.Ultimo ? `último acompanhamento ${dataCurta(linha.Ultimo)}` : "sem acompanhamento"}`,
  );
  return consultaPronta(
    `Processos abertos nos últimos 6 meses sem acompanhamento há ${dias} dias ou mais\n${lista(linhas, "Nenhum processo parado nesse recorte.")}`,
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

function idadeDaFila(dias, responsavel) {
  const n = Number(dias);
  if (!Number.isFinite(n)) return "";
  const tempo = n <= 0 ? "entrou hoje na fila" : n === 1 ? "há 1 dia na fila" : `há ${n} dias na fila`;
  const quem = String(responsavel ?? "").trim();
  return quem ? `${tempo} com ${quem}` : tempo;
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

async function documentalCe(pool, args, ctx) {
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
        DATEDIFF(day, COALESCE(Ati.Data_Inicio, Lhs.Data_Abertura_Processo), CAST(GETDATE() AS date)) AS Dias_Fila,
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
        AND ${PROCESSO_REAL}
        AND Lhs.Numero_Processo LIKE '%-' + @ano
        AND EXISTS (
          SELECT 1
          FROM mov_Projeto_Atividade_Responsavel Pap
          WHERE Pap.IdProjeto_Atividade = Ati.IdProjeto_Atividade
            AND Pap.IdResponsavel = Ati.IdResponsavel
            AND ${filtroDoCaso(caso)}
        )
        AND (@sem = 0 OR ISNULL(Sta.Descricao, '') <> 'CE LIBERADO')
      ORDER BY CASE WHEN Ati.Previsao_Termino IS NULL THEN 1 ELSE 0 END, Ati.Previsao_Termino, Dias_Fila DESC, Lhs.Numero_Processo`;
    const sem = foco === "sem_liberacao" ? 1 : 0;
    const sufixo = sufixoDoAno(args.ano);
    const r = await pool.request().input("sem", sql.Int, sem).input("ano", sql.VarChar(2), sufixo).query(comando);
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
    const linhas = r.recordset.map((linha) => ({
      Processo: linha.Numero_Processo,
      Cliente: String(linha.Cliente ?? "").trim(),
      Atividade: String(linha.Atividade ?? "").trim(),
      Caso: linha.Caso === "IM" ? "IM" : "CE",
      Responsavel: String(linha.Responsavel ?? "").trim(),
      Idade: idadeDaFila(linha.Dias_Fila, linha.Responsavel),
      Situacao: String(linha.Situacao ?? "").trim(),
      Inicio: dataCurta(linha.Previsao_Inicio),
      Termino: dataCurta(linha.Previsao_Termino),
      Falta: foco === "pendencias" ? faltaDaAtividade(linha, String(linha.Situacao ?? "").trim().toUpperCase() === "CE LIBERADO") : "",
    }));
    return consultaPronta(textoRegistros(titulo, linhas, "Nenhuma atividade nesse recorte.", "Ordenado pelo que vence primeiro e, em seguida, pelo que está há mais tempo na fila."), comando, linhas, { sem, ano: sufixo });
  }

  const numero = numeroDe(args.numero, ctx);
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
  const sufixo = sufixoDoAno(args.ano);
  const ano = anoCheio(sufixo);
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
      DATEDIFF(day, COALESCE(Ati.Data_Inicio, Lhs.Data_Abertura_Processo), CAST(GETDATE() AS date)) AS Dias_Fila,
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
      AND ${PROCESSO_REAL}
      AND Lhs.Numero_Processo LIKE '%-' + @ano
      ${setor === "operacional" ? filtroModalidadeSql(recorte) : ""}
    ORDER BY CASE WHEN Ati.Previsao_Termino IS NULL THEN 1 ELSE 0 END, Ati.Previsao_Termino, Dias_Fila DESC, Lhs.Numero_Processo`;
  const r = await pool.request().input("ano", sql.VarChar(2), sufixo).query(comando);
  const linhas = r.recordset.map((linha) => ({
    Processo: linha.Numero_Processo,
    Cliente: String(linha.Cliente ?? "").trim(),
    Papel: String(linha.Papel ?? "").trim(),
    Atividade: String(linha.Atividade ?? "").trim(),
    Responsavel: String(linha.Responsavel ?? "").trim(),
    Inicio: dataCurta(linha.Previsao_Inicio),
    Termino: dataCurta(linha.Previsao_Termino),
    Idade: idadeDaFila(linha.Dias_Fila, linha.Responsavel),
    Motivo: notaCurta(linha.Motivo) || "Motivo não informado",
  }));
  return consultaPronta(textoRegistros(titulo, linhas, `Nenhuma atividade pendente em ${ano}.`, "Ordenado pelo que vence primeiro e, em seguida, pelo que está há mais tempo na fila."), comando, linhas, { ano: sufixo });
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
  const sufixo = sufixoDoAno(args.ano);
  const ano = anoCheio(sufixo);
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
    WHERE Lhs.Numero_Processo LIKE '%-' + @ano
      ${filtroModalidadeSql(recorte)}
      AND Lms.Data_Previsao_Desembarque IS NOT NULL
      AND Lms.Data_Desembarque IS NOT NULL
      AND ABS(DATEDIFF(day, CAST(Lms.Data_Previsao_Desembarque AS date), CAST(Lms.Data_Desembarque AS date))) >= @dias
    ORDER BY ABS(DATEDIFF(day, CAST(Lms.Data_Previsao_Desembarque AS date), CAST(Lms.Data_Desembarque AS date))) DESC, Lhs.Numero_Processo`;
  const r = await pool.request().input("dias", sql.Int, dias).input("ano", sql.VarChar(2), sufixo).query(comando);
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
  return consultaPronta(textoRegistros(`Divergências de desembarque${faixa}`, linhas, `Nenhuma divergência grande de desembarque${faixa} em ${ano}.`, `Processos${faixa} de ${ano} em que o desembarque real difere ${dias} dias ou mais da previsão.`), comando, linhas, { dias, ano: sufixo });
}

async function filaSetor(pool, recorte) {
  if (recorte?.visao !== "tudo" && recorte?.visao !== "gerencia") return "A fila dos setores aparece só na visão de todos os setores e na gerência.";
  const r = await pool.request().query(`
    SELECT
      SUM(CASE WHEN Lhs.Data_Fechamento_Processo IS NULL AND ${PROCESSO_REAL} THEN 1 ELSE 0 END) AS Abertos,
      SUM(CASE WHEN Lhs.Data_Fechamento_Processo IS NULL AND ${PROCESSO_REAL} AND Lhs.IdOferta_Frete IS NULL THEN 1 ELSE 0 END) AS Sem_Proposta
    FROM mov_Logistica_House Lhs
    WHERE ${SEM_EXCECAO}
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`);
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
      AND ${PROCESSO_REAL}
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))
      AND (Ult.Data IS NULL OR Ult.Data < DATEADD(day, -7, GETDATE()))`);
  const prazosVencidos = await pool.request().query(`
    SELECT COUNT(*) AS Total
    FROM mov_Logistica_House Lhs
    LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    WHERE Lhs.Data_Fechamento_Processo IS NULL
      AND ${PROCESSO_REAL}
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
  if (!itens.length) {
    const quem = exibicao ? ` de ${exibicao}` : "";
    return consultaPronta(`Nenhuma alteração${quem} ${hoje ? "hoje" : `nas últimas ${horas} horas`}.`, comando, [], { horas, tipo, tabela, limite, idUsuario });
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

function textoRegistros(titulo, linhas, vazio, nota = "") {
  return juntar([`## ${titulo}`, nota, linhas.length ? tabelaMarkdown(Object.keys(linhas[0]), linhas) : vazio]);
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

async function taxasProcesso(pool, args, ctx) {
  const numero = numeroDe(args.numero, ctx);
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

async function relacionamentoClientes(pool, args = {}) {
  const grupos = await relacionamentoPorClassificacao(pool, args.nivel || args.niveis);
  return consultaPronta(textoRelacionamento(grupos), "", [], {});
}

function contraMesDinheiro(atual, anterior) {
  const diff = (Number(atual) || 0) - (Number(anterior) || 0);
  if (!diff) return "igual ao mês passado";
  const texto = dinheiro(Math.abs(diff)) || "R$ 0,00";
  return diff > 0 ? `${texto} a mais que o mês passado` : `${texto} a menos que o mês passado`;
}

async function painelFinanceiro(pool, args = {}) {
  const inicioMes = "DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)";
  const sqlComissao = `
    SELECT
      SUM(CASE WHEN Lhs.Data_Abertura_Processo >= ${inicioMes} THEN Com.Valor_Comissao ELSE 0 END) AS Comissao,
      SUM(CASE WHEN Lhs.Data_Abertura_Processo < ${inicioMes} THEN Com.Valor_Comissao ELSE 0 END) AS Anterior,
      SUM(CASE WHEN Lhs.Data_Abertura_Processo >= ${inicioMes} THEN 1 ELSE 0 END) AS Qtd_Comissao
    FROM mov_Logistica_House Lhs
    JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
    WHERE ${PROCESSO_REAL}
      AND Lhs.Data_Abertura_Processo >= DATEADD(month, -1, ${inicioMes})
      AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, ${inicioMes})`;
  const sqlTaxas = `
    SELECT TOP 12
      Exb.Nome AS Taxa,
      SUM(Tax.Valor_Pagamento_Total) AS Pagamento,
      SUM(Tax.Valor_Recebimento_Total) AS Recebimento
    FROM mov_Logistica_Taxa Tax
    JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Tax.IdLogistica_House
    LEFT JOIN cad_Taxa_Logistica_Exibicao Exb ON Exb.IdTaxa_Logistica_Exibicao = Tax.IdTaxa_Logistica_Exibicao
    WHERE ${PROCESSO_REAL}
      AND Lhs.Data_Abertura_Processo >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
      AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    GROUP BY Exb.Nome
    ORDER BY SUM(Tax.Valor_Recebimento_Total) DESC`;
  const sqlPrazos = `
    SELECT COUNT(*) AS Qtd
    FROM mov_Logistica_House Lhs
    LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
    WHERE Lhs.Data_Fechamento_Processo IS NULL
      AND ${PROCESSO_REAL}
      AND (
        (Lms.Data_Embarque IS NULL AND Lms.Data_Previsao_Embarque IS NOT NULL AND Lms.Data_Previsao_Embarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
        OR (Lms.Data_Desembarque IS NULL AND Lms.Data_Previsao_Desembarque IS NOT NULL AND Lms.Data_Previsao_Desembarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
        OR (Lhs.Data_Entrega IS NULL AND Lhs.Data_Previsao_Entrega IS NOT NULL AND Lhs.Data_Previsao_Entrega < DATEADD(day, 7, CAST(GETDATE() AS date)))
      )`;
  const [totais, taxas, prazos, relacao] = await Promise.all([
    pool.request().query(sqlComissao),
    pool.request().query(sqlTaxas),
    pool.request().query(sqlPrazos),
    args?.foco === "taxas" ? Promise.resolve([]) : relacionamentoFinanceiro(pool, 6),
  ]);
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
    `- Comissões: ${dinheiro(cabeca.Comissao) || "R$ 0,00"} em ${Number(cabeca.Qtd_Comissao) || 0} lançamentos (${contraMesDinheiro(cabeca.Comissao, cabeca.Anterior)})`,
    `- Prazos de embarque, desembarque ou entrega nos próximos 7 dias: ${Number(prazos.recordset[0]?.Qtd) || 0}`,
    "",
    lista(listaTaxas, "Nenhuma taxa neste mês."),
    "",
    textoEncartes("Relacionamento com o cliente", relacao),
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

async function rotaProcesso(pool, args, ctx) {
  const numero = numeroDe(args.numero, ctx);
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

const MODAL_PROJETO = {
  IM: {
    prefixo: "IM",
    filtro: "L.Modalidade_Maritimo = 1 AND ISNULL(L.Modalidade_Aereo, 0) = 0 AND ISNULL(L.Modalidade_Terrestre, 0) = 0 AND L.Operacao_Importacao = 1 AND ISNULL(L.Operacao_Exportacao, 0) = 0 AND ISNULL(L.Operacao_Nacional, 0) = 0",
  },
  EM: {
    prefixo: "EM",
    filtro: "L.Modalidade_Maritimo = 1 AND ISNULL(L.Modalidade_Aereo, 0) = 0 AND ISNULL(L.Modalidade_Terrestre, 0) = 0 AND ISNULL(L.Operacao_Importacao, 0) = 0 AND L.Operacao_Exportacao = 1 AND ISNULL(L.Operacao_Nacional, 0) = 0",
  },
  IA: {
    prefixo: "IA",
    filtro: "ISNULL(L.Modalidade_Maritimo, 0) = 0 AND L.Modalidade_Aereo = 1 AND ISNULL(L.Modalidade_Terrestre, 0) = 0 AND L.Operacao_Importacao = 1 AND ISNULL(L.Operacao_Exportacao, 0) = 0 AND ISNULL(L.Operacao_Nacional, 0) = 0",
  },
  EA: {
    prefixo: "EA",
    filtro: "ISNULL(L.Modalidade_Maritimo, 0) = 0 AND L.Modalidade_Aereo = 1 AND ISNULL(L.Modalidade_Terrestre, 0) = 0 AND ISNULL(L.Operacao_Importacao, 0) = 0 AND L.Operacao_Exportacao = 1 AND ISNULL(L.Operacao_Nacional, 0) = 0",
  },
};

function modalidadeDaConta(ctx) {
  const valor = String(ctx?.recorte?.modalidade ?? "").trim().toUpperCase();
  return MODAL_PROJETO[valor] ? valor : "";
}

function rotuloSituacaoAtividade(valor) {
  const nomes = { 1: "não iniciada", 2: "em andamento", 3: "em espera", 4: "concluída", 5: "não realizada", 6: "cancelada" };
  return nomes[Number(valor)] || String(valor ?? "").trim();
}

function simNao(valor) {
  if (valor === true || valor === 1 || valor === "1") return "sim";
  if (valor === false || valor === 0 || valor === "0") return "não";
  return "";
}

function camposCitados(xml) {
  const texto = String(xml ?? "").slice(0, 800);
  const nomes = new Set();
  for (const achado of texto.matchAll(/\b([A-Za-z][A-Za-z0-9_]{2,40})\b/g)) {
    const nome = achado[1];
    if (/^(Id|xml|true|false|and|or|not|null)$/i.test(nome)) continue;
    if (nome.includes("_")) nomes.add(nome);
  }
  return [...nomes].slice(0, 8);
}

async function projetoAtivoDaModalidade(pool, modalidade) {
  const modal = MODAL_PROJETO[modalidade];
  if (!modal) return null;
  const r = await pool.request().input("prefixo", sql.VarChar(4), modal.prefixo).query(`
    SELECT TOP 1 P.IdProjeto_Tarefa, P.Codigo, P.Nome
    FROM cad_Projeto_Tarefa P
    JOIN cad_Projeto_Tarefa_Logistica L ON L.IdProjeto_Tarefa = P.IdProjeto_Tarefa
    WHERE L.Ativo = 1
      AND P.Codigo NOT IN ('INATIVO', 'TESTE', 'SEGURO')
      AND ${modal.filtro}
    GROUP BY P.IdProjeto_Tarefa, P.Codigo, P.Nome
    ORDER BY (
      SELECT COUNT(*)
      FROM mov_Logistica_House H
      JOIN mov_Projeto_Atividade Pa ON Pa.IdProjeto_Atividade = H.IdProjeto_Atividade
      WHERE Pa.IdProjeto_Tarefa = P.IdProjeto_Tarefa AND H.Numero_Processo LIKE @prefixo + '%'
    ) DESC, P.Codigo`);
  return r.recordset[0] || null;
}

async function projetosDoPedido(pool, args, ctx) {
  const daConta = modalidadeDaConta(ctx);
  const pedida = String(args.modalidade ?? "").trim().toUpperCase();
  const modalidade = daConta || (MODAL_PROJETO[pedida] ? pedida : "");
  const numero = String(args.numero ?? "").trim();
  if (numero) {
    const processo = numeroDe(numero, ctx);
    const prefixo = processo.slice(0, 2).toUpperCase();
    if (daConta && prefixo !== daConta) return { erro: `Sua modalidade é ${daConta}. O processo ${processo} é de ${prefixo}.` };
    const r = await pool.request().input("n", sql.VarChar(40), processo).query(`
      SELECT TOP 1 P.IdProjeto_Tarefa, P.Codigo, P.Nome, Lhs.Numero_Processo
      FROM mov_Logistica_House Lhs
      JOIN mov_Projeto_Atividade Pa ON Pa.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
      JOIN cad_Projeto_Tarefa P ON P.IdProjeto_Tarefa = Pa.IdProjeto_Tarefa
      WHERE Lhs.Numero_Processo = @n`);
    const linha = r.recordset[0];
    if (!linha) return { erro: `Não encontrei o projeto de tarefas do processo ${processo}.` };
    if (/^(INATIVO|TESTE|SEGURO)$/i.test(String(linha.Codigo ?? "").trim()) && MODAL_PROJETO[prefixo]) {
      const atual = await projetoAtivoDaModalidade(pool, prefixo);
      if (atual) return { projetos: [{ ...atual, Numero_Processo: processo }], processo, modalidade: prefixo };
    }
    return { projetos: [linha], processo, modalidade: MODAL_PROJETO[prefixo] ? prefixo : "" };
  }
  if (!modalidade) return { erro: "Diga o modal IM, IA, EM ou EA, ou o número do processo." };
  const projeto = await projetoAtivoDaModalidade(pool, modalidade);
  if (!projeto) return { erro: `Não encontrei projeto de tarefas ativo para o modal ${modalidade}.` };
  return { projetos: [projeto], modalidade };
}

async function projetoTarefas(pool, args, ctx) {
  if (!ehAdmin(ctx)) return "A aba de atividades e os comandos do bot são só do administrador.";
  const achado = await projetosDoPedido(pool, args, ctx);
  if (achado.erro) return achado.erro;
  const projetos = [];
  for (const projeto of achado.projetos) {
    const tarefas = await pool.request().input("id", sql.Int, Number(projeto.IdProjeto_Tarefa)).query(`
      SELECT Tar.IdTarefa, Tar.Codigo, Tar.Descricao, Prec.Codigo AS Precedente, Prec.Descricao AS Precedente_Nome
      FROM cad_Tarefa Tar
      LEFT JOIN cad_Tarefa Prec ON Prec.IdTarefa = Tar.IdTarefa_Precedente
      WHERE Tar.IdProjeto_Tarefa = @id
        AND ISNULL(Tar.Invisivel_Gerencial, 0) = 0
        AND Tar.Descricao NOT LIKE '%INATIV%'
      ORDER BY Tar.Codigo, Tar.IdTarefa`);
    projetos.push({
      codigo: String(projeto.Codigo ?? "").trim(), nome: String(projeto.Nome ?? "").trim(),
      modalidade: achado.modalidade || "", processo: achado.processo || "",
      tarefas: tarefas.recordset.map((linha) => ({
        id: String(linha.IdTarefa), codigo: String(linha.Codigo ?? "").trim(), nome: String(linha.Descricao ?? "").trim(),
        precedente: String(linha.Precedente ?? "").trim() ? { codigo: String(linha.Precedente).trim(), nome: String(linha.Precedente_Nome ?? "").trim() } : null,
      })),
    });
  }
  return `\`\`\`tarefas\n${JSON.stringify({ projetos })}\n\`\`\``;
}

async function monitoresCampo(pool, args, ctx) {
  if (!ehAdmin(ctx)) return "A aba de atividades e os comandos do bot são só do administrador.";
  const achado = await projetosDoPedido(pool, args, ctx);
  if (achado.erro) return achado.erro;
  const blocos = [];
  for (const projeto of achado.projetos) {
    const id = Number(projeto.IdProjeto_Tarefa);
    const monitores = await pool.request().input("id", sql.Int, id).query(`
      SELECT TOP 40 Descricao, Classe, Ao_Inserir, Ao_Excluir, Ao_Atualizar, Geracao_Atividades, Observacao,
             LEFT(CAST(Dados_Registro AS nvarchar(800)), 800) AS Xml
      FROM cad_Projeto_Tarefa_Monitor
      WHERE IdProjeto_Tarefa = @id AND Ativo = 1
      ORDER BY Descricao`);
    const dasTarefas = await pool.request().input("id", sql.Int, id).query(`
      SELECT TOP 40 Tar.Codigo, Tar.Descricao AS Atividade, M.Geracao_Atividade
      FROM cad_Tarefa_Monitor M
      JOIN cad_Tarefa Tar ON Tar.IdTarefa = M.IdTarefa
      WHERE Tar.IdProjeto_Tarefa = @id
      ORDER BY Tar.Codigo`);
    const doProjeto = monitores.recordset.map((linha) => {
      const quando = [
        simNao(linha.Ao_Inserir) === "sim" ? "ao incluir" : "",
        simNao(linha.Ao_Atualizar) === "sim" ? "ao atualizar" : "",
        simNao(linha.Ao_Excluir) === "sim" ? "ao excluir" : "",
      ].filter(Boolean).join(", ");
      const campos = camposCitados(linha.Xml);
      const gera = simNao(linha.Geracao_Atividades) === "sim" ? " Gera atividade." : "";
      return `- ${String(linha.Descricao ?? "").trim() || "Monitor"}${linha.Classe ? ` (${String(linha.Classe).trim()})` : ""}${quando ? `. Dispara ${quando}` : ""}.${gera}${campos.length ? ` Campos: ${campos.join(", ")}.` : ""}`;
    });
    const dasAtividades = dasTarefas.recordset.map((linha) => {
      const nome = [String(linha.Codigo ?? "").trim(), String(linha.Atividade ?? "").trim()].filter(Boolean).join(" ");
      const gera = simNao(linha.Geracao_Atividade) === "sim" ? " Gera atividade." : "";
      return `- ${nome}.${gera}`;
    });
    const titulo = [String(projeto.Codigo ?? "").trim(), String(projeto.Nome ?? "").trim()].filter(Boolean).join(" ");
    blocos.push(
      `Monitoramentos de campo do projeto ${titulo}\n\n${doProjeto.join("\n") || "Nenhum monitoramento ativo neste projeto."}` +
        (dasAtividades.length ? `\n\nMonitor da atividade\n\n${dasAtividades.join("\n")}` : ""),
    );
  }
  return blocos.join("\n\n");
}

async function gatilhosAtividade(pool, args, ctx) {
  if (!ehAdmin(ctx)) return "A aba de atividades e os comandos do bot são só do administrador.";
  const achado = await projetosDoPedido(pool, args, ctx);
  if (achado.erro) return achado.erro;
  const projetos = [];
  for (const projeto of achado.projetos) {
    const gatilhos = await pool.request().input("id", sql.Int, Number(projeto.IdProjeto_Tarefa)).query(`
      SELECT G.IdTarefa_Gatilho_Situacao, Tar.Codigo, Tar.Descricao AS Atividade, G.Situacao_Atual, G.Situacao_Atualizar,
             G.Gerar_Atividade, G.Observacao, Alvo.Codigo AS Codigo_Alvo, Alvo.Descricao AS Atividade_Alvo
      FROM cad_Tarefa_Gatilho_Situacao G
      JOIN cad_Tarefa Tar ON Tar.IdTarefa = G.IdTarefa
      LEFT JOIN cad_Tarefa Alvo ON Alvo.IdTarefa = G.IdTarefa_Atualizar
      WHERE Tar.IdProjeto_Tarefa = @id
      ORDER BY Tar.Codigo, G.Situacao_Atual, Alvo.Codigo, G.IdTarefa_Gatilho_Situacao`);
    projetos.push({
      codigo: String(projeto.Codigo ?? "").trim(), nome: String(projeto.Nome ?? "").trim(),
      gatilhos: gatilhos.recordset.map((linha) => ({
        id: String(linha.IdTarefa_Gatilho_Situacao),
        origem: { codigo: String(linha.Codigo ?? "").trim(), nome: String(linha.Atividade ?? "").trim() },
        evento: rotuloSituacaoAtividade(linha.Situacao_Atual),
        destino: { codigo: String(linha.Codigo_Alvo ?? "").trim(), nome: String(linha.Atividade_Alvo ?? "").trim() || "Atividade ligada" },
        situacao: rotuloSituacaoAtividade(linha.Situacao_Atualizar),
        geraAtividade: simNao(linha.Gerar_Atividade) === "sim",
        observacao: String(linha.Observacao ?? "").trim(),
      })),
    });
  }
  return `\`\`\`gatilhos\n${JSON.stringify({ projetos })}\n\`\`\``;
}

export async function executarComandoBot(pool, args, ctx) {
  if (!ehAdmin(ctx)) return "A aba de atividades e os comandos do bot são só do administrador.";
  const acao = String(args.acao ?? "").trim().toLowerCase();
  const botaoPedido = String(args.botao ?? "").trim();
  const acaoNaFaixa = Boolean(botaoPedido) || !["ler", "preencher", ""].includes(acao);
  if (!acao && !botaoPedido) throw new Error("Diga a ação: ler, preencher, ou o botão da faixa de Ações.");
  const numero = String(args.numero ?? "").trim();
  const codigo = String(args.codigo ?? "").trim();
  const campo = String(args.campo ?? "").trim();
  const valor = String(args.valor ?? "").trim();
  const caminho = String(args.caminho ?? "").trim();
  if (!numero) throw new Error("Diga o número do processo.");
  if (acaoNaFaixa && acao !== "preencher" && !codigo) throw new Error("Diga o código da atividade.");
  if (acao === "preencher" && !campo) throw new Error("Diga o campo que o bot deve procurar na tela.");
  if (acao === "preencher" && !valor) return `Diga o valor que o bot deve digitar em ${campo} no processo ${numero}. Ele procura esse campo na tela do HeadCargo.`;
  let resultado = "";
  if (acao === "preencher") {
    resultado = await textoDoPreenchimento(pool, { numero, campo, valor });
  } else {
    const botao = (botaoPedido || (acao === "ler" || acao === "preencher" ? "" : acao)).toUpperCase();
    resultado = String(await andamentoAtividade(pool, { numero, codigo, requisitos: args.requisitos, concluir: botao === "CONCLUIR", restaurar: botao === "RESTAURAR", botao, caminho }, ctx));
  }
  registrarComandoBot({ email: ctx?.email, acao: botaoPedido || acao, numero, codigo, campo, valor: acaoNaFaixa ? caminho : valor, resultado });
  return resultado;
}

function cartaoTarefa(tarefa) {
  return { texto: textoTarefa(tarefa), tarefaId: tarefa.id, tarefaEstado: tarefa.estado, sql: "", linhas: [] };
}

async function comandoBot(pool, args, ctx) {
  if (!ehAdmin(ctx)) throw new Error("Os comandos do bot são só do administrador.");
  if (args.acao === "ler") return executarComandoBot(pool, args, ctx);
  const motor = operacoesBot();
  const acao = String(args.botao || args.acao).toLowerCase();
  const conhecida = ["preencher", "concluir", "restaurar", "cancelar", "iniciar", "encerrar"].includes(acao);
  const tarefa = motor.criar(ctx.email, { titulo: `${args.acao || args.botao} no HeadCargo`, etapas: [{ ...args, acao: conhecida ? acao : "botao", botao: conhecida ? "" : String(args.botao || args.acao) }] });
  return cartaoTarefa(motor.controlar(tarefa.id, ctx.email, "executar"));
}

async function ferramentasOperacionais(pool, nome, dados, ctx) {
  if (!ehAdmin(ctx)) throw new Error("Os comandos do bot são restritos ao administrador.");
  const motor = operacoesBot();
  if (Array.isArray(dados.valores)) dados = { ...dados, valores: Object.fromEntries(dados.valores.map((v) => [String(v.campo), String(v.valor ?? "")])) };
  if (nome === "painel_excecoes") return JSON.stringify(await painelExcecoes(pool, motor, ctx.email));
  if (nome === "regras_bot") {
    if (dados.acao === "validar") return JSON.stringify(motor.salvarRegra(ctx.email, dados));
    if (dados.acao === "remover") return JSON.stringify({ removida: motor.removerRegra(ctx.email, dados.id) });
    return JSON.stringify(motor.regras(ctx.email));
  }
  if (nome === "rotina_bot") {
    if (dados.acao === "salvar") return JSON.stringify(motor.salvarRotina(ctx.email, dados));
    if (dados.acao === "prever") return cartaoTarefa(motor.daRotina(ctx.email, dados));
    return JSON.stringify(motor.rotinas(ctx.email));
  }
  if (dados.acao === "criar") {
    const t = motor.criar(ctx.email, dados);
    return cartaoTarefa(dados.executar === true ? motor.controlar(t.id, ctx.email, "executar") : t);
  }
  if (["executar", "retomar", "pausar", "cancelar"].includes(dados.acao)) return cartaoTarefa(motor.controlar(dados.id, ctx.email, dados.acao, dados));
  return dados.id ? cartaoTarefa(motor.obter(dados.id, ctx.email)) : JSON.stringify(motor.listar(ctx.email).map((t) => ({ id: t.id, estado: t.estado, texto: textoTarefa(t) }))) || "Nenhuma tarefa nesta conta.";
}

export function ferramentaDaVisao(nome, setor) {
  if (["tarefa_bot", "rotina_bot", "painel_excecoes", "regras_bot"].includes(nome)) return true;
  if (setor === "atividades") {
    return [
      "projeto_tarefas",
      "monitores_campo",
      "gatilhos_atividade",
      "comando_bot",
      "aprendizado_bot",
      "andamento_atividade",
      "explicar_campo_livre",
      "resumo_processo",
      "localizar_processo",
      "buscar_tabelas",
      "listar_colunas",
    ].includes(nome);
  }
  if (nome === "passagens_aereas") return setor === "financeiro" || setor === "gerencia";
  if (setor === "gerencia") return !["painel_ti", "log_recente", "monitoramentos_alterados"].includes(nome);
  if (nome === "painel_financeiro" || nome === "taxas_processo") return setor === "financeiro";
  if (setor === "financeiro") {
    return [
      "painel_financeiro",
      "passagens_aereas",
      "relacionamento_clientes",
      "taxas_processo",
      "comissao_periodo",
      "prazos",
      "proposta_processo",
      "propostas_periodo",
      "resumo_processo",
      "rota_processo",
      "buscar_processos",
      "executar_sql",
      "consultar_dados",
      "localizar_processo",
      "processos_abertos_cliente",
      "processos_abertos",
      "meu_dia",
      "ficha_processo",
      "buscar_tabelas",
      "listar_colunas",
    ].includes(nome);
  }
  if (nome === "painel_ti" || nome === "log_recente" || nome === "monitoramentos_alterados") return setor === "ti";
  if (setor === "ti") {
    return !["fila_setor", "proposta_processo", "propostas_periodo", "montar_proposta", "comissao_periodo", "processos_parados", "documental_ce", "atividades_pendentes", "divergencias_viagem"].includes(nome);
  }
  if (nome === "fila_setor") return setor === "admin";
  if (nome === "prazos") return true;
  if (nome === "divergencias_viagem") return setor === "operacional" || setor === "admin" || setor === "financeiro";
  if (nome === "documental_ce") return setor === "documental" || setor === "admin";
  if (nome === "atividades_pendentes") return ["operacional", "inside", "comercial", "admin"].includes(setor);
  if (nome === "proposta_processo" || nome === "propostas_periodo" || nome === "comissao_periodo") return setor !== "operacional" && setor !== "documental";
  if (nome === "montar_proposta") return setor === "comercial" || setor === "inside" || setor === "gerencia";
  return true;
}

function mesmoCodigoAtividade(valor, pedido) {
  const limpar = (item) => String(item ?? "").trim().replace(/^0+(?=\d)/, "");
  const esperado = limpar(pedido);
  return Boolean(esperado) && limpar(valor) === esperado;
}

function escolherParaConcluir(linhas, codigo) {
  let escolhidas = linhas;
  if (codigo) {
    const peloCodigo = linhas.filter((linha) => mesmoCodigoAtividade(linha.Codigo, codigo));
    if (peloCodigo.length) escolhidas = peloCodigo;
  }
  const abertas = escolhidas.filter((linha) => ![4, 5, 6].includes(Number(linha.Situacao)));
  if (abertas.length === 1) return { unica: abertas[0] };
  if (escolhidas.length === 1) return { unica: escolhidas[0] };
  return { varias: abertas.length ? abertas : escolhidas };
}

function atividadeInativa(linha) {
  return /inativ/i.test(`${linha.Codigo ?? ""} ${linha.Atividade ?? ""}`);
}

function escolherParaRestaurar(linhas, codigo) {
  let escolhidas = linhas;
  if (codigo) {
    const peloCodigo = linhas.filter((linha) => mesmoCodigoAtividade(linha.Codigo, codigo));
    if (peloCodigo.length) escolhidas = peloCodigo;
  }
  const alvo = escolhidas.filter((linha) => [4, 5, 6].includes(Number(linha.Situacao)) || atividadeInativa(linha));
  const lista = alvo.length ? alvo : escolhidas;
  if (lista.length === 1) return { unica: lista[0] };
  return { varias: lista };
}

async function textoProximaAtividade(pool, numero, codigo) {
  const pedido = String(codigo ?? "").trim();
  if (!pedido) return "";
  const r = await pool.request().input("n", sql.VarChar(40), numero).input("c", sql.VarChar(25), pedido).query(`
    SELECT TOP 3 Tar.Codigo, Tar.Descricao
    FROM mov_Logistica_House Lhs
    JOIN mov_Projeto_Atividade Pa ON Pa.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
    JOIN cad_Tarefa Atual ON Atual.IdProjeto_Tarefa = Pa.IdProjeto_Tarefa
      AND CAST(Atual.Codigo AS varchar(60)) = @c
    JOIN cad_Tarefa Tar ON Tar.IdTarefa_Precedente = Atual.IdTarefa
    WHERE Lhs.Numero_Processo = @n
    ORDER BY Tar.Codigo`);
  const nomes = r.recordset
    .map((linha) => [String(linha.Codigo ?? "").trim(), String(linha.Descricao ?? "").trim()].filter(Boolean).join(" "))
    .filter(Boolean);
  if (!nomes.length) return "";
  return ` A próxima do fluxo é ${nomes.join("; ")}. Diga se quer seguir.`;
}

function semConfirmacaoDoBot(texto) {
  return /não confirmou/i.test(String(texto ?? ""));
}

async function estadoAtividade(pool, id) {
  const conferido = await pool.request().input("id", sql.Int, Number(id)).query(`
    SELECT TOP 1 Situacao, Data_Termino, Data_Inicio FROM mov_Atividade WHERE IdAtividade = @id`);
  const linha = conferido.recordset[0];
  if (!linha) return null;
  return { situacao: Number(linha.Situacao), termino: linha.Data_Termino || null, inicio: linha.Data_Inicio || null };
}

async function esperarEstado(pool, id, pronto) {
  let atual = null;
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    atual = await estadoAtividade(pool, id);
    if (atual && pronto(atual)) return atual;
    await new Promise((resolver) => setTimeout(resolver, 700));
  }
  return atual;
}

async function andamentoAtividade(pool, args, ctx) {
  const bruto = String(args.numero ?? "");
  const pedidoTeste = numeroParaConsulta(bruto, ehAdmin(ctx));
  if (!pedidoTeste.ok) throw new Error(pedidoTeste.erro);
  const citado = bruto.match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})\b/i);
  const numero = pedidoTeste.numero || (citado?.[1] ?? bruto).replace(/\s+/g, " ").trim().slice(0, 40).toUpperCase();
  const pedido = limparNomeAtividade(args.codigo);
  const partes = partesDoNomeAtividade(pedido);
  const codigo = partes.codigo;
  const descricao = partes.descricao.replace(/[%_[\]]/g, "").slice(0, 70);
  const pendentes = args.pendentes === true || args.pendentes === "true" || args.pendentes === 1;
  const botao = String(args.botao ?? "").trim().toUpperCase();
  const concluir = args.concluir === true || args.concluir === "true" || args.concluir === 1 || botao === "CONCLUIR";
  const restaurar = args.restaurar === true || args.restaurar === "true" || args.restaurar === 1 || botao === "RESTAURAR";
  const outroBotao = botao && botao !== "CONCLUIR" && botao !== "RESTAURAR" ? botao : "";
  if (!numero) throw new Error("Informe o número do processo, como IM5328-26.");
  if (concluir && !codigo && !descricao) throw new Error("Diga o nome da atividade que deve ser concluída.");
  if (restaurar && !codigo && !descricao) throw new Error("Diga o nome da atividade que deve ser restaurada.");
  if (outroBotao && !codigo && !descricao) throw new Error(`Diga o nome da atividade para ${outroBotao.toLowerCase()}.`);
  const limite = pendentes ? 40 : 5;
  const r = await pool.request().input("n", sql.VarChar(40), numero).input("c", sql.VarChar(25), codigo).input("d", sql.VarChar(80), descricao ? `%${descricao}%` : "").query(`
    SELECT TOP ${limite}
      Ati.IdAtividade,
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
      AND (
        (@c = '' AND @d = '')
        OR (@c <> '' AND CAST(Tar.Codigo AS varchar(60)) = @c)
        OR (@d <> '' AND Tar.Descricao LIKE @d)
      )
      ${pendentes ? "AND Ati.Data_Termino IS NULL AND Ati.Situacao NOT IN (4, 5, 6)" : ""}
    ORDER BY CASE WHEN @c <> '' AND CAST(Tar.Codigo AS varchar(60)) = @c THEN 0 ELSE 1 END, CASE WHEN Ati.Situacao IN (4, 5, 6) THEN 1 ELSE 0 END, CASE WHEN Ati.Previsao_Termino IS NULL THEN 1 ELSE 0 END, Ati.Previsao_Termino`);
  const linhas = r.recordset;
  if (!linhas.length) {
    if (pendentes) return `Nenhuma atividade pendente no processo ${numero}.`;
    const alvo = descricao || codigo;
    return alvo
      ? `Não encontrei a atividade ${alvo} no processo ${numero}.`
      : `Não encontrei atividades no processo ${numero}.`;
  }
  if (args.requisitos && !concluir && !restaurar && !outroBotao) {
    if (linhas.length !== 1) return `Encontrei mais de uma atividade no processo ${numero}. Informe o código exato da atividade para consultar o que falta.`;
    const alvo = linhas[0];
    let validados = [];
    try { validados = operacoesBot().regras(ctx.email).filter((r) => r.codigo === String(alvo.Codigo).trim() && (!r.processo || r.processo.toLowerCase() === numero.toLowerCase())).map((r) => r.campo); } catch { /* não há regras validadas disponíveis */ }
    return requisitosAtividade(pool, { numero, atividade: alvo, requisitos: [...exigenciasDoProcesso(numero, alvo.Codigo), ...validados] });
  }
  if (concluir) {
    const escolha = escolherParaConcluir(linhas, codigo);
    if (!escolha.unica) {
      const nomes = escolha.varias.map((linha) => {
        const cod = String(linha.Codigo ?? "").trim();
        const atividade = String(linha.Atividade ?? "").trim();
        const quando = dataCurta(linha.Previsao_Termino);
        return [cod && atividade ? `${cod} ${atividade}` : atividade || cod, quando].filter(Boolean).join(" ");
      });
      return `Encontrei ${escolha.varias.length} atividades iguais no processo ${numero}: ${nomes.join("; ")}. Diga o código da que deve ser concluída.`;
    }
    const unica = escolha.unica;
    const nome = String(unica.Atividade ?? "").trim();
    const situacao = Number(unica.Situacao);
    if (situacao === 4) return `A atividade ${nome} do processo ${numero} já está concluída.`;
    if (!pedidoTeste.numero) return `A atividade ${nome} é do processo ${numero}. Só concluo atividade de processo teste, como IM2099-25 teste.`;
    const antes = { situacao: Number(unica.Situacao), termino: unica.Data_Termino || null };
    const clique = await concluirAtividadeNoHeadCargo({
      numero: pedidoTeste.numero,
      nome,
      codigo: String(unica.Codigo ?? codigo ?? "").trim(),
      caminho: String(args.caminho ?? "").trim(),
      confirmar: unica.IdAtividade ? async () => {
        const atual = await estadoAtividade(pool, unica.IdAtividade);
        return Boolean(atual && (atual.situacao === 4 || (atual.termino && !antes.termino)));
      } : undefined,
    });
    let estado = antes;
    if (unica.IdAtividade && (clique.ok || semConfirmacaoDoBot(clique.texto))) {
      estado = (await esperarEstado(
        pool,
        unica.IdAtividade,
        (item) => item.situacao === 4 || (item.termino && !antes.termino),
      )) || antes;
    }
    if (estado.situacao === 4 || (estado.termino && !antes.termino)) {
      let seguinte = "";
      if (estado.situacao === 4) {
        try {
          seguinte = await textoProximaAtividade(pool, numero, String(unica.Codigo ?? codigo ?? "").trim());
        } catch {
          seguinte = "";
        }
      }
      return `Concluí a atividade ${nome} do processo ${numero} no HeadCargo.${seguinte}`;
    }
    if (!clique.ok) {
      const campos = camposPedidos(clique.texto);
      if (campos.length) {
        guardarExigencia({ codigo: String(unica.Codigo ?? codigo ?? ""), nome, numero, campos });
        return `${clique.texto} Diga o valor de cada campo, na mesma ordem, para eu preencher e tentar concluir de novo.`;
      }
      return clique.texto;
    }
    return `Persistência não confirmada: o clique foi enviado para ${nome} no processo ${numero}, mas a consulta ainda não confirmou a conclusão. Revisão necessária antes de repetir.`;
  }
  if (restaurar) {
    const escolha = escolherParaRestaurar(linhas, codigo);
    if (!escolha.unica) {
      const nomes = escolha.varias.map((linha) => {
        const cod = String(linha.Codigo ?? "").trim();
        const atividade = String(linha.Atividade ?? "").trim();
        return cod && atividade ? `${cod} ${atividade}` : atividade || cod;
      });
      return `Encontrei ${escolha.varias.length} atividades no processo ${numero}: ${nomes.join("; ")}. Diga o código da que deve ser restaurada.`;
    }
    const unica = escolha.unica;
    const nome = String(unica.Atividade ?? "").trim();
    if (!pedidoTeste.numero) return `A atividade ${nome} é do processo ${numero}. Só restauro atividade de processo teste, como IM2099-25 teste.`;
    const clique = await concluirAtividadeNoHeadCargo({
      numero: pedidoTeste.numero,
      nome,
      codigo: String(unica.Codigo ?? codigo ?? "").trim(),
      caminho: String(args.caminho ?? "").trim(),
      acao: "restaurar",
    });
    const antes = { situacao: Number(unica.Situacao), termino: unica.Data_Termino || null };
    const abriu = (item) => {
      const eraFechada = [4, 5, 6].includes(antes.situacao) || Boolean(antes.termino);
      if (!eraFechada) return false;
      return ![4, 5, 6].includes(item.situacao) || (antes.termino && !item.termino);
    };
    let estado = antes;
    if (unica.IdAtividade && (clique.ok || semConfirmacaoDoBot(clique.texto))) {
      estado = (await esperarEstado(pool, unica.IdAtividade, abriu)) || antes;
    }
    if (abriu(estado)) return `Restaurei a atividade ${nome} do processo ${numero} no HeadCargo.`;
    if (!clique.ok) return clique.texto;
    return `Persistência não confirmada: a restauração de ${nome} ainda não foi confirmada na consulta. Revisão necessária antes de repetir.`;
  }
  if (outroBotao) {
    const escolha = escolherParaConcluir(linhas, codigo);
    if (!escolha.unica) {
      const nomes = escolha.varias.map((linha) => {
        const cod = String(linha.Codigo ?? "").trim();
        const atividade = String(linha.Atividade ?? "").trim();
        return cod && atividade ? `${cod} ${atividade}` : atividade || cod;
      });
      return `Encontrei ${escolha.varias.length} atividades no processo ${numero}: ${nomes.join("; ")}. Diga o código da que deve receber ${outroBotao.toLowerCase()}.`;
    }
    const unica = escolha.unica;
    const nome = String(unica.Atividade ?? "").trim();
    if (!pedidoTeste.numero) return `A atividade ${nome} é do processo ${numero}. Só clico em botão de atividade de processo teste, como IM2099-25 teste.`;
    const clique = await concluirAtividadeNoHeadCargo({
      numero: pedidoTeste.numero,
      nome,
      codigo: String(unica.Codigo ?? codigo ?? "").trim(),
      caminho: String(args.caminho ?? "").trim(),
      botao: outroBotao,
    });
    const antes = { situacao: Number(unica.Situacao), termino: unica.Data_Termino || null, inicio: unica.Data_Inicio || null };
    const efeito = (item) => {
      if (outroBotao === "CANCELAR") return item.situacao === 6 || item.situacao === 5;
      if (outroBotao === "INICIAR") return item.situacao === 2 || Boolean(item.inicio);
      return false;
    };
    const conhece = ["CANCELAR", "INICIAR"].includes(outroBotao);
    let estado = antes;
    if (conhece && unica.IdAtividade && (clique.ok || semConfirmacaoDoBot(clique.texto))) {
      estado = (await esperarEstado(pool, unica.IdAtividade, efeito)) || antes;
    }
    const rotulo = outroBotao.charAt(0) + outroBotao.slice(1).toLowerCase();
    const feito = outroBotao === "CANCELAR" ? `Cancelei a atividade ${nome}` : outroBotao === "ENCERRAR" ? `Encerrei a atividade ${nome}` : outroBotao === "INICIAR" ? `Iniciei a atividade ${nome}` : `Cliquei em ${rotulo} na atividade ${nome}`;
    if (conhece && efeito(estado)) return `${feito} do processo ${numero} no HeadCargo.`;
    if (!clique.ok) return clique.texto;
    return `Persistência não confirmada: clique em ${rotulo} enviado para ${nome}. Revisão necessária antes de repetir.`;
  }
  const blocos = linhas.map((linha) => {
    const nome = [String(linha.Codigo ?? "").trim(), String(linha.Atividade ?? "").trim()].filter(Boolean).join(" — ") || "Atividade";
    const situacao = Number(linha.Situacao);
    const quando = dataCurta(linha.Data_Termino || linha.Data_Inicio);
    const status =
      situacao === 4
        ? `Concluída${quando ? ` em ${quando}` : ""}`
        : situacao === 5
          ? `Não realizada${quando ? ` em ${quando}` : ""}`
          : situacao === 6
            ? `Cancelada${quando ? ` em ${quando}` : ""}`
            : situacao === 2 || linha.Data_Inicio
              ? `Em andamento${linha.Data_Inicio ? ` desde ${dataCurta(linha.Data_Inicio)}` : ""}`
              : situacao === 3
                ? "Em espera"
                : "Ainda não iniciada";
    const inicio = dataCurta(linha.Previsao_Inicio);
    const termino = dataCurta(linha.Previsao_Termino);
    const previsao = inicio && termino && inicio !== termino ? previsaoDe(linha.Previsao_Inicio, linha.Previsao_Termino) : termino || inicio ? `Previsão ${termino || inicio}` : "";
    const previsaoTexto = previsao.replace(/^Previsão\s+/i, "");
    const atrasada = ![4, 5, 6].includes(situacao) && linha.Previsao_Termino && new Date(linha.Previsao_Termino) < new Date();
    const itens = [
      `  - Situação: ${status}${atrasada ? " · atrasada" : ""}`,
      linha.Responsavel ? `  - Responsável: ${String(linha.Responsavel).trim()}` : "",
      previsaoTexto ? `  - Previsão: ${previsaoTexto}` : "",
      notaCurta(linha.Observacao) ? `  - Observação: ${notaCurta(linha.Observacao)}` : "",
    ].filter(Boolean);
    return `- ${nome}\n${itens.join("\n")}`;
  });
  const ultimo = linhas[0];
  const acompanhamento = codigo && !pendentes && ultimo.Acompanhamento_Data
    ? `\n\n**Último acompanhamento do processo** (${dataCurta(ultimo.Acompanhamento_Data)}${ultimo.Acompanhamento_Responsavel ? `, ${String(ultimo.Acompanhamento_Responsavel).trim()}` : ""}):\n${notaCurta(ultimo.Acompanhamento) || "sem descrição"}`
    : "";
  const titulo = pendentes ? `Atividades pendentes de ${String(ultimo.Numero_Processo).trim()}` : `Processo ${String(ultimo.Numero_Processo).trim()}`;
  return `### ${titulo}\n\n${blocos.join("\n\n")}${acompanhamento}`;
}

function textoDe(resultado) {
  if (resultado && typeof resultado === "object" && resultado.texto != null) return String(resultado.texto);
  return String(resultado ?? "");
}

function visaoComDocumental(recorte) {
  return ["documental", "operacional", "tudo", "gerencia"].includes(String(recorte?.visao || ""));
}

async function fichaDoProcesso(pool, args, recorte, ctx) {
  const numero = numeroDe(args.numero, ctx);
  const resumo = await resumoProcesso(pool, { numero }, recorte, ctx);
  if (/não encontrado/.test(String(resumo))) return resumo;
  const resumoTexto = String(resumo).trim();
  const partes = [cabecalhoDaFicha(resumoTexto), resumoTexto].filter(Boolean);
  const sqls = [];
  const linhas = [];
  if (!recorte?.semComercial) {
    const proposta = String(await propostaProcesso(pool, { numero }, recorte) ?? "").trim();
    if (proposta && !/são informação do comercial/.test(proposta)) partes.push(proposta);
  }
  if (visaoComDocumental(recorte)) {
    const doc = await documentalCe(pool, { foco: "processo", caso: "ambos", numero });
    const texto = textoDe(doc).trim();
    if (texto && !/^Processo .+ não encontrado/.test(texto)) {
      partes.push(texto);
      if (doc && typeof doc === "object") {
        if (doc.sql) sqls.push(String(doc.sql));
        if (Array.isArray(doc.linhas)) linhas.push(...doc.linhas);
      }
    }
  }
  const passos = passosDaFicha(partes.join("\n"));
  if (passos.length) partes.push(`Próximos passos\n${passos.map((item) => `- ${item}`).join("\n")}`);
  partes.push(`Texto para o cliente\n${textoParaCliente(resumoTexto)}`);
  return consultaPronta(partes.join("\n\n"), sqls.join("\n\n"), linhas);
}

async function meuDia(pool, _args, _recorte, ctx) {
  const pessoa = await pessoaDaConta(pool, ctx?.email);
  if (!pessoa) {
    const painel = montarPainelDia("", []);
    painel.vazio = `Não localizei no HeadCargo o cadastro do e-mail ${String(ctx?.email ?? "").trim() || "desta conta"}.`;
    return `\`\`\`dia\n${JSON.stringify(painel)}\n\`\`\``;
  }
  const r = await pool.request().input("id", sql.Int, pessoa.IdPessoa).query(`
    SELECT
      Ati.IdAtividade,
      Tar.Codigo,
      Tar.Descricao AS Atividade,
      Lhs.Numero_Processo,
      Cli.Nome AS Cliente,
      Ati.Previsao_Termino,
      LEFT(CAST(Ati.Observacao AS nvarchar(300)), 160) AS Motivo
    FROM mov_Atividade Ati
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
    WHERE Ati.IdResponsavel = @id
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
    ORDER BY CASE WHEN Ati.Previsao_Termino IS NULL THEN 1 ELSE 0 END, Ati.Previsao_Termino`);
  const painel = montarPainelDia(pessoa.Nome, r.recordset);
  return `\`\`\`dia\n${JSON.stringify(painel)}\n\`\`\``;
}

function embalagem(resultado) {
  if (resultado && typeof resultado === "object" && "texto" in resultado) return resultado;
  return { texto: String(resultado ?? ""), sql: "", linhas: [] };
}

export async function executarFuncao(pool, nome, args, ctx) {
  if (!FUNCOES.has(nome)) throw new Error("Função desconhecida.");
  const dados = args && typeof args === "object" ? args : {};
  const recorte = ctx.recorte ?? {};
  if (consultaDeAtividade(ctx.pergunta) && ["comando_bot", "andamento_atividade"].includes(nome)) {
    return embalagem(await andamentoAtividade(pool, { numero: dados.numero, codigo: dados.codigo, pendentes: dados.pendentes, requisitos: dados.requisitos === true || /o que falta|o que precisa|requisit|obrigat/i.test(ctx.pergunta) }, ctx));
  }
  if (consultaDeAtividade(ctx.pergunta) && nome === "tarefa_bot" && (dados.executar === true || ["executar", "retomar"].includes(dados.acao))) throw new Error("O pedido é uma consulta. Não execute alterações para descobrir o que falta na atividade.");
  if (["tarefa_bot", "rotina_bot", "painel_excecoes", "regras_bot"].includes(nome)) return embalagem(await ferramentasOperacionais(pool, nome, dados, ctx));
  if (nome === "resumo_processo") return embalagem(await resumoProcesso(pool, dados, recorte, ctx));
  if (nome === "ficha_processo") return embalagem(await fichaDoProcesso(pool, dados, recorte, ctx));
  if (nome === "meu_dia") return embalagem(await meuDia(pool, dados, recorte, ctx));
  if (nome === "buscar_processos") return embalagem(await buscarProcessos(pool, dados, recorte));
  if (nome === "processos_abertos") return embalagem(await processosAbertos(pool, dados, recorte));
  if (nome === "acompanhamentos_processo") return embalagem(await acompanhamentosProcesso(pool, dados, ctx));
  if (nome === "modelo_followup") return embalagem(await modeloFollowup(pool, dados, ctx));
  if (nome === "email_atividade") {
    if (String(dados.numero ?? "").trim()) dados.numero = numeroDe(dados.numero, ctx);
    const gerado = await emailDaAtividade(pool, dados);
    if (gerado && typeof gerado === "object" && gerado.follow) return embalagem(await followDaAtividade(pool, gerado));
    return embalagem(gerado);
  }
  if (nome === "pendencias") return embalagem(await pendencias(pool, dados, ctx));
  if (nome === "o_que_mudou") return embalagem(await oQueMudou(pool, dados, ctx));
  if (nome === "proposta_processo") return embalagem(await propostaProcesso(pool, dados, recorte, ctx));
  if (nome === "montar_proposta") {
    const carteira = await idDaCarteira(pool, recorte, ctx);
    return embalagem(await montarPropostaEmail(pool, dados, { ...ctx, carteira, recorte }));
  }
  if (nome === "propostas_periodo") return embalagem(await propostasPeriodo(pool, dados, recorte, ctx));
  if (nome === "comissao_periodo") return embalagem(await comissaoPeriodo(pool, dados, recorte, ctx));
  if (nome === "processos_abertos_cliente") return embalagem(await processosAbertosCliente(pool, dados, recorte, ctx));
  if (nome === "prazos") return embalagem(await prazos(pool, dados, recorte));
  if (nome === "processos_parados") return embalagem(await processosParados(pool, dados, recorte));
  if (nome === "documental_ce") return embalagem(await documentalCe(pool, dados, ctx));
  if (nome === "atividades_pendentes") return embalagem(await atividadesPendentes(pool, dados, recorte));
  if (nome === "divergencias_viagem") return embalagem(await divergenciasViagem(pool, dados, recorte));
  if (nome === "rota_processo") return embalagem(await rotaProcesso(pool, dados, ctx));
  if (nome === "andamento_atividade") {
    if (dados.concluir || dados.restaurar || dados.botao) return embalagem(await comandoBot(pool, { ...dados, acao: dados.restaurar ? "restaurar" : dados.botao ? String(dados.botao).toLowerCase() : "concluir" }, ctx));
    return embalagem(await andamentoAtividade(pool, dados, ctx));
  }
  if (nome === "projeto_tarefas") return embalagem(await projetoTarefas(pool, dados, ctx));
  if (nome === "monitores_campo") return embalagem(await monitoresCampo(pool, dados, ctx));
  if (nome === "gatilhos_atividade") return embalagem(await gatilhosAtividade(pool, dados, ctx));
  if (nome === "comando_bot") return embalagem(await comandoBot(pool, dados, ctx));
  if (nome === "aprendizado_bot") return embalagem(textoComandosBot(dados.limite));
  if (nome === "painel_ti") return embalagem(await painelTi(pool, dados, ctx));
  if (nome === "log_recente") return embalagem(await logRecente(pool, dados, ctx));
  if (nome === "monitoramentos_alterados") return embalagem(await monitoramentosAlterados(pool, dados, ctx));
  if (nome === "painel_financeiro") return embalagem(await painelFinanceiro(pool, dados));
  if (nome === "relacionamento_clientes") return embalagem(await relacionamentoClientes(pool, dados));
  if (nome === "taxas_processo") return embalagem(await taxasProcesso(pool, dados, ctx));
  if (nome === "passagens_aereas") return embalagem(await pesquisarPassagens(dados));
  if (nome === "explicar_itens_carga") return embalagem(await explicarItensCarga(pool, dados, ctx));
  if (nome === "explicar_campo_livre") return embalagem(await explicarCampoLivre(pool, dados, ctx));
  return embalagem(await filaSetor(pool, recorte));
}
