-- consultar_dados
-- 2026-10-15

SELECT TOP 20
    Tab.Codigo AS Codigo,
    Tab.Descricao AS Descricao
FROM cad_Tarefa Tab
WHERE Tab.IdProjeto_Tarefa = N'2019';
