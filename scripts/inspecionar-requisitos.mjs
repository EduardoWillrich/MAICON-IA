import "../server/env.js";
import sql from "mssql";
import { protegerPool } from "../server/seguranca.js";
import { executarFuncao } from "../server/funcoes.js";

const instancia = String(process.env.SQL_INSTANCE || "").trim();
const servidor = String(process.env.SQL_SERVER || "").trim();
const pool = protegerPool(await new sql.ConnectionPool({
  server: instancia ? `${servidor}\\${instancia}` : servidor,
  port: Number(process.env.SQL_PORT || 1433), database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER, password: process.env.SQL_PASSWORD,
  options: { encrypt: process.env.SQL_ENCRYPT !== "false", trustServerCertificate: process.env.SQL_TRUST_CERT !== "false", readOnlyIntent: true },
  connectionTimeout: 10000, requestTimeout: 20000,
}).connect());
try {
  if (process.argv.includes("--resultado")) {
    const resultado = await executarFuncao(pool, "andamento_atividade", { numero: "IM2099-25 teste", codigo: "0024", requisitos: true }, { email: "", acesso: { papel: "admin" }, recorte: {} });
    console.log(resultado.texto);
  } else if (process.argv.includes("--arquivos")) {
    const colunas = await pool.request().query(`SELECT T.name AS Tabela, C.name AS Coluna FROM sys.tables T JOIN sys.columns C ON C.object_id=T.object_id
      WHERE T.name IN ('mov_Projeto_Atividade_Arquivo','Arq_Arquivo') OR T.name LIKE '%Arquivo_Grupo%' ORDER BY T.name,C.column_id`);
    const estado = await pool.request().input("numero", sql.VarChar(40), "IM2099-25 teste").query(`SELECT Lhs.IdProjeto_Atividade, Lhs.IdStatus_Processo_Logistico, S.Descricao AS Status FROM mov_Logistica_House Lhs LEFT JOIN cad_Status_Processo_Logistico S ON S.IdStatus_Processo_Logistico=Lhs.IdStatus_Processo_Logistico WHERE Lhs.Numero_Processo=@numero`);
    console.log(JSON.stringify({ colunas: colunas.recordset, estado: estado.recordset }));
  } else if (process.argv.includes("--atividade")) {
    const pedido = () => pool.request().input("numero", sql.VarChar(40), "IM2099-25 teste").input("codigo", sql.VarChar(40), "0024");
    const vinculo = `FROM mov_Logistica_House Lhs JOIN mov_Projeto_Atividade Pa ON Pa.IdProjeto_Atividade=Lhs.IdProjeto_Atividade
      JOIN cad_Tarefa Tar ON Tar.IdProjeto_Tarefa=Pa.IdProjeto_Tarefa`;
    const filtro = `WHERE Lhs.Numero_Processo=@numero AND CAST(Tar.Codigo AS varchar(60))=@codigo`;
    const tarefa = await pedido().query(`SELECT Tar.IdTarefa, Tar.Codigo, Tar.Descricao, Tar.Observacao, Tar.IdProjeto_Tarefa ${vinculo} ${filtro}`);
    const condicoes = await pedido().query(`SELECT Rel.Situacao_Verificacao, C.Descricao, C.Observacao, CAST(C.Dados_Registro AS nvarchar(max)) AS Dados_Registro ${vinculo}
      JOIN cad_Tarefa_Condicao Rel ON Rel.IdTarefa=Tar.IdTarefa JOIN cad_Projeto_Tarefa_Condicao C ON C.IdProjeto_Tarefa_Condicao=Rel.IdProjeto_Tarefa_Condicao ${filtro}`);
    const monitores = await pedido().query(`SELECT M.Descricao, M.Classe, M.Ao_Inserir, M.Ao_Atualizar, M.Ao_Excluir, M.Ativo, Rel.Geracao_Atividade, M.Observacao, CAST(M.Dados_Registro AS nvarchar(max)) AS Dados_Registro ${vinculo}
      JOIN cad_Tarefa_Monitor Rel ON Rel.IdTarefa=Tar.IdTarefa JOIN cad_Projeto_Tarefa_Monitor M ON M.IdProjeto_Tarefa_Monitor=Rel.IdProjeto_Tarefa_Monitor ${filtro}`);
    console.log(JSON.stringify({ tarefa: tarefa.recordset, condicoes: condicoes.recordset, monitores: monitores.recordset }));
  } else {
  const r = await pool.request().query(`SELECT T.name AS Tabela, C.name AS Coluna, Y.name AS Tipo
    FROM sys.tables T JOIN sys.columns C ON C.object_id=T.object_id
    JOIN sys.types Y ON Y.user_type_id=C.user_type_id
    WHERE T.name LIKE '%Tarefa%' ORDER BY T.name, C.column_id`);
  console.log(JSON.stringify(r.recordset));
  }
} finally { await pool.close(); }
