-- executar_sql
-- 2026-11-03

SELECT
    Mo.Nome AS Codigo,
    Mo.Nome AS Moeda
FROM dbo.cad_Moeda Mo
ORDER BY Mo.IdMoeda;
