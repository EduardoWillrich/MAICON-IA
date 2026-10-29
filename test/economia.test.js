import test from "node:test";
import assert from "node:assert/strict";
import {
  conversaSimples,
  chamadaDireta,
  ferramentasProvaveis,
  lerFiltro,
  pedidoInformativo,
  pedidoSimples,
  respostaDeFerramentaPronta,
  respostaImediata,
} from "../server/economia.js";
import { textoConsultasRelevantes } from "../server/consultas.js";

test("cumprimento curto não exige consulta", () => {
  assert.equal(pedidoSimples("oi"), true);
  assert.equal(pedidoSimples("Bom dia!"), true);
  assert.equal(conversaSimples([{ role: "user", content: "o que você faz" }]), true);
});

test("pedido com dado ou número de processo segue para a IA principal", () => {
  assert.equal(pedidoSimples("oi, qual o cliente do IM1020-26"), false);
  assert.equal(pedidoSimples("liste os processos abertos"), false);
  assert.equal(conversaSimples([
    { role: "user", content: "oi" },
    { role: "assistant", content: "Olá" },
    { role: "user", content: "mostre as taxas" },
  ]), false);
});

test("pergunta geral pode usar o modelo leve sem ferramentas", () => {
  assert.equal(pedidoInformativo("Explique em uma frase o que é logística internacional."), true);
  assert.equal(pedidoInformativo("Qual o cliente do processo IM1020-26?"), false);
  assert.equal(pedidoInformativo("Liste as taxas abertas"), false);
});

test("responde localmente a saudação e pede o número ausente", () => {
  assert.match(respostaImediata("oi"), /Olá/);
  assert.match(respostaImediata("preciso de informações sobre um processo"), /número do processo/i);
  assert.equal(respostaImediata("taxas do processo IM1020-26"), "");
});

test("seleciona ferramentas comuns sem gastar uma chamada de IA", () => {
  assert.deepEqual(
    ferramentasProvaveis("quais taxas do processo IM1020-26"),
    ["localizar_processo", "taxas_processo"],
  );
  assert.deepEqual(
    ferramentasProvaveis("qual a rota do processo IM1020-26"),
    ["localizar_processo", "rota_processo"],
  );
  assert.deepEqual(chamadaDireta("Quais processos desembarcam hoje?"), {
    nome: "prazos",
    args: { dias: 1 },
  });
});

test("devolve diretamente o texto de ferramenta já formatado", () => {
  const id = "direta_1";
  assert.equal(
    respostaDeFerramentaPronta([
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id, function: { name: "prazos", arguments: "{\"dias\":1}" } }],
      },
      { role: "tool", tool_call_id: id, content: "{\"texto\":\"Processos de hoje\"}" },
    ]),
    "Processos de hoje",
  );
});

test("filtro aceita só ferramentas conhecidas", () => {
  assert.deepEqual(
    lerFiltro('{"ferramentas":["resumo_processo","apagar"],"termos":"IM1020-26"}', ["resumo_processo"]),
    { ferramentas: ["resumo_processo"], termos: "IM1020-26" },
  );
});

test("catálogo relevante fica muito menor que o catálogo completo", () => {
  const recorte = textoConsultasRelevantes("taxas do processo");
  assert.match(recorte, /taxa/i);
  assert.ok(recorte.length < 8000);
});
