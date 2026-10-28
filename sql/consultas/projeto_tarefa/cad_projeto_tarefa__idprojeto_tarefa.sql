-- consultar_dados
-- 2026-10-15

SELECT TOP 20
    Tab.IdProjeto_Tarefa AS IdProjeto_Tarefa
FROM cad_Projeto_Tarefa Tab
WHERE Tab.Nome = N'IMPORTACAO AEREA - NOVO';
