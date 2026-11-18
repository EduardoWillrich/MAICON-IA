import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { executarFuncao } from "../server/funcoes.js";
import { gatilhosDoTexto } from "../src/gatilhos.ts";

const linhas = (n) => Array.from({ length: n }, (_, i) => ({
  IdTarefa_Gatilho_Situacao: i + 1, Codigo: String(i).padStart(4,"0"), Atividade: `ORIGEM ${i + 1}`,
  Situacao_Atual: 4, Situacao_Atualizar: i % 2 ? 1 : 4,
  Codigo_Alvo: String(i + 1).padStart(4, "0"), Atividade_Alvo: `DESTINO ${i + 1}`,
  Gerar_Atividade: i % 3 === 0, Observacao: i === n - 1 ? "Último gatilho da lista completa." : "",
}));

async function componente() {
  const fonte = (await readFile(new URL("../src/GatilhosCard.tsx", import.meta.url), "utf8")).replace(/^import\s+"\.\/estilos\/gatilhos.css";\s*$/m, "");
  const js = ts.transpileModule(fonte, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve("react/jsx-runtime")));
  return (await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`)).GatilhosCard;
}

test("consulta devolve todos os gatilhos do projeto, inclusive acima de 60", async () => {
  const consultas = [];
  const pool = { request() { const parametros = {}; return { input(n, _tipo, v) { parametros[n] = v; return this; }, async query(sql) { consultas.push({ sql, parametros }); return { recordset: sql.includes("cad_Tarefa_Gatilho_Situacao") ? linhas(83) : [{ IdProjeto_Tarefa: 19, Codigo: "0004", Nome: "IMPORTACAO MARITIMA" }] }; } }; } };
  const r = await executarFuncao(pool, "gatilhos_atividade", { numero: "IM2099-25 teste" }, { acesso: { papel: "admin" }, recorte: {} });
  const dados = gatilhosDoTexto(r.texto);
  assert.equal(dados.projetos[0].gatilhos.length, 83);
  assert.equal(dados.projetos[0].gatilhos[82].destino.nome, "DESTINO 83");
  assert.equal(dados.projetos[0].gatilhos[82].observacao, "Último gatilho da lista completa.");
  assert.doesNotMatch(consultas[1].sql, /\bTOP\b/i);
  assert.equal(consultas[1].parametros.id, 19);
  assert.match(consultas[1].sql, /G.IdTarefa_Gatilho_Situacao/);
});

test("respostas antigas preservam a primeira e a última linha no novo desenho", () => {
  const texto = "Gatilhos do projeto 0004 IMPORTACAO MARITIMA\n\n" + Array.from({ length: 60 }, (_, i) => `- ${String(i).padStart(4,"0")} ATIVIDADE ${i}: quando fica concluída, 9999 DESTINO ${i} fica não iniciada. Gera uma atividade nova.`).join("\n");
  const r = gatilhosDoTexto(texto);
  assert.equal(r.projetos[0].gatilhos.length, 60);
  assert.equal(r.projetos[0].gatilhos[0].origem.codigo, "0000");
  assert.equal(r.projetos[0].gatilhos[59].destino.nome, "DESTINO 59");
  assert.equal(r.projetos[0].gatilhos[59].geraAtividade, true);
});

test("componente renderiza 83 linhas e calcula o contador da mesma coleção", async () => {
  const GatilhosCard = await componente();
  const dados = gatilhosDoTexto("Gatilhos do projeto 0004 IMPORTACAO MARITIMA\n" + Array.from({ length:83 }, (_, i) => `- ${i} ORIGEM ${i}: quando fica concluída, ${i+1} DESTINO ${i} fica concluída.`).join("\n"));
  const html = renderToStaticMarkup(React.createElement(GatilhosCard, { lista: dados }));
  assert.equal((html.match(/class="gatilhos-item"/g) || []).length, 83);
  assert.match(html, /Todos os 83 gatilhos exibidos/);
  assert.match(html, /DESTINO 82/);
  assert.doesNotMatch(html, /<li[^>]*(?:\shidden(?:\s|=|>)|aria-hidden="true"|display:\s*none)/);
});

test("projetos vazios e múltiplos têm contagens corretas", async () => {
  const GatilhosCard = await componente();
  const vazio = { projetos: [{ codigo: "0004", nome: "IMPORTACAO MARITIMA", gatilhos: [] }] };
  const html = renderToStaticMarkup(React.createElement(GatilhosCard, { lista: vazio }));
  assert.match(html, /Nenhum gatilho cadastrado/);
  assert.equal((html.match(/class="gatilhos-item"/g) || []).length, 0);
  assert.equal(gatilhosDoTexto("```gatilhos\n{\"projetos\": [{\"codigo\": \"1\", \"nome\": \"A\", \"gatilhos\": []}, {\"codigo\": \"2\", \"nome\": \"B\", \"gatilhos\": []}]}\n```").projetos.length, 2);
  assert.equal(gatilhosDoTexto("```gatilhos\n{\"projetos\": [{\"gatilhos\": [null]}]}\n```"), null);
});
