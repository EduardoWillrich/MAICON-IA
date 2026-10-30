-- executar_sql
-- 2026-10-30

SELECT
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lhs.Referencia_Cliente AS Referencia_Cliente,
    'FCL' AS Tipo_Carga,
    CONVERT(VARCHAR(10), Lhs.Data_Abertura_Processo, 103) + ' ' + CONVERT(VARCHAR(5), Lhs.Data_Abertura_Processo, 108) AS Data_Abertura
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Abertura_Processo >= '2026-10-29' AND Lhs.Data_Abertura_Processo < '2026-10-30'
  AND Lhs.Tipo_Carga = 3
ORDER BY Lhs.Data_Abertura_Processo, Lhs.Numero_Processo;
