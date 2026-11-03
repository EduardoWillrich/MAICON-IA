-- executar_sql
-- 2026-11-03

SELECT
    Pai.Nome AS Vendedor,
    COUNT(Com.IdLogistica_Comissao) AS Quantidade_Comissoes,
    SUM(ISNULL(Com.Valor_Comissao, 0)) AS Total_Comissao
FROM dbo.mov_Logistica_Comissao Com
LEFT OUTER JOIN dbo.mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Com.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdVendedor
WHERE Lhs.Data_Abertura_Processo >= '2026-10-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
GROUP BY Pai.Nome
ORDER BY Total_Comissao DESC;
