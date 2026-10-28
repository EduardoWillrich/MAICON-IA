-- consultar_dados
-- 2026-10-16

SELECT TOP 20
    Tab.Data_Abertura_Processo AS Data_Abertura_Processo
FROM mov_Logistica_House Tab
WHERE Tab.IdProjeto_Atividade = N'134479';
