-- executar_sql
-- 2026-10-27

SELECT TOP 1
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    Sta.Descricao AS Situacao
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Lhs.Numero_Processo LIKE 'EM%-26'
AND Lhs.Data_Fechamento_Processo IS NULL
AND Lhs.Data_Cancelamento IS NULL
ORDER BY Lhs.Data_Abertura_Processo DESC;
