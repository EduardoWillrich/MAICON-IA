-- executar_sql
-- 2026-10-08

SELECT TOP 50
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    Sta.Descricao AS Situacao
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Lhs.Data_Abertura_Processo >= '2026-09-01' 
AND Lhs.Data_Abertura_Processo <= '2026-09-30'
ORDER BY Lhs.Data_Abertura_Processo DESC;
