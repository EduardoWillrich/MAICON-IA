-- consultar_dados
-- 2026-10-13

SELECT TOP 20
    Tab.Valor_Comissao AS Valor_Comissao,
    Tab.Percentual_Base_Calculo AS Percentual_Base_Calculo,
    Tab.IdPessoa AS IdPessoa,
    Tab.IdTaxa_Logistica_Exibicao AS IdTaxa_Logistica_Exibicao
FROM mov_Logistica_Comissao Tab
WHERE Tab.IdLogistica_House = N'41698';
