import assert from "node:assert/strict";
import test from "node:test";
import { escolherAutocorrecoes, textoDasAutocorrecoes } from "../server/aprendizado.js";

const recusas = [
  {
    email: "eduardo.cunha@conlinebr.com.br",
    pergunta: "traga o lucro estimado total dos processos abertos na semana passada",
    resposta: "Tabela com vários processos, clientes e situações.",
    comentario: "pedi apenas o lucro estimado total, não uma tabela com varios registros",
  },
  {
    email: "eduardo.willrich@conlinebr.com.br",
    pergunta: "qual o navio do processo IM1000-26",
    resposta: "Não encontrei o navio.",
    comentario: "o navio está na viagem",
  },
];

test("a próxima pergunta de lucro reaproveita a recusa parecida", () => {
  const escolhidas = escolherAutocorrecoes("qual o lucro estimado total dos processos abertos", recusas, "outro@conlinebr.com.br");
  assert.equal(escolhidas.length, 1);
  assert.match(escolhidas[0].pergunta, /lucro estimado/);
  const texto = textoDasAutocorrecoes(escolhidas);
  assert.match(texto, /AUTOCORREÇÃO OBRIGATÓRIA/);
  assert.match(texto, /não uma tabela/);
  assert.match(texto, /Não repita/);
});

test("uma pergunta diferente não herda a recusa", () => {
  const escolhidas = escolherAutocorrecoes("quais clientes não têm proposta", recusas, "outro@conlinebr.com.br");
  assert.equal(escolhidas.length, 0);
  assert.equal(textoDasAutocorrecoes(escolhidas), "");
});
