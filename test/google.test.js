import test from "node:test";
import assert from "node:assert/strict";
import { modeloGoogle, pedidoGoogle, partesGoogle, urlGoogle } from "../server/google.js";

test("o modelo do Google é o Gemma 4, sem o prefixo da OpenRouter", () => {
  assert.equal(modeloGoogle("gemma-4-26b-a4b-it"), "gemma-4-26b-a4b-it");
  assert.equal(modeloGoogle("google/gemma-4-26b-a4b-it"), "gemma-4-26b-a4b-it");
  assert.equal(modeloGoogle(""), "gemma-4-26b-a4b-it");
  assert.equal(
    urlGoogle("gemma-4-26b-a4b-it", "stream"),
    "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:streamGenerateContent?alt=sse",
  );
});

test("o pedido do chat vira a API nativa do Gemma, com ferramenta obrigatória", () => {
  const pedido = pedidoGoogle({
    temperature: 0.3,
    max_tokens: 400,
    tool_choice: "required",
    tools: [{
      type: "function",
      function: {
        name: "executar_sql",
        description: "Consulta o banco",
        parameters: {
          type: "object",
          properties: { sql: { type: "string" } },
          required: ["sql"],
        },
      },
    }],
    messages: [
      { role: "system", content: "Responda em português." },
      { role: "user", content: "Quantos processos hoje?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{
          id: "call_1",
          type: "function",
          function: { name: "executar_sql", arguments: "{\"sql\":\"select 1\"}" },
        }],
      },
      { role: "tool", name: "executar_sql", tool_call_id: "call_1", content: "{\"linhas\":1}" },
    ],
  });
  assert.equal(pedido.systemInstruction, undefined);
  assert.equal(pedido.contents[0].parts[0].text, "Responda em português.");
  assert.equal(pedido.contents[0].role, "user");
  assert.equal(pedido.contents[1].role, "model");
  assert.equal(pedido.contents[1].parts[0].functionCall.name, "executar_sql");
  assert.deepEqual(pedido.contents[1].parts[0].functionCall.args, { sql: "select 1" });
  assert.equal(pedido.contents[2].parts[0].functionResponse.name, "executar_sql");
  assert.equal(pedido.tools[0].functionDeclarations[0].parameters.type, "OBJECT");
  assert.equal(pedido.tools[0].functionDeclarations[0].parameters.properties.sql.type, "STRING");
  assert.equal(pedido.toolConfig, undefined);
  assert.equal(pedido.generationConfig.thinkingConfig.thinkingLevel, "minimal");
  assert.equal(pedido.generationConfig.maxOutputTokens, 400);
});

test("a resposta do Gemma devolve texto e chamada de ferramenta", () => {
  const mensagem = partesGoogle({
    content: {
      parts: [
        { text: "pensando", thought: true },
        { text: "Achei 3." },
        { functionCall: { id: "abc", name: "executar_sql", args: { sql: "select 1" } } },
      ],
    },
  });
  assert.equal(mensagem.content, "Achei 3.");
  assert.equal(mensagem.reasoning, "pensando");
  assert.equal(mensagem.tools[0].id, "abc");
  assert.equal(mensagem.tools[0].function.name, "executar_sql");
  assert.equal(mensagem.tools[0].function.arguments, "{\"sql\":\"select 1\"}");
});

test("enum numérico da ferramenta vai como texto para o Google", () => {
  const pedido = pedidoGoogle({
    messages: [{ role: "user", content: "Quem gravou log?" }],
    tools: [{
      type: "function",
      function: {
        name: "consultar_log",
        description: "Histórico",
        parameters: {
          type: "object",
          properties: {
            tipo: { type: "integer", enum: [0, 1, 2, 3] },
          },
        },
      },
    }],
  });
  const tipo = pedido.tools[0].functionDeclarations[0].parameters.properties.tipo;
  assert.equal(tipo.type, "INTEGER");
  assert.deepEqual(tipo.enum, ["0", "1", "2", "3"]);
});
