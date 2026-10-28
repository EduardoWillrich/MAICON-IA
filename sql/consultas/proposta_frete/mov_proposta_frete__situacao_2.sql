-- executar_sql
-- 2026-10-13

SELECT
    P.Numero_Proposta AS Numero_Proposta,
    P.Situacao AS Situacao,
    P.Data_Proposta AS Data_Proposta
FROM mov_Proposta_Frete P
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = P.IdProjeto_Atividade
WHERE Lhs.Numero_Processo = 'IM4940-26'
ORDER BY P.Data_Proposta DESC;
