-- executar_sql
-- 2026-10-26

SELECT
    Lhs.Numero_Processo AS Logistica_House
FROM mov_Logistica_House Lhs
WHERE Lhs.Numero_Processo LIKE 'IM5476-26%';
