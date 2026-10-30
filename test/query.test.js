import test from "node:test";
import assert from "node:assert/strict";
import { montarSelect, montarXpaths, tabelasDaLinha } from "../server/query.js";

test("select do log lê pelo índice de data e devolve os campos do ERP", () => {
  const xpath = montarXpaths({
    tabela: "mov_Logistica_Taxa",
    tipo: 0,
    chaves: [{ nome: "IdTaxa_Logistica_Exibicao", valor: "90" }],
  })[0];
  assert.equal(
    xpath,
    '/Log/Tabela[@Nome="mov_Logistica_Taxa"][Campo[@Nome="IdTaxa_Logistica_Exibicao" and (@Value="90")]]',
  );
  const sql = montarSelect([xpath]);
  assert.match(sql, /Idx_sys_Log_Tabela_Data_Inicio/);
  assert.match(sql, /Dados_Log\.exist\('/);
  assert.match(sql, /Cross Apply/);
  assert.match(sql, /Dados_Log\.nodes\('/);
  assert.match(sql, /Dlg\.value\('\.\.\/@WindowsUser', 'VarChar\(Max\)'\)/);
  assert.match(sql, /Dlg\.query\('<Campos>\{Campo\}<\/Campos>'\)/);
  assert.match(sql, /Usr\.Nome as Usuario/);
  assert.doesNotMatch(sql, /cad_Funcionario/);
});

test("linha do log lê a tabela e os campos do select", () => {
  const tabelas = tabelasDaLinha({
    Tabela: "mov_Logistica_House",
    Tipo: 3,
    Data: "10/15/2026 17:38:00",
    Indice: 2,
    Campos: '<Campos><Campo Nome="Situacao" Value="1" OldValue="2"/></Campos>',
  });
  assert.equal(tabelas.length, 1);
  assert.equal(tabelas[0].nome, "mov_Logistica_House");
  assert.equal(tabelas[0].tipo, 3);
  assert.equal(tabelas[0].indice, 2);
  assert.equal(tabelas[0].campos[0].nome, "Situacao");
  assert.equal(tabelas[0].campos[0].valor, "1");
  assert.equal(tabelas[0].campos[0].valorAnterior, "2");
});
