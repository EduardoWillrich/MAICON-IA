-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Processo,
    Mo.Nome AS Moeda,
    Moe.Lucro_Estimado AS Lucro_Estimado,
    Moe.Lucro_Efetivo AS Lucro_Efetivo
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Moe ON Moe.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Moeda Mo ON Mo.IdMoeda = Moe.IdMoeda
WHERE Lhs.Numero_Processo IN ('IM6196-26','IM6192-26','EM2899-26')
ORDER BY Lhs.Numero_Processo, Mo.Nome;
