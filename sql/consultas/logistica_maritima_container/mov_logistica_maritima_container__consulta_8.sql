-- executar_sql
-- 2026-10-21

SELECT
    Lmc.IdLogistica_Maritima_Container,
    Lmc.Number
FROM mov_Logistica_Maritima_Container Lmc
WHERE Lmc.IdLogistica_House = 38607
GROUP BY Lmc.IdLogistica_Maritima_Container, Lmc.Number;
