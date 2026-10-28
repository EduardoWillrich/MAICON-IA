-- executar_sql
-- 2026-10-09

SELECT
    Tar.Descricao AS Atividade,
    Ati.Data_Inicio AS Data_Inicio
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
WHERE Res.Nome = 'Andressa Zaia'
AND Ati.Data_Inicio >= '2026-01-01'
ORDER BY Ati.Data_Inicio DESC;
