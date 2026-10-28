-- consultar_dados
-- 2026-10-28

SELECT TOP 20
    Tab.Nome AS Nome,
    Tab.IdUsuario AS IdUsuario
FROM sys_Usuario Tab
WHERE Tab.Nome Like '%' + N'Julia' + '%';
