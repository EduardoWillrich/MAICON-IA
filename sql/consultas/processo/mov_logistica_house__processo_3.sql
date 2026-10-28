-- executar_sql
-- 2026-10-09

SELECT
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Sta.Descricao AS Situacao,
    Lhs.Data_Abertura_Processo AS Data_Abertura
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Sta.Descricao = 'CE LIBERADO'
AND Lhs.Data_Abertura_Processo >= '2026-08-09'
ORDER BY Lhs.Data_Abertura_Processo DESC;
