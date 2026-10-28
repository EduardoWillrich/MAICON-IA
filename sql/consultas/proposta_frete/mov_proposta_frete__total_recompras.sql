-- executar_sql
-- 2026-10-26

SELECT
    COUNT(P.IdProposta_Frete) AS Total_Recompras
FROM mov_Proposta_Frete P
WHERE P.IdProposta_Original IS NOT NULL
AND P.Data_Proposta >= '2026-10-26 00:00:00'
AND P.Data_Proposta <= '2026-10-26 23:59:59';
