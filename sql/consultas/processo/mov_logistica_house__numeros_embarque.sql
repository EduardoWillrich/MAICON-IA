-- executar_sql
-- 2026-10-09

SELECT
    Tab.Numero_DI_RE AS Numero_DI_RE,
    Tab.Numero_RE AS Numero_RE,
    Tab.Numero_LI_DDE AS Numero_LI_DDE,
    Tab.Numero_Conhecimentos AS Numero_Conhecimentos,
    Tab.Numeros_Embarque AS Numeros_Embarque,
    Tab.Numeros_RVS_RAS AS Numeros_RVS_RAS,
    Tab.Numeros_RF_RP AS Numeros_RF_RP,
    Tab.Numero_Invoices AS Numero_Invoices,
    Tab.Conhecimentos AS Conhecimentos,
    Tab.Referencia_Interna AS Referencia_Interna,
    Tab.Referencia_Externa AS Referencia_Externa,
    Tab.Referencia_Cliente AS Referencia_Cliente,
    Tab.Ordem_Compra AS Ordem_Compra,
    Tab.NCM_Descricao AS NCM_Descricao,
    Tab.Instrucoes_Agente AS Instrucoes_Agente,
    Tab.Instrucoes_Operacional AS Instrucoes_Operacional,
    Tab.Instrucoes_Operacional_Cliente AS Instrucoes_Operacional_Cliente,
    Tab.Parecer_Auditoria AS Parecer_Auditoria,
    Tab.Instrucoes_Cliente AS Instrucoes_Cliente,
    Tab.Instrucoes_Financeiro AS Instrucoes_Financeiro,
    Tab.Observacao AS Observacao,
    Tab.Shipper_Exporter AS Shipper_Exporter,
    Tab.Consignee AS Consignee,
    Tab.Notify AS Notify,
    Tab.Remarks AS Remarks,
    Tab.Remarks_Terrestre AS Remarks_Terrestre,
    Tab.Remarks_Free_Time AS Remarks_Free_Time
FROM mov_Logistica_House Tab
WHERE Tab.Numero_Processo = 'IM4460-26';
