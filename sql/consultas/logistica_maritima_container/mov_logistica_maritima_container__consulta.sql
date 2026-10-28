-- executar_sql
-- 2026-10-20

SELECT TOP 1
    Lmc.IdLogistica_Maritima_Container
FROM mov_Logistica_Maritima_Container Lmc
WHERE Lmc.IdLogistica_House = 38607
ORDER BY Lmc.IdLogistica_Maritima_Container DESC;
