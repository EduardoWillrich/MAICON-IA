-- consultar_dados
-- 2026-10-21

SELECT TOP 20
    Tab.Number AS Number,
    Tab.IdLogistica_House AS IdLogistica_House
FROM mov_Logistica_Maritima_Container Tab
WHERE Tab.IdLogistica_Maritima_Container = N'40001';
