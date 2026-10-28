-- executar_sql
-- 2026-10-28

SELECT
    Eqm.Codigo AS Codigo,
    Eqm.Descricao AS Descricao,
    Eqm.Tipo AS Tipo
FROM cad_Equipamento_Maritimo Eqm
ORDER BY Eqm.Codigo;
