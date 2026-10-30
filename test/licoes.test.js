import test from "node:test";
import assert from "node:assert/strict";
import { licoesDaConversa } from "../server/aprendizado.js";

test("lê a conversa e guarda a tabela que respondeu", () => {
  const licoes = licoesDaConversa([
    { role: "user", content: "liste as propostas abertas ontem" },
    {
      role: "assistant",
      content: "",
      tool_calls: [{ id: "1", function: { name: "propostas_periodo", arguments: "{\"quando\":\"ontem\",\"situacao\":\"abertas\"}" } }],
    },
    {
      role: "tool",
      tool_call_id: "1",
      content: "SELECT Pro.Numero_Proposta FROM dbo.mov_Proposta_Frete Pro WHERE Pro.Data_Proposta >= '2026-10-29'",
    },
    { role: "assistant", content: "Propostas abertas de ontem: 30" },
  ]);
  assert.equal(licoes.length, 1);
  assert.equal(licoes[0].falhou, false);
  assert.equal(licoes[0].ferramentas[0].nome, "propostas_periodo");
  assert.deepEqual(licoes[0].tabelas, ["mov_Proposta_Frete"]);
});

test("não aprende uma resposta que admitiu falha", () => {
  const licoes = licoesDaConversa([
    { role: "user", content: "liste as propostas abertas ontem" },
    {
      role: "assistant",
      content: "",
      tool_calls: [{ id: "1", function: { name: "localizar_processo", arguments: "{\"numero\":\"IM5944-26\"}" } }],
    },
    { role: "tool", tool_call_id: "1", content: "Processo IM5944-26" },
    { role: "assistant", content: "Não consegui retornar a lista de propostas." },
  ]);
  assert.equal(licoes[0].falhou, true);
});
