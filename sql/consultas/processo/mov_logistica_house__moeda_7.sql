-- executar_sql
-- 2026-11-03

SELECT
    Mo.Nome AS Moeda,
    COUNT(*) AS Lancamentos,
    SUM(Outu.Lucro_Estimado) AS Lucro_Estimado_Total
FROM (
    SELECT
        Lhs.IdLogistica_House,
        Lhs.Data_Abertura_Processo
    FROM dbo.mov_Logistica_House Lhs
    WHERE Lhs.Numero_Processo NOT LIKE '%TESTE%'
        AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
) Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Outu ON Outu.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Moeda Mo ON Mo.IdMoeda = Outu.IdMoeda
WHERE Lhs.Data_Abertura_Processo >= '2026-11-01' AND Lhs.Data_Abertura_Processo < '2026-11-04'
GROUP BY Mo.Nome
ORDER BY SUM(Outu.Lucro_Estimado) DESC;
