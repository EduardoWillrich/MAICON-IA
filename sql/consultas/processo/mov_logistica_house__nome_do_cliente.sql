-- executar_sql
-- 2026-10-09

SELECT
    Lhs.Numero_Processo AS Numero_do_Processo,
    Cli.Nome AS Nome_do_Cliente,
    RF.Valor_Total AS Valor,
    RF.Data AS Data
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN mov_Logistica_Fatura Lfat ON Lfat.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN mov_Registro_Financeiro RF ON RF.IdRegistro_Financeiro = Lfat.IdRegistro_Financeiro
WHERE RF.Data >= '2026-09-01' AND RF.Data < '2026-10-01'
ORDER BY RF.Data DESC;
