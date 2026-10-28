-- executar_sql
-- 2026-10-19

SELECT
    Lhs.Numero_Processo AS Processo,
    Lvi.Data_Desembarque AS Data_Desembarque
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Logistica_Viagem Lvi ON Lvi.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lvi.Data_Desembarque = '2026-10-19'
AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
AND Lhs.Numero_Processo NOT LIKE 'TESTE%'
ORDER BY Lhs.Numero_Processo;
