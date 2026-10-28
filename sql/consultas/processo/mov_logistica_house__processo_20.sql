-- executar_sql
-- 2026-10-28

SELECT
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN mov_Proposta_Frete P ON (P.IdProjeto_Atividade = Lhs.IdLogistica_House OR P.IdProjeto_Atividade = Lhs.IdProjeto_Atividade)
WHERE Lhs.Data_Abertura_Processo >= '2026-04-28'
AND Lhs.Data_Fechamento_Processo IS NULL
AND Lhs.Data_Cancelamento IS NULL
AND P.IdProposta_Frete IS NULL
AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
AND Lhs.Numero_Processo NOT LIKE 'TESTE%'
ORDER BY Lhs.Data_Abertura_Processo DESC;
