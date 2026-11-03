-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Processo,
    CONVERT(varchar(10), Lhs.Data_Abertura_Processo, 103) AS Data_Abertura
FROM dbo.mov_Logistica_House Lhs
WHERE Lhs.Data_Abertura_Processo >= '2026-11-01' AND Lhs.Data_Abertura_Processo < '2026-11-04' AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
ORDER BY Lhs.Data_Abertura_Processo;
