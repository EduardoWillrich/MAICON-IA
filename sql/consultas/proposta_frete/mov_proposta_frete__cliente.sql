-- executar_sql
-- 2026-10-30

SELECT
    Pes.Nome AS Cliente,
    COUNT(Prp.IdProposta_Frete) AS Quantidade_Propostas
FROM dbo.mov_Proposta_Frete Prp
LEFT OUTER JOIN dbo.cad_Cliente Cli ON Cli.IdPessoa = Prp.IdCliente
LEFT OUTER JOIN dbo.cad_Pessoa Pes ON Pes.IdPessoa = Cli.IdPessoa
WHERE Prp.Data_Proposta >= '2026-08-30' AND Prp.Data_Proposta < '2026-10-31'
    AND (Prp.Numero_Proposta NOT LIKE 'DEMU%' OR Prp.Numero_Proposta IS NULL)
    AND (Prp.Numero_Proposta NOT LIKE 'TESTE%' OR Prp.Numero_Proposta IS NULL)
GROUP BY Pes.Nome
ORDER BY Quantidade_Propostas DESC, Pes.Nome;
