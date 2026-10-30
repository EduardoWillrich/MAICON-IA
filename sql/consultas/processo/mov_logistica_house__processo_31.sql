-- executar_sql
-- 2026-10-30

SELECT
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lhs.Referencia_Cliente AS Referencia_Cliente,
    CASE Lhs.Tipo_Carga WHEN 1 THEN 'Aéreo' WHEN 2 THEN 'LCL' WHEN 3 THEN 'FCL' WHEN 4 THEN 'Rodoviário' ELSE 'Outro' END AS Tipo_Carga,
    Sta.Descricao AS Situacao,
    Ven.Nome AS Vendedor,
    CONVERT(varchar(16), Lhs.Data_Abertura_Processo, 103) + ' ' + CONVERT(varchar(5), Lhs.Data_Abertura_Processo, 108) AS Data_Abertura
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN dbo.cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
LEFT OUTER JOIN dbo.cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Lhs.Data_Abertura_Processo >= '2026-10-30' AND Lhs.Data_Abertura_Processo < '2026-10-31'
ORDER BY Lhs.Data_Abertura_Processo DESC;
