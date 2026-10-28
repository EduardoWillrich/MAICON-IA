-- executar_sql
-- 2026-10-07

SELECT TOP 50
    COUNT(Lhs.IdLogistica_House) AS Total_Processos
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
WHERE Cli.Nome = 'METALURGICA RIOSULENSE SA'
AND Lhs.Data_Abertura_Processo >= '2026-09-07';
