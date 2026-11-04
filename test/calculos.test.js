import test from "node:test";
import assert from "node:assert/strict";
import { numeroDe, resumirCalculos, textoCalculos } from "../server/calculos.js";

test("lê número em real e ignora código", () => {
  assert.equal(numeroDe("R$ 1.234,50"), 1234.5);
  assert.equal(numeroDe("20,50"), 20.5);
  assert.equal(numeroDe("IM1020-26"), null);
  assert.equal(numeroDe(10.5), 10.5);
});

test("soma recebimento, calcula lucro e margem e não soma id", () => {
  const linhas = [
    { IdLogistica_Taxa: 1, Valor_Recebimento_Total: 10.5, Valor_Pagamento_Total: 4, Situacao: 0 },
    { IdLogistica_Taxa: 2, Valor_Recebimento_Total: "20,50", Valor_Pagamento_Total: 1, Situacao: 1 },
  ];
  const resumo = resumirCalculos(linhas);
  assert.equal(resumo.colunas.find((coluna) => coluna.nome === "Valor_Recebimento_Total").soma, 31);
  assert.equal(resumo.colunas.find((coluna) => coluna.nome === "Valor_Pagamento_Total").soma, 5);
  assert.equal(resumo.derivados.find((item) => item.nome === "Lucro").valor, 26);
  assert.equal(resumo.derivados.find((item) => item.nome === "Margem").valor, 83.9);
  assert.equal(resumo.colunas.some((coluna) => /id|situacao/i.test(coluna.nome)), false);
  const texto = textoCalculos(linhas);
  assert.match(texto, /CÁLCULOS sobre 2 linhas/);
  assert.match(texto, /Lucro/);
  assert.doesNotMatch(texto, /IdLogistica_Taxa/);
});

test("não multiplica total de janela e não soma percentual", () => {
  const linhas = [
    { Cliente: "A", Total: 2, Valor: 10, Margem: 10 },
    { Cliente: "B", Total: 2, Valor: 5, Margem: 30 },
  ];
  const resumo = resumirCalculos(linhas, { janela: true });
  assert.equal(resumo.colunas.find((coluna) => coluna.nome === "Total").repetido, true);
  assert.equal(resumo.colunas.find((coluna) => coluna.nome === "Valor").soma, 15);
  assert.equal(resumo.derivados.length, 0);
  const texto = textoCalculos(linhas, { janela: true });
  assert.match(texto, /não multiplique/i);
  assert.match(texto, /Não some percentual/);
});

test("média ignora vazio e uma linha não vira cálculo", () => {
  const resumo = resumirCalculos([{ Valor: 10 }, { Valor: null }, { Valor: 30 }]);
  const valor = resumo.colunas.find((coluna) => coluna.nome === "Valor");
  assert.equal(valor.qtd, 2);
  assert.equal(valor.soma, 40);
  assert.equal(valor.media, 20);
  assert.match(textoCalculos([{ Valor: 10 }, { Valor: null }, { Valor: 30 }]), /sobre 2 valores/);
  assert.equal(textoCalculos([{ Valor: 10 }]), "");
});
