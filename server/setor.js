import sql from "mssql";

const cache = new Map();
const MINUTOS = 5 * 60 * 1000;

function tokens(nome, email) {
  const limpo = String(nome ?? "")
    .split(" - ")[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .trim();
  let partes = limpo.split(/\s+/).filter((p) => p.length > 1);
  if (partes.length < 2) {
    const local = String(email ?? "").split("@")[0] ?? "";
    partes = local
      .split(/[._-]+/)
      .map((p) => p.replace(/[^A-Za-z]/g, ""))
      .filter((p) => p.length > 1);
  }
  if (partes.length < 2) return null;
  const limpar = (valor) => valor.replace(/[%_[\]]/g, "");
  return { primeiro: limpar(partes[0]), ultimo: limpar(partes[partes.length - 1]) };
}

export function classificarCargo(nome) {
  const texto = String(nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (texto.includes("INSIDE") || texto.includes("PRICING") || texto.includes("SUPPORT SALES")) return "inside";
  if (texto.includes("DOCUMENT")) return "documental";
  if (
    texto.includes("OPERAC") ||
    texto.includes("CUSTOMER SERVICE")
  ) {
    return "operacional";
  }
  if (texto.includes("COMMERCIAL") || texto.includes("COMERCIAL") || texto.includes("SALES EXECUTIVE") || /\bVEND/.test(texto)) {
    return "comercial";
  }
  return "geral";
}

async function pessoaPorConta(pool, email, nome) {
  const conta = String(email ?? "").trim().toLowerCase();
  const porEmail = await pool.request().input("email", sql.VarChar(180), conta).query(`
    SELECT TOP 1 P.IdPessoa, C.Nome AS Cargo
    FROM cad_Pessoa P
    JOIN cad_Funcionario F ON F.IdPessoa = P.IdPessoa
    JOIN cad_Cargo C ON C.IdCargo = F.IdCargo
    WHERE LOWER(LTRIM(RTRIM(ISNULL(P.EMail, '')))) = @email
       OR LOWER(LTRIM(RTRIM(ISNULL(P.EMail_Pessoal, '')))) = @email
  `);
  if (porEmail.recordset[0]) return porEmail.recordset[0];
  const nomeSistema = tokens(nome, conta);
  if (!nomeSistema) return null;
  const porNome = await pool
    .request()
    .input("primeiro", sql.VarChar(80), nomeSistema.primeiro)
    .input("ultimo", sql.VarChar(80), nomeSistema.ultimo)
    .query(`
      SELECT TOP 1 P.IdPessoa, C.Nome AS Cargo
      FROM cad_Pessoa P
      JOIN cad_Funcionario F ON F.IdPessoa = P.IdPessoa
      JOIN cad_Cargo C ON C.IdCargo = F.IdCargo
      WHERE P.Nome LIKE @primeiro + ' %'
        AND P.Nome LIKE '% ' + @ultimo
      ORDER BY LEN(P.Nome)
    `);
  return porNome.recordset[0] ?? null;
}

async function modalidadeDaPessoa(pool, idPessoa) {
  const r = await pool.request().input("id", sql.Int, idPessoa).query(`
    SELECT TOP 2 LEFT(Lhs.Numero_Processo, 2) AS Prefixo, COUNT(*) AS Qtd
    FROM mov_Projeto_Atividade_Responsavel Rel
    JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Rel.IdProjeto_Atividade
    WHERE Rel.IdResponsavel = @id
      AND Rel.IdPapel_Projeto IN (2, 16, 17)
      AND Lhs.Numero_Processo LIKE '%-26'
      AND LEFT(Lhs.Numero_Processo, 2) IN ('IA', 'EA', 'IM', 'EM')
    GROUP BY LEFT(Lhs.Numero_Processo, 2)
    ORDER BY COUNT(*) DESC
  `);
  const primeiro = r.recordset[0];
  if (!primeiro) return "";
  const principal = Number(primeiro.Qtd) || 0;
  const seguinte = Number(r.recordset[1]?.Qtd) || 0;
  if (principal < 8) return "";
  if (seguinte > 0 && principal / (principal + seguinte) < 0.7) return "";
  const prefixo = String(primeiro.Prefixo ?? "").toUpperCase();
  return ["IA", "EA", "IM", "EM"].includes(prefixo) ? prefixo : "";
}

async function papeisDaPessoa(pool, idPessoa) {
  const r = await pool.request().input("id", sql.Int, idPessoa).query(`
    SELECT DISTINCT Pap.Nome AS Papel,
      L.Visualizar_Comissoes_Vendedor AS ComissaoVendedor
    FROM cad_Funcionario F
    JOIN sys_Papel_Membro M ON M.IdUsuario = F.IdUsuario_Correspondente
    JOIN sys_Papel Pap ON Pap.IdPapel = M.IdPapel_Superior
    LEFT JOIN cad_Papel_Usuario_Logistica L ON L.IdPapel = Pap.IdPapel
    WHERE F.IdPessoa = @id
  `);
  return r.recordset;
}

export async function perfilDaConta(pool, email, nome) {
  const conta = String(email ?? "").trim().toLowerCase();
  const salvo = cache.get(conta);
  if (salvo && Date.now() - salvo.quando < MINUTOS) return salvo.perfil;

  const pessoa = await pessoaPorConta(pool, conta, nome);
  if (!pessoa) {
    const perfil = { encontrado: false, setor: "geral", cargo: "", semComissao: false, papeis: [], modalidade: "" };
    cache.set(conta, { quando: Date.now(), perfil });
    return perfil;
  }
  const linhas = await papeisDaPessoa(pool, Number(pessoa.IdPessoa));
  const papeis = [...new Set(linhas.map((l) => String(l.Papel ?? "").trim()).filter(Boolean))];
  const setor = classificarCargo(pessoa.Cargo);
  const bloqueiaComissao = papeis.some((p) => p.toUpperCase().includes("BLOQ_VIS_TAXA_COMISSAO"));
  const flag = linhas.reduce((max, l) => Math.max(max, Number(l.ComissaoVendedor) || 0), 0);
  const modalidade = setor === "operacional" ? await modalidadeDaPessoa(pool, Number(pessoa.IdPessoa)) : "";
  const perfil = {
    encontrado: true,
    setor,
    cargo: String(pessoa.Cargo ?? "").trim(),
    semComissao: bloqueiaComissao || (setor === "operacional" && flag === 0),
    papeis: papeis.slice(0, 12),
    modalidade,
  };
  cache.set(conta, { quando: Date.now(), perfil });
  return perfil;
}
