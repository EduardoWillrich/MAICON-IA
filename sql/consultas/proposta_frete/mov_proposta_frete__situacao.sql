-- consultar_dados
-- 2026-10-13

SELECT TOP 20
    Tab.Numero_Proposta AS Numero_Proposta,
    Tab.Situacao AS Situacao,
    Tab.Data_Proposta AS Data_Proposta
FROM mov_Proposta_Frete Tab
WHERE Tab.IdProjeto_Atividade = N'131744';
