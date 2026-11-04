-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Processo,
    Pai.Nome AS Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    SUM(Moe.Lucro_Estimado) AS Lucro_Estimado
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Moe ON Moe.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Abertura_Processo >= '2026-10-26' AND Lhs.Data_Abertura_Processo < '2026-11-02'
    AND Lhs.Numero_Processo NOT LIKE '%TEST%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
    AND (Pai.Nome IS NULL OR Pai.Nome NOT LIKE '%TEST%')
GROUP BY Lhs.Numero_Processo, Pai.Nome, Lhs.Data_Abertura_Processo
ORDER BY SUM(Moe.Lucro_Estimado) DESC
OFFSET 30 ROWS FETCH NEXT 170 ROWS ONLY;
