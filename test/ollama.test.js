import test from "node:test";
import assert from "node:assert/strict";
import { mensagensOllama } from "../server/ollama.js";

test("a mensagem de ferramenta da Ollama leva o nome da função", () => {
  const mensagens = mensagensOllama([
    { role: "assistant", content: "", tool_calls: [{ function: { name: "proposta_processo", arguments: "{\"numero\":\"IM1-26\"}" } }] },
    { role: "tool", name: "proposta_processo", content: "Proposta 10" },
  ]);
  assert.equal(mensagens[0].tool_calls[0].function.name, "proposta_processo");
  assert.equal(mensagens[0].tool_calls[0].function.arguments.numero, "IM1-26");
  assert.equal(mensagens[1].tool_name, "proposta_processo");
});
