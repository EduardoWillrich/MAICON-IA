import test from "node:test";
import assert from "node:assert/strict";
import { modelosOpenRouter } from "../server/openrouter.js";

test("usa somente o DeepSeek V4.1 Flash configurado", () => {
  assert.deepEqual(modelosOpenRouter("deepseek/deepseek-v4.1-flash-1017"), [
    "deepseek/deepseek-v4.1-flash-1017",
  ]);
});

test("sem modelo informado usa o DeepSeek V4.1 Flash", () => {
  assert.deepEqual(modelosOpenRouter(""), ["deepseek/deepseek-v4.1-flash-1017"]);
});
