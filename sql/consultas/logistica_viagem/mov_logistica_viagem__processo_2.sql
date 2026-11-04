-- executar_sql
-- 2026-11-03

SELECT
    Lhs.Numero_Processo AS Processo,
    Pai.Nome AS Cliente,
    Lvi.Data_Embarque AS Data_Embarque,
    Ori.Nome AS Origem,
    Des.Nome AS Destino
FROM dbo.mov_Logistica_Viagem Lvi
LEFT OUTER JOIN dbo.mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Lvi.IdLogistica_House
LEFT OUTER JOIN dbo.cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN dbo.cad_Origem_Destino Ori ON Ori.IdOrigem_Destino = Lvi.IdOrigem
LEFT OUTER JOIN dbo.cad_Origem_Destino Des ON Des.IdOrigem_Destino = Lvi.IdDestino
WHERE Lvi.Data_Embarque >= '2026-11-03' AND Lvi.Data_Embarque < '2026-11-04' AND Lhs.Numero_Processo NOT LIKE '%TEST%'
ORDER BY Lhs.Numero_Processo;
