import test from "node:test";
import assert from "node:assert/strict";
import {
  colunasDoSql,
  conferirTabelas,
  lerJulgamento,
  respostaConfereComRetorno,
  rodadasDesdePergunta,
  tabelasDoSql,
} from "../server/avaliacaoConsulta.js";

function volta(nome, args, content, id = nome) {
  return [
    {
      role: "assistant",
      content: "",
      tool_calls: [{ id, type: "function", function: { name: nome, arguments: JSON.stringify(args) } }],
    },
    { role: "tool", tool_call_id: id, content },
  ];
}

test("lê tabelas e colunas do SELECT", () => {
  const sql = "SELECT Lhs.Numero_Processo, Cia.Nome FROM mov_Logistica_House Lhs LEFT OUTER JOIN cad_Pessoa Cia ON Cia.IdPessoa = Lhs.IdCliente";
  assert.deepEqual(tabelasDoSql(sql), ["mov_Logistica_House", "cad_Pessoa"]);
  assert.deepEqual(colunasDoSql(sql), ["Numero_Processo", "Nome", "IdPessoa", "IdCliente"]);
});

test("reprova SQL cuja tabela não passou pelo catálogo", () => {
  const mensagens = [
    { role: "user", content: "quantos processos abriu a casa X" },
    ...volta("executar_sql", { sql: "SELECT COUNT(*) AS Total FROM mov_Atividade_Historico Ati" }, '{"linhas":[{"Total":3}]}'),
  ];
  const conferencia = conferirTabelas(mensagens);
  assert.equal(conferencia.ok, false);
  assert.match(conferencia.motivo, /mov_Atividade_Historico/);
});

test("aprova SQL só com tabela e coluna lidas no catálogo", () => {
  const mensagens = [
    { role: "user", content: "liste os processos" },
    ...volta("buscar_tabelas", { termo: "Processo" }, "mov_Logistica_House\nmov_Logistica_Master", "busca"),
    ...volta(
      "listar_colunas",
      { tabelas: ["mov_Logistica_House"] },
      JSON.stringify([{ Tabela: "mov_Logistica_House", Coluna: "Numero_Processo" }, { Tabela: "mov_Logistica_House", Coluna: "IdCliente" }]),
      "cols",
    ),
    ...volta(
      "executar_sql",
      { sql: "SELECT Lhs.Numero_Processo FROM mov_Logistica_House Lhs" },
      '{"linhas":[{"Numero_Processo":"IM1-26"}]}',
      "sql",
    ),
  ];
  assert.equal(conferirTabelas(mensagens).ok, true);
});

test("reprova coluna que o catálogo não devolveu", () => {
  const mensagens = [
    { role: "user", content: "qual o lucro" },
    ...volta(
      "listar_colunas",
      { tabelas: ["mov_Logistica_House"] },
      JSON.stringify([{ Tabela: "mov_Logistica_House", Coluna: "Numero_Processo" }]),
      "cols",
    ),
    ...volta(
      "executar_sql",
      { sql: "SELECT Lhs.Lucro_Inventado FROM mov_Logistica_House Lhs" },
      '{"linhas":[{"Lucro_Inventado":10}]}',
      "sql",
    ),
  ];
  const conferencia = conferirTabelas(mensagens);
  assert.equal(conferencia.ok, false);
  assert.match(conferencia.motivo, /Lucro_Inventado/);
});

test("consulta vazia não inventa e ferramenta pronta passa direto", () => {
  const vazia = [
    { role: "user", content: "processos da semana" },
    ...volta("listar_colunas", { tabelas: ["mov_Logistica_House"] }, JSON.stringify([{ Tabela: "mov_Logistica_House", Coluna: "Numero_Processo" }]), "cols"),
    ...volta("executar_sql", { sql: "SELECT Lhs.Numero_Processo FROM mov_Logistica_House Lhs" }, '{"sql":"SELECT","linhas":[]}', "sql"),
  ];
  const conferencia = conferirTabelas(vazia);
  assert.equal(conferencia.ok, true);
  assert.match(conferencia.aviso, /não devolveu registros/);
  assert.equal(conferirTabelas([{ role: "user", content: "resumo IM1-26" }, ...volta("resumo_processo", { numero: "IM1-26" }, "Cliente: Casa Azul")]).ok, true);
});

test("conta só as consultas desta pergunta e lê o julgamento", () => {
  const mensagens = [
    ...volta("executar_sql", { sql: "SELECT 1" }, "antes", "antiga"),
    { role: "user", content: "de novo" },
    ...volta("buscar_tabelas", { termo: "Pessoa" }, "cad_Pessoa", "nova"),
  ];
  assert.equal(rodadasDesdePergunta(mensagens), 1);
  assert.deepEqual(lerJulgamento('{"ok":false,"motivo":"tabela errada","deNovo":true}'), {
    ok: false,
    motivo: "tabela errada",
    deNovo: true,
  });
  assert.equal(lerJulgamento("sem json").ok, true);
  assert.equal(respostaConfereComRetorno("segue o bloco\n```rota\nnavio\n```", []), true);
});

test("aceita o formato que o chat envia, com dbo e tabela markdown", () => {
  const mensagens = [
    { role: "user", content: "liste os processos de 2026" },
    ...volta(
      "listar_colunas",
      { tabelas: ["dbo.mov_Logistica_House"] },
      JSON.stringify([{ Tabela: "mov_Logistica_House", Coluna: "Numero_Processo" }]),
      "cols",
    ),
    ...volta(
      "executar_sql",
      { sql: "SELECT Lhs.Numero_Processo FROM dbo.mov_Logistica_House Lhs WHERE Lhs.Numero_Processo LIKE '%-26'" },
      "| Numero_Processo |\n| --- |\n| IM1020-26 |",
      "sql",
    ),
  ];
  const conferencia = conferirTabelas(mensagens);
  assert.equal(conferencia.ok, true);
  assert.equal(conferencia.aviso, "");
});

test("reprova erro de SQL, junção sem catálogo e busca sem colunas", () => {
  const erro = [
    { role: "user", content: "qual o cliente" },
    ...volta("executar_sql", { sql: "SELECT Lhs.Cliente FROM mov_Logistica_House Lhs" }, "Erro: Invalid column name 'Cliente'."),
  ];
  assert.match(conferirTabelas(erro).motivo, /Invalid column name/);

  const join = [
    { role: "user", content: "nome do cliente do processo" },
    ...volta(
      "listar_colunas",
      { tabelas: ["mov_Logistica_House"] },
      JSON.stringify([{ Tabela: "mov_Logistica_House", Coluna: "IdCliente" }, { Tabela: "mov_Logistica_House", Coluna: "Numero_Processo" }]),
      "cols",
    ),
    ...volta(
      "executar_sql",
      { sql: "SELECT Cia.Nome FROM dbo.mov_Logistica_House Lhs LEFT OUTER JOIN dbo.cad_Pessoa Cia ON Cia.IdPessoa = Lhs.IdCliente" },
      "| Nome |\n| --- |\n| Casa Azul |",
      "sql",
    ),
  ];
  assert.match(conferirTabelas(join).motivo, /cad_Pessoa/);

  const soBusca = [
    { role: "user", content: "liste processos" },
    ...volta("buscar_tabelas", { termo: "Processo" }, "mov_Logistica_House"),
    ...volta("executar_sql", { sql: "SELECT Lhs.Numero_Processo FROM mov_Logistica_House Lhs" }, "| Numero_Processo |\n| --- |\n| IM1-26 |", "sql"),
  ];
  assert.match(conferirTabelas(soBusca).motivo, /sem leitura de colunas/);
});

test("aceita colchetes, maiúsculas, catálogo em texto e a leitura da pergunta anterior", () => {
  assert.deepEqual(tabelasDoSql("SELECT 1 FROM [dbo].[mov_Logistica_House] Lhs INNER JOIN [dbo].[cad_Pessoa] Cia ON 1=1"), [
    "mov_Logistica_House",
    "cad_Pessoa",
  ]);
  const texto = [
    { role: "user", content: "processos" },
    ...volta("listar_colunas", { tabelas: ["MOV_LOGISTICA_HOUSE"] }, "mov_Logistica_House:\nNumero_Processo\nIdCliente", "cols"),
    ...volta(
      "executar_sql",
      { sql: "SELECT Lhs.Numero_Processo FROM [dbo].[MOV_LOGISTICA_HOUSE] Lhs" },
      "| Numero_Processo |\n| --- |\n| IM9-26 |",
      "sql",
    ),
  ];
  assert.equal(conferirTabelas(texto).ok, true);

  const segue = [
    ...volta(
      "listar_colunas",
      { tabelas: ["cad_Pessoa"] },
      JSON.stringify([{ Tabela: "cad_Pessoa", Coluna: "Nome" }, { Tabela: "cad_Pessoa", Coluna: "IdPessoa" }]),
      "antes",
    ),
    { role: "user", content: "agora o nome" },
    ...volta("executar_sql", { sql: "SELECT Pes.Nome FROM dbo.cad_Pessoa Pes" }, "| Nome |\n| --- |\n| Ana |", "sql"),
  ];
  assert.equal(conferirTabelas(segue).ok, true);
});

test("ignora SQL antigo, lê argumentos em objeto e julga o texto copiado", () => {
  const mensagens = [
    ...volta("executar_sql", { sql: "SELECT X FROM mov_Atividade_Historico" }, "Erro: falhou", "antiga"),
    { role: "user", content: "resumo IM1-26" },
    ...volta("resumo_processo", { numero: "IM1-26" }, "Cliente: Casa Azul. Processo IM1-26."),
  ];
  assert.equal(conferirTabelas(mensagens).ok, true);

  const objeto = [
    { role: "user", content: "processos" },
    {
      role: "assistant",
      content: "",
      tool_calls: [{ id: "cols", type: "function", function: { name: "listar_colunas", arguments: { tabelas: ["mov_Logistica_House"] } } }],
    },
    { role: "tool", tool_call_id: "cols", content: JSON.stringify({ colunas: [{ TABLE_NAME: "mov_Logistica_House", COLUMN_NAME: "Numero_Processo" }] }) },
    {
      role: "assistant",
      content: "",
      tool_calls: [{ id: "sql", type: "function", function: { name: "executar_sql", arguments: { sql: "SELECT Lhs.Numero_Processo FROM mov_Logistica_House Lhs" } } }],
    },
    { role: "tool", tool_call_id: "sql", content: "| Numero_Processo |\n| --- |\n| IM1-26 |" },
  ];
  assert.equal(conferirTabelas(objeto).ok, true);

  const amostra = "Cliente Casa Azul, processo IM1020-26, abertura 02/03/2026, vendedor Marina Costa, referência REF-9.";
  const comDados = [
    { role: "user", content: "quem é o cliente" },
    { role: "tool", tool_call_id: "sql", content: amostra },
  ];
  assert.equal(respostaConfereComRetorno(`O cliente é a Casa Azul.\n${amostra}`, comDados), true);
  assert.equal(respostaConfereComRetorno("O cliente é a Empresa Inventada Ltda e o lucro foi R$ 9.999,00.", comDados), false);
  assert.equal(lerJulgamento('```json\n{"ok":false,"motivo":"coluna inventada"}\n```').deNovo, true);
  assert.equal(lerJulgamento('{"ok":false,"motivo":"texto confuso","deNovo":false}').deNovo, false);
  assert.equal(lerJulgamento('{"ok":true}').ok, true);
  assert.equal(rodadasDesdePergunta([{ role: "user", content: "oi" }]), 0);
});
