import test from 'node:test';
import assert from 'node:assert/strict';
import { executarComConfirmacao } from '../server/confirmacaoDesktop.js';

test('confirmação persistida encerra o helper e espera sua saída antes de liberar o desktop',async()=>{
 let saiu=false,consultas=0,paradas=0;
 let rejeitar;
 const processo=new Promise((_,r)=>rejeitar=r);
 processo.child={kill(){paradas++;setTimeout(()=>{saiu=true;rejeitar(new Error('terminado'));},5);}};
 const r=await executarComConfirmacao(()=>processo,async()=>++consultas>=2,2);
 assert.equal(r.confirmado,true);assert.equal(saiu,true);assert.equal(paradas,1);
});
test('sem confirmação não encerra a operação nem transforma erro em sucesso',async()=>{
 let paradas=0;
 const processo=new Promise((_,r)=>setTimeout(()=>r(new Error('falhou')),15));processo.child={kill(){paradas++;}};
 await assert.rejects(executarComConfirmacao(()=>processo,async()=>false,2),/falhou/);
 assert.equal(paradas,0);
});
test('falha do monitor SQL mantém a verificação visual e para de consultar ao terminar',async()=>{
 let consultas=0;
 const r=await executarComConfirmacao(()=>new Promise(r=>setTimeout(()=>r({stdout:'OK confirmação visual'}),15)),async()=>{consultas++;throw new Error('SQL indisponível');},2);
 assert.equal(r.stdout,'OK confirmação visual');const antes=consultas;
 await new Promise(r=>setTimeout(r,10));assert.equal(consultas,antes);
});
