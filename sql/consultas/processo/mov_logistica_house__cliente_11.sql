-- executar_sql
-- 2026-11-10

SELECT DISTINCT TOP 1 Lhs.Numero_Processo AS IdLogistica_House,
    Nom1.Numero_Processo AS IdLogistica_Master,
    Nom2.Referencia AS IdProjeto_Atividade,
    Lhs.Numero_Processo AS Numero_Processo,
    Lhs.Referencia_Cliente AS Referencia_Cliente,
    Lhs.Data_Abertura_Processo AS Data_Abertura,
    Cli.Nome AS Cliente,
    Imp.Nome AS Importador,
    Exp.Nome AS Exportador,
    Ven.Nome AS Vendedor,
    Sta.Descricao AS Situacao
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
LEFT OUTER JOIN cad_Pessoa Imp ON Imp.IdPessoa = Lhs.IdImportador
LEFT OUTER JOIN cad_Pessoa Exp ON Exp.IdPessoa = Lhs.IdExportador
LEFT OUTER JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
LEFT OUTER JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
LEFT OUTER JOIN mov_Logistica_Master Nom1 ON Nom1.IdLogistica_Master = Lhs.IdLogistica_Master
LEFT OUTER JOIN mov_Projeto_Atividade Nom2 ON Nom2.IdProjeto_Atividade = Lhs.IdProjeto_Atividade
WHERE Lhs.Numero_Processo NOT LIKE 'DEMU%' AND Lhs.Data_Cancelamento IS NULL AND (Lhs.IdStatus_Processo_Logistico IS NULL OR Lhs.IdStatus_Processo_Logistico <> 6) AND Lhs.Numero_Processo = N'IM2099-25 teste'
AND Lhs.IdLogistica_House = 24870;
