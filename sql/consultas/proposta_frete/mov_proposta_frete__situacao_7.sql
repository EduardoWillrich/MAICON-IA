-- executar_sql
-- 2026-10-13

SELECT
    P.Numero_Proposta AS Numero_Proposta,
    P.Situacao AS Situacao,
    P.Data_Proposta AS Data_Proposta
FROM mov_Proposta_Frete P
WHERE P.Numero_Proposta LIKE 'PF%'
AND (P.IdProjeto_Atividade = 42663 OR P.IdProjeto_Atividade = 134368)
ORDER BY P.Data_Proposta DESC;
