-- executar_sql
-- 2026-10-13

SELECT
    Pai.Nome AS Vendedor,
    Com.Valor_Comissao AS Valor_Comissao,
    Com.Percentual_Base_Calculo AS Percentual,
    Txa.Nome AS Taxa_Referente
FROM mov_Logistica_Comissao Com
LEFT OUTER JOIN cad_Pessoa Pai ON Pai.IdPessoa = Com.IdPessoa
LEFT OUTER JOIN cad_Taxa_Logistica_Exibicao Txa ON Txa.IdTaxa_Logistica_Exibicao = Com.IdTaxa_Logistica_Exibicao
WHERE Com.IdLogistica_House = 41698
AND Pai.Nome <> '[LCL FOB] SHENZHEN APLUS - CHINA'
ORDER BY Com.Valor_Comissao DESC;
