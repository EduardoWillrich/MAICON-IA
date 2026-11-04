-- executar_sql
-- 2026-11-04

SELECT 
    TOP 1 Lhs.Numero_Processo 
FROM dbo.mov_Logistica_House Lhs 
WHERE Lhs.Numero_Processo LIKE 'IM%TESTE%' 
OR Lhs.Numero_Processo LIKE 'IM%TEST%';
