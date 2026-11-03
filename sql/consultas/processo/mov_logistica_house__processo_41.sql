-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Processo,
    Pai.Nome AS Cliente,
    CONVERT(varchar(10), Lhs.Data_Abertura_Processo, 103) AS Data_Abertura,
    Moe.Lucro_Estimado AS Lucro_Estimado
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Moe ON Moe.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Abertura_Processo >= '2026-09-03' AND Lhs.Data_Abertura_Processo < '2026-11-04'
    AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
ORDER BY Lhs.Data_Abertura_Processo DESC;
