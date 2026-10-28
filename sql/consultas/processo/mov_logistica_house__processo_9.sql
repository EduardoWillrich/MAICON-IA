-- executar_sql
-- 2026-10-14

SELECT
    Lhs.Numero_Processo AS Processo,
    Lvi.Data_Previsao_Embarque AS Prev_Embarque,
    Lvi.Data_Embarque AS Real_Embarque,
    Lvi.Data_Previsao_Desembarque AS Prev_Desembarque,
    Lvi.Data_Desembarque AS Real_Desembarque
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Logistica_Viagem Lvi ON Lvi.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Numero_Processo LIKE 'IM%-26'
AND (
    ABS(DATEDIFF(day, Lvi.Data_Previsao_Desembarque, Lvi.Data_Desembarque)) > 15
    OR ABS(DATEDIFF(day, Lvi.Data_Previsao_Embarque, Lvi.Data_Embarque)) > 15
    OR (Lvi.Data_Desembarque < Lvi.Data_Embarque)
    OR (Lvi.Data_Desembarque < '2025-01-01' OR Lvi.Data_Desembarque > '2027-12-31')
)
ORDER BY ABS(DATEDIFF(day, Lvi.Data_Previsao_Desembarque, Lvi.Data_Desembarque)) DESC;
