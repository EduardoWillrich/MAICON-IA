import test from "node:test";
import assert from "node:assert/strict";
import { compararRequisitos, requisitosAtividade } from "../server/requisitosAtividade.js";
import { exigirSomenteLeitura } from "../server/seguranca.js";
import { guardarExigencia } from "../server/comandosBot.js";
import { executarFuncao } from "../server/funcoes.js";

test("campos vazios, preenchidos e não identificados são estados diferentes", () => {
  const r = compararRequisitos(["Nome Marca", "Data", "Booleano", "Fora do cadastro", "Repetido"], [
    { Campo: "Marca", Valor: "" }, { Campo: "Data", Valor: "20/01/2027" }, { Campo: "Booleano", Valor: 0 },
    { Campo: "Repetido", Valor: "A" }, { Campo: "Repetido", Valor: "B" },
  ]);
  assert.deepEqual(r.map((v) => v.estado), ["em_branco", "preenchido", "preenchido", "nao_verificado", "nao_verificado"]);
});

test("consulta mostra o que falta sem transformar todos os campos vazios em obrigatórios", async () => {
  const consultas = [];
  const pool = { request() { return { input() { return this; }, async query(sql) { exigirSomenteLeitura(sql); consultas.push(sql); return { recordset: sql.includes("AS Campo") ? [{ Campo: "Marca", Valor: "" }, { Campo: "Contramarca", Valor: "ABC" }, { Campo: "Observação livre", Valor: null }] : [{ Codigo: "0023", Atividade: "Anterior", Situacao: 1 }] }; } }; } };
  const r = await requisitosAtividade(pool, { numero: "IM2099-25 teste", atividade: { Codigo: "0024", Atividade: "ENVIAR OHBL AO CLIENTE", Situacao: 1 }, requisitos: ["Nome Marca", "Contramarca", "Outro campo"] });
  assert.match(r, /Campos em branco entre os requisitos[\s\S]*Nome Marca/);
  assert.match(r, /Requisitos preenchidos[\s\S]*Contramarca: ABC/);
  assert.match(r, /valor ainda não foi verificado[\s\S]*Outro campo/);
  assert.match(r, /Outros campos livres em branco[\s\S]*Observação livre/);
  assert.match(r, /não confirma que o campo seja obrigatório/);
  assert.match(r, /Etapa anterior[\s\S]*ainda não concluída/);
  assert.match(r, /sem acionar Concluir/);
  assert.equal(consultas.length, 3);
});

test("ausência de lista registrada não vira afirmação de que está pronto", async () => {
  const pool = { request() { return { input() { return this; }, async query() { return { recordset: [] }; } }; } };
  const r = await requisitosAtividade(pool, { numero: "IM2099-25 teste", atividade: { Codigo: "0024", Situacao: 1 } });
  assert.match(r, /Não há uma lista confirmada/);
  assert.match(r, /não garante que a conclusão esteja liberada/);
  assert.doesNotMatch(r, /pediu para preencher|Concluí/);
});

test("pergunta do print entrega requisitos observados do mesmo processo", async () => {
  guardarExigencia({ numero: "IM2099-25 teste", codigo: "0024", nome: "ENVIAR OHBL AO CLIENTE", campos: ["Nome Marca"] });
  const pool = { request() { return { input() { return this; }, async query(sql) { return { recordset: sql.includes("SELECT TOP") ? [{ Numero_Processo: "IM2099-25 teste", Codigo: "0024", Atividade: "ENVIAR OHBL AO CLIENTE", Situacao: 1 }] : sql.includes("AS Campo") ? [{ Campo: "Marca", Valor: null }] : [] }; } }; } };
  const r = await executarFuncao(pool, "andamento_atividade", { numero: "IM2099-25 teste", codigo: "0024", requisitos: true }, { email: "admin@example.com", acesso: { papel: "admin" }, recorte: {} });
  assert.match(r.texto, /O que falta para concluir/);
  assert.match(r.texto, /Nome Marca/);
  assert.match(r.texto, /sem acionar Concluir/);
});
