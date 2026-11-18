import test from 'node:test';
import assert from 'node:assert/strict';
import { apresentarResposta } from '../src/apresentacaoResposta.ts';

test('comissões do print separam assunto, período e resultado vazio',()=>{
 assert.deepEqual(apresentarResposta('Comissões de processos abertos entre 01/11/2026 e 17/11/2026\nNenhuma comissão nesse recorte.'),{
  titulo:'Comissões de processos abertos',contexto:'01/11/2026 a 17/11/2026',conteudo:'Nenhuma comissão nesse recorte.',vazio:true
 });
});
test('o mesmo padrão atende consultas com e sem registros em outros assuntos',()=>{
 for(const assunto of ['Taxas do processo IM2099-25','Atividades pendentes','Clientes sem proposta','Monitoramentos alterados']){
  assert.equal(apresentarResposta(assunto+'\nNenhum registro encontrado.').titulo,assunto);
 }
 const lista='Taxas do processo IM2099-25\n- FRETE: 0,00\n- ENTREGA: 100,00';
 const r=apresentarResposta(lista);
 assert.equal(r.vazio,false);assert.equal(r.conteudo,'- FRETE: 0,00\n- ENTREGA: 100,00');
});
test('prosa mantém fatos em parágrafos e não ganha título inventado',()=>{
 const r=apresentarResposta('O cliente está em análise.\nO responsável é João.');
 assert.equal(r.titulo,'');assert.equal(r.conteudo,'O cliente está em análise.\n\nO responsável é João.');
 assert.equal(apresentarResposta('Qual cliente você quer na ficha?').vazio,false);
 assert.equal(apresentarResposta('Cliente: AMBEV\nVendedor: João').titulo,'');
 assert.equal(apresentarResposta('Nenhuma permissão foi concedida.').vazio,false);
});
test('Markdown estruturado, tabelas e blocos de código não são reescritos',()=>{
 for(const texto of ['## Comissões\n\nSem registros.','| Taxa | Valor |\n| --- | --- |\n| FRETE | 10 |','```tarefas\n{"projetos":[]}\n```']){
  assert.equal(apresentarResposta(texto).conteudo,texto);
 }
});
