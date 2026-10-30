-- executar_sql
-- 2026-10-30

SELECT
    CASE Lhs.Tipo_Carga WHEN 1 THEN 'Aéreo' WHEN 2 THEN 'LCL' WHEN 3 THEN 'FCL' WHEN 4 THEN 'Rodoviário' ELSE 'Outro' END AS Tipo_Carga,
    COUNT(Lhs.IdLogistica_House) AS Quantidade_Processos
FROM dbo.mov_Logistica_House Lhs
WHERE Lhs.Data_Abertura_Processo >= '2026-10-26' AND Lhs.Data_Abertura_Processo < '2026-10-31'
  AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
  AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
GROUP BY Lhs.Tipo_Carga
ORDER BY Quantidade_Processos DESC;
