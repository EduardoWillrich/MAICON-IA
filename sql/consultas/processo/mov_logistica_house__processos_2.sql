-- executar_sql
-- 2026-11-03

SELECT
    TOP 1 COUNT(DISTINCT Lhs.IdLogistica_House) AS Processos,
    SUM(Lmo.Lucro_Estimado) AS Total_Lucro_Estimado
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Lmo ON Lmo.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Data_Abertura_Processo >= '2026-10-01' AND Lhs.Data_Abertura_Processo < '2026-11-01' AND Lhs.Numero_Processo NOT LIKE '%TEST%'
  AND Lhs.Numero_Processo NOT LIKE '%DEMU%';
