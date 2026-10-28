-- executar_sql
-- 2026-10-09

SELECT TOP 50
    COUNT(Ati.IdAtividade) AS Total_Atividades_Concluidas
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
WHERE Res.Nome LIKE '%mercante%'
AND Ati.Situacao = 4;
