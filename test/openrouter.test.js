import test from "node:test";
import assert from "node:assert/strict";
import { MODELO_OPENROUTER, modeloDaEtapa, modelosOpenRouter } from "../server/openrouter.js";

test("usa somente o Gemma 4 configurado", () => {
  assert.deepEqual(modelosOpenRouter("gemma-4-31b-it"), [MODELO_OPENROUTER]);
});

test("sem modelo informado usa o Gemma 4 31B", () => {
  assert.deepEqual(modelosOpenRouter(""), [MODELO_OPENROUTER]);
});

test("consulta e resposta usam o mesmo Gemma 4", () => {
  const modelo = modelosOpenRouter()[0];
  assert.equal(modeloDaEtapa("consulta"), modelo);
  assert.equal(modeloDaEtapa("previa"), modelo);
  assert.equal(modeloDaEtapa("relatorio"), modelo);
  assert.equal(modeloDaEtapa("resposta"), modelo);
});
