import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { botaoDaPergunta, consultaDeAtividade } from "../server/intencaoAtividade.js";
import { executarFuncao } from "../server/funcoes.js";
import { camposPedidos, camposValidos } from "../server/comandosBot.js";
import { classificarResultado } from "../server/operacoesBot.js";

const leituras = [
  "Leia a atividade 0018.2 do processo IM2099-25 teste e diga o que falta para concluir.",
  "Leia a atividade 0024 do processo IM2099-25 teste e diga o que falta para concluir.",
  "O que falta para concluir a atividade 0024?",
  "Qual a situação da atividade concluída?",
  "Mostre a atividade cancelada do processo IM2099-25 teste.",
  "Consulte a atividade 0024, sem concluir.",
  "Não conclua a atividade 0024, apenas leia.",
];
test("perguntar sobre conclusão e estado nunca é ordem para clicar", () => {
  for (const t of leituras) { assert.equal(botaoDaPergunta(t), "", t); assert.equal(consultaDeAtividade(t), true, t); }
});
test("uma ordem explícita continua funcionando, inclusive depois de consultar", () => {
  for (const [t, esperado] of [
    ["Conclua a atividade 0024 do processo IM2099-25 teste.", "CONCLUIR"],
    ["Pode concluir a atividade 0024 do processo IM2099-25 teste.", "CONCLUIR"],
    ["Quero que o bot concluir a atividade 0024.", "CONCLUIR"],
    ["Leia a atividade 0024 e depois conclua a atividade.", "CONCLUIR"],
    ["Restaure a atividade 0018.2.", "RESTAURAR"],
    ["Cancele a atividade 0024.", "CANCELAR"],
  ]) { assert.equal(botaoDaPergunta(t), esperado, t); assert.equal(consultaDeAtividade(t), false, t); }
});
test("as duas mensagens do print geram receitas somente de consulta", async () => {
  let fonte = await readFile(new URL("../src/receitasIa.ts", import.meta.url), "utf8");
  fonte = fonte.replace('"./datas"', JSON.stringify(new URL("../src/datas.ts", import.meta.url).href))
    .replace('"../server/intencaoAtividade.js"', JSON.stringify(new URL("../server/intencaoAtividade.js", import.meta.url).href))
    .replace('"../server/projetoPedido.js"', JSON.stringify(new URL("../server/projetoPedido.js", import.meta.url).href))
    .replace('"../server/pedidoFicha.js"', JSON.stringify(new URL("../server/pedidoFicha.js", import.meta.url).href));
  const compilado = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { receitaSalva } = await import(`data:text/javascript;base64,${Buffer.from(compilado).toString("base64")}`);
  assert.equal(receitaSalva("Monte a ficha do cliente. Se eu não disse o nome, pergunte qual. Diga se ele é ouro, prata ou bronze e se paga em dia."),null);
  for (const [i, pedido] of leituras.slice(0, 2).entries()) {
    const r = receitaSalva(pedido);
    assert.equal(r[0].nome, "andamento_atividade");
    assert.equal(r[0].args.codigo, i ? "0024" : "0018.2");
    assert.equal(r[0].args.numero, "IM2099-25 TESTE");
    assert.equal(r[0].args.concluir, undefined);
    assert.equal(r[0].args.botao, undefined);
  }
});
test("servidor preserva leitura mesmo se o cliente enviar flags de conclusão", async () => {
  let consultas = 0;
  const pool = { request() { return { input() { return this; }, async query(sql) { consultas++; return { recordset: sql.includes("SELECT TOP") ? [{ Numero_Processo: "IM2099-25 teste", Codigo: "0024", Atividade: "ENVIAR OHBL AO CLIENTE", Situacao: 1 }] : [] }; } }; } };
  const ctx = { pergunta: leituras[1], email: "admin@example.com", acesso: { papel: "admin" }, recorte: {} };
  for (const nome of ["andamento_atividade", "comando_bot"]) {
    const r = await executarFuncao(pool, nome, { numero: "IM2099-25 teste", codigo: "0024", concluir: true, botao: "CONCLUIR", acao: "concluir" }, ctx);
    assert.match(r.texto, /Ainda não iniciada/);
    assert.doesNotMatch(r.texto, /Concluí|Não concluí|Tarefa/);
  }
  assert.equal(consultas, 8);
  await assert.rejects(executarFuncao(pool, "tarefa_bot", { acao: "criar", executar: true }, ctx), /pedido é uma consulta/);
});
test("aviso do print não vira campo obrigatório nem aprendizado", () => {
  const errado = "Não concluí. O HeadCargo pediu para preencher: Cuidado x; A conexão servidor foi perdida anteriormente. com o; Deseja tentar reconectar agora?; Não, forçar fechamento do sistema.";
  assert.deepEqual(camposPedidos(errado), []);
  assert.deepEqual(camposValidos(["Cuidado x", "A conexão servidor foi perdida anteriormente", "Deseja tentar reconectar agora?"]), []);
  assert.deepEqual(camposValidos(["Fecha Ctrl+F4 r Minimizar Maximizar Restaurar Restaurar tamanho Centralizar"]), []);
  assert.equal(classificarResultado(errado, { acao: "concluir" }).estado, "revisao");
});
