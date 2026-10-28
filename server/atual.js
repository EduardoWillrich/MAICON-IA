import sql from "mssql";

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const IGNORAR = new Set([
  "xml",
  "Dados",
  "Dados_Arquivo",
  "Dados_Registro",
  "Hash",
]);

function normalizar(valor) {
  if (valor == null) return "";
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 19);
  }
  return String(valor).trim();
}

function equivalentes(a, b) {
  if (a === b) return true;
  if (!a && !b) return true;
  if (a && b && !Number.isNaN(Number(a)) && !Number.isNaN(Number(b)) && a.trim() !== "" && b.trim() !== "") {
    if (Number(a) === Number(b)) return true;
  }
  const da = a.match(/^(\d{4}-\d{2}-\d{2})/);
  const db = b.match(/^(\d{4}-\d{2}-\d{2})/);
  if (da && db) return da[1] === db[1];
  return false;
}

function paresDasChaves(chaves) {
  return (chaves ?? []).flatMap((c) => {
    const nome = String(c.nome ?? "").trim();
    if (!IDENT.test(nome)) return [];
    return String(c.valor ?? "")
      .split(/[,;]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((valor) => ({ nome, valor }));
  });
}

function ultimoEventoDoPar(eventos, par) {
  const lista = eventos ?? [];
  for (let i = lista.length - 1; i >= 0; i -= 1) {
    const campo = (lista[i].campos ?? []).find(
      (c) => c.nome === par.nome && String(c.valor) === String(par.valor),
    );
    if (campo) return lista[i];
  }
  return lista[lista.length - 1];
}

function camposComparados(ultimo, atual, existentes) {
  const campos = [];
  for (const campo of ultimo?.campos ?? []) {
    if (!existentes.has(campo.nome) || IGNORAR.has(campo.nome)) continue;
    const valorLog = normalizar(campo.valor);
    const valorAtual = normalizar(atual?.[campo.nome]);
    campos.push({
      nome: campo.nome,
      valorLog,
      valorAtual,
      igual: equivalentes(valorLog, valorAtual),
    });
  }
  return campos;
}

async function lerRegistro(pool, nomeTabela, chavesOk, selectCols, ultimo, existentes) {
  const req = pool.request();
  const where = chavesOk.map((c, i) => {
    req.input(`k${i}`, sql.NVarChar(100), String(c.valor).trim());
    return `[${c.nome.trim()}] = @k${i}`;
  }).join(" And ");
  const lista = selectCols.map((n) => `[${n}]`).join(", ");
  const r = await req.query(
    `Select Top 1 ${lista} From [${nomeTabela}] Where ${where}`,
  );
  const linha = r.recordset[0];
  const apelido = {
    IdLogistica_Master: "Master",
    IdLogistica_House: "Processo",
    IdAtividade: "Atividade",
    IdProjeto_Atividade: "Processo",
  };
  const rotulo = chavesOk
    .map((c) => `${apelido[c.nome] ?? c.nome.replace(/^Id(?=[A-Z])/, "").replaceAll("_", " ")} ${c.valor}`)
    .join(" / ");
  if (!linha) {
    return {
      rotulo,
      encontrado: false,
      excluido: Number(ultimo?.tipo) === 2,
      campos: camposComparados(ultimo, null, existentes),
      divergencias: [],
    };
  }
  const campos = camposComparados(ultimo, linha, existentes);
  return {
    rotulo,
    encontrado: true,
    excluido: false,
    campos,
    divergencias: campos.filter((c) => !c.igual),
  };
}

export async function compararComCadastro(pool, { tabela, chaves, eventos }) {
  const nomeTabela = String(tabela ?? "").trim();
  if (!IDENT.test(nomeTabela)) {
    return {
      encontrado: false,
      tabela: nomeTabela,
      campos: [],
      divergencias: [],
      registros: [],
      aviso: "Tabela inválida para conferir o cadastro.",
    };
  }

  const pares = paresDasChaves(chaves);
  if (!pares.length) {
    return {
      encontrado: false,
      tabela: nomeTabela,
      campos: [],
      divergencias: [],
      registros: [],
      aviso: "Informe a chave do registro para conferir o cadastro.",
    };
  }

  try {
    const colsReq = pool.request();
    colsReq.input("tabela", sql.NVarChar(128), nomeTabela);
    const cols = await colsReq.query(`
      Select Column_Name as Nome
      From Information_Schema.Columns
      Where Table_Name = @tabela
    `);
    const existentes = new Set(cols.recordset.map((r) => r.Nome));
    const mesmoCampo = pares.every((p) => p.nome === pares[0].nome);
    const grupos = mesmoCampo ? pares.map((p) => [p]) : [pares];
    const registros = [];

    for (const grupo of grupos) {
      const chavesOk = grupo.filter((c) => existentes.has(c.nome.trim()));
      if (!chavesOk.length) continue;
      const ultimo = ultimoEventoDoPar(eventos, chavesOk[0]);
      const nomesLog = (ultimo?.campos ?? [])
        .map((c) => c.nome)
        .filter((n) => existentes.has(n) && !IGNORAR.has(n));
      const selectCols = [
        ...new Set([...chavesOk.map((c) => c.nome.trim()), ...nomesLog]),
      ].filter((n) => IDENT.test(n));
      registros.push(
        await lerRegistro(pool, nomeTabela, chavesOk, selectCols, ultimo, existentes),
      );
    }

    if (!registros.length) {
      return {
        encontrado: false,
        tabela: nomeTabela,
        campos: [],
        divergencias: [],
        registros: [],
        aviso: "A chave informada não existe nessa tabela.",
      };
    }

    const campos = registros.length === 1 ? registros[0].campos : [];
    const divergencias = registros.flatMap((r) =>
      r.divergencias.map((d) => ({ ...d, rotulo: r.rotulo })),
    );

    return {
      encontrado: registros.some((r) => r.encontrado),
      tabela: nomeTabela,
      campos,
      divergencias,
      registros,
      excluido: registros.length === 1 && registros[0].excluido,
      aviso: "",
    };
  } catch {
    return {
      encontrado: false,
      tabela: nomeTabela,
      campos: [],
      divergencias: [],
      registros: [],
      aviso: "Não foi possível ler o cadastro atual.",
    };
  }
}
