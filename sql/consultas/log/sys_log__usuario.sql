-- executar_sql
-- 2026-10-30

SELECT
    Lgt.Data AS Data_Hora,
    Usu.Nome AS Usuario,
    Lgt.Descricao AS Operacao,
    Lgt.Referencia AS Referencia,
    Lgt.Motivo AS Motivo
FROM dbo.sys_Log Lgt
LEFT OUTER JOIN dbo.sys_Usuario Usu ON Usu.IdUsuario = Lgt.IdUsuario
WHERE Lgt.Referencia LIKE '%IM5944-26%'
ORDER BY Lgt.Data DESC;
