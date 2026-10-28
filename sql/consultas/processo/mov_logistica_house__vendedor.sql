-- executar_sql
-- 2026-10-20

SELECT
    Ven.Nome AS Vendedor,
    COUNT(Lhs.IdLogistica_House) AS Total_Processos
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
WHERE Lhs.Data_Abertura_Processo >= '2026-01-01' AND Lhs.Data_Abertura_Processo < '2027-01-01'
AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
AND Lhs.Numero_Processo NOT LIKE 'TESTE%'
GROUP BY Ven.Nome
ORDER BY Total_Processos DESC;
