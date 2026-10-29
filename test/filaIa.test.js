import test from "node:test";
import assert from "node:assert/strict";
import {
  executarFilaComFallback,
  filaDeChaves,
  podeTrocarChave,
} from "../server/filaIa.js";

const ambienteCompleto = {
  OPENROUTER_API_KEY: "teste-openrouter",
  GEMINI_API_KEY: "teste-gemini",
  OLLAMA_API_KEY: "teste-ollama",
};

test("a fila usa somente o OpenRouter", () => {
  const fila = filaDeChaves(
    [
      { provedor: "gemini", chave: "teste-gemini" },
      { provedor: "ollama", chave: "teste-ollama" },
    ],
    ambienteCompleto,
  );
  assert.deepEqual(fila.map((item) => item.provedor), ["openrouter"]);
});

test("chaves vazias não entram na fila", () => {
  const fila = filaDeChaves(
    [{ provedor: "openrouter", chave: "  " }],
    { ...ambienteCompleto, OPENROUTER_API_KEY: "" },
  );
  assert.deepEqual(fila, []);
});

test("chave pessoal vem antes da chave do ambiente e duplicatas não se repetem", () => {
  const fila = filaDeChaves(
    [
      { provedor: "openrouter", chave: "teste-pessoal" },
      { provedor: "openrouter", chave: "teste-pessoal" },
      { provedor: "openrouter", chave: "teste-openrouter" },
      { provedor: "gemini", chave: "teste-gemini" },
    ],
    ambienteCompleto,
  );
  assert.deepEqual(
    fila.map((item) => item.chave),
    ["teste-pessoal", "teste-openrouter"],
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
    /valor inesperado/,
  );
  assert.equal(tentativas, 1);
});

test("erro que não é falta de crédito não vira mensagem genérica", async () => {
  await assert.rejects(
    executarFilaComFallback(
      [{ provedor: "openrouter", chave: "teste-openrouter" }],
      async () => {
        throw new Error("Unauthorized");
      },
    ),
    /Unauthorized/,
  );
});

test("falta de crédito avisa para recarregar a chave", async () => {
  await assert.rejects(
    executarFilaComFallback(
      [{ provedor: "openrouter", chave: "teste-openrouter" }],
      async () => {
        const erro = new Error("insufficient credits");
        erro.status = 402;
        throw erro;
      },
    ),
    /créditos da IA acabaram/,
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
