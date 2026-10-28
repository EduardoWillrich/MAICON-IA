-- executar_sql
-- 2026-10-15

SELECT
    Pai.Nome AS Cliente,
    COUNT(Lhs.IdLogistica_House) AS Total_Processos
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Fechamento_Processo IS NULL
AND Lhs.Data_Cancelamento IS NULL
AND Lhs.Data_Abertura_Processo >= '2026-01-01'
AND Lhs.Data_Abertura_Processo < '2027-01-01'
AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
AND Lhs.Numero_Processo NOT LIKE 'TESTE%'
GROUP BY Pai.Nome
ORDER BY Total_Processos DESC;
