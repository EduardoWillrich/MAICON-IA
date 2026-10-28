-- executar_sql
-- 2026-10-28

SELECT
    Lhs.Numero_Processo AS Numero_Processo,
    Lhs.Numero_Processo AS IdLogistica_House,
    Nom1.Referencia AS IdProjeto_Atividade
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Projeto_Atividade Nom1 ON Nom1.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
WHERE Lhs.Numero_Processo LIKE 'IM5476-26%';
