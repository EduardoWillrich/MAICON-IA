-- executar_sql
-- 2026-10-09

SELECT TOP 50
    Lhs.Numero_Processo AS Processo,
    Pai.Nome AS Responsavel
FROM mov_Logistica_House Lhs
LEFT OUTER JOIN cad_Pessoa Pai ON Pai.IdPessoa = Lhs.IdVendedor
WHERE Pai.Nome LIKE '%mercante%'
ORDER BY Lhs.Numero_Processo;
