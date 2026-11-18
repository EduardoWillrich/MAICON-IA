-- executar_sql
-- 2026-11-17

SELECT
    Txa.Nome AS Nome_Taxa,
    Mlt.Valor_Pagamento_Total AS Valor_Pagamento,
    Mlt.Valor_Recebimento_Total AS Valor_Recebimento
FROM mov_Logistica_Taxa Mlt
LEFT OUTER JOIN cad_Taxa_Logistica_Exibicao Txa ON Txa.IdTaxa_Logistica_Exibicao = Mlt.IdTaxa_Logistica_Exibicao
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Mlt.IdLogistica_House
WHERE Lhs.Numero_Processo NOT LIKE '%TESTE%' AND Lhs.Numero_Processo NOT LIKE 'DEMU%' AND Lhs.Data_Cancelamento IS NULL AND (Lhs.IdStatus_Processo_Logistico IS NULL OR Lhs.IdStatus_Processo_Logistico <> 6) AND Lhs.Data_Abertura_Processo >= '2026-10-01' AND Lhs.Data_Abertura_Processo < '2026-11-01'
ORDER BY Txa.Nome;
