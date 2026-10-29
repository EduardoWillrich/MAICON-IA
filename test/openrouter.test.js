import test from "node:test";
import assert from "node:assert/strict";
import { modelosOpenRouter } from "../server/openrouter.js";

test("prioriza o modelo configurado e mantém as reservas com ferramentas", () => {
  assert.deepEqual(modelosOpenRouter("qwen/qwen3.8-27b"), [
    "qwen/qwen3.8-27b",
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "google/gemma-4-31b-it:free",
  ]);
});

test("não repete o modelo configurado quando ele já é uma reserva", () => {
  assert.equal(
    modelosOpenRouter("nvidia/nemotron-3.5-lightning:free")
      .filter((modelo) => modelo === "nvidia/nemotron-3.5-lightning:free").length,
    1,
  );
});
