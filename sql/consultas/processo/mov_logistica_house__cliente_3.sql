-- executar_sql
-- 2026-10-09

SELECT
    Lhs.Numero_Processo AS Numero_do_Processo,
    Cli.Nome AS Cliente,
    Lhs.Data_Abertura_Processo AS Data_de_Abertura,
    Sta.Descricao AS Situacao,
    Lmo.Lucro_Estimado AS Lucro_Estimado
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
LEFT OUTER JOIN mov_Logistica_Moeda Lmo ON Lmo.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Data_Abertura_Processo >= '2026-10-05' AND Lhs.Data_Abertura_Processo < '2026-10-12'
ORDER BY Lhs.Data_Abertura_Processo DESC;
