-- executar_sql
-- 2026-10-09

SELECT
    Cfg.Descricao AS Campo,
    CASE 
        WHEN Cfg.Tipo_Valor = 1 THEN Mcl.Valor_Alfanumerico
        WHEN Cfg.Tipo_Valor = 2 THEN Mcl.Valor_Texto
        WHEN Cfg.Tipo_Valor = 3 THEN CAST(Mcl.Valor_Boleano AS VARCHAR)
        WHEN Cfg.Tipo_Valor = 4 THEN CAST(Mcl.Valor_Tipo_Fixo AS VARCHAR)
        WHEN Cfg.Tipo_Valor = 5 THEN CAST(Mcl.Valor_Inteiro AS VARCHAR)
        WHEN Cfg.Tipo_Valor = 6 THEN CAST(Mcl.Valor_Data AS VARCHAR)
        WHEN Cfg.Tipo_Valor = 7 THEN CAST(Mcl.Valor_Real4 AS VARCHAR)
    END AS Valor
FROM mov_Logistica_Campo_Livre Lcl
LEFT OUTER JOIN mov_Campo_Livre Mcl ON Mcl.IdCampo_Livre = Lcl.IdCampo_Livre
LEFT OUTER JOIN cad_Configuracao_Campo_Livre Cfg ON Cfg.IdConfiguracao_Campo_Livre = Mcl.IdConfiguracao_Campo_Livre
WHERE Lcl.IdLogistica_House = 40826
ORDER BY Cfg.Descricao;
