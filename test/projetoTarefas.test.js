import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { executarFuncao } from "../server/funcoes.js";
import { pedidoProjetoDaConversa, pedidoProjetoTarefas } from "../server/projetoPedido.js";
import { projetoTarefasDoTexto } from "../src/projetoTarefas.ts";

const tarefas = (n) => Array.from({ length:n },(_,i) => ({ IdTarefa:i+1, Codigo:i < 8 ? "0000" : String(i).padStart(4,"0"), Descricao:`ATIVIDADE ${i+1}`, Precedente:i % 2 ? String(i-1).padStart(4,"0") : null, Precedente_Nome:i % 2 ? `ATIVIDADE ${i}` : null }));
async function buscar(n) {
  const consultas = [];
  const pool = { request() { const parametros={}; return { input(n,_tipo,v){parametros[n]=v;return this;}, async query(sql){consultas.push({sql,parametros});return {recordset:sql.includes("FROM cad_Tarefa Tar") ? tarefas(n) : [{IdProjeto_Tarefa:19,Codigo:"0004",Nome:"IMPORTACAO MARITIMA"}]};} };} };
  const r=await executarFuncao(pool,"projeto_tarefas",{modalidade:"IM"},{acesso:{papel:"admin"},recorte:{}});
  return { lista:projetoTarefasDoTexto(r.texto), consultas };
}
async function componente() {
  const fonte=(await readFile(new URL("../src/ProjetoTarefasCard.tsx",import.meta.url),"utf8")).replace(/^import\s+"\.\/estilos\/projetoTarefas.css";\s*$/m,"");
  const js=ts.transpileModule(fonte,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
    .replace('"react/jsx-runtime"',JSON.stringify(import.meta.resolve("react/jsx-runtime")))
    .replace('"react"',JSON.stringify(import.meta.resolve("react")))
    .replace('"./projetoTarefas"',JSON.stringify(new URL("../src/projetoTarefas.ts",import.meta.url).href));
  return (await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`)).ProjetoTarefasCard;
}

test("consulta preserva os 80 itens e os códigos repetidos",async()=>{
  const {lista}=await buscar(80);
  assert.equal(lista.projetos[0].tarefas.length,80);
  assert.equal(lista.projetos[0].tarefas.filter(t=>t.codigo==="0000").length,8);
  assert.equal(new Set(lista.projetos[0].tarefas.map(t=>t.id)).size,80);
  assert.equal(lista.projetos[0].tarefas[79].nome,"ATIVIDADE 80");
  assert.equal(lista.projetos[0].modalidade,"IM");
});
test("consulta não corta projetos que tenham mais de 80 atividades",async()=>{
  const {lista,consultas}=await buscar(97);
  assert.equal(lista.projetos[0].tarefas.length,97);
  assert.match(consultas[0].sql,/Modalidade_Aereo, 0\) = 0/);
  assert.match(consultas[0].sql,/NOT IN \('INATIVO', 'TESTE', 'SEGURO'\)/);
  assert.doesNotMatch(consultas[1].sql,/\bTOP\b/i);
  assert.match(consultas[1].sql,/Invisivel_Gerencial/);
  assert.match(consultas[1].sql,/INATIV/);
  assert.equal(consultas[1].parametros.id,19);
  assert.equal(lista.projetos[0].tarefas[96].nome,"ATIVIDADE 97");
});
test("primeira visualização mostra 20 de 80 e oferece Ver mais",async()=>{
  const Card=await componente(); const {lista}=await buscar(80);
  const html=renderToStaticMarkup(React.createElement(Card,{lista}));
  assert.equal((html.match(/class="projeto-tarefas-indice"/g)||[]).length,20);
  assert.match(html,/Exibindo 20 de 80 atividades/);
  assert.match(html,/Ver mais/);
  assert.match(html,/ATIVIDADE 20/);
  assert.doesNotMatch(html,/ATIVIDADE 21/);
});
test("projeto vazio ou pequeno não oferece expansão desnecessária",async()=>{
  const Card=await componente();
  for(const n of [0,1,20]){
    const {lista}=await buscar(n); const html=renderToStaticMarkup(React.createElement(Card,{lista}));
    assert.doesNotMatch(html,/Ver mais/);
    if(n) assert.match(html,/Todas as atividades exibidas/); else assert.match(html,/não tem atividades cadastradas/);
  }
});
test("a modalidade da conta escolhe o projeto e bloqueia o das outras",async()=>{
  const consultas=[];
  const pool={request(){const parametros={};return{input(n,_tipo,v){parametros[n]=v;return this;},async query(sql){consultas.push({sql,parametros});return{recordset:sql.includes("FROM cad_Tarefa Tar")?[]:[{IdProjeto_Tarefa:2,Codigo:"0002",Nome:"EXPORTACAO AEREA - NOVO"}]};}};}};
  const trocada=await executarFuncao(pool,"projeto_tarefas",{modalidade:"IM"},{acesso:{papel:"admin"},recorte:{modalidade:"EA"}});
  assert.match(consultas[0].sql,/L\.Modalidade_Aereo = 1/);
  assert.match(consultas[0].sql,/L\.Operacao_Exportacao = 1/);
  assert.equal(consultas[0].parametros.prefixo,"EA");
  assert.match(trocada.texto,/EXPORTACAO AEREA/);
  const bloqueada=await executarFuncao(pool,"projeto_tarefas",{numero:"EA1000-26"},{acesso:{papel:"admin"},recorte:{modalidade:"IM"}});
  assert.match(bloqueada.texto,/Sua modalidade é IM/);
  assert.match(bloqueada.texto,/EA1000-26/);
});
test("pedido de projeto e lista incompleta trazem o modal inteiro",()=>{
  assert.deepEqual(pedidoProjetoTarefas("mostre o projeto de tarefas do IM"),{modalidade:"IM"});
  assert.deepEqual(pedidoProjetoTarefas("não esta exibindo todas as tarefas, temos mais de 80 no IM"),{modalidade:"IM"});
  assert.deepEqual(pedidoProjetoTarefas("atividades do projeto de importação marítima"),{modalidade:"IM"});
  assert.deepEqual(pedidoProjetoTarefas("projeto de tarefas do processo IM2099-25 teste"),{numero:"IM2099-25 teste"});
  assert.equal(pedidoProjetoTarefas("cancele a atividade 0029"),null);
  assert.deepEqual(pedidoProjetoDaConversa([
    {role:"assistant",content:"Projeto 0004 IMPORTACAO MARITIMA do modal IM"},
    {role:"user",content:"não esta exibindo todas"},
  ]),{modalidade:"IM"});
});
test("respostas antigas mantêm todos os itens e as etapas anteriores",()=>{
  const texto="Projeto 0004 IMPORTACAO MARITIMA do modal IM\n\n"+tarefas(80).map(t=>`- ${t.Codigo} ${t.Descricao}${t.Precedente ? `. Depois de ${t.Precedente} ${t.Precedente_Nome}` : ""}`).join("\n");
  const lista=projetoTarefasDoTexto(texto);
  assert.equal(lista.projetos[0].tarefas.length,80);
  assert.equal(lista.projetos[0].nome,"IMPORTACAO MARITIMA");
  assert.equal(lista.projetos[0].modalidade,"IM");
  assert.equal(lista.projetos[0].tarefas[79].precedente.nome,"ATIVIDADE 79");
  assert.equal(projetoTarefasDoTexto("```tarefas\n{}\n```"),null);
});

test("histórico de monitoramentos não vira uma lista vazia de atividades",async()=>{
  const pool={request(){return{input(){return this;},async query(){return{recordset:[]};}};}};
  const resposta=await executarFuncao(pool,"monitoramentos_alterados",{dias:7},{acesso:{papel:"admin"},recorte:{visao:"ti"}});
  assert.match(resposta.texto,/Monitoramentos alterados/);
  assert.equal(projetoTarefasDoTexto(resposta.texto),null);
  const historico="Monitoramentos alterados — últimos 7 dias\n\nProjeto de tarefas\n| Data | Quem | Ação | Projeto | Monitor |\n| --- | --- | --- | --- | --- |\n| 17/11/2026 | ANA | Alteração | 0004 IMPORTACAO MARITIMA | CONCLUSÃO |\n\nAtividade\n| Data | Quem | Atividade |\n| --- | --- | --- |\n| 17/11/2026 | JOÃO | 0024 ENVIAR OHBL AO CLIENTE |";
  assert.equal(projetoTarefasDoTexto(historico),null);
  assert.equal(projetoTarefasDoTexto("Projeto de tarefas"),null);
  assert.equal(projetoTarefasDoTexto("Projeto 0004 IMPORTACAO MARITIMA\n| Data | Quem |\n| --- | --- |"),null);
});

test("resposta antiga só vira cartão quando contém uma lista completa",()=>{
  assert.equal(projetoTarefasDoTexto("Resumo de alterações\nProjeto 0004 IMPORTACAO MARITIMA\n- 0001 CONFERIR VALORES"),null);
  const vazio=projetoTarefasDoTexto("Projeto 0004 IMPORTACAO MARITIMA do modal IM\nEste projeto não tem tarefas.");
  assert.equal(vazio.projetos[0].tarefas.length,0);
});
