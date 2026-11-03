-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Numero_Processo,
    Cli.Nome AS Cliente,
    Txa.Nome AS Nome_Taxa,
    Com.Valor_Comissao AS Valor_Comissao
FROM dbo.mov_Logistica_Comissao Com
LEFT OUTER JOIN dbo.mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Com.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN dbo.cad_Taxa_Logistica_Exibicao Txa ON Txa.IdTaxa_Logistica_Exibicao = Com.IdTaxa_Logistica_Exibicao
WHERE Lhs.Data_Abertura_Processo >= '2026-11-01' AND Lhs.Data_Abertura_Processo < '2026-11-04'
ORDER BY Lhs.Numero_Processo, Txa.Nome;
