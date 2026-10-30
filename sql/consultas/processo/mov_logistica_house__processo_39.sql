-- executar_sql
-- 2026-10-30

SELECT
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    Sta.Descricao AS Situacao,
    CASE Lhs.Tipo_Carga WHEN 1 THEN 'Aéreo' WHEN 2 THEN 'LCL' WHEN 3 THEN 'FCL' WHEN 4 THEN 'Rodoviário' WHEN 5 THEN 'Terrestre' ELSE 'Outro' END AS Tipo_Carga
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN dbo.cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
WHERE Lhs.Data_Abertura_Processo >= '2026-09-01' AND Lhs.Data_Abertura_Processo < '2026-10-01' AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
    AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
ORDER BY Lhs.Data_Abertura_Processo;
