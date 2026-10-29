import test from "node:test";
import assert from "node:assert/strict";
import {
  limiteGeminiProximo,
  modeloGeminiServeAoChat,
  ordenarModelosGemini,
} from "../server/gemini.js";

test("mantém modelos Gemini de texto e exclui modelos especializados", () => {
  assert.equal(
    modeloGeminiServeAoChat({
      name: "models/gemini-3.5-flash",
      supportedGenerationMethods: ["generateContent"],
    }),
    true,
  );
  for (const nome of [
    "models/gemini-2.5-flash-image",
    "models/gemini-3.8-flash-tts",
    "models/gemini-3.5-transcribe",
    "models/gemini-robotics-er-2-preview",
  ]) {
    assert.equal(
      modeloGeminiServeAoChat({ name: nome, supportedGenerationMethods: ["generateContent"] }),
      false,
      nome,
    );
  }
});

test("coloca o modelo configurado primeiro e mantém os demais sem duplicar", () => {
  assert.deepEqual(
    ordenarModelosGemini(
      ["models/gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-flash"],
      "gemini-3.5-flash",
    ),
    ["gemini-3.5-flash", "gemini-2.5-flash"],
  );
});

test("detecta quando restam dez por cento ou menos da cota informada", () => {
  const perto = new Headers({
    "x-ratelimit-limit-requests": "100",
    "x-ratelimit-remaining-requests": "9",
  });
  const folga = new Headers({
    "x-ratelimit-limit-requests": "100",
    "x-ratelimit-remaining-requests": "80",
  });
  assert.equal(limiteGeminiProximo(perto), true);
  assert.equal(limiteGeminiProximo(folga), false);
});
