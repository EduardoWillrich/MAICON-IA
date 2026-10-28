-- consultar_dados
-- 2026-10-15

SELECT TOP 20
    Tab.Nome AS Nome,
    Tab.IdProjeto_Tarefa AS IdProjeto_Tarefa
FROM cad_Projeto_Tarefa Tab
WHERE Tab.Codigo = N'006';
