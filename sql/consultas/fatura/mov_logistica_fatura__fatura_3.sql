-- executar_sql
-- 2026-10-07

SELECT TOP 50
    Nom1.Numero AS Fatura,
    Fat.Data_Conversao AS Data_Conversao
FROM mov_Logistica_Fatura Fat
LEFT OUTER JOIN mov_Registro_Financeiro Nom1 ON Nom1.IdRegistro_Financeiro = Fat.IdRegistro_Financeiro
WHERE Fat.IdLogistica_House = 41675
ORDER BY Fat.IdRegistro_Financeiro;
