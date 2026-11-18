import test from "node:test";
import assert from "node:assert/strict";
import { camposPedidos } from "../server/comandosBot.js";

test("separa os campos que o HeadCargo pediu para preencher", () => {
  const texto = "Não concluí a atividade ENVIAR OHBL AO CLIENTE. Para confirmar, o HeadCargo pediu para preencher: Tipo embalagem container; Nome Marca; Nome Contramarca.";
  assert.deepEqual(camposPedidos(texto), ["Tipo embalagem container", "Nome Marca", "Nome Contramarca"]);
  assert.deepEqual(camposPedidos("sem aviso"), []);
});
