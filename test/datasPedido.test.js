import test from "node:test";
import assert from "node:assert/strict";
import { anotarPedido, sqlDoPeriodo } from "../server/datasPedido.js";
import { textoConsultasRelevantes } from "../server/consultas.js";

const calendario = { hoje: "30/10/2026", ontem: "29/10/2026" };

test("hoje na pergunta vira o dia 30, não o dia da lista anterior", () => {
  const anotado = anotarPedido("quero saber o abertos hoje", "liste os abertos de ontem", calendario);
  assert.match(anotado, /30\/10\/2026/);
  assert.match(anotado, /2026-10-30/);
  assert.match(anotado, /2026-10-31/);
  assert.match(anotado, /Não troque esse intervalo por um único dia/);
});

test("correção curta de data repete a pergunta anterior no dia certo", () => {
  const anotado = anotarPedido("hoje dia 30/10", "quero saber o abertos hoje", calendario);
  assert.match(anotado, /quero saber o abertos hoje/);
  assert.match(anotado, /2026-10-30/);
  assert.doesNotMatch(anotado, /2026-10-29'/);
});

test("pedir a lista completa repete a consulta em vez de descartá-la", () => {
  const anotado = anotarPedido("detalhe a lista completa aqui", "preciso dos processos de hoje", calendario);
  assert.match(anotado, /no máximo 30 linhas/);
  assert.match(anotado, /2026-10-30/);
  assert.doesNotMatch(anotado, /não reaproveite a lista/i);
});

test("esse mês não vira um único dia", () => {
  const anotado = anotarPedido("quais processos foram abertos esse mês?", "quero saber o abertos hoje", {
    ...calendario,
    inicioMes: "01/10/2026",
    inicioSemana: "26/10/2026",
  });
  assert.match(anotado, /2026-10-01/);
  assert.match(anotado, /2026-10-31/);
  assert.doesNotMatch(anotado, /2026-10-30' AND < '2026-10-31'/);
});

test("essa semana começa na segunda e vai até amanhã exclusivo", () => {
  const anotado = anotarPedido("verifique os abertos essa semana", "", {
    ...calendario,
    inicioMes: "01/10/2026",
    inicioSemana: "26/10/2026",
  });
  assert.match(anotado, /2026-10-26/);
  assert.match(anotado, /2026-10-31/);
});

test("SQL do dia 29 vira o mês quando o pedido é esse mês", () => {
  const sql =
    "SELECT Lhs.Numero_Processo FROM dbo.mov_Logistica_House Lhs " +
    "WHERE Lhs.Data_Abertura_Processo >= '2026-10-29' AND Lhs.Data_Abertura_Processo < '2026-10-30' " +
    "ORDER BY Lhs.Numero_Processo";
  const ajustado = sqlDoPeriodo(sql, "quais processos foram abertos esse mês?", {
    ...calendario,
    inicioMes: "01/10/2026",
    inicioSemana: "26/10/2026",
  });
  assert.match(ajustado, /2026-10-01/);
  assert.match(ajustado, /2026-10-31/);
  assert.doesNotMatch(ajustado, /2026-10-29/);
});

test("dia explícito não herda horário nem tipo de carga de outra consulta", () => {
  const sql =
    "SELECT Lhs.Numero_Processo FROM dbo.mov_Logistica_House Lhs " +
    "WHERE Lhs.Data_Abertura_Processo >= '2026-10-15' AND Lhs.Data_Abertura_Processo < '2026-10-16' " +
    "AND Lhs.Tipo_Carga = 3 AND Lhs.Data_Abertura_Processo >= '2026-10-15 16:00'";
  const ajustado = sqlDoPeriodo(sql, "quais processos foram abertos em 15/10/2026?", calendario);
  assert.match(ajustado, /2026-10-15'/);
  assert.match(ajustado, /2026-10-16'/);
  assert.doesNotMatch(ajustado, /16:00/);
  assert.doesNotMatch(ajustado, /Tipo_Carga/i);
});

test("pedido de FCL mantém o tipo de carga", () => {
  const sql =
    "SELECT Lhs.Numero_Processo FROM dbo.mov_Logistica_House Lhs " +
    "WHERE Lhs.Data_Abertura_Processo >= '2026-10-29' AND Lhs.Tipo_Carga = 3";
  const ajustado = sqlDoPeriodo(sql, "quais processos FCL foram abertos esse mês?", {
    ...calendario,
    inicioMes: "01/10/2026",
  });
  assert.match(ajustado, /Tipo_Carga = 3/);
  assert.match(ajustado, /2026-10-01/);
  assert.doesNotMatch(ajustado, /2026-10-29/);
});

test("consultas prontas não repetem a data do exemplo", () => {
  const texto = textoConsultasRelevantes("quais processos foram abertos esse mês");
  assert.doesNotMatch(texto, /2026-10-29/);
});

test("ontem usa o dia anterior ao de hoje", () => {
  const anotado = anotarPedido("quais abriram ontem", "", calendario);
  assert.match(anotado, /29\/10\/2026/);
  assert.match(anotado, /2026-10-29/);
  assert.match(anotado, /2026-10-30/);
});
