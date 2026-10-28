-- executar_sql
-- 2026-10-14

SELECT
    Lhs.Numero_Processo AS Processo,
    Lvi.Data_Previsao_Embarque AS Prev_Embarque,
    Lvi.Data_Embarque AS Real_Embarque,
    Lvi.Data_Previsao_Desembarque AS Prev_Desembarque,
    Lvi.Data_Desembarque AS Real_Desembarque,
    Lvi.Previsao_Carregamento AS Prev_Carregamento,
    Lvi.Data_Carregamento AS Real_Carregamento,
    Lvi.Previsao_Descarregamento AS Prev_Descarregamento,
    Lvi.Data_Descarregamento AS Real_Descarregamento
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Logistica_Viagem Lvi ON Lvi.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Numero_Processo LIKE 'IM%-26'
AND (
    (Lvi.Data_Previsao_Embarque <> Lvi.Data_Embarque) OR
    (Lvi.Data_Previsao_Desembarque <> Lvi.Data_Desembarque) OR
    (Lvi.Previsao_Carregamento <> Lvi.Data_Carregamento) OR
    (Lvi.Previsao_Descarregamento <> Lvi.Data_Descarregamento) OR
    (Lvi.Data_Previsao_Embarque IS NULL AND Lvi.Data_Embarque IS NOT NULL) OR
    (Lvi.Data_Previsao_Desembarque IS NULL AND Lvi.Data_Desembarque IS NOT NULL)
)
ORDER BY Lhs.Numero_Processo;
