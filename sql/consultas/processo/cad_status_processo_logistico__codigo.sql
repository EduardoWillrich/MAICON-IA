-- executar_sql
-- 2026-10-30

SELECT
    Sta.Descricao AS Codigo,
    Sta.Codigo AS Sigla,
    Sta.Descricao AS Descricao
FROM dbo.cad_Status_Processo_Logistico Sts
RIGHT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Sta.IdStatus_Processo_Logistico
ORDER BY Sta.IdStatus_Processo_Logistico;
