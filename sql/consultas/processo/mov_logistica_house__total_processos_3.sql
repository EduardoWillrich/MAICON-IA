-- executar_sql
-- 2026-11-03

SELECT
    COUNT(DISTINCT Lhs.Numero_Processo) AS Total_Processos,
    SUM(Moe.Lucro_Estimado) AS Total_Lucro_Estimado
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.mov_Logistica_Moeda Moe ON Moe.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Abertura_Processo >= '2026-10-26' AND Lhs.Data_Abertura_Processo < '2026-11-02'
    AND Lhs.Numero_Processo NOT LIKE '%TEST%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
    AND (Pai.Nome IS NULL OR Pai.Nome NOT LIKE '%TEST%');
