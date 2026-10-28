-- consultar_dados
-- 2026-10-28

SELECT TOP 20
    Tab.Numero_Processo AS Numero_Processo,
    Tab.Referencia_Cliente AS Referencia_Cliente,
    Tab.Data_Abertura_Processo AS Data_Abertura_Processo,
    Tab.IdCliente AS IdCliente,
    Tab.IdImportador AS IdImportador,
    Tab.IdExportador AS IdExportador,
    Tab.IdVendedor AS IdVendedor,
    Tab.IdStatus_Processo_Logistico AS IdStatus_Processo_Logistico
FROM mov_Logistica_House Tab
WHERE Tab.Numero_Processo Like '%' + N'IM5476-26' + '%';
