-- executar_sql
-- 2026-10-07

SELECT TOP 50
    Con.Titulo AS Titulo,
    Con.Descricao AS Descricao,
    Con.Data AS Data,
    P.Nome AS Responsavel
FROM mov_Acompanhamento Con
LEFT OUTER JOIN cad_Pessoa P ON P.IdPessoa = Con.IdResponsavel
WHERE Con.IdProjeto_Atividade = 131657
ORDER BY Con.Data DESC;
