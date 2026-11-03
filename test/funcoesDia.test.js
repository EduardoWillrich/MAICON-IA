import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  anoCheio,
  escolherCliente,
  executarFuncao,
  ferramentaDaVisao,
  montarPainelDia,
  passosDaFicha,
  perguntaMeuDia,
  sufixoDoAno,
} from "../server/funcoes.js";
import { esquemaDaFerramenta } from "../server/ia.js";

function poolFalso(responder) {
  const consultas = [];
  const pool = {
    consultas,
    request() {
      const inputs = {};
      const pedido = {
        input(nome, _tipo, valor) {
          inputs[nome] = valor;
          return pedido;
        },
        async query(comando) {
          const item = { comando, inputs: { ...inputs } };
          consultas.push(item);
          return { recordset: await responder(item, consultas.length) };
        },
      };
      return pedido;
    },
  };
  return pool;
}

function ctxDe(recorte) {
  return {
    recorte,
    email: "ana@conline.com.br",
    nome: "Ana",
    acesso: { papel: "admin", fazerLog: true },
  };
}

test("meu dia não é a lista de pendências de hoje", () => {
  assert.equal(perguntaMeuDia("Como está o meu dia?"), true);
  assert.equal(perguntaMeuDia("  o que eu preciso fazer hoje. "), true);
  assert.equal(perguntaMeuDia("Quais são minhas pendências de hoje?"), false);
});

test("o ano do processo segue o pedido e, sem pedido, o ano atual", () => {
  assert.equal(sufixoDoAno(2024), "24");
  assert.equal(sufixoDoAno("26"), "26");
  assert.equal(sufixoDoAno("", new Date("2027-03-01T12:00:00Z")), "27");
  assert.equal(anoCheio("24"), 2024);
  assert.equal(anoCheio("26"), 2026);
});

test("cliente homônimo pede escolha e o nome exato segue mesmo com menos processos", () => {
  const grupos = [
    { Nome: "Silva Transportes", Abertos: 8, SemProposta: 1 },
    { Nome: "Silva Log", Abertos: 1, SemProposta: 0 },
  ];
  const ambiguo = escolherCliente(grupos, "silva");
  assert.equal(ambiguo.tipo, "ambiguo");
  assert.equal(ambiguo.opcoes.length, 2);
  const exato = escolherCliente(grupos, "Silva Log");
  assert.equal(exato.tipo, "unico");
  assert.equal(exato.cliente.nome, "Silva Log");
  assert.equal(exato.cliente.abertos, 1);
  assert.deepEqual(exato.outros.map((item) => item.nome), ["Silva Transportes"]);
});

test("a ficha sugere no máximo três próximos passos e ignora pendência vazia", () => {
  const vazio = passosDaFicha("Pendência: nenhuma em aberto.\nÚltimo acompanhamento: nenhum.");
  assert.deepEqual(vazio, ["Registrar um acompanhamento."]);
  const cheio = passosDaFicha(
    [
      "Pendência: Liberar BL (previsão 10/11/2026)",
      "O processo IM1000-26 não tem proposta nem oferta ligada.",
      "CE não liberado · Em desembaraço",
      "Último acompanhamento: nenhum.",
      "Previsão de embarque: 12/11/2026",
    ].join("\n"),
  );
  assert.equal(cheio.length, 3);
  assert.match(cheio[0], /Liberar BL/);
  assert.match(cheio[1], /proposta/);
  assert.match(cheio[2], /CE/);
});

test("o contrato da ferramenta inclui o que o código já executa", () => {
  assert.ok(esquemaDaFerramenta("pendencias").parameters.properties.escopo.enum.includes("abertas"));
  const prazos = esquemaDaFerramenta("prazos").parameters.properties;
  assert.ok(prazos.marco);
  assert.ok(prazos.modo);
  assert.ok(prazos.modalidade);
  assert.ok(esquemaDaFerramenta("processos_abertos_cliente").parameters.properties.foco);
  assert.equal(esquemaDaFerramenta("processos_abertos_cliente").parameters.required, undefined);
  assert.ok(esquemaDaFerramenta("processos_abertos"));
  assert.ok(esquemaDaFerramenta("meu_dia"));
  assert.ok(esquemaDaFerramenta("ficha_processo"));
  assert.equal(esquemaDaFerramenta("atividades_pendentes").parameters.properties.ano.type, "integer");
  assert.equal(ferramentaDaVisao("meu_dia", "financeiro"), true);
  assert.equal(ferramentaDaVisao("ficha_processo", "financeiro"), true);
  assert.equal(ferramentaDaVisao("processos_abertos", "financeiro"), true);
  assert.equal(ferramentaDaVisao("painel_ti", "financeiro"), false);
});

test("atividades pendentes de outro ano não ficam presas em 2026", async () => {
  const pool = poolFalso(() => []);
  const resultado = await executarFuncao(pool, "atividades_pendentes", { setor: "comercial", ano: 2024 }, ctxDe({ visao: "comercial" }));
  assert.equal(pool.consultas[0].inputs.ano, "24");
  assert.match(pool.consultas[0].comando, /@ano/);
  assert.match(resultado.sql, /N'24'/);
  assert.match(resultado.texto, /2024/);
  assert.doesNotMatch(resultado.texto, /2026/);
});

test("ficha de cliente ambígua pergunta qual nome antes de montar a ficha", async () => {
  const pool = poolFalso((_item, ordem) => {
    if (ordem > 1) throw new Error("a ficha foi montada sem escolher o cliente");
    return [
      { Nome: "Silva Transportes", Abertos: 4, SemProposta: 1 },
      { Nome: "Silva Log", Abertos: 2, SemProposta: 0 },
    ];
  });
  const resultado = await executarFuncao(
    pool,
    "processos_abertos_cliente",
    { cliente: "Silva" },
    ctxDe({ visao: "tudo", semComercial: false, semComissao: false, semOperacional: false }),
  );
  assert.equal(pool.consultas.length, 1);
  assert.match(resultado.texto, /Qual deles você quer na ficha/);
  assert.match(resultado.texto, /Silva Log/);
  assert.doesNotMatch(resultado.texto, /^Ficha de /);
});

test("ficha do processo junta a situação e os próximos passos", async () => {
  const pool = poolFalso(() => [
    {
      Numero_Processo: "IM1000-26",
      Cliente: "Acme",
      Vendedor: "Ana",
      Situacao: "Em andamento",
      Referencia_Cliente: "REF-1",
      Pendencia: "Liberar BL",
      Previsao_Pendencia: null,
      Acompanhamento: null,
    },
  ]);
  const resultado = await executarFuncao(
    pool,
    "ficha_processo",
    { numero: "IM1000-26" },
    ctxDe({ visao: "comercial", semOperacional: true, semComercial: false, semComissao: false }),
  );
  assert.match(resultado.texto, /Processo IM1000-26/);
  assert.match(resultado.texto, /Pendência: Liberar BL/);
  assert.match(resultado.texto, /não tem proposta/);
  assert.match(resultado.texto, /Próximos passos/);
  assert.match(resultado.texto, /Vincular a proposta/);
});

test("o painel do dia separa atrasadas, hoje e a semana", () => {
  const painel = montarPainelDia("Eduardo Willrich", [
    { Atividade: "Liberar BL", Numero_Processo: "IM1-26", Cliente: "Acme", Previsao_Termino: new Date(Date.UTC(2026, 10, 1)), Motivo: "Falta o BL" },
    { Atividade: "Enviar DI", Numero_Processo: "IM2-26", Cliente: "Beta", Previsao_Termino: new Date(Date.UTC(2026, 10, 3)), Motivo: "" },
    { Atividade: "Cobrar cliente", Numero_Processo: "IA3-26", Cliente: "Gama", Previsao_Termino: new Date(Date.UTC(2026, 10, 6)), Motivo: "" },
    { Atividade: "Sem data", Numero_Processo: "EM4-26", Cliente: "Delta", Previsao_Termino: null, Motivo: "" },
  ], new Date("2026-11-03T15:00:00Z"));
  assert.equal(painel.titulo, "Meu dia");
  assert.deepEqual(painel.chips.map((chip) => chip.valor), [1, 1, 1]);
  assert.equal(painel.grupos.find((grupo) => grupo.id === "atrasada")?.itens[0].rel, "Há 2 dias");
  assert.equal(painel.grupos.find((grupo) => grupo.id === "hoje")?.itens[0].rel, "Hoje");
  assert.equal(painel.grupos.find((grupo) => grupo.id === "semana")?.itens[0].rel, "Em 3 dias");
  assert.equal(painel.grupos.find((grupo) => grupo.id === "sem_data")?.itens[0].atividade, "Sem data");
  assert.equal(painel.vazio, "");
});

test("meu dia é o mesmo painel em qualquer visão", async () => {
  const linhas = () => [
    { Atividade: "Liberar BL", Numero_Processo: "IM1000-26", Cliente: "Acme", Previsao_Termino: new Date(Date.UTC(2026, 10, 1)), Motivo: "Falta o BL" },
  ];
  const poolDe = () => poolFalso((item) => (/EMail_Pessoal/.test(item.comando) ? [{ IdPessoa: 7, Nome: "Eduardo Willrich" }] : linhas()));
  const operacional = await executarFuncao(poolDe(), "meu_dia", {}, ctxDe({ visao: "operacional" }));
  const financeiro = await executarFuncao(poolDe(), "meu_dia", {}, ctxDe({ visao: "financeiro" }));
  assert.match(operacional.texto, /^```dia/);
  assert.equal(operacional.texto, financeiro.texto);
  const painel = JSON.parse(operacional.texto.replace(/^```dia\n/, "").replace(/\n```$/, ""));
  assert.equal(painel.nome, "Eduardo Willrich");
  assert.equal(painel.grupos[0].itens[0].atividade, "Liberar BL");
  assert.equal(painel.grupos[0].itens[0].processo, "IM1000-26");
});

test("as receitas do chat apontam para meu dia, ficha e o ano pedido", async () => {
  const fonte = await readFile(new URL("../src/receitasIa.ts", import.meta.url), "utf8");
  assert.match(fonte, /"como está o meu dia\?": \[\{ nome: "meu_dia"/);
  assert.match(fonte, /nome: "ficha_processo"/);
  assert.match(fonte, /atividades_pendentes", args: \{ setor: "comercial", ano: 2026 \}/);
  assert.match(fonte, /divergencias_viagem", args: \{ dias: 15, ano: 2026 \}/);
  assert.match(fonte, /quais processos deste ano têm o desembarque/);
});
