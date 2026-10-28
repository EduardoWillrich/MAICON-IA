-- consultar_dados
-- 2026-10-28

SELECT TOP 20
    Tab.IdLogistica_Viagem AS IdLogistica_Viagem,
    Tab.Data_Previsao_Desembarque AS Data_Previsao_Desembarque,
    Tab.IdLogistica_Maritima_Transbordo AS IdLogistica_Maritima_Transbordo
FROM mov_Logistica_Viagem Tab
WHERE Tab.IdLogistica_House = N'43502';
