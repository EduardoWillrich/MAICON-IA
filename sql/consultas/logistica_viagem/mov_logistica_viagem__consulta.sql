-- executar_sql
-- 2026-10-28

SELECT
    Lvi.IdLogistica_Maritima_Transbordo
FROM mov_Logistica_Viagem Lvi
WHERE Lvi.IdLogistica_House = 43502
AND Lvi.IdLogistica_Maritima_Transbordo IS NOT NULL;
