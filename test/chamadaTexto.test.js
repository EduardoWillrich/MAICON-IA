import test from "node:test";
import assert from "node:assert/strict";
import { extrairChamadasDoTexto } from "../server/chamadaTexto.js";

const vazada =
  '< | DSML | calls> < | DSML | invoke name="executar_sql"> < | DSML | parameter name="sql" string="true">' +
  "SELECT Lhs.Numero_Processo AS Processo FROM dbo.mov_Logistica_House Lhs " +
  "WHERE Lhs.Data_Abertura_Processo >= '2026-10-29' AND Lhs.Data_Abertura_Processo < '2026-10-30' " +
  "</ | DSML | parameter> </ | DSML | invoke> </ | DSML | calls>";

test("marcação de ferramenta não vira texto e vira chamada", () => {
  const extraida = extrairChamadasDoTexto(`Antes.\n${vazada}`);
  assert.equal(extraida.texto, "Antes.");
  assert.equal(extraida.chamadas.length, 1);
  assert.equal(extraida.chamadas[0].function.name, "executar_sql");
  const args = JSON.parse(extraida.chamadas[0].function.arguments);
  assert.match(args.sql, /SELECT Lhs\.Numero_Processo/);
  assert.match(args.sql, /2026-10-29/);
  assert.doesNotMatch(extraida.texto, /DSML/);
});

test("texto normal segue inteiro", () => {
  const extraida = extrairChamadasDoTexto("Olá. A data é 29/10/2026.");
  assert.equal(extraida.texto, "Olá. A data é 29/10/2026.");
  assert.deepEqual(extraida.chamadas, []);
});

test("marcação com barra larga também vira chamada", () => {
  const extraida = extrairChamadasDoTexto(
    '<｜DSML｜invoke name="listar_colunas"><｜DSML｜parameter name="tabelas">["mov_Logistica_House"]</｜DSML｜parameter></｜DSML｜invoke>',
  );
  assert.equal(extraida.texto, "");
  assert.equal(extraida.chamadas[0].function.name, "listar_colunas");
  assert.deepEqual(JSON.parse(extraida.chamadas[0].function.arguments).tabelas, ["mov_Logistica_House"]);
});
