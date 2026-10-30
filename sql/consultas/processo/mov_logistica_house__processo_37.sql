-- executar_sql
-- 2026-10-30

SELECT
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lhs.Referencia_Cliente AS Referencia_Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Abertura_Processo >= '2026-10-15' AND Lhs.Data_Abertura_Processo < '2026-10-16' AND Lhs.Tipo_Carga = 3
  AND Lhs.Data_Abertura_Processo < '2026-10-15 16:00'
ORDER BY Lhs.Data_Abertura_Processo;
