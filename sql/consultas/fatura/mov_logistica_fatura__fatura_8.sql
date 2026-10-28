-- executar_sql
-- 2026-10-26

SELECT
    RF.Numero AS Fatura,
    RF.Valor_Total AS Valor,
    RF.Data AS Data
FROM mov_Logistica_Fatura Lfat
LEFT OUTER JOIN mov_Registro_Financeiro RF ON RF.IdRegistro_Financeiro = Lfat.IdRegistro_Financeiro
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Lfat.IdLogistica_House
WHERE Lhs.Numero_Processo = 'IM5476-26 TESTE'
ORDER BY RF.Data ASC;
