-- executar_sql
-- 2026-10-28

SELECT
    Pai.Nome AS Cliente,
    SUM(CASE WHEN Eqm.Tipo = 1 THEN 1 WHEN Eqm.Tipo = 2 THEN 2 ELSE 0 END) AS Total_TEUs,
    SUM(Lhs.Valor_Mercadoria) AS Valor_Mercadoria,
    COUNT(DISTINCT Lhs.IdLogistica_House) AS Quantidade_Processos
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN mov_Logistica_Maritima_Container Lmc ON Lmc.IdLogistica_House = Lhs.IdLogistica_House
LEFT OUTER JOIN cad_Equipamento_Maritimo Eqm ON Eqm.IdEquipamento_Maritimo = Lmc.IdEquipamento_Maritimo
WHERE Lhs.Data_Abertura_Processo >= '2026-07-28' AND Lhs.Data_Abertura_Processo < '2026-10-29'
AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
AND Lhs.Numero_Processo NOT LIKE 'TESTE%'
GROUP BY Pai.Nome
ORDER BY Total_TEUs DESC;
