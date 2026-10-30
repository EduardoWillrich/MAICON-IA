-- executar_sql
-- 2026-10-30

SELECT
    Prp.Situacao AS Situacao,
    COUNT(Prp.IdProposta_Frete) AS Quantidade
FROM dbo.mov_Proposta_Frete Prp
WHERE Prp.Data_Proposta >= '2026-10-01' AND Prp.Data_Proposta < '2026-10-31' AND (Prp.Numero_Proposta NOT LIKE 'DEMU%' OR Prp.Numero_Proposta IS NULL)
    AND (Prp.Numero_Proposta NOT LIKE 'TESTE%' OR Prp.Numero_Proposta IS NULL)
GROUP BY Prp.Situacao
ORDER BY Quantidade DESC;
