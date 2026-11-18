import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import { colunasDaResposta, tituloDaColuna, colunaNumerica, valorDaCelula, semDadosRepetidos, usarTabelaConsulta, linhasDaLista } from '../src/respostaConsulta.ts';
import { executarFuncao } from '../server/funcoes.js';
const linhas=[{Nome_Taxa:'ACERTO',Valor_Pagamento:null,Valor_Recebimento:175},{Nome_Taxa:'AD VALOREM',Valor_Pagamento:147.06,Valor_Recebimento:233.15}];
test('listas antigas com subitens não duplicam cartões acima da tabela',()=>{
 const dados=[{Numero_Processo:'EM1541-26',Cliente:'FRIATO ALIMENTOS',Detalhe:'Desembarque antecipado em 100 dias'}];
 const texto='#### Divergências de desembarque\n\nProcessos de 2026.\n\n- **EM1541-26**\n  - FRIATO ALIMENTOS\n  - Previsto 11/09/2026 · Real 03/06/2026\n  - Desembarque antecipado em 100 dias';
 assert.equal(semDadosRepetidos(texto,dados),'#### Divergências de desembarque\n\nProcessos de 2026.');
 const tabela=linhasDaLista([{hora:'',titulo:'EM1541-26',linhas:['FRIATO ALIMENTOS','Previsto 11/09/2026 · Real 03/06/2026','Desembarque antecipado em 100 dias'],tag:'',tipo:''}]);
 assert.deepEqual(tabela,[{Processo:'EM1541-26',Cliente:'FRIATO ALIMENTOS',Previsto:'11/09/2026',Real:'03/06/2026',Detalhes:'Desembarque antecipado em 100 dias'}]);
});
test('divergências novas já saem do servidor como tabela, sem cartões aninhados',async()=>{
 const pool={request(){return{input(){return this;},async query(){return{recordset:[{Numero_Processo:'EM1541-26',Cliente:'FRIATO ALIMENTOS',Dias:-100,Data_Previsao_Desembarque:'2026-09-11',Data_Desembarque:'2026-06-03'}]};}};}};
 const r=await executarFuncao(pool,'divergencias_viagem',{ano:2026},{acesso:{papel:'admin'},recorte:{}});
 assert.match(r.texto,/\| Numero_Processo \| Cliente \|/);
 assert.match(r.texto,/antecipado em 100 dias/);
 assert.doesNotMatch(r.texto,/- \*\*/);
 assert.equal(r.linhas.length,1);
});
test('listas de processos ficam apenas na tabela, preservando assunto e observações',()=>{
 const dados=Array.from({length:3680},(_,i)=>({Numero_Processo:`IM${2705+i}-26`,Cliente:`CLIENTE ${i}`,Ultimo:'19/05/2026 10:22'}));
 const titulo='Processos abertos nos últimos 6 meses sem acompanhamento há 7 dias ou mais';
 const texto=titulo+'\n'+dados.map(r=>`- ${r.Numero_Processo} · ${r.Cliente} · último acompanhamento ${r.Ultimo}`).join('\n');
 assert.equal(usarTabelaConsulta(dados,texto),true);
 assert.equal(semDadosRepetidos(texto,dados),'## '+titulo);
 const aviso='- IM2705-26 — Atenção: requer revisão.';
 assert.match(semDadosRepetidos(texto+'\n\n'+aviso,dados),/Atenção: requer revisão/);
});
test('tabela é o padrão mesmo para listas pequenas e respeita formatos específicos',()=>{
 assert.equal(usarTabelaConsulta(linhas,'Taxas\n- ACERTO\n- AD VALOREM'),true);
 assert.equal(usarTabelaConsulta([], 'Nenhuma taxa encontrada.'),false);
 assert.equal(usarTabelaConsulta(linhas,'Texto para encaminhar',true),false);
 for(const tipo of ['tarefas','gatilhos','modelo','email','rota','encarte','log']) assert.equal(usarTabelaConsulta(linhas,'```'+tipo+'\n{}\n```'),false);
});
test('resultado separa números de códigos e preserva colunas que aparecem depois',()=>{
 assert.deepEqual(colunasDaResposta([{IdTaxa:1,Nome_Taxa:'A'},{Nome_Taxa:'B',Moeda:'USD'}]),['Nome_Taxa','Moeda']);
 assert.equal(tituloDaColuna('Nome_Taxa'),'Taxa');
 assert.equal(tituloDaColuna('Valor_Recebimento'),'Recebimento');
 assert.equal(colunaNumerica('Valor_Pagamento',linhas),true);
 assert.equal(colunaNumerica('Codigo',[{Codigo:'0001'}]),false);
 assert.equal(valorDaCelula(2674.27,'Valor_Pagamento',true),'2.674,27');
 assert.equal(valorDaCelula(0,'Valor_Pagamento',true),'0,00');
 assert.equal(valorDaCelula(null,'Valor_Pagamento',true),'—');
 assert.equal(valorDaCelula('0004','Codigo',false),'0004');
 assert.equal(valorDaCelula(false,'Ativo',false),'Não');
});
test('remove a repetição do print sem apagar a conclusão e os alertas',()=>{
 const texto='Confira os valores antes de enviar.\n\nNome_Taxa: ACERTO. Valor_Recebimento: R$ 175,00\nNome_Taxa: AD VALOREM. Valor_Pagamento: R$ 147,06. Valor_Recebimento: R$ 233,15\nMais 4980 registros.\n\nAtenção: os valores estão em moedas diferentes.';
 assert.equal(semDadosRepetidos(texto,linhas),'Confira os valores antes de enviar.\n\nAtenção: os valores estão em moedas diferentes.');
 assert.equal(semDadosRepetidos('Valor_Pagamento: divergência pendente de análise.',linhas),'Valor_Pagamento: divergência pendente de análise.');
});
test('não repete a tabela e mantém blocos especiais e tabelas de outra análise',()=>{
 const tabela='| Nome_Taxa | Valor_Pagamento | Valor_Recebimento |\n| --- | --- | --- |\n| ACERTO | | 175 |';
 const analise='| Indicador | Situação |\n| --- | --- |\n| Revisão | Pendente |';
 const especial='```encarte\n{"nome":"CLIENTE"}\n```';
 assert.equal(semDadosRepetidos(tabela+'\n\n'+analise+'\n\n'+especial,linhas),analise+'\n\n'+especial);
 const totais='| Nome_Taxa | Valor_Pagamento | Valor_Recebimento |\n| --- | --- | --- |\n| Total | 147,06 | 408,15 |';
 assert.equal(semDadosRepetidos(totais,linhas),totais);
});

test('5000 resultados começam com 10 linhas sem perder colunas ou confundir zero e vazio',async()=>{
 let fonte=await readFile(new URL('../src/ResultadosConsulta.tsx',import.meta.url),'utf8');
 fonte=fonte.replace('"./datas"',JSON.stringify(new URL('../src/datas.ts',import.meta.url).href)).replace('"./respostaConsulta"',JSON.stringify(new URL('../src/respostaConsulta.ts',import.meta.url).href));
 const js=ts.transpileModule(fonte,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime'))).replace('"react"',JSON.stringify(import.meta.resolve('react')));
 const {ResultadosConsulta}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
 const dados=Array.from({length:5000},(_,i)=>({...linhas[i%2],Valor_Pagamento:i===0?0:linhas[i%2].Valor_Pagamento,Observacao:i===4999?'Última observação':null}));
 const html=renderToStaticMarkup(React.createElement(ResultadosConsulta,{linhas:dados}));
 assert.equal((html.match(/<tr>/g)||[]).length,11);
 assert.match(html,/5\.000 registros/);
 assert.match(html,/Exibindo 10 de 5\.000/);
 assert.match(html,/Ver mais/);
 assert.match(html,/>Pagamento</);
 assert.match(html,/>0,00</);
 assert.match(html,/>—</);
 assert.match(html,/Observação/);
 assert.doesNotMatch(html,/Nome_Taxa|Valor_Pagamento/);
});
