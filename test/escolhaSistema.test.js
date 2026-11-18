import test from "node:test";
import assert from "node:assert/strict";
import { decidirCadastro, dominioDoCampo, escolherLinha, opcaoFixa, prepararEscolha } from "../server/escolhaSistema.js";

test("o campo diz qual cadastro consultar", () => {
  assert.equal(dominioDoCampo("destino").dominio, "origem_destino");
  assert.equal(dominioDoCampo("data de embarque").dominio, "");
  assert.equal(dominioDoCampo("embarque").dominio, "");
  assert.equal(dominioDoCampo("porto de embarque").dominio, "origem_destino");
  assert.equal(dominioDoCampo("situacao embarque").dominio, "situacao_embarque");
  assert.equal(dominioDoCampo("tipo de carga").dominio, "tipo_carga");
  assert.equal(dominioDoCampo("companhia de transporte").dominio, "companhia");
  assert.equal(dominioDoCampo("importador").papel, "importador");
  assert.equal(dominioDoCampo("referencia do cliente").dominio, "");
});

test("tipo de carga aceita o nome do sistema e o jeito de falar", () => {
  assert.equal(opcaoFixa("tipo_carga", "lcl").nome, "LCL");
  assert.equal(opcaoFixa("tipo_carga", "fcl").codigo, "3");
  assert.equal(opcaoFixa("tipo_carga", "carga consolidada").nome, "LCL");
  assert.equal(opcaoFixa("tipo_carga", "break bulk").nome, "Break bulk");
  assert.equal(opcaoFixa("tipo_carga", "xx"), null);
});

test("cadastro igual ganha de nome parecido e empate pede a sigla", () => {
  const linhas = [
    { Nome: "SANTOS", Sigla: "BRSSZ", Codigo: "SSZ" },
    { Nome: "SANTOS BRASIL", Sigla: "BRSBR", Codigo: "SBR" },
  ];
  assert.equal(decidirCadastro(linhas, "santos").item.Sigla, "BRSSZ");
  assert.equal(decidirCadastro(linhas, "ssz").item.Nome, "SANTOS");
  assert.equal(decidirCadastro([
    { Nome: "SANTOS", Sigla: "BRSSZ" },
    { Nome: "SANTOS", Sigla: "BRSTS" },
  ], "santos").tipo, "ambiguo");
});

test("a linha da tela precisa ser o registro, não a primeira palavra parecida", () => {
  const palavras = [
    { t: "SANTOS", x: 10, y: 40 },
    { t: "BRSSZ", x: 90, y: 42 },
    { t: "SANTOS", x: 10, y: 70 },
    { t: "BRASIL", x: 90, y: 70 },
  ];
  const dica = { nome: "SANTOS", sigla: "BRSSZ", codigo: "SSZ", aliases: [] };
  assert.equal(escolherLinha(palavras, "SANTOS", dica).texto, "SANTOS BRSSZ");
  assert.equal(escolherLinha([
    { t: "SANTOS", x: 10, y: 40 },
    { t: "SP", x: 80, y: 40 },
    { t: "SANTOS", x: 10, y: 70 },
    { t: "RJ", x: 80, y: 70 },
  ], "SANTOS", { nome: "SANTOS", sigla: "", codigo: "", aliases: [] }).tipo, "ambiguo");
});

test("sem banco, a lista fixa já troca o apelido pelo nome do sistema", async () => {
  const escolha = await prepararEscolha(null, "tipo de carga", "consolidado");
  assert.equal(escolha.seguir, true);
  assert.equal(escolha.valor, "LCL");
  assert.equal(escolha.escolha.codigo, "4");
  const fcl = await prepararEscolha(null, "tipo de carga", "FCL");
  assert.equal(fcl.valor, "FCL");
  assert.equal(fcl.escolha.codigo, "3");
  assert.equal(fcl.escolha.lista, true);
  const porto = await prepararEscolha(null, "destino", "navegantes");
  assert.equal(porto.seguir, true);
  assert.equal(porto.valor, "navegantes");
});
