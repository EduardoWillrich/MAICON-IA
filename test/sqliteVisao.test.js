import test from "node:test";
import assert from "node:assert/strict";
import { arquivoSqlitePermitido, tabelaSqlitePermitida, valorVisivel } from "../server/sqliteVisao.js";

test("só aceita arquivo sqlite dentro da pasta de dados", () => {
  assert.equal(arquivoSqlitePermitido("../segredo.sqlite"), "");
  assert.equal(arquivoSqlitePermitido("conversas.sqlite.txt"), "");
  assert.equal(tabelaSqlitePermitida("conversas;drop"), "");
  assert.equal(tabelaSqlitePermitida("mensagens"), "mensagens");
});

test("mascara segredo, token do Google e id de sessão", () => {
  assert.equal(valorVisivel("segredo", "sk-or-v1-abcdef1234"), "••••1234");
  assert.equal(valorVisivel("google", "ya29.token-secreto"), "••••reto");
  assert.equal(valorVisivel("id", "maicon.sessao-longa-99ab"), "••••99ab");
  assert.equal(valorVisivel("email", "ana@conlinebr.com.br"), "ana@conlinebr.com.br");
});
