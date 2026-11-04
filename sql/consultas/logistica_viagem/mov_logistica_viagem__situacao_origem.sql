-- executar_sql
-- 2026-11-03

SELECT
    CASE WHEN Lvi.IdOrigem IS NULL THEN 'Sem origem informada' ELSE 'Com origem' END AS Situacao_Origem,
    COUNT(*) AS Quantidade_Processos
FROM dbo.mov_Logistica_Viagem Lvi
LEFT OUTER JOIN dbo.mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Lvi.IdLogistica_House
WHERE Lvi.Data_Embarque >= '2026-11-03' AND Lvi.Data_Embarque < '2026-11-04' AND Lhs.Numero_Processo NOT LIKE '%TEST%'
GROUP BY CASE WHEN Lvi.IdOrigem IS NULL THEN 'Sem origem informada' ELSE 'Com origem' END
ORDER BY Situacao_Origem;
