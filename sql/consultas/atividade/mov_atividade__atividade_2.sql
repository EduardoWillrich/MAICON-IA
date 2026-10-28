-- executar_sql
-- 2026-10-09

SELECT TOP 50
    Tar.Descricao AS Atividade
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
WHERE Res.Nome = 'Andressa Zaia'
AND Ati.Situacao = 0
ORDER BY Tar.Descricao;
