-- executar_sql
-- 2026-10-16

SELECT
    Par.Nome AS Papel,
    Res.Nome AS Responsavel
FROM mov_Projeto_Atividade_Responsavel Rap
LEFT OUTER JOIN cad_Papel_Projeto Par ON Par.IdPapel_Projeto = Rap.IdPapel_Projeto
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Rap.IdResponsavel
WHERE Rap.IdProjeto_Atividade = 135652
AND Res.Nome = 'Andressa Zaia';
