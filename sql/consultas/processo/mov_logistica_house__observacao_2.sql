-- executar_sql
-- 2026-10-09

SELECT
    Tab.Observacao AS Observacao,
    Tab.Referencia_Cliente AS Referencia_Cliente,
    Tab.Referencia_Interna AS Referencia_Interna,
    Tab.Referencia_Externa AS Referencia_Externa,
    Tab.Remarks AS Remarks,
    Tab.Remarks_Terrestre AS Remarks_Terrestre,
    Tab.Remarks_Free_Time AS Remarks_Free_Time,
    Tab.Instrucoes_Cliente AS Instrucoes_Cliente,
    Tab.Ordem_Compra AS Ordem_Compra,
    Tab.NCM_Descricao AS NCM_Descricao,
    Tab.Instrucoes_Agente AS Instrucoes_Agente,
    Tab.Instrucoes_Operacional AS Instrucoes_Operacional,
    Tab.Parecer_Auditoria AS Parecer_Auditoria,
    Tab.Instrucoes_Financeiro AS Instrucoes_Financeiro,
    Tab.Shipper_Exporter AS Shipper_Exporter,
    Tab.Consignee AS Consignee
FROM mov_Logistica_House Tab
WHERE Tab.Numero_Processo = 'IM4460-26';
