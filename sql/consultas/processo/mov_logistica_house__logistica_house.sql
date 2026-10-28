-- executar_sql
-- 2026-10-26

SELECT
    Lhs.Numero_Processo AS Logistica_House,
    Nom2.Referencia AS Projeto_Atividade
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Projeto_Atividade Nom2 ON Nom2.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
WHERE Lhs.Numero_Processo = 'IM5476-26 TESTE';
