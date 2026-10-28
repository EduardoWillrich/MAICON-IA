-- localizar_processo
-- 2026-10-07

SELECT DISTINCT TOP 5
    Lhs.IdLogistica_House AS IdLogistica_House,
    Lhs.IdLogistica_Master AS IdLogistica_Master,
    Lhs.IdProjeto_Atividade AS IdProjeto_Atividade,
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
WHERE Lhs.Numero_Processo = @n;
