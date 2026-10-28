-- executar_sql
-- 2026-10-15

SELECT Lhs.Numero_Processo AS Processo,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    Sta.Descricao AS Situacao
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Cli.Nome LIKE '%MASTER AGROINDUSTRIAL S/A%'
ORDER BY Lhs.Data_Abertura_Processo DESC;
