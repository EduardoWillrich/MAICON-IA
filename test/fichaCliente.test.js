import test from "node:test";
import assert from "node:assert/strict";
import { nomeCitadoNaFicha, pedidoFichaCliente, pedidoRelacionamento } from "../server/regras.js";
import { consultouNoTurno } from "../server/turnoConversa.js";
import { executarFuncao } from "../server/funcoes.js";

const PERGUNTA =
  "Monte a ficha do cliente com os processos abertos. Se eu não disse o nome, pergunte qual cliente. Inclua vendedor, quantos estão sem proposta, o último processo, a comissão deste mês, se ele é ouro, prata ou bronze e se paga em dia.";

test("a ficha sem nome pergunta qual cliente", () => {
  assert.deepEqual(pedidoFichaCliente([{ role: "user", content: PERGUNTA }]), { perguntar: true });
  assert.equal(nomeCitadoNaFicha(PERGUNTA), "");
  assert.equal(nomeCitadoNaFicha("Monte a ficha do cliente. Se eu não disse o nome, pergunte qual."), "");
  assert.deepEqual(pedidoFichaCliente([{ role: "user", content: "Monte a ficha do cliente. Se eu não disse o nome, pergunte qual. Diga se ele é ouro, prata ou bronze e se paga em dia." }]), { perguntar: true });
});

test("consultas antigas não impedem a pergunta sobre o cliente atual",()=>{
  const mensagens=[{role:"user",content:"Mostre os monitoramentos"},{role:"tool",content:"histórico"},{role:"assistant",content:"Resultado"},{role:"user",content:PERGUNTA}];
  assert.equal(consultouNoTurno(mensagens),false);
  assert.deepEqual(pedidoFichaCliente(mensagens),{perguntar:true});
  assert.equal(consultouNoTurno([...mensagens,{role:"assistant",content:"",tool_calls:[{}]},{role:"tool",content:"dados"}]),true);
  assert.equal(consultouNoTurno([]),false);
});

test("buscas longas reservam espaço para os dois curingas do SQL",async()=>{
  const parametros=[];
  const pool={request(){return{input(nome,tipo,valor){parametros.push({nome,tipo,valor});return this;},async query(){return{recordset:[]};}};}};
  for(const nome of ["buscar_processos","processos_abertos_cliente"]){
    await executarFuncao(pool,nome,{termo:"A".repeat(80),cliente:"A".repeat(80)},{acesso:{papel:"admin"},recorte:{}});
  }
  const buscas=parametros.filter(p=>p.nome==="t");
  assert.ok(buscas.length>=2);
  for(const p of buscas){assert.equal(p.valor.length,82);assert.ok(p.tipo.length>=p.valor.length);}
});

test("receita antiga não consulta cliente inventado quando o pedido veio sem nome",async()=>{
  const pool={request(){throw new Error("Não deveria consultar antes de pedir o nome");}};
  const r=await executarFuncao(pool,"processos_abertos_cliente",{cliente:PERGUNTA},{pergunta:PERGUNTA,acesso:{papel:"admin"},recorte:{}});
  assert.equal(r.texto,"Qual cliente você quer na ficha?");
});

test("o nome dito na frase segue para a ficha", () => {
  assert.equal(nomeCitadoNaFicha("Monte a ficha da ATL CARGO, se ele é ouro."), "ATL CARGO");
  assert.deepEqual(
    pedidoFichaCliente([{ role: "user", content: "Ficha do cliente Ambev S/A: processos abertos e se paga em dia." }]),
    { cliente: "Ambev S/A" },
  );
});

test("a resposta seguinte com o nome do cliente monta a ficha", () => {
  const pedido = pedidoFichaCliente([
    { role: "user", content: PERGUNTA },
    { role: "assistant", content: "Qual cliente você quer na ficha?" },
    { role: "user", content: "ATL CARGO FREIGHT SOLUTIONS" },
  ]);
  assert.deepEqual(pedido, { cliente: "ATL CARGO FREIGHT SOLUTIONS" });
});

test("relacionamento de ouro, prata e bronze pede os cartões", () => {
  assert.deepEqual(pedidoRelacionamento("Qual o relacionamento dos clientes ouro, prata e bronze?"), {
    niveis: ["ouro", "prata", "bronze"],
  });
  assert.deepEqual(pedidoRelacionamento("Qual o relacionamento dos clientes ouro?"), { niveis: ["ouro"] });
  assert.equal(pedidoRelacionamento("Monte a ficha do cliente com os processos abertos. Se ele é ouro, prata ou bronze e se paga em dia."), null);
  assert.equal(pedidoRelacionamento("Relacionamento do cliente ouro, quantos estão sem proposta."), null);
});

test("ficha de processo e pergunta solta não viram ficha de cliente", () => {
  assert.equal(pedidoFichaCliente([{ role: "user", content: "Monte a ficha do processo IM1000-26." }]), null);
  assert.equal(pedidoFichaCliente([{ role: "user", content: "ATL CARGO FREIGHT SOLUTIONS" }]), null);
  assert.equal(
    pedidoFichaCliente([
      { role: "user", content: PERGUNTA },
      { role: "user", content: "IM6179-26" },
    ]),
    null,
  );
});
