import test from "node:test";
import assert from "node:assert/strict";
import { exigirSomenteLeitura } from "../server/seguranca.js";

test("aceita select com texto entre aspas e recusa comando de escrita", () => {
  assert.doesNotThrow(() => exigirSomenteLeitura("Select Case When Tipo = 2 Then 'Break-Bulk' Else 'Aéreo' End From T"));
  assert.throws(() => exigirSomenteLeitura("Select 1; Bulk Insert T From X"), /não é permitido|apenas um comando/);
  assert.throws(() => exigirSomenteLeitura("Delete From T"), /Select/);
});
