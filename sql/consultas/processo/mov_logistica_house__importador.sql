-- executar_sql
-- 2026-10-09

SELECT
    Lhs.Numero_Processo AS Numero_Processo,
    Imp.Nome AS Importador,
    Exp.Nome AS Exportador,
    Lhs.Data_Abertura_Processo AS Data_Abertura
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Imp ON Imp.IdPessoa = Lhs.IdImportador
LEFT OUTER JOIN cad_Pessoa Exp ON Exp.IdPessoa = Lhs.IdExportador
WHERE Lhs.Data_Abertura_Processo >= '2026-09-01' AND Lhs.Data_Abertura_Processo < '2026-10-01'
ORDER BY Lhs.Data_Abertura_Processo DESC;
