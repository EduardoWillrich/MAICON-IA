-- executar_sql
-- 2026-10-16

SELECT
    Pap.Nome AS Papel,
    Res.Nome AS Responsavel
FROM cad_Papel_Logistica_Responsavel Plr
LEFT OUTER JOIN cad_Papel_Projeto Pap ON Pap.IdPapel_Projeto = Plr.IdPapel_Projeto
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Plr.IdResponsavel
WHERE Res.Nome = 'Andressa Zaia'
AND Pap.Nome = 'DOCUMENTAL CE';
