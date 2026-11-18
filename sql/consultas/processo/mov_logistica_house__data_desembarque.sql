-- executar_sql
-- 2026-11-10

SELECT TOP 1 Lvi.Data_Desembarque AS Data_Desembarque
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Logistica_Viagem Lvi ON Lvi.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Numero_Processo NOT LIKE 'DEMU%' AND Lhs.Data_Cancelamento IS NULL AND (Lhs.IdStatus_Processo_Logistico IS NULL OR Lhs.IdStatus_Processo_Logistico <> 6) AND Lvi.Data_Desembarque = Lvi.Data_Desembarque
AND Lhs.Numero_Processo = N'IM2099-25 teste'
AND Lhs.IdLogistica_House = 24870;
