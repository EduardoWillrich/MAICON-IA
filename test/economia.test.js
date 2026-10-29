import test from "node:test";
import assert from "node:assert/strict";
import {
  conversaSimples,
  chamadaDireta,
  ferramentasProvaveis,
  lerFiltro,
  pedidoInformativo,
  pedidoSimples,
  respostaDeFerramentaPronta,
  respostaImediata,
} from "../server/economia.js";
import { textoConsultasRelevantes } from "../server/consultas.js";

test("cumprimento curto não exige consulta", () => {
  assert.equal(pedidoSimples("oi"), true);
  assert.equal(pedidoSimples("Bom dia!"), true);
  assert.equal(conversaSimples([{ role: "user", content: "o que você faz" }]), true);
});

test("pedido com dado ou número de processo segue para a IA principal", () => {
  assert.equal(pedidoSimples("oi, qual o cliente do IM1020-26"), false);
  assert.equal(pedidoSimples("liste os processos abertos"), false);
  assert.equal(conversaSimples([
    { role: "user", content: "oi" },
    { role: "assistant", content: "Olá" },
    { role: "user", content: "mostre as taxas" },
  ]), false);
});

test("pergunta geral pode usar o modelo leve sem ferramentas", () => {
  assert.equal(pedidoInformativo("Explique em uma frase o que é logística internacional."), true);
  assert.equal(pedidoInformativo("Qual o cliente do processo IM1020-26?"), false);
  assert.equal(pedidoInformativo("Liste as taxas abertas"), false);
});

test("responde localmente a saudação e pede o número ausente", () => {
  assert.match(respostaImediata("oi"), /Olá/);
  assert.match(respostaImediata("preciso de informações sobre um processo"), /número do processo/i);
  assert.equal(respostaImediata("taxas do processo IM1020-26"), "");
});

test("seleciona ferramentas comuns sem gastar uma chamada de IA", () => {
  assert.deepEqual(
    ferramentasProvaveis("quais taxas do processo IM1020-26"),
    ["localizar_processo", "taxas_processo"],
  );
  assert.deepEqual(
    ferramentasProvaveis("qual a rota do processo IM1020-26"),
    ["localizar_processo", "rota_processo"],
  );
  assert.deepEqual(chamadaDireta("Quais processos desembarcam hoje?"), {
    nome: "prazos",
    args: { dias: 1, marco: "desembarque", modo: "hoje" },
  });
  assert.deepEqual(chamadaDireta("quais processos desembarcaram hoje?"), {
    nome: "prazos",
    args: { dias: 1, marco: "desembarque", modo: "realizado" },
  });
  assert.deepEqual(chamadaDireta("Quais processos embarcaram ou desembarcaram hoje?"), {
    nome: "prazos",
    args: { dias: 1, marco: "embarque,desembarque", modo: "realizado" },
  });
  assert.deepEqual(chamadaDireta("Quais processos IM desembarcaram hoje?"), {
    nome: "prazos",
    args: { dias: 1, marco: "desembarque", modo: "realizado", modalidade: "IM" },
  });
  assert.deepEqual(chamadaDireta("Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?"), {
    nome: "prazos",
    args: { dias: 7 },
  });
  assert.deepEqual(chamadaDireta("quais atividades minhas estão atrasadas?"), {
    nome: "pendencias",
    args: { escopo: "atrasadas" },
  });
  assert.deepEqual(chamadaDireta("Quais são minhas pendências atrasadas, de hoje e da semana?"), {
    nome: "pendencias",
    args: { escopo: "abertas" },
  });
  assert.deepEqual(chamadaDireta("Quais são as atividades pendentes do comercial em 2026 e qual o motivo de cada uma?"), {
    nome: "atividades_pendentes",
    args: { setor: "comercial" },
  });
  assert.deepEqual(chamadaDireta("Quais são as atividades pendentes do inside em 2026 e qual o motivo de cada uma?"), {
    nome: "atividades_pendentes",
    args: { setor: "inside" },
  });
  assert.deepEqual(chamadaDireta("Quais são as atividades pendentes do operacional em 2026 e qual o motivo de cada uma?"), {
    nome: "atividades_pendentes",
    args: { setor: "operacional" },
  });
  assert.deepEqual(chamadaDireta("Quais atividades estão agora com o documental CE?"), {
    nome: "documental_ce",
    args: { foco: "fila", caso: "ce" },
  });
  assert.deepEqual(chamadaDireta("Quais atividades estão agora com o documental IM?"), {
    nome: "documental_ce",
    args: { foco: "fila", caso: "im" },
  });
  assert.deepEqual(chamadaDireta("Quais são todas as atividades pendentes do documental CE e do documental IM, e o que falta para concluir cada uma?"), {
    nome: "documental_ce",
    args: { foco: "pendencias", caso: "ambos" },
  });
  assert.deepEqual(chamadaDireta("Quais atividades do documental CE e do documental IM ainda não têm o CE liberado?"), {
    nome: "documental_ce",
    args: { foco: "sem_liberacao", caso: "ambos" },
  });
  assert.deepEqual(chamadaDireta("Quais processos estão parados há 7 dias sem acompanhamento?"), {
    nome: "processos_parados",
    args: { dias: 7 },
  });
  assert.deepEqual(chamadaDireta("Quais processos de 2026 têm o desembarque real muito diferente da previsão?"), {
    nome: "divergencias_viagem",
    args: { dias: 15 },
  });
  assert.deepEqual(chamadaDireta("Como está a fila dos setores: processos abertos, sem proposta, atrasados e parados?"), {
    nome: "fila_setor",
    args: {},
  });
  assert.deepEqual(chamadaDireta("Qual a comissão neste mês?"), {
    nome: "comissao_periodo",
    args: {},
  });
  assert.deepEqual(chamadaDireta("Monte o painel financeiro deste mês, com valores."), {
    nome: "painel_financeiro",
    args: {},
  });
  assert.deepEqual(chamadaDireta("Quais as taxas deste mês, com nome, pagamento e recebimento?"), {
    nome: "painel_financeiro",
    args: { foco: "taxas" },
  });
  assert.deepEqual(chamadaDireta("Monte o painel do TI das últimas 24 horas."), {
    nome: "painel_ti",
    args: { horas: 24 },
  });
  assert.deepEqual(chamadaDireta("Quais exclusões aconteceram nas últimas 24 horas?"), {
    nome: "log_recente",
    args: { horas: 24, tipo: 2 },
  });
  assert.deepEqual(chamadaDireta("Quais clientes têm mais processos abertos?"), {
    nome: "processos_abertos_cliente",
    args: { foco: "abertos" },
  });
  assert.deepEqual(chamadaDireta("Ficha do cliente ACME Ltda: processos abertos, vendedor, quantos estão sem proposta, o último processo e a comissão deste mês."), {
    nome: "processos_abertos_cliente",
    args: { cliente: "ACME Ltda" },
  });
  assert.deepEqual(chamadaDireta("quais taxas do processo IM1020-26"), {
    nome: "taxas_processo",
    args: { numero: "IM1020-26" },
  });
  assert.deepEqual(chamadaDireta("qual o cliente do processo IM1020-26"), {
    nome: "resumo_processo",
    args: { numero: "IM1020-26" },
  });
  assert.deepEqual(
    chamadaDireta("Ficha do cliente MASTER AGROINDUSTRIAL S/A: processos abertos, vendedor, quantos estão sem proposta, o último processo e a comissão deste mês."),
    {
      nome: "processos_abertos_cliente",
      args: { cliente: "MASTER AGROINDUSTRIAL S/A" },
    },
  );
  assert.equal(
    respostaDeFerramentaPronta([
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id: "ficha_1", function: { name: "processos_abertos_cliente", arguments: "{}" } }],
      },
      { role: "tool", tool_call_id: "ficha_1", content: "Ficha de MASTER AGROINDUSTRIAL S/A\nAbertos: 3" },
    ]),
    "Ficha de MASTER AGROINDUSTRIAL S/A\nAbertos: 3",
  );
});

test("devolve diretamente o texto de ferramenta já formatado", () => {
  const id = "direta_1";
  assert.equal(
    respostaDeFerramentaPronta([
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id, function: { name: "prazos", arguments: "{\"dias\":1}" } }],
      },
      { role: "tool", tool_call_id: id, content: "{\"texto\":\"Processos de hoje\"}" },
    ]),
    "Processos de hoje",
  );
});

test("filtro aceita só ferramentas conhecidas", () => {
  assert.deepEqual(
    lerFiltro('{"ferramentas":["resumo_processo","apagar"],"termos":"IM1020-26"}', ["resumo_processo"]),
    { ferramentas: ["resumo_processo"], termos: "IM1020-26" },
  );
});

test("catálogo relevante fica muito menor que o catálogo completo", () => {
  const recorte = textoConsultasRelevantes("taxas do processo");
  assert.match(recorte, /taxa/i);
  assert.ok(recorte.length < 8000);
});
