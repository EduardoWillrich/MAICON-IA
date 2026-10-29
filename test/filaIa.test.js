import test from "node:test";
import assert from "node:assert/strict";
import {
  executarFilaComFallback,
  filaDeChaves,
  podeTrocarChave,
} from "../server/filaIa.js";

const ambienteCompleto = {
  GROQ_API_KEY: "teste-groq",
  GEMINI_API_KEY: "teste-gemini",
  OPENROUTER_API_KEY: "teste-openrouter",
  OLLAMA_API_KEY: "teste-ollama",
  OLLAMA_URL: "https://ollama.invalid",
};

test("usuário sem chave própria usa os quatro provedores na ordem comum", () => {
  const fila = filaDeChaves([], ambienteCompleto);
  assert.deepEqual(fila.map((item) => item.provedor), [
    "groq",
    "gemini",
    "openrouter",
    "ollama",
  ]);
});

test("chaves vazias não entram na fila", () => {
  const fila = filaDeChaves(
    [{ provedor: "groq", chave: "  " }],
    { ...ambienteCompleto, GROQ_API_KEY: "", OLLAMA_API_KEY: "   " },
  );
  assert.deepEqual(fila.map((item) => item.provedor), ["gemini", "openrouter"]);
});

test("chave pessoal vem antes da chave do ambiente e duplicatas não se repetem", () => {
  const fila = filaDeChaves(
    [
      { provedor: "groq", chave: "teste-pessoal" },
      { provedor: "groq", chave: "teste-pessoal" },
      { provedor: "groq", chave: "teste-groq" },
    ],
    ambienteCompleto,
  );
  assert.deepEqual(
    fila.filter((item) => item.provedor === "groq").map((item) => item.chave),
    ["teste-pessoal", "teste-groq"],
  );
});

test("401 no Gemini e Unauthorized no Ollama usam a Groq restante", async () => {
  const tentativas = [];
  const fila = [
    { provedor: "gemini", chave: "teste-gemini" },
    { provedor: "ollama", chave: "teste-ollama" },
    { provedor: "groq", chave: "teste-groq" },
  ];
  const resposta = await executarFilaComFallback(fila, async (item) => {
    tentativas.push(item.provedor);
    if (item.provedor === "gemini") {
      const erro = new Error("API key not valid");
      erro.status = 401;
      throw erro;
    }
    if (item.provedor === "ollama") throw new Error("Unauthorized");
    return "ok";
  });
  assert.equal(resposta, "ok");
  assert.deepEqual(tentativas, ["gemini", "ollama", "groq"]);
});

test("abort do usuário não troca de chave", async () => {
  let tentativas = 0;
  const abort = new Error("Aborted");
  abort.name = "AbortError";
  await assert.rejects(
    executarFilaComFallback(
      [
        { provedor: "groq", chave: "teste-groq" },
        { provedor: "gemini", chave: "teste-gemini" },
      ],
      async () => {
        tentativas += 1;
        throw abort;
      },
    ),
    (erro) => erro === abort,
  );
  assert.equal(tentativas, 1);
});

test("erro de programação não troca de chave", async () => {
  let tentativas = 0;
  await assert.rejects(
    executarFilaComFallback(
      [
        { provedor: "groq", chave: "teste-groq" },
        { provedor: "gemini", chave: "teste-gemini" },
      ],
      async () => {
        tentativas += 1;
        throw new TypeError("valor inesperado");
      },
    ),
    /A IA não respondeu agora/,
  );
  assert.equal(tentativas, 1);
});

test("fila esgotada devolve mensagem segura em português", async () => {
  await assert.rejects(
    executarFilaComFallback(
      [{ provedor: "ollama", chave: "teste-ollama" }],
      async () => {
        throw new Error("Unauthorized");
      },
    ),
    (erro) => {
      assert.match(erro.message, /A IA não respondeu agora/);
      assert.doesNotMatch(erro.message, /Unauthorized/i);
      return true;
    },
  );
});

test("erros de autenticação, cota e modelo permitem fallback", () => {
  for (const mensagem of [
    "Unauthenticated",
    "invalid api key",
    "User not found",
    "quota exceeded",
    "rate limit",
    "billing required",
    "insufficient credit",
    "model does not exist",
    "do not have access",
  ]) {
    assert.equal(podeTrocarChave(new Error(mensagem)), true, mensagem);
  }
});
