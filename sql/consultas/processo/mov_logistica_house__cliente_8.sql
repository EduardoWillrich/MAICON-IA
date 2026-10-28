-- executar_sql
-- 2026-10-27

SELECT
    Lhs.Numero_Processo AS Numero_do_Processo,
    Cli.Nome AS Cliente,
    Lvi.Data_Previsao_Embarque AS Previsao_Embarque,
    Lvi.Data_Previsao_Desembarque AS Previsao_Desembarque,
    Lvi.Previsao_Descarregamento AS Previsao_Entrega
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN mov_Logistica_Viagem Lvi ON Lvi.IdLogistica_House = Lhs.IdLogistica_House
WHERE (Lvi.Data_Previsao_Embarque >= '2026-10-27' AND Lvi.Data_Previsao_Embarque <= '2026-11-03')
    OR (Lvi.Data_Previsao_Desembarque >= '2026-10-27' AND Lvi.Data_Previsao_Desembarque <= '2026-11-03')
    OR (Lvi.Previsao_Descarregamento >= '2026-10-27' AND Lvi.Previsao_Descarregamento <= '2026-11-03')
ORDER BY Lvi.Data_Previsao_Embarque ASC;
