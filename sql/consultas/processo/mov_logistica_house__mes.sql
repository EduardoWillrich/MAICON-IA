-- executar_sql
-- 2026-11-03

SELECT
    CONVERT(varchar(7), Lhs.Data_Abertura_Processo, 126) AS Mes,
    COUNT(DISTINCT Lhs.Numero_Processo) AS Processos,
    SUM(Moe.Lucro_Estimado) AS Lucro_Estimado_Total
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Moe ON Moe.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Data_Abertura_Processo >= '2026-09-03' AND Lhs.Data_Abertura_Processo < '2026-11-04'
    AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
GROUP BY CONVERT(varchar(7), Lhs.Data_Abertura_Processo, 126)
ORDER BY CONVERT(varchar(7), Lhs.Data_Abertura_Processo, 126);
