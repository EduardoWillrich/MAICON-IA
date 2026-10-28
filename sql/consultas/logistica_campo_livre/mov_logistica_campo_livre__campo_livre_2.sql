-- executar_sql
-- 2026-10-21

SELECT
    Cfg.Descricao AS Campo_Livre
FROM mov_Logistica_Campo_Livre Lcl
LEFT OUTER JOIN mov_Campo_Livre Mcl ON Mcl.IdCampo_Livre = Lcl.IdCampo_Livre
LEFT OUTER JOIN cad_Configuracao_Campo_Livre Cfg ON Cfg.IdConfiguracao_Campo_Livre = Mcl.IdConfiguracao_Campo_Livre
WHERE Lcl.IdLogistica_House = 41833
AND Cfg.Descricao = 'OMBL';
