-- consultar_dados
-- 2026-10-19

SELECT TOP 20
    Tab.Data_Previsao_Embarque AS Data_Previsao_Embarque,
    Tab.Data_Embarque AS Data_Embarque,
    Tab.Data_Previsao_Desembarque AS Data_Previsao_Desembarque,
    Tab.Data_Desembarque AS Data_Desembarque,
    Tab.Previsao_Carregamento AS Previsao_Carregamento,
    Tab.Data_Carregamento AS Data_Carregamento,
    Tab.Previsao_Descarregamento AS Previsao_Descarregamento,
    Tab.Data_Descarregamento AS Data_Descarregamento
FROM mov_logistica_viagem Tab
WHERE Tab.IdLogistica_House = N'42910';
