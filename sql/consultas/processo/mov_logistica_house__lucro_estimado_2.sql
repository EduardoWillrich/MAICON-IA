-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Numero_Processo,
    SUM(Lmo.Lucro_Estimado) AS Lucro_Estimado
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Lmo ON Lmo.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Data_Abertura_Processo >= '2026-10-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
  AND Lhs.Numero_Processo NOT LIKE '%TEST%'
  AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
GROUP BY Lhs.Numero_Processo
ORDER BY SUM(Lmo.Lucro_Estimado) DESC;
