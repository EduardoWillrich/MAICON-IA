-- consultar_dados
-- 2026-11-10

SELECT TOP 20
    Tab.IdLogistica_House AS IdLogistica_House,
    Tab.Data_Abertura_Processo AS Data_Abertura_Processo,
    Tab.Data_Cancelamento AS Data_Cancelamento
FROM mov_Logistica_House Tab
WHERE Tab.Data_Abertura_Processo = N'2026-11-09';
