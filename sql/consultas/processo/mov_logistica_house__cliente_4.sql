-- executar_sql
-- 2026-10-15

SELECT 
    Lhs.Numero_Processo, 
    Cli.Nome AS Cliente, 
    Ult.Data AS Ultimo_Acompanhamento
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
OUTER APPLY (
    SELECT MAX(A.Data) AS Data 
    FROM mov_Acompanhamento A 
    WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
) Ult
WHERE Lhs.Data_Fechamento_Processo IS NULL 
    AND Lhs.Data_Cancelamento IS NULL 
    AND Lhs.Data_Abertura_Processo >= '2026-01-01' 
    AND Lhs.Data_Abertura_Processo < '2027-01-01'
    AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
    AND (Ult.Data IS NULL OR Ult.Data < '2026-10-08')
ORDER BY Ult.Data ASC;
