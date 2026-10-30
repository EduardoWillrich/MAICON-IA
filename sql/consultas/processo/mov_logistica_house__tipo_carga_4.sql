-- executar_sql
-- 2026-10-30

SELECT
    CASE Lhs.Tipo_Carga WHEN 1 THEN 'Aéreo' WHEN 2 THEN 'LCL' WHEN 3 THEN 'FCL' WHEN 4 THEN 'Rodoviário' ELSE 'Outro' END AS Tipo_Carga,
    COUNT(*) AS Quantidade
FROM dbo.mov_Logistica_House Lhs
WHERE Lhs.Data_Abertura_Processo >= '2026-10-15' AND Lhs.Data_Abertura_Processo < '2026-10-16'
GROUP BY Lhs.Tipo_Carga
ORDER BY Quantidade DESC;
