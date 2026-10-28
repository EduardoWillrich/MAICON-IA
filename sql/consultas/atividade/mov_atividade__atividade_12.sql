-- executar_sql
-- 2026-10-26

SELECT
    Tar.Descricao AS Atividade,
    Ati.Situacao AS Situacao,
    Ati.Data_Inicio AS Data_Inicio,
    Ati.Data_Termino AS Data_Termino,
    Res.Nome AS Responsavel
FROM mov_Atividade Ati
LEFT OUTER JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
LEFT OUTER JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel
LEFT OUTER JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
WHERE Lhs.Numero_Processo = 'EM2487-25 teste'
AND Tar.Codigo = '0024.1';
