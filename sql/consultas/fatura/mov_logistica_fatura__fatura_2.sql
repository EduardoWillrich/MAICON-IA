-- executar_sql
-- 2026-10-07

SELECT TOP 50
    Fat.IdRegistro_Financeiro AS Fatura,
    CASE Fat.Tipo_Fatura 
        WHEN 1 THEN 'Tipo 1' 
        WHEN 2 THEN 'Tipo 2' 
        WHEN 3 THEN 'Tipo 3' 
        WHEN 4 THEN 'Tipo 4' 
    END AS Tipo_Fatura,
    Fat.Data_Conversao AS Data_Conversao
FROM mov_Logistica_Fatura Fat
WHERE Fat.IdLogistica_House = 41675
ORDER BY Fat.IdRegistro_Financeiro;
