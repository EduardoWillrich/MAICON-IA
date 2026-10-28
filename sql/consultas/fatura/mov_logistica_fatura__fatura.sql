-- executar_sql
-- 2026-10-07

SELECT TOP 50
    Fat.IdRegistro_Financeiro AS Fatura,
    Fat.Data_Conversao AS Data_Conversao,
    Ind.Nome AS Indicador
FROM mov_Logistica_Fatura Fat
LEFT OUTER JOIN cad_Indicador_Logistica_Fatura Ind ON Ind.IdIndicador_Logistica_Fatura = Fat.IdIndicador_Logistica_Fatura
WHERE Fat.IdLogistica_House = 41675
ORDER BY Fat.IdRegistro_Financeiro;
