import test from "node:test";
import assert from "node:assert/strict";
import { criarSessaoAssinada, lerSessaoAssinada } from "../server/sessaoAssinada.js";

process.env.MAICON_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente";

test("sessão assinada mantém a conta sem depender do SQLite", () => {
  const token = criarSessaoAssinada("Pessoa@Conline.com.br", "Pessoa Teste", 1_000);
  const dados = lerSessaoAssinada(token, 2_000);
  assert.equal(dados?.email, "pessoa@conline.com.br");
  assert.equal(dados?.nome, "Pessoa Teste");
  assert.equal(dados?.renovar, false);
});

test("sessão alterada ou vencida é recusada", () => {
  const inicio = 1_000;
  const token = criarSessaoAssinada("pessoa@conline.com.br", "Pessoa", inicio);
  assert.equal(lerSessaoAssinada(`${token}x`, inicio + 1_000), null);
  assert.equal(lerSessaoAssinada(token, inicio + 31 * 24 * 60 * 60 * 1000), null);
});

test("sessão é marcada para renovação na última semana", () => {
  const inicio = 1_000;
  const token = criarSessaoAssinada("pessoa@conline.com.br", "Pessoa", inicio);
  const depoisDe24Dias = inicio + 24 * 24 * 60 * 60 * 1000;
  assert.equal(lerSessaoAssinada(token, depoisDe24Dias)?.renovar, true);
});
