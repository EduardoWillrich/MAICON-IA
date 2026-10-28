-- executar_sql
-- 2026-10-27

SELECT
    Lhs.Numero_Processo AS Numero_do_Processo,
    Cli.Nome AS Cliente,
    Sta.Descricao AS Situacao,
    Lhs.Data_Abertura_Processo AS Data_de_Abertura,
    Res.Nome AS Responsavel
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Lhs.IdVendedor
WHERE Lhs.Data_Abertura_Processo >= '2026-10-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
ORDER BY Lhs.Data_Abertura_Processo DESC;
