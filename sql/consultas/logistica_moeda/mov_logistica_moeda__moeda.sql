-- executar_sql
-- 2026-10-15

SELECT
    Nom1.Nome AS Moeda,
    Moe.Lucro_Estimado AS Lucro_Estimado,
    Moe.Lucro_Efetivo AS Lucro_Efetivo
FROM mov_Logistica_Moeda Moe
LEFT OUTER JOIN cad_Moeda Nom1 ON Nom1.IdMoeda = Moe.IdMoeda
WHERE Moe.IdLogistica_House = 43220
ORDER BY Moe.IdLogistica_Moeda;
