-- executar_sql
-- 2026-10-30

SELECT
    Lhs.Numero_Processo AS Processo,
    Pes.Nome AS Cliente,
    Sta.Descricao AS Situacao,
    Lhs.Data_Abertura_Processo AS Abertura,
    MAX(Aco.Data) AS Ultimo_Acompanhamento
FROM dbo.mov_Logistica_House Lhs
LEFT OUTER JOIN dbo.cad_Pessoa Pes ON Pes.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN dbo.cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
LEFT OUTER JOIN dbo.mov_Acompanhamento Aco ON Aco.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
WHERE Lhs.Data_Abertura_Processo >= '2026-01-01' AND Lhs.Data_Abertura_Processo < '2026-10-30'
AND Lhs.Ativo = 1
AND Lhs.Data_Cancelamento IS NULL
AND Lhs.Data_Fechamento_Processo IS NULL
AND Lhs.Numero_Processo NOT LIKE '%TESTE%'
AND Lhs.Numero_Processo NOT LIKE '%DEMU%'
GROUP BY Lhs.Numero_Processo, Pes.Nome, Sta.Descricao, Lhs.Data_Abertura_Processo, Lhs.IdProjeto_Atividade, Lhs.IdCliente
HAVING MAX(Aco.Data) IS NULL OR MAX(Aco.Data) < '2026-10-29'
ORDER BY Lhs.Data_Abertura_Processo DESC;
