-- consultar_dados
-- 2026-10-28

SELECT TOP 20
    Tab.Nome AS Nome,
    Tab.IdPessoa AS IdPessoa
FROM cad_Pessoa Tab
WHERE Tab.Nome Like '%' + N'Julia' + '%';
