-- executar_sql
-- 2026-10-14

SELECT
    Lhs.Numero_Processo AS Processo,
    Cli.Nome AS Cliente,
    Lvi.Data_Previsao_Desembarque AS Prev_Desembarque,
    Lvi.Data_Desembarque AS Real_Desembarque,
    ABS(DATEDIFF(day, Lvi.Data_Previsao_Desembarque, Lvi.Data_Desembarque)) AS Dias_Diferenca
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN mov_Logistica_Viagem Lvi ON Lvi.IdLogistica_House = Lhs.IdLogistica_House
WHERE Lhs.Numero_Processo LIKE 'IM%-26'
AND Lvi.Data_Previsao_Desembarque IS NOT NULL
AND Lvi.Data_Desembarque IS NOT NULL
AND ABS(DATEDIFF(day, Lvi.Data_Previsao_Desembarque, Lvi.Data_Desembarque)) >= 15
ORDER BY Dias_Diferenca DESC;
