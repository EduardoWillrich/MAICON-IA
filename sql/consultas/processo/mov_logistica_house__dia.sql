-- executar_sql
-- 2026-10-30

SELECT
    CONVERT(varchar(10), Lhs.Data_Abertura_Processo, 103) AS Dia,
    CASE Lhs.Tipo_Carga WHEN 1 THEN 'Aéreo' WHEN 2 THEN 'LCL' WHEN 3 THEN 'FCL' ELSE 'Outro' END AS Tipo_Carga,
    COUNT(*) AS Quantidade
FROM dbo.mov_Logistica_House Lhs
WHERE Lhs.Data_Abertura_Processo >= '2026-10-26' AND Lhs.Data_Abertura_Processo < '2026-10-31'
AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
GROUP BY CONVERT(varchar(10), Lhs.Data_Abertura_Processo, 103), Lhs.Tipo_Carga
ORDER BY Dia;
