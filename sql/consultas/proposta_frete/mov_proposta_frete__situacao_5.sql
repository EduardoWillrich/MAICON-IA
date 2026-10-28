-- executar_sql
-- 2026-10-13

SELECT
    P.Numero_Proposta AS Numero_Proposta,
    P.Situacao AS Situacao,
    P.Data_Proposta AS Data_Proposta
FROM mov_Proposta_Frete P
WHERE P.Numero_Proposta LIKE 'PF016937/26%'
ORDER BY P.Data_Proposta DESC;
