import sql from "mssql";

export async function pessoaDaConta(pool, email) {
  const conta = String(email ?? "").trim().toLowerCase();
  if (!conta.includes("@")) return null;
  const login = conta.split("@")[0];
  const achado = await pool.request().input("email", sql.VarChar(180), conta).input("login", sql.VarChar(80), login).query(`
    SELECT TOP 1 IdPessoa, Nome
    FROM (
      SELECT P.IdPessoa, P.Nome, CASE WHEN F.IdPessoa IS NULL THEN 1 ELSE 0 END AS Ordem
      FROM cad_Pessoa P
      LEFT JOIN cad_Funcionario F ON F.IdPessoa = P.IdPessoa
      WHERE LOWER(LTRIM(RTRIM(ISNULL(P.EMail, '')))) = @email
         OR LOWER(LTRIM(RTRIM(ISNULL(P.EMail_Pessoal, '')))) = @email
      UNION ALL
      SELECT P.IdPessoa, P.Nome, 2
      FROM cad_Conta_Email C
      JOIN cad_Funcionario F ON F.IdUsuario_Correspondente = C.IdUsuario
      JOIN cad_Pessoa P ON P.IdPessoa = F.IdPessoa
      WHERE LOWER(LTRIM(RTRIM(ISNULL(C.EMail, '')))) = @email
      UNION ALL
      SELECT P.IdPessoa, P.Nome, 3
      FROM sys_Usuario U
      JOIN cad_Funcionario F ON F.IdUsuario_Correspondente = U.IdUsuario
      JOIN cad_Pessoa P ON P.IdPessoa = F.IdPessoa
      WHERE LOWER(LTRIM(RTRIM(U.Nome))) = @login
    ) Achado
    ORDER BY Ordem, IdPessoa`);
  return achado.recordset[0] ?? null;
}
