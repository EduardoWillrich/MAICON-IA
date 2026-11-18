import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { painelExcecoes, verificarPreenchimento } from "../server/inteligenciaOperacional.js";
import { MotorOperacoes } from "../server/operacoesBot.js";
import { exigirSomenteLeitura } from "../server/seguranca.js";

function poolFalso(linhas) {
  const consultas = [];
  return { consultas, request() { const parametros = {}; return { input(nome, _tipo, valor) { parametros[nome] = valor; return this; }, async query(sql) { exigirSomenteLeitura(sql); consultas.push({ sql, parametros }); return { recordset: linhas }; } }; } };
}

test("persistência de preenchimento é confirmada somente com o valor lido", async () => {
  const visto = { estado: "observado", evidencia: "tela", texto: "Preenchido na tela." };
  const r = await verificarPreenchimento(poolFalso([{ Valor: new Date("2027-01-20T00:00:00Z") }]), { numero: "IM2099-25 teste", campo: "Data de embarque", valor: "20/01/2027" }, visto);
  assert.equal(r.estado, "confirmado");
  assert.equal(r.evidencia, "banco");
  const desconhecido = await verificarPreenchimento(poolFalso([]), { campo: "Campo customizado" }, visto);
  assert.equal(desconhecido.estado, "observado");
  assert.match(desconhecido.texto, /não verificada/);
});

test("exceções mostram o motivo, a ação e o que surgiu desde a consulta anterior", async () => {
  const m = new MotorOperacoes(new DatabaseSync(":memory:"), async () => ({}));
  const pool = poolFalso([{ IdAtividade: 1, Processo: "IM2099-25 teste", Codigo: "1", Atividade: "Conferir", Tipo: "atrasada" }]);
  const a = await painelExcecoes(pool, m, "a@example.com");
  assert.equal(a.novas, 1);
  assert.match(a.itens[0].motivo, /anterior a hoje/);
  assert.ok(a.itens[0].proximaAcao);
  assert.equal((await painelExcecoes(pool, m, "a@example.com")).novas, 0);
  assert.equal((await painelExcecoes(pool, m, "b@example.com")).novas, 1);
});
