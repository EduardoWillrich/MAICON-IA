-- executar_sql
-- 2026-11-03

SELECT
    CONVERT(varchar(7), Lhs.Data_Abertura_Processo, 126) AS Mes,
    COUNT(*) AS Processos
FROM dbo.mov_Logistica_House Lhs
WHERE Lhs.Data_Abertura_Processo >= '2026-11-01' AND Lhs.Data_Abertura_Processo < '2026-11-04' AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
GROUP BY CONVERT(varchar(7), Lhs.Data_Abertura_Processo, 126)
ORDER BY CONVERT(varchar(7), Lhs.Data_Abertura_Processo, 126);
