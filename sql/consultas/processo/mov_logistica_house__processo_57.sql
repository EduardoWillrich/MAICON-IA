-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Processo,
    Pai.Nome AS Cliente,
    SUM(CASE WHEN Eqm.Tipo = 1 THEN 1 WHEN Eqm.Tipo = 2 THEN 2 ELSE 0 END) AS Total_TEUs
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN dbo.mov_Logistica_Maritima_Container Lmc ON Lmc.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Equipamento_Maritimo Eqm ON Eqm.IdEquipamento_Maritimo = Lmc.IdEquipamento_Maritimo
WHERE Lhs.Data_Abertura_Processo >= '2026-10-26' AND Lhs.Data_Abertura_Processo < '2026-11-02' AND DATENAME(WEEKDAY, Lhs.Data_Abertura_Processo) NOT IN ('Saturday','Sunday','sábado','domingo')
AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
AND Lhs.Numero_Processo NOT LIKE '%TEST%'
GROUP BY Lhs.Numero_Processo, Pai.Nome
HAVING SUM(CASE WHEN Eqm.Tipo = 1 THEN 1 WHEN Eqm.Tipo = 2 THEN 2 ELSE 0 END) > 0
ORDER BY Total_TEUs DESC;
