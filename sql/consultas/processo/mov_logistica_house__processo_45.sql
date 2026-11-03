-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Processo,
    Pai.Nome AS Cliente,
    CONVERT(varchar(10), Lhs.Data_Abertura_Processo, 103) AS Data_Abertura,
    'R$ ' + FORMAT(SUM(CASE WHEN Mo.Nome = 'REAL' THEN Moe.Lucro_Estimado ELSE 0 END), 'N2', 'pt-BR') AS Lucro_Estimado_Real,
    'US$ ' + FORMAT(SUM(CASE WHEN Mo.Nome = 'DOLAR AMERICANO' THEN Moe.Lucro_Estimado ELSE 0 END), 'N2', 'en-US') AS Lucro_Estimado_Dolar,
    'EUR ' + FORMAT(SUM(CASE WHEN Mo.Nome = 'EURO' THEN Moe.Lucro_Estimado ELSE 0 END), 'N2', 'pt-BR') AS Lucro_Estimado_Euro
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Moe ON Moe.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Moeda Mo ON Mo.IdMoeda = Moe.IdMoeda
LEFT OUTER JOIN dbo.cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Abertura_Processo >= '2026-09-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
    AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
GROUP BY Lhs.Numero_Processo, Pai.Nome, Lhs.Data_Abertura_Processo
ORDER BY SUM(CASE WHEN Mo.Nome = 'REAL' THEN Moe.Lucro_Estimado ELSE 0 END) DESC;
