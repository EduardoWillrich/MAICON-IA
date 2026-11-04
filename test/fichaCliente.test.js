import test from "node:test";
import assert from "node:assert/strict";
import { nomeCitadoNaFicha, pedidoFichaCliente, pedidoRelacionamento } from "../server/regras.js";

const PERGUNTA =
  "Monte a ficha do cliente com os processos abertos. Se eu não disse o nome, pergunte qual cliente. Inclua vendedor, quantos estão sem proposta, o último processo, a comissão deste mês, se ele é ouro, prata ou bronze e se paga em dia.";

test("a ficha sem nome pergunta qual cliente", () => {
  assert.deepEqual(pedidoFichaCliente([{ role: "user", content: PERGUNTA }]), { perguntar: true });
  assert.equal(nomeCitadoNaFicha(PERGUNTA), "");
  assert.equal(nomeCitadoNaFicha("Monte a ficha do cliente. Se eu não disse o nome, pergunte qual."), "");
});

test("o nome dito na frase segue para a ficha", () => {
  assert.equal(nomeCitadoNaFicha("Monte a ficha da ATL CARGO, se ele é ouro."), "ATL CARGO");
  assert.deepEqual(
    pedidoFichaCliente([{ role: "user", content: "Ficha do cliente Ambev S/A: processos abertos e se paga em dia." }]),
    { cliente: "Ambev S/A" },
  );
});

test("a resposta seguinte com o nome do cliente monta a ficha", () => {
  const pedido = pedidoFichaCliente([
    { role: "user", content: PERGUNTA },
    { role: "assistant", content: "Qual cliente você quer na ficha?" },
    { role: "user", content: "ATL CARGO FREIGHT SOLUTIONS" },
  ]);
  assert.deepEqual(pedido, { cliente: "ATL CARGO FREIGHT SOLUTIONS" });
});

test("relacionamento de ouro, prata e bronze pede os cartões", () => {
  assert.deepEqual(pedidoRelacionamento("Qual o relacionamento dos clientes ouro, prata e bronze?"), {
    niveis: ["ouro", "prata", "bronze"],
  });
  assert.deepEqual(pedidoRelacionamento("Qual o relacionamento dos clientes ouro?"), { niveis: ["ouro"] });
  assert.equal(pedidoRelacionamento("Monte a ficha do cliente com os processos abertos. Se ele é ouro, prata ou bronze e se paga em dia."), null);
  assert.equal(pedidoRelacionamento("Relacionamento do cliente ouro, quantos estão sem proposta."), null);
});

test("ficha de processo e pergunta solta não viram ficha de cliente", () => {
  assert.equal(pedidoFichaCliente([{ role: "user", content: "Monte a ficha do processo IM1000-26." }]), null);
  assert.equal(pedidoFichaCliente([{ role: "user", content: "ATL CARGO FREIGHT SOLUTIONS" }]), null);
  assert.equal(
    pedidoFichaCliente([
      { role: "user", content: PERGUNTA },
      { role: "user", content: "IM6179-26" },
    ]),
    null,
  );
});
