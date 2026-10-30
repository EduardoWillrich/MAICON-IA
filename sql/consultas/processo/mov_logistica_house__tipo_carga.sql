-- executar_sql
-- 2026-10-30

SELECT
    CASE Lhs.Tipo_Carga WHEN 1 THEN 'Aéreo' WHEN 2 THEN 'LCL' WHEN 3 THEN 'FCL' WHEN 4 THEN 'Rodoviário' ELSE 'Outro' END AS Tipo_Carga,
    COUNT(Lhs.Numero_Processo) AS Qtde
FROM dbo.mov_Logistica_House Lhs
WHERE Lhs.Data_Abertura_Processo >= '2026-10-29' AND Lhs.Data_Abertura_Processo < '2026-10-30'
GROUP BY Lhs.Tipo_Carga
ORDER BY Qtde DESC;
