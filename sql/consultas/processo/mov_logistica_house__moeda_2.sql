-- executar_sql
-- 2026-11-03

SELECT
    Mo.Nome AS Moeda,
    COUNT(DISTINCT Lhs.Numero_Processo) AS Processos,
    'R$ ' + FORMAT(SUM(Moe.Lucro_Estimado), 'N2', 'pt-BR') AS Lucro_Estimado_Total
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Moe ON Moe.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Moeda Mo ON Mo.IdMoeda = Moe.IdMoeda
WHERE Lhs.Data_Abertura_Processo >= '2026-09-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
    AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
GROUP BY Mo.Nome
ORDER BY SUM(Moe.Lucro_Estimado) DESC;
