-- executar_sql
-- 2026-10-19

SELECT
    Lhs.Numero_Processo AS Processo,
    Nom1.Nome AS Id_Arquivo,
    Arq.Descricao AS Descricao_Arquivo,
    Nom2.Nome AS Grupo
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN mov_Projeto_Atividade_Arquivo Mpa ON Mpa.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
LEFT OUTER JOIN arq_Arquivo Arq ON Arq.IdArquivo = Mpa.IdArquivo
LEFT OUTER JOIN sys_Arquivo Nom1 ON Nom1.IdArquivo = Arq.IdArquivo
LEFT OUTER JOIN cad_Arquivo_Grupo Nom2 ON Nom2.IdArquivo_Grupo = Arq.IdArquivo_Grupo
WHERE Lhs.IdLogistica_House = 42400
AND Arq.IdArquivo_Grupo = 114;
