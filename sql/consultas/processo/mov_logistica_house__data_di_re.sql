-- consultar_dados
-- 2026-10-13

SELECT TOP 20
    Tab.Data_DI_RE AS Data_DI_RE,
    Tab.Data_Averbacao AS Data_Averbacao,
    Tab.Data_Entrega AS Data_Entrega
FROM mov_Logistica_House Tab
WHERE Tab.Numero_Processo = N'IM4940-26';
