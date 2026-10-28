-- executar_sql
-- 2026-10-14

SELECT
    Pap.Nome AS Papel,
    Pap.Nome AS Papel_Projeto
FROM cad_Papel_Projeto Pap
WHERE Pap.Nome LIKE '%CE%' OR Pap.Nome LIKE '%Documental%'
ORDER BY Pap.Nome;
