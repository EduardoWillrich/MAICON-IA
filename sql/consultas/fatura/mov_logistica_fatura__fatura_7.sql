-- executar_sql
-- 2026-10-21

SELECT
    RF.Numero AS Fatura,
    RF.Valor_Total AS Valor,
    RF.Data AS Data
FROM mov_Logistica_Fatura Lfat
LEFT OUTER JOIN mov_Registro_Financeiro RF ON RF.IdRegistro_Financeiro = Lfat.IdRegistro_Financeiro
WHERE Lfat.IdLogistica_House = 41833
ORDER BY RF.Data ASC;
