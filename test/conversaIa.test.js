import test from "node:test";
import assert from "node:assert/strict";
import { conversar } from "../server/ia.js";

function simularGoogle(t, resposta) {
  const chaveAnterior = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = "teste-local-sem-chave-real";
  t.after(() => { if (chaveAnterior === undefined) delete process.env.GOOGLE_API_KEY; else process.env.GOOGLE_API_KEY = chaveAnterior; });
  const pedidos = [];
  t.mock.method(globalThis, "fetch", async (url, opcoes) => {
    assert.match(String(url), /generativelanguage\.googleapis\.com/);
    pedidos.push(JSON.parse(opcoes.body));
    return new Response(`data: ${JSON.stringify({ candidates: [{ content: { role: "model", parts: resposta } }] })}\n\n`, { headers: { "Content-Type": "text/event-stream" } });
  });
  return pedidos;
}

test("conversa do administrador prepara instruções sem erro de escopo", async (t) => {
  const pedidos = simularGoogle(t, [{ text: "Qual processo deseja consultar?" }]);
  const trechos = [];
  const resultado = await conversar([
    { role: "user", content: "Quero consultar uma atividade." },
  ], (v) => trechos.push(v), { papel: "admin", setor: "atividades", email: "teste@example.com" });
  assert.match(resultado.content, /Qual processo/);
  assert.ok(trechos.length);
  assert.equal(pedidos.length, 1);
  const corpo = JSON.stringify(pedidos[0]);
  assert.match(corpo, /OPERAÇÕES NO CHAT/);
  assert.match(corpo, /CONSULTA DE ATIVIDADE/);
  assert.doesNotMatch(corpo, /conferir_documento/);
});

test("conversa consegue solicitar a consulta de atividade", async (t) => {
  const pedidos = simularGoogle(t, [{ functionCall: { name: "andamento_atividade", args: { numero: "IM2099-25 teste", codigo: "0024", requisitos: true } } }]);
  const resultado = await conversar([
    { role: "user", content: "Leia a atividade 0024 do processo IM2099-25 teste e diga o que falta para concluir." },
  ], () => {}, { papel: "admin", setor: "atividades", email: "teste@example.com" });
  assert.equal(resultado.tool_calls[0].function.name, "andamento_atividade");
  assert.equal(JSON.parse(resultado.tool_calls[0].function.arguments).requisitos, true);
  assert.equal(pedidos.length, 1);
});

test("conversa de usuário comum também prepara as instruções sem referência indefinida", async (t) => {
  const pedidos = simularGoogle(t, [{ text: "Qual processo você deseja consultar?" }]);
  const resultado = await conversar([{ role: "user", content: "Quero consultar um processo." }], () => {}, { papel: "usuario", setor: "operacional", email: "usuario@example.com" });
  assert.match(resultado.content, /Qual processo/);
  assert.doesNotMatch(JSON.stringify(pedidos[0]), /OPERAÇÕES NO CHAT/);
});
