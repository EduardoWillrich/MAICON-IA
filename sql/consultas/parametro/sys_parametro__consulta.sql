-- executar_sql
-- 2026-10-19

SELECT
    sys.IdParametro,
    sys.Dados
FROM sys_Parametro sys
WHERE sys.IdParametro = 'BLOQ_INSERIR_GRUPO_ACOMPANHAMENTO';
