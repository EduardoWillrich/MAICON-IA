-- executar_sql
-- 2026-10-27

SELECT
    Lhs.Numero_Processo
FROM mov_Logistica_House Lhs
WHERE Lhs.Numero_Processo LIKE 'EM%TESTE%'
OR Lhs.Numero_Processo LIKE 'EM%teste%';
