-- executar_sql
-- 2026-10-26

SELECT
    Lhs.Numero_Processo AS Processo,
    Lhs.Referencia_Cliente AS Referencia
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Func ON Func.IdPessoa = Lhs.IdVendedor
WHERE Func.Nome = 'Camila Vitoria'
AND Lhs.Data_Fechamento_Processo IS NULL
AND Lhs.Data_Cancelamento IS NULL
ORDER BY Lhs.Numero_Processo;
