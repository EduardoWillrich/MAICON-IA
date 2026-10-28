-- executar_sql
-- 2026-10-09

SELECT
    Cfg.Descricao,
    Cfg.Itens
FROM cad_Configuracao_Campo_Livre Cfg
WHERE Cfg.Descricao IN ('OHBL', 'OHBL DISPONIVEL', 'OHBL VIAS', 'OMBL', 'OMBL VIAS');
