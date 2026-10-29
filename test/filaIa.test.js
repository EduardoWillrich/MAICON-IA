import test from "node:test";
import assert from "node:assert/strict";
import {
  executarFilaComFallback,
  filaDeChaves,
  podeTrocarChave,
} from "../server/filaIa.js";

const ambienteCompleto = {
  GEMINI_API_KEY: "teste-gemini",
  OPENROUTER_API_KEY: "teste-openrouter",
  OLLAMA_API_KEY: "teste-ollama",
  OLLAMA_URL: "https://ollama.invalid",
};

test("usuário sem chave própria usa Gemini, OpenRouter e Beam", () => {
  const fila = filaDeChaves([], ambienteCompleto);
  assert.deepEqual(fila.map((item) => item.provedor), ["gemini", "openrouter", "ollama"]);
});

test("chaves vazias não entram na fila", () => {
  const fila = filaDeChaves(
    [{ provedor: "gemini", chave: "  " }],
    { ...ambienteCompleto, GEMINI_API_KEY: "", OPENROUTER_API_KEY: "", OLLAMA_API_KEY: "   " },
  );
  assert.deepEqual(fila, []);
});

test("chave pessoal vem antes da chave do ambiente e duplicatas não se repetem", () => {
  const fila = filaDeChaves(
    [
      { provedor: "gemini", chave: "teste-pessoal" },
      { provedor: "gemini", chave: "teste-pessoal" },
      { provedor: "gemini", chave: "teste-gemini" },
    ],
    ambienteCompleto,
  );
  assert.deepEqual(
    fila.filter((item) => item.provedor === "gemini").map((item) => item.chave),
    ["teste-pessoal", "teste-gemini"],
  );
});

test("401 no Gemini usa o Beam restante", async () => {
  const tentativas = [];
  const fila = [
    { provedor: "gemini", chave: "teste-gemini" },
    { provedor: "ollama", chave: "teste-ollama" },
  ];
  const resposta = await executarFilaComFallback(fila, async (item) => {
    tentativas.push(item.provedor);
    if (item.provedor === "gemini") {
      const erro = new Error("API key not valid");
      erro.status = 401;
      throw erro;
    }
    return "ok";
  });
  assert.equal(resposta, "ok");
  assert.deepEqual(tentativas, ["gemini", "ollama"]);
});

test("abort do usuário não troca de chave", async () => {
  let tentativas = 0;
  const abort = new Error("Aborted");
  abort.name = "AbortError";
  await assert.rejects(
    executarFilaComFallback(
      [
        { provedor: "gemini", chave: "teste-gemini" },
        { provedor: "ollama", chave: "teste-ollama" },
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
        { provedor: "gemini", chave: "teste-gemini" },
        { provedor: "ollama", chave: "teste-ollama" },
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

test("erro de propriedade unsupported permite fallback", () => {
  assert.equal(podeTrocarChave(new Error("property 'modelo' is unsupported")), true);
  assert.equal(podeTrocarChave(new Error("O modelo configurado não está disponível nesta conta.")), true);
});

test("413 request too large permite fallback", () => {
  const erro = new Error("Request too large");
  erro.status = 413;
  assert.equal(podeTrocarChave(erro), true);
});
