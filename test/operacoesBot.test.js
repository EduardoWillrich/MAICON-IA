import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { MotorOperacoes, classificarResultado, validarEtapas, textoTarefa } from "../server/operacoesBot.js";
import { executarNoDesktop } from "../server/filaDesktop.js";

const conta = "admin@example.com";
const preencher = { acao: "preencher", numero: "IM2099-25 teste", campo: "Marca", valor: "ACME" };
const concluir = { acao: "concluir", numero: "IM2099-25 teste", codigo: "0023.1" };
const confirmado = { estado: "confirmado", evidencia: "banco", texto: "Confirmado pela consulta." };
const criarMotor = (executar = async () => confirmado) => new MotorOperacoes(new DatabaseSync(":memory:"), executar);
async function esperar(checar) {
  for (let i = 0; i < 100; i++) {
    if (checar()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail("A operação não chegou ao estado esperado.");
}

test("uma prévia nunca executa, nem autoriza alterar processo real", async () => {
  let chamadas = 0;
  const m = criarMotor(async () => { chamadas++; return confirmado; });
  const t = m.criar(conta, { etapas: [preencher] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(chamadas, 0);
  assert.equal(t.estado, "previa");
  assert.throws(() => m.criar(conta, { etapas: [{ ...preencher, numero: "IM2099-25" }] }), /teste/);
  assert.throws(() => validarEtapas([{ ...concluir, numero: "texto teste" }]), /teste/);
  assert.throws(() => validarEtapas([{ ...concluir, acao: "executar_sql" }]), /inválida/);
  assert.throws(() => validarEtapas(Array(101).fill(preencher)), /100/);
});

test("tarefas e rotinas pertencem à conta autenticada", () => {
  const m = criarMotor();
  const t = m.criar(conta, { etapas: [preencher] });
  assert.equal(m.listar("outro@example.com").length, 0);
  assert.throws(() => m.obter(t.id, "outro@example.com"), /não encontrada/);
  assert.throws(() => m.controlar(t.id, "outro@example.com", "executar"), /não encontrada/);
  const r = m.salvarRotina(conta, { etapas: [preencher] });
  assert.throws(() => m.daRotina("outro@example.com", { id: r.id, versao: 1, processos: [preencher.numero] }), /não encontrada/);
});

test("execução repetida do mesmo controle não duplica ações", async () => {
  let chamadas = 0;
  const m = criarMotor(async () => { chamadas++; return confirmado; });
  const t = m.criar(conta, { etapas: [preencher, concluir] });
  m.controlar(t.id, conta, "executar");
  m.controlar(t.id, conta, "executar");
  await m.fila;
  assert.equal(chamadas, 2);
  assert.equal(m.obter(t.id, conta).estado, "concluida");
  assert.throws(() => m.controlar(t.id, conta, "executar"), /encerrada/);
});

test("uma tarefa aguarda sua vez sem intercalar etapas de outra", async () => {
  let liberar;
  const ordem = [];
  const m = criarMotor(async (e) => {
    ordem.push(e.campo);
    if (e.campo === "A") await new Promise((resolve) => { liberar = resolve; });
    return confirmado;
  });
  const a = m.criar(conta, { etapas: [{ ...preencher, campo: "A" }, { ...preencher, campo: "B" }] });
  const b = m.criar(conta, { etapas: [{ ...preencher, campo: "C" }] });
  m.controlar(a.id, conta, "executar");
  m.controlar(b.id, conta, "executar");
  await esperar(() => liberar);
  assert.equal(m.obter(b.id, conta).estado, "fila");
  liberar();
  await m.fila;
  assert.deepEqual(ordem, ["A", "B", "C"]);
});

test("pausar durante uma ação preserva o resultado e retoma somente a próxima", async () => {
  let liberar;
  const chamadas = [];
  const m = criarMotor(async (e) => { chamadas.push(e.acao); if (chamadas.length === 1) await new Promise((resolve) => { liberar = resolve; }); return confirmado; });
  const t = m.criar(conta, { etapas: [preencher, concluir] });
  m.controlar(t.id, conta, "executar");
  await esperar(() => liberar);
  m.controlar(t.id, conta, "pausar");
  liberar(); await m.fila;
  assert.equal(m.obter(t.id, conta).estado, "pausada");
  assert.deepEqual(chamadas, ["preencher"]);
  m.controlar(t.id, conta, "retomar"); await m.fila;
  assert.deepEqual(chamadas, ["preencher", "concluir"]);
});

test("cancelar tarefa na fila não chega ao desktop", async () => {
  let liberar;
  let chamadas = 0;
  const m = criarMotor(async () => { chamadas++; await new Promise((resolve) => { liberar = resolve; }); return confirmado; });
  const a = m.criar(conta, { etapas: [preencher] });
  const b = m.criar(conta, { etapas: [concluir] });
  m.controlar(a.id, conta, "executar");
  m.controlar(b.id, conta, "executar");
  m.controlar(b.id, conta, "cancelar");
  await esperar(() => liberar); liberar(); await m.fila;
  assert.equal(chamadas, 1);
  assert.equal(m.obter(b.id, conta).estado, "cancelada");
});

test("campos exigidos entram antes da conclusão e a primeira etapa não se repete", async () => {
  const chamadas = [];
  let pediu = false;
  const m = criarMotor(async (e) => {
    chamadas.push(`${e.acao}:${e.campo || e.codigo}`);
    if (e.acao === "concluir" && !pediu) { pediu = true; return { estado: "aguardando", texto: "Falta Marca", campos: ["Marca", "Contramarca"] }; }
    return confirmado;
  });
  const t = m.criar(conta, { etapas: [{ ...preencher, campo: "Referência" }, concluir] });
  m.controlar(t.id, conta, "executar"); await m.fila;
  assert.equal(m.obter(t.id, conta).estado, "aguardando");
  assert.equal(m.controlar(t.id, conta, "retomar", { valores: { Marca: "M" } }).estado, "aguardando");
  m.controlar(t.id, conta, "retomar", { valores: { Contramarca: "C" } }); await m.fila;
  assert.deepEqual(chamadas, ["preencher:Referência", "concluir:0023.1", "preencher:Marca", "preencher:Contramarca", "concluir:0023.1"]);
  assert.equal(m.obter(t.id, conta).estado, "concluida");
});

test("valor pendente e escolha de caminho são preservados na retomada", async () => {
  const recebidas = [];
  const m = criarMotor(async (e) => { recebidas.push(e); return e.acao === "concluir" && !e.caminho ? { estado: "aguardando", texto: "Qual seguir? A ou B" } : confirmado; });
  const t = m.criar(conta, { etapas: [{ ...preencher, valor: "" }, concluir] });
  m.controlar(t.id, conta, "executar"); await m.fila;
  assert.equal(recebidas.length, 0);
  m.controlar(t.id, conta, "retomar", { valor: "ACME" }); await m.fila;
  m.controlar(t.id, conta, "retomar", { caminho: "B" }); await m.fila;
  assert.equal(recebidas.at(-1).caminho, "B");
  assert.equal(recebidas.filter((e) => e.acao === "preencher").length, 1);
});

test("efeito incerto nunca é repetido sem decisão explícita", async () => {
  let chamadas = 0;
  const m = criarMotor(async () => { chamadas++; throw new Error("conexão perdida após clicar"); });
  const t = m.criar(conta, { etapas: [concluir] });
  m.controlar(t.id, conta, "executar"); await m.fila;
  assert.equal(m.obter(t.id, conta).estado, "revisao");
  assert.throws(() => m.controlar(t.id, conta, "retomar"), /Confira/);
  assert.equal(chamadas, 1);
  m.controlar(t.id, conta, "retomar", { resolucao: "confirmado" }); await m.fila;
  assert.equal(chamadas, 1);
  assert.equal(m.obter(t.id, conta).etapas[0].evidencia, "conferencia_manual");
});

test("reinício preserva tarefas e interrompe execução desconhecida para revisão", () => {
  const db = new DatabaseSync(":memory:");
  const a = new MotorOperacoes(db, async () => confirmado);
  const t = a.criar(conta, { etapas: [concluir] });
  t.estado = "executando"; t.etapas[0].estado = "executando"; a.salvar(t);
  const b = new MotorOperacoes(db, async () => confirmado);
  assert.equal(b.obter(t.id, conta).estado, "revisao");
  assert.equal(b.obter(t.id, conta).etapas[0].estado, "interrompido");
  assert.throws(() => b.controlar(t.id, conta, "retomar"), /Confira/);
});

test("versões de rotina são imutáveis e lote valida cada processo antes de gravar", () => {
  const m = criarMotor();
  const r = m.salvarRotina(conta, { nome: "Modelo", etapas: [preencher] });
  m.salvarRotina(conta, { id: r.id, nome: "Modelo novo", etapas: [{ ...preencher, valor: "OUTRO" }] });
  const t = m.daRotina(conta, { id: r.id, versao: 1, processos: [preencher.numero, "IM2100-25 teste"] });
  assert.equal(t.etapas.length, 2);
  assert.equal(t.etapas[0].valor, "ACME");
  assert.equal(m.rotinas(conta)[0].versao, 2);
  assert.throws(() => m.daRotina(conta, { id: r.id, versao: 1, processos: [preencher.numero, "IM2100-25"] }), /teste/);
  assert.throws(() => m.daRotina(conta, { id: r.id, versao: 1, processos: Array(21).fill(preencher.numero) }), /20/);
});

test("requisito validado tem escopo e suspende conclusão até receber valor", async () => {
  const m = criarMotor();
  m.salvarRegra(conta, { codigo: concluir.codigo, campo: "Marca", processo: concluir.numero, justificativa: "Exigido pelo fluxo documental revisado" });
  const t = m.criar(conta, { etapas: [concluir] });
  m.controlar(t.id, conta, "executar"); await m.fila;
  assert.equal(m.obter(t.id, conta).estado, "aguardando");
  assert.equal(m.obter(t.id, conta).etapas[0].campo, "Marca");
  const outro = m.criar(conta, { etapas: [{ ...concluir, numero: "IM2100-25 teste" }] });
  m.controlar(outro.id, conta, "executar"); await m.fila;
  assert.equal(m.obter(outro.id, conta).estado, "concluida");
});

test("clique e observação visual não viram confirmação de persistência", () => {
  assert.equal(classificarResultado("OK Clique enviado na atividade.", concluir).estado, "revisao");
  assert.equal(classificarResultado("Persistência não confirmada: aguarde revisão.", concluir).estado, "revisao");
  assert.equal(classificarResultado("O bot digitou ACME e confirmou os dados na tela do HeadCargo.", preencher).estado, "observado");
  assert.equal(classificarResultado("Concluí a atividade X no HeadCargo.", concluir).evidencia, "banco");
  assert.deepEqual(classificarResultado("Não concluí. O HeadCargo pediu para preencher: Marca; Contramarca. Diga os valores.", concluir).campos, ["Marca", "Contramarca"]);
});

test("fila do desktop libera após falha e permite chamadas internas sem deadlock", async () => {
  const ordem = [];
  const a = executarNoDesktop(async () => { ordem.push(1); await executarNoDesktop(async () => { ordem.push(2); }); throw new Error("falhou"); });
  const b = executarNoDesktop(async () => { ordem.push(3); return "ok"; });
  await assert.rejects(a, /falhou/);
  assert.equal(await b, "ok");
  assert.deepEqual(ordem, [1, 2, 3]);
});

test("retorno conversacional pede só os valores que ainda faltam", async () => {
  const m = criarMotor(async () => ({ estado: "aguardando", campos: ["Marca", "Contramarca"], texto: "Campos obrigatórios." }));
  const t = m.criar(conta, { etapas: [concluir] });
  m.controlar(t.id, conta, "executar"); await m.fila;
  const parcial = m.controlar(t.id, conta, "retomar", { valores: { Marca: "ACME" } });
  const resposta = textoTarefa(parcial);
  assert.match(resposta, /Informe os valores de Contramarca/);
  assert.doesNotMatch(resposta, /Informe os valores de Marca|Central|formulário|painel/);
  assert.equal(parcial.etapas[0].valoresPendentes.Marca, "ACME");
});

test("acompanhamento termina quando a tarefa pede resposta e cancelamento é cooperativo", async () => {
  const m = criarMotor();
  const t = m.criar(conta, { etapas: [{ ...preencher, valor: "" }] });
  m.controlar(t.id, conta, "executar"); await m.fila;
  const eventos = [];
  const r = await m.aguardar(t.id, conta, { progresso: (v) => eventos.push(v) });
  assert.equal(r.estado, "aguardando");
  assert.ok(eventos.length);
  const controle = new AbortController(); controle.abort();
  await assert.rejects(m.aguardar(t.id, conta, { sinal: controle.signal }), { name: "AbortError" });
  assert.equal(m.obter(t.id, conta).estado, "cancelada");
});
