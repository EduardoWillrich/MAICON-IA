-- executar_sql
-- 2026-10-09

SELECT TOP 50
    Lhs.Numero_Processo AS Processo,
    Tar.Descricao AS Atividade,
    Ati.Data_Inicio AS Data_Inicio
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
WHERE Tar.Descricao = 'ENVIAR OHBL AO CLIENTE'
AND Ati.Data_Inicio >= '2026-01-01'
ORDER BY Ati.Data_Inicio DESC;
