-- executar_sql
-- 2026-10-09

SELECT TOP 50
    Tar.Descricao AS Atividade,
    Res.Nome AS Responsavel
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
WHERE Res.Nome LIKE '%mercante%'
AND Ati.Situacao = 1
ORDER BY Tar.Descricao;
