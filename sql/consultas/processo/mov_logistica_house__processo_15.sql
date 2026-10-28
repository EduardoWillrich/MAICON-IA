-- executar_sql
-- 2026-10-20

SELECT
    Lhs.Numero_Processo AS Processo,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    Sta.Descricao AS Situacao
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Cli.Nome LIKE 'CORTTEX IND, COM, IMPORTACAO E EXPORTACAO LTDA%'
AND Lhs.Data_Abertura_Processo >= '2026-10-20 00:00:00'
AND Lhs.Data_Abertura_Processo <= '2026-10-20 23:59:59'
ORDER BY Lhs.Data_Abertura_Processo DESC;
