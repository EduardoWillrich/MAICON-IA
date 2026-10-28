-- executar_sql
-- 2026-10-15

SELECT
    IdProjeto_Tarefa,
    Nome
FROM cad_Projeto_Tarefa
WHERE Nome LIKE '%IMPORTAÇÃO AÉREA%'
ORDER BY Nome;
