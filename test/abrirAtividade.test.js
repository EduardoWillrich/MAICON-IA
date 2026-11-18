import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {abrirAtividade} from '../server/abrirAtividade.js';
import {montarPainelDia} from '../server/funcoes.js';

test('navegação resolve o registro pelo ID e usa apenas os dados reais do servidor',async()=>{
 const consultas=[],navegacoes=[];
 const pool={request(){const params={};return{input(n,t,v){params[n]=v;return this;},async query(sql){consultas.push({sql,params});return{recordset:[{IdAtividade:22,Numero_Processo:'IM2099-25 teste',Codigo:'0024',Atividade:'ENVIAR OHBL AO CLIENTE',Ocorrencias:1}]};}};}};
 const r=await abrirAtividade(pool,22,{papel:'admin'},async p=>{navegacoes.push(p);return{ok:true,texto:'Aberta'};});
 assert.equal(r.ok,true);assert.equal(consultas[0].params.id,22);
 assert.deepEqual(navegacoes,[{numero:'IM2099-25 teste',codigo:'0024',nome:'ENVIAR OHBL AO CLIENTE'}]);
 assert.doesNotMatch(consultas[0].sql,/\b(?:UPDATE|DELETE|INSERT|EXEC)\b/i);
});
test('acesso comum e IDs inválidos não consultam nem controlam o desktop',async()=>{
 const pool={request(){throw new Error('consulta indevida');}};
 for(const acesso of [{papel:'usuario'},{papel:'admin',removida:true}])await assert.rejects(abrirAtividade(pool,22,acesso),/administrador/);
 for(const id of [undefined,null,'22',0,-1,1.5,2147483648])await assert.rejects(abrirAtividade(pool,id,{papel:'admin'}),/inválida/);
});
test('resultado ausente ou ambíguo nunca inicia navegação',async()=>{
 for(const linhas of [[],[{},{}],[{Ocorrencias:2,Atividade:'FOLLOW UP'}]]){
  const pool={request(){return{input(){return this;},async query(){return{recordset:linhas};}};}};
  await assert.rejects(abrirAtividade(pool,22,{papel:'admin'},()=>{throw new Error('desktop indevido');}),/única|mais de uma/);
 }
});
test('Meu dia preserva o ID da atividade sem depender de nome ou ordem',()=>{
 const p=montarPainelDia('Ana',[{IdAtividade:22,Codigo:'0024',Atividade:'ENVIAR OHBL',Numero_Processo:'IM2099-25 teste'}]);
 assert.equal(p.grupos[0].itens[0].idAtividade,22);assert.equal(p.grupos[0].itens[0].codigo,'0024');
});
test('entrada de navegação fixa o modo de visualização antes do script compartilhado',async()=>{
 const wrapper=await readFile(new URL('../server/abrirAtividade.ps1',import.meta.url),'utf8');
 assert.match(wrapper,/HC_ACAO = "visualizar"/);assert.match(wrapper,/HC_CLICAR = "0"/);
 const ps=await readFile(new URL('../server/concluirAtividade.ps1',import.meta.url),'utf8');
 const inicio=ps.indexOf('if ($visualizar) {',ps.indexOf('if ($alvos.Count -gt 1)'));
 const fim=ps.indexOf('$faixa =',inicio);
 const ramo=ps.slice(inicio,fim);
 assert.match(ramo,/Processo-VisivelHc/);assert.match(ramo,/Selecao-AtividadeConfirmada/);assert.match(ramo,/exit 0/);
 assert.doesNotMatch(ramo,/Apertar|pontoBotao|HC_CLICAR/);
});
