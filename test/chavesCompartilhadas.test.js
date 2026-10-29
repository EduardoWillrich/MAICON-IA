import test from "node:test";
import assert from "node:assert/strict";
import { apagarChave, chavesParaUso, criarChave } from "../server/conversas.js";

test("chave cadastrada pelo administrador fica disponível para outra conta", () => {
  const sufixo = `${process.pid}-${Date.now()}`;
  const administrador = `admin-${sufixo}@teste.invalid`;
  const usuario = `usuario-${sufixo}@teste.invalid`;
  const segredo = `chave-compartilhada-${sufixo}`;
  const chaves = criarChave(administrador, {
    provedor: "gemini",
    rotulo: "Teste compartilhado",
    chave: segredo,
  });
  const criada = chaves.find((item) => item.final === segredo.slice(-4));
  try {
    assert.ok(criada?.id);
    assert.equal(
      chavesParaUso(usuario).some((item) => item.provedor === "gemini" && item.chave === segredo),
      true,
    );
  } finally {
    if (criada?.id) apagarChave(criada.id, administrador);
  }
});
