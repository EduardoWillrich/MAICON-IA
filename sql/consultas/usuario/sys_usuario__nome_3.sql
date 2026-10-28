-- executar_sql
-- 2026-10-28

SELECT
    U.Nome AS Id_Usuario,
    U.Nome AS Nome
FROM sys_Usuario U
WHERE U.Nome = 'julia.moraes';
