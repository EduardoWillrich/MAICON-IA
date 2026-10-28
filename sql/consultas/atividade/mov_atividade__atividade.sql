-- executar_sql
-- 2026-10-07

SELECT TOP 50
    Tar.Descricao AS Atividade,
    Res.Nome AS Responsavel
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
WHERE Ati.IdProjeto_Atividade = 131657
AND Ati.Situacao = 0
ORDER BY Tar.Descricao;
