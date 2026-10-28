-- consultar_dados
-- 2026-10-09

SELECT TOP 20
    Tab.Observacao AS Observacao,
    Tab.Referencia_Cliente AS Referencia_Cliente,
    Tab.Referencia_Interna AS Referencia_Interna,
    Tab.Referencia_Externa AS Referencia_Externa,
    Tab.Remarks AS Remarks,
    Tab.Remarks_Terrestre AS Remarks_Terrestre,
    Tab.Remarks_Free_Time AS Remarks_Free_Time,
    Tab.Instrucoes_Cliente AS Instrucoes_Cliente
FROM mov_Logistica_House Tab
WHERE Tab.Numero_Processo = N'IM4460-26';
