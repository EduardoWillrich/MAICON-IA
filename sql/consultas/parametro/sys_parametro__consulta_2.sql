-- executar_sql
-- 2026-10-19

SELECT
    sys.IdParametro
FROM sys_Parametro sys
WHERE sys.IdParametro LIKE '%BLOQ_INSERIR%'
OR sys.IdParametro LIKE '%ACOMPANHAMENTO%';
