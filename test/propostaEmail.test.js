import test from "node:test";
import assert from "node:assert/strict";
import { corpoDaProposta, escolherProposta, taxasComerciais, montarPropostaEmail } from "../server/propostaEmail.js";

test("cliente longo da proposta não ultrapassa o parâmetro SQL",async()=>{
  const parametros=[];
  const pool={request(){return{input(nome,tipo,valor){parametros.push({nome,tipo,valor});return this;},async query(){return{recordset:[]};}};}};
  await montarPropostaEmail(pool,{cliente:"A".repeat(100)});
  const p=parametros.find(p=>p.nome==="t");
  assert.equal(p.valor.length,82);
  assert.ok(p.tipo.length>=p.valor.length);
});

const recente = {
  numero: "4501",
  situacao: 6,
  ofertas: [{ origem: "Shanghai (CNSHA)", destino: "Itapoa (BRIOA)" }],
};
const antiga = {
  numero: "3100",
  situacao: 2,
  ofertas: [{ origem: "Ningbo (CNNGB)", destino: "Santos (BRSSZ)" }],
};

test("sem e-mail do cliente, fica a proposta aberta mais recente", () => {
  const escolha = escolherProposta([recente, antiga], []);
  assert.equal(escolha.proposta.numero, "4501");
  assert.equal(escolha.motivo, "recente");
});

test("o e-mail do cliente escolhe a proposta da rota citada", () => {
  const escolha = escolherProposta([recente, antiga], [
    { assunto: "Cotação Ningbo para Santos", trecho: "preciso do frete Ningbo Santos" },
  ]);
  assert.equal(escolha.proposta.numero, "3100");
  assert.equal(escolha.motivo, "email");
});

test("a proposta comercial repete o PDF no visual novo", () => {
  const taxas = taxasComerciais([
    { nome: "FRETE EXPRESSO", moedaPagamento: "USD", moedaRecebimento: "USD", pagamento: 197.6, recebimento: 255, origem: 1 },
    { nome: "DESCONSOLIDAÇÃO", moedaPagamento: "BRL", moedaRecebimento: "BRL", pagamento: 250, recebimento: 350, origem: 3 },
    { nome: "DELIVERY FEE", moedaPagamento: "USD", moedaRecebimento: "USD", pagamento: 20.23, recebimento: 20.23, origem: 3 },
    { nome: "DTA - TRANSITO ADUANEIRO", moedaPagamento: "BRL", moedaRecebimento: "BRL", pagamento: 110.5, recebimento: 110.5, origem: 3 },
  ]);
  assert.deepEqual(taxas.resumo.map((item) => `${item.nome} ${item.valor}`), [
    "Taxa de frete USD 57,40",
    "Taxa de origem BRL 100,00",
    "Taxa de origem USD 0,00",
  ]);
  const html = corpoDaProposta({
    cliente: "SAFELOG TRANSPORTES E LOGISTICA LTDA",
    cnpj: "13.635.987/0001-62",
    pais: "BRASIL",
    numero: "PF019938/26-01",
    modais: [{ nome: "Aéreo", aprovadas: 17, reprovadas: 141, processo: "IA1710-26" }],
    taxas: [
      { nome: "FRETE EXPRESSO", moedaPagamento: "USD", moedaRecebimento: "USD", pagamento: 197.6, recebimento: 255, origem: 1 },
    ],
  });
  assert.match(html, /PF019938\/26-01/);
  assert.match(html, /Estatística do cliente/);
  assert.match(html, /Aéreo/);
  assert.match(html, /FCL/);
  assert.match(html, /LCL/);
  assert.match(html, /#e8312f/);
  assert.match(html, /\+ USD 57,40/);
  assert.match(html, /10,76%/);
  assert.match(html, /Taxa de frete/);
  assert.match(html, /cid:logo-conline/);
});

test("o resumo separa frete e origem, com pagamento zerado e resultado negativo", () => {
  const taxas = taxasComerciais([
    { nome: "FRETE", moedaPagamento: "BRL", moedaRecebimento: "BRL", pagamento: 0, recebimento: 45, categoria: 1 },
    { nome: "FRETE USD", moedaPagamento: "USD", moedaRecebimento: "USD", pagamento: 100, recebimento: 905, categoria: 1 },
    { nome: "THC", moedaPagamento: "BRL", moedaRecebimento: "BRL", pagamento: 0, recebimento: 1024, trecho: 1 },
    { nome: "BL", moedaPagamento: "USD", moedaRecebimento: "USD", pagamento: 100, recebimento: 30, trecho: 1 },
  ]);
  assert.deepEqual(taxas.resumo, [
    { nome: "Taxa de frete", valor: "BRL 45,00" },
    { nome: "Taxa de frete", valor: "USD 805,00" },
    { nome: "Taxa de origem", valor: "BRL 1.024,00" },
    { nome: "Taxa de origem", valor: "USD -70,00" },
  ]);
});
