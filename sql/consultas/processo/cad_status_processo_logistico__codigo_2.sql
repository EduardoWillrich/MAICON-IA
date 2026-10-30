-- executar_sql
-- 2026-10-30

SELECT
    Sta.Descricao AS Codigo,
    Sta.Descricao AS Descricao
FROM dbo.cad_Status_Processo_Logistico Sta
WHERE Sta.IdStatus_Processo_Logistico <= 12
ORDER BY Sta.IdStatus_Processo_Logistico;
