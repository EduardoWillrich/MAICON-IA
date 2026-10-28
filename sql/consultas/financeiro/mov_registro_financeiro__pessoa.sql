-- executar_sql
-- 2026-10-07

SELECT TOP 50
    RF.Numero AS Numero_Fatura,
    Pai.Nome AS Pessoa,
    RF.Valor_Total AS Valor,
    RF.Historico AS Historico
FROM mov_Registro_Financeiro RF
LEFT OUTER JOIN cad_Pessoa Pai ON Pai.IdPessoa = RF.IdPessoa
WHERE RF.IdRegistro_Financeiro IN (272354, 272355, 272356, 272357)
ORDER BY RF.IdRegistro_Financeiro;
