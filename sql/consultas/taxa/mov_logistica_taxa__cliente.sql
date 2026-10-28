-- executar_sql
-- 2026-10-15

SELECT
    Lhs.Numero_Processo AS Numero_Processo,
    Cli.Nome AS Cliente,
    Txa.Nome AS Nome_Taxa,
    Mlt.Valor_Pagamento_Total AS Valor_Pagamento,
    Mlt.Valor_Recebimento_Total AS Valor_Recebimento
FROM mov_Logistica_Taxa Mlt
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Mlt.IdLogistica_House
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Taxa_Logistica_Exibicao Txa ON Txa.IdTaxa_Logistica_Exibicao = Mlt.IdTaxa_Logistica_Exibicao
WHERE Lhs.Data_Abertura_Processo >= '2026-10-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
ORDER BY Lhs.Numero_Processo;
