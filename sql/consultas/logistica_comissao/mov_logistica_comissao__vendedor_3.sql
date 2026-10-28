-- executar_sql
-- 2026-10-28

SELECT
    Pai.Nome AS Vendedor,
    Lhs.Numero_Processo AS Numero_Processo,
    Cli.Nome AS Cliente,
    Com.Valor_Comissao AS Valor_Comissao
FROM mov_Logistica_Comissao Com
LEFT OUTER JOIN cad_Pessoa Pai ON Pai.IdPessoa = Com.IdPessoa
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Com.IdLogistica_House
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
WHERE Lhs.Data_Abertura_Processo >= '2026-10-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
ORDER BY Pai.Nome, Lhs.Numero_Processo;
