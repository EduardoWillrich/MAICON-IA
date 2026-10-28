-- consultar_dados
-- 2026-10-28

SELECT TOP 20
    Tab.IdUsuario AS IdUsuario,
    Tab.Nome AS Nome
FROM sys_Usuario Tab
WHERE Tab.Nome Like '%' + N'julia.moraes' + '%';
