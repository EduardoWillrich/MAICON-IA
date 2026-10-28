-- executar_sql
-- 2026-10-14

SELECT
    Lhs.Numero_Processo AS Processo,
    Lhs.Referencia_Cliente AS Referencia,
    Cli.Nome AS Cliente,
    Sta.Descricao AS Situacao
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Cli.Nome LIKE '%Agricola Ferrari%'
AND Lhs.Data_Fechamento_Processo IS NULL
AND Lhs.Data_Cancelamento IS NULL
ORDER BY Lhs.Data_Abertura_Processo DESC;
