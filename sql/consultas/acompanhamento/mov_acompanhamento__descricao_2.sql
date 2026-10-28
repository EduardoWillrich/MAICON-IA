-- executar_sql
-- 2026-10-07

SELECT TOP 50
    Con.Descricao AS Descricao,
    Con.Data AS Data,
    Pers.Nome AS Responsavel
FROM mov_Acompanhamento Con
LEFT OUTER JOIN cad_Funcionario Func ON Func.IdPessoa = Con.IdResponsavel
LEFT OUTER JOIN cad_Pessoa Pers ON Pers.IdPessoa = Func.IdPessoa
WHERE Con.IdProjeto_Atividade = 131657
ORDER BY Con.Data DESC;
