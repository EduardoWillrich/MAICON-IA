-- executar_sql
-- 2026-10-09

SELECT
    SUM(Lmo.Lucro_Estimado) AS Total_Lucro_Estimado
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Logistica_Moeda Lmo ON Lmo.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Data_Abertura_Processo >= '2026-10-05' AND Lhs.Data_Abertura_Processo < '2026-10-12';
