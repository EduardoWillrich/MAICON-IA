-- executar_sql
-- 2026-10-21

SELECT
    Cfg.Descricao AS Descricao,
    Cfg.Itens
FROM cad_Configuracao_Campo_Livre Cfg
WHERE Cfg.IdConfiguracao_Campo_Livre = (
    SELECT Mcl.IdConfiguracao_Campo_Livre 
    FROM mov_Campo_Livre Mcl 
    WHERE Mcl.IdCampo_Livre = 325545
);
