import sql from "mssql";
import { abrirAtividadeNoHeadCargo } from "./headcargoDesktop.js";

export async function abrirAtividade(pool, id, acesso, navegar = abrirAtividadeNoHeadCargo) {
  if (acesso?.removida || acesso?.papel !== "admin") throw new Error("A abertura no HeadCargo é restrita ao administrador.");
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw new Error("Atividade inválida. Atualize Meu dia e tente novamente.");
  const r = await pool.request().input("id", sql.Int, id).query(`
    SELECT Ati.IdAtividade, Lhs.Numero_Processo, Tar.Codigo, Tar.Descricao AS Atividade,
      (SELECT COUNT(*) FROM mov_Atividade Repetida WHERE Repetida.IdProjeto_Atividade = Ati.IdProjeto_Atividade AND Repetida.IdTarefa = Ati.IdTarefa) AS Ocorrencias
    FROM mov_Atividade Ati
    JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    WHERE Ati.IdAtividade = @id`);
  if (r.recordset.length !== 1) throw new Error("Não foi possível identificar o processo dessa atividade de forma única.");
  const linha = r.recordset[0];
  if (Number(linha.Ocorrencias) > 1) throw new Error("Essa atividade aparece mais de uma vez no processo. Abra o HeadCargo e selecione a ocorrência desejada.");
  if (!String(linha.Atividade || "").trim()) throw new Error("A atividade não tem nome cadastrado.");
  return navegar({ numero: linha.Numero_Processo, codigo: linha.Codigo, nome: linha.Atividade });
}
