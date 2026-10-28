-- consultar_dados
-- 2026-10-09

SELECT TOP 20
    Tab.Ordem_Compra AS Ordem_Compra,
    Tab.NCM_Descricao AS NCM_Descricao,
    Tab.Instrucoes_Agente AS Instrucoes_Agente,
    Tab.Instrucoes_Operacional AS Instrucoes_Operacional,
    Tab.Parecer_Auditoria AS Parecer_Auditoria,
    Tab.Instrucoes_Financeiro AS Instrucoes_Financeiro,
    Tab.Shipper_Exporter AS Shipper_Exporter,
    Tab.Consignee AS Consignee
FROM mov_Logistica_House Tab
WHERE Tab.Numero_Processo = N'IM4460-26';
