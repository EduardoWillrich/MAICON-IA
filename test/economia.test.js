import test from "node:test";
import assert from "node:assert/strict";
import {
  conversaSimples,
  chamadaDireta,
  ferramentasProvaveis,
  lerFiltro,
  pedidoDaRodada,
  pedidoInformativo,
  pedidoSimples,
  respostaDeFerramentaPronta,
  respostaImediata,
  textoCalendario,
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

test("pedido de log do processo abre o histórico, não o resumo", () => {
  assert.deepEqual(ferramentasProvaveis("preciso do log desse processo IM5856-26"), [
    "localizar_processo",
    "consultar_log",
    "o_que_mudou",
  ]);
  assert.equal(chamadaDireta("preciso do log desse processo IM5856-26"), null);
  assert.equal(chamadaDireta("qual o cliente do IM5856-26"), null);
  assert.deepEqual(chamadaDireta("faça o resumo do processo IM5856-26"), {
    nome: "resumo_processo",
    args: { numero: "IM5856-26" },
  });
  assert.deepEqual(chamadaDireta("quais as atividades pendentes desse processo aqui IM5856-26 ?"), {
    nome: "andamento_atividade",
    args: { numero: "IM5856-26", pendentes: true },
  });
  assert.deepEqual(chamadaDireta("quanto vamos receber de frete marítimo no IM5856-26?"), {
    nome: "taxas_processo",
    args: { numero: "IM5856-26" },
  });
  assert.deepEqual(chamadaDireta("o CE do IM5856-26 já foi liberado?"), {
    nome: "documental_ce",
    args: { numero: "IM5856-26", foco: "processo", caso: "ambos" },
  });
  assert.deepEqual(chamadaDireta("quanto de comissão a gente tem no IM5856-26?"), {
    nome: "comissao_periodo",
    args: { numero: "IM5856-26" },
  });
  assert.deepEqual(chamadaDireta("quais as atividades pendentes do IA1612-26"), {
    nome: "andamento_atividade",
    args: { numero: "IA1612-26", pendentes: true },
  });
  assert.deepEqual(chamadaDireta("quando embarca o EA0441-26"), {
    nome: "rota_processo",
    args: { numero: "EA0441-26" },
  });
  assert.deepEqual(ferramentasProvaveis("me lista as mudanças do DEMU0368-26"), [
    "localizar_processo",
    "consultar_log",
    "o_que_mudou",
  ]);
  assert.deepEqual(chamadaDireta("quais as atividades desse processo aqui IM5856-26 ?"), {
    nome: "andamento_atividade",
    args: { numero: "IM5856-26", pendentes: false },
  });
});

test("pergunta seguinte no mesmo chat não reabre a ficha anterior", () => {
  const antes = [
    { role: "user", content: "quais as atividades pendentes do IM5856-26" },
    { role: "assistant", content: "Ficha do processo" },
    { role: "tool", tool_call_id: "antiga", content: JSON.stringify({ texto: "Ficha do IM5856-26" }) },
  ];
  const com = (texto) => [...antes, { role: "user", content: texto }];
  assert.equal(pedidoDaRodada(com("quais processos estão parados há 7 dias?")), "quais processos estão parados há 7 dias?");
  assert.equal(pedidoDaRodada(com("quando embarca o EA0441-26?")), "quando embarca o EA0441-26?");
  assert.match(pedidoDaRodada(com("qual o cliente desse processo?")), /IM5856-26$/);
  assert.match(pedidoDaRodada(com("me lista as mudanças")), /IM5856-26$/);
  assert.match(pedidoDaRodada(com("quanto vamos receber de frete?")), /IM5856-26$/);
  assert.deepEqual(chamadaDireta(pedidoDaRodada(com("quais processos estão parados há 7 dias?"))), {
    nome: "processos_parados",
    args: { dias: 7 },
  });
  assert.deepEqual(chamadaDireta(pedidoDaRodada(com("quando embarca o EA0441-26?"))), {
    nome: "rota_processo",
    args: { numero: "EA0441-26" },
  });
  assert.deepEqual(chamadaDireta(pedidoDaRodada(com("quanto vamos receber de frete?"))), {
    nome: "taxas_processo",
    args: { numero: "IM5856-26" },
  });
  assert.equal(chamadaDireta(pedidoDaRodada(com("qual o cliente desse processo?"))), null);
  assert.deepEqual(ferramentasProvaveis(pedidoDaRodada(com("qual o cliente desse processo?"))), [
    "localizar_processo",
    "consultar_dados",
  ]);
  assert.deepEqual(ferramentasProvaveis(pedidoDaRodada(com("me lista as mudanças"))), [
    "localizar_processo",
    "consultar_log",
    "o_que_mudou",
  ]);
  assert.equal(respostaDeFerramentaPronta(com("quais processos estão parados há 7 dias?")), "");
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
  assert.deepEqual(chamadaDireta("quais atividade tenho pendente ?"), {
    nome: "pendencias",
    args: { escopo: "abertas" },
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
  assert.deepEqual(chamadaDireta("traga os processos abertos hoje"), {
    nome: "processos_abertos",
    args: { quando: "hoje" },
  });
  assert.equal(chamadaDireta("qual o cliente do processo IM1020-26"), null);
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
      { role: "user", content: "quais processos embarcaram hoje?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id, function: { name: "prazos", arguments: "{\"dias\":1}" } }],
      },
      { role: "tool", tool_call_id: id, content: "{\"texto\":\"Processos com embarque realizado hoje\"}" },
      { role: "assistant", content: "Processos com embarque realizado hoje" },
      { role: "user", content: "quais clientes tiveram mais processos abertos hoje?" },
    ]),
    "",
  );
  assert.equal(
    respostaDeFerramentaPronta([
      { role: "user", content: "quais processos embarcaram hoje?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id, function: { name: "prazos", arguments: "{\"dias\":1}" } }],
      },
      { role: "tool", tool_call_id: id, content: "{\"texto\":\"Processos com embarque realizado hoje\"}" },
    ]),
    "Processos com embarque realizado hoje",
  );
  assert.deepEqual(chamadaDireta("quais clientes tiveram mais processos abertos hoje?"), {
    nome: "processos_abertos_cliente",
    args: { foco: "abertos", quando: "hoje" },
  });
});

test("lista de propostas usa a data e não o processo anterior", () => {
  const antes = [
    { role: "user", content: "preciso saber desse aqui IM5944-26" },
    { role: "assistant", content: "Referência: 136.763" },
  ];
  const com = (texto) => [...antes, { role: "user", content: texto }];
  assert.equal(pedidoDaRodada(com("liste as propostas abertas ontem")), "liste as propostas abertas ontem");
  assert.equal(pedidoDaRodada(com("todas as propostas com data de 29/10/2026")), "todas as propostas com data de 29/10/2026");
  assert.equal(pedidoDaRodada(com("Liste as propostas abertas esse mês")), "Liste as propostas abertas esse mês");
  assert.match(pedidoDaRodada(com("qual a proposta desse processo?")), /IM5944-26$/);
  assert.match(pedidoDaRodada(com("me lista as mudanças")), /IM5944-26$/);
  assert.deepEqual(chamadaDireta("liste as propostas abertas ontem"), {
    nome: "propostas_periodo",
    args: { quando: "ontem", situacao: "abertas" },
  });
  assert.deepEqual(chamadaDireta("todas as propostas com data de 29/10/2026"), {
    nome: "propostas_periodo",
    args: { inicio: "29/10/2026", fim: "29/10/2026", situacao: "todas" },
  });
  assert.deepEqual(chamadaDireta("Liste as propostas abertas esse mês"), {
    nome: "propostas_periodo",
    args: { quando: "mes", situacao: "abertas" },
  });
  assert.deepEqual(chamadaDireta("qual a proposta do IM5944-26"), {
    nome: "proposta_processo",
    args: { numero: "IM5944-26" },
  });
  const calendario = textoCalendario(new Date("2026-10-30T15:00:00Z"));
  assert.equal(calendario.hoje, "30/10/2026");
  assert.equal(calendario.ontem, "29/10/2026");
  assert.equal(calendario.inicioMes, "01/10/2026");
  assert.equal(calendario.inicioSemana, "26/10/2026");
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
