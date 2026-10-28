-- executar_sql
-- 2026-10-26

SELECT
    Lhs.Numero_Processo AS Processo,
    Tar.Descricao AS Atividade,
    Ati.Data_Inicio AS Data_Inicio
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
WHERE Tar.Descricao = 'SOLICITAR DOCS FINAIS AO AGENTE'
AND Ati.Situacao <> 4
AND CAST(Ati.Data_Inicio AS DATE) = '2026-10-26'
ORDER BY Lhs.Numero_Processo;
