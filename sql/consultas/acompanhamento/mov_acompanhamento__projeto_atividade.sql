-- executar_sql
-- 2026-11-04

SELECT
    TOP 1 Pa.Referencia AS Projeto_Atividade,
    Con.Descricao AS Acompanhamento,
    Pt.Nome AS Atividade
FROM dbo.mov_Acompanhamento Con
LEFT OUTER JOIN dbo.mov_Projeto_Atividade Pa ON Pa.IdProjeto_Atividade = Con.IdProjeto_Atividade
LEFT OUTER JOIN dbo.cad_Projeto_Tarefa Pt ON Pt.IdProjeto_Tarefa = Pa.IdProjeto_Tarefa
WHERE Con.Data >= '2027-01-15' AND Con.Data < '2027-01-16' AND Con.Descricao LIKE '%Confirmamos o embarque da carga%'
ORDER BY Con.Data DESC;
