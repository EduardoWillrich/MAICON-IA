import assert from "node:assert/strict";
import test from "node:test";
import { escolherFoto, fotoPadrao, urlFotoGoogle } from "../server/acesso.js";

test("a foto da conta só aceita o endereço https do Google", () => {
  const boa = "https://lh3.googleusercontent.com/a/abc=s96-c";
  assert.equal(urlFotoGoogle(boa), boa);
  assert.equal(urlFotoGoogle("http://lh3.googleusercontent.com/a/abc"), "");
  assert.equal(urlFotoGoogle("https://evil.example/a.png"), "");
  assert.equal(urlFotoGoogle("javascript:alert(1)"), "");
  assert.equal(urlFotoGoogle(""), "");
});

test("a inicial gerada pelo Google não apaga uma foto de verdade", () => {
  const inicial = "https://lh3.googleusercontent.com/a/ACg8ocLVqhvidy7mcH63kQg8QALv_3fllHqNlQ1iJZ-I";
  const real = "https://lh3.googleusercontent.com/a-/AOh14real=s256-c";
  assert.equal(fotoPadrao(inicial), true);
  assert.equal(fotoPadrao(real), false);
  assert.equal(escolherFoto(real, inicial), "");
  assert.equal(escolherFoto(inicial, real), real);
});
