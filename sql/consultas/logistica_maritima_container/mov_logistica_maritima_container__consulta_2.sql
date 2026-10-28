-- executar_sql
-- 2026-10-21

SELECT
    Lmc.IdLogistica_Maritima_Container,
    Lmc.Number
FROM mov_Logistica_Maritima_Container Lmc
WHERE Lmc.IdLogistica_House = 38607
AND Lmc.Number IN ('HMMU6017802', 'HMMU6228282', 'HMMU6060244', 'TGBU6492433', 'KOCU4951154', 'HMMU6041558')
ORDER BY Lmc.IdLogistica_Maritima_Container ASC;
