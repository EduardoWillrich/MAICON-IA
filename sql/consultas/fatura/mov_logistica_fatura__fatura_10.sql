-- executar_sql
-- 2026-11-09

SELECT
    RF.Numero AS Fatura,
    RF.Valor_Total AS Valor,
    RF.Data AS Data
FROM mov_Logistica_Fatura Lfat
LEFT OUTER JOIN mov_Registro_Financeiro RF ON RF.IdRegistro_Financeiro = Lfat.IdRegistro_Financeiro
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Lfat.IdLogistica_House
WHERE Lhs.Numero_Processo NOT LIKE '%TESTE%' AND Lhs.Numero_Processo NOT LIKE 'DEMU%' AND Lhs.Data_Cancelamento IS NULL AND (Lhs.IdStatus_Processo_Logistico IS NULL OR Lhs.IdStatus_Processo_Logistico <> 6) AND Lhs.Numero_Processo = 'IM5944-26'
ORDER BY RF.Data ASC;
