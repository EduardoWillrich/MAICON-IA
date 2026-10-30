-- executar_sql
-- 2026-10-30

SELECT
    Prp.Numero_Proposta AS Numero_Proposta,
    Pes.Nome AS Cliente,
    Prp.Data_Proposta AS Data_Proposta,
    Prp.Situacao AS Situacao
FROM dbo.mov_Proposta_Frete Prp
LEFT OUTER JOIN dbo.cad_Cliente Cli ON Cli.IdPessoa = Prp.IdCliente
LEFT OUTER JOIN dbo.cad_Pessoa Pes ON Pes.IdPessoa = Cli.IdPessoa
WHERE Prp.Data_Proposta >= '2026-10-01' AND Prp.Data_Proposta < '2026-10-31' AND (Prp.Numero_Proposta NOT LIKE 'DEMU%' OR Prp.Numero_Proposta IS NULL)
    AND (Prp.Numero_Proposta NOT LIKE 'TESTE%' OR Prp.Numero_Proposta IS NULL)
ORDER BY Prp.Data_Proposta DESC;
