-- executar_sql
-- 2026-10-20

SELECT
    Lmc.IdLogistica_Maritima_Container AS Id_Container,
    Lmc.Number AS Numero_Container,
    Lmc.Seal AS Lacre
FROM mov_Logistica_Maritima_Container Lmc
WHERE Lmc.IdLogistica_House = 38607
ORDER BY Lmc.IdLogistica_Maritima_Container DESC;
