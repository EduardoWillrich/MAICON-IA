-- executar_sql
-- 2026-10-26

SELECT
    Nom1.Referencia AS Projeto_Atividade
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Projeto_Atividade Nom1 ON Nom1.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
WHERE Lhs.Numero_Processo = 'EM2487-25 teste';
