import sql from "mssql";
import { nomeProprio } from "./itensCarga.js";

export async function pessoasPorLogin(pool, logins) {
  const mapa = new Map();
  const lista = [...new Set((logins ?? []).map((login) => String(login ?? "").trim()).filter(Boolean))].slice(0, 80);
  for (const login of lista) mapa.set(login, nomeProprio(login));
  if (!lista.length) return mapa;
  const pedido = pool.request();
  const marcas = lista.map((login, indice) => {
    pedido.input(`u${indice}`, sql.VarChar(120), login);
    return `@u${indice}`;
  });
  const r = await pedido.query(`
    SELECT U.Nome AS Login, P.Nome AS Pessoa
    FROM sys_Usuario U
    OUTER APPLY (
      SELECT TOP 1 Pes.Nome
      FROM cad_Funcionario Fun
      JOIN cad_Pessoa Pes ON Pes.IdPessoa = Fun.IdPessoa
      WHERE Fun.IdUsuario_Correspondente = U.IdUsuario
        AND Pes.Nome IS NOT NULL
        AND LTRIM(RTRIM(Pes.Nome)) <> ''
      ORDER BY Fun.IdPessoa
    ) P
    WHERE U.Nome IN (${marcas.join(",")})
  `);
  for (const linha of r.recordset) {
    const pessoa = String(linha.Pessoa ?? "").trim();
    const login = String(linha.Login ?? "").trim();
    if (login && pessoa) mapa.set(login, nomeProprio(pessoa));
  }
  return mapa;
}

export function nomeDe(mapa, login) {
  const chave = String(login ?? "").trim();
  if (!chave) return "Usuário não identificado";
  return mapa?.get(chave) || nomeProprio(chave);
}

export function relogioLog(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return { dia: "", hora: "" };
  const ajustado = new Date(data.getTime() - 3 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return {
    dia: `${p(ajustado.getUTCDate())}/${p(ajustado.getUTCMonth() + 1)}/${ajustado.getUTCFullYear()}`,
    hora: `${p(ajustado.getUTCHours())}:${p(ajustado.getUTCMinutes())}`,
  };
}
