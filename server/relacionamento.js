import sql from "mssql";

const MEDIDAS = `
  LTRIM(RTRIM(Cli.Nome)) AS Nome,
  MAX(LTRIM(RTRIM(Class.Nome))) AS Classificacao,
  MAX(LTRIM(RTRIM(Class.Codigo))) AS Codigo,
  SUM(CASE WHEN Fat.IdFatura_Financeira IS NOT NULL AND ISNULL(Fat.Em_Aberto, 0) = 1 AND Fat.Data_Vencimento < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS AbertasAtraso,
  SUM(CASE WHEN Fat.IdFatura_Financeira IS NOT NULL AND Fat.Data_Pagamento IS NOT NULL AND CAST(Fat.Data_Pagamento AS date) > CAST(Fat.Data_Vencimento AS date) THEN 1 ELSE 0 END) AS PagasAtraso,
  SUM(CASE WHEN Fat.IdFatura_Financeira IS NOT NULL THEN 1 ELSE 0 END) AS Faturas,
  SUM(CASE WHEN Fat.IdFatura_Financeira IS NOT NULL AND ISNULL(Fat.Em_Aberto, 0) = 1 THEN ISNULL(Fat.Valor_Residual, Fat.Valor) ELSE 0 END) AS Aberto
`;

const JUNTOS = `
  FROM cad_Pessoa Cli
  LEFT JOIN cad_Cliente Cad ON Cad.IdPessoa = Cli.IdPessoa
  LEFT JOIN cad_Cliente_Classificacao Class ON Class.IdCliente_Classificacao = Cad.IdCliente_Classificacao
  LEFT JOIN mov_Registro_Financeiro Reg ON Reg.IdPessoa = Cli.IdPessoa
  LEFT JOIN mov_Fatura_Financeira Fat ON Fat.IdRegistro_Financeiro = Reg.IdRegistro_Financeiro
    AND Fat.Data_Cancelamento IS NULL
    AND ISNULL(Fat.Ativo, 1) = 1
    AND (ISNULL(Fat.Renegociada, 0) = 0 OR ISNULL(Fat.Em_Aberto, 0) = 1)
    AND (
      ISNULL(Fat.Em_Aberto, 0) = 1
      OR Fat.Data_Vencimento >= DATEADD(month, -12, CAST(GETDATE() AS date))
      OR Fat.Data_Pagamento >= DATEADD(month, -12, CAST(GETDATE() AS date))
    )
    AND NOT EXISTS (
      SELECT 1
      FROM mov_Logistica_Fatura Lf
      JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Lf.IdLogistica_House
      WHERE Lf.IdRegistro_Financeiro = Fat.IdRegistro_Financeiro
        AND Lhs.IdCliente IS NOT NULL
        AND Lhs.IdCliente <> Reg.IdPessoa
    )
`;

export function nivelDaClassificacao(nome) {
  const texto = String(nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\bouro\b|\bgold\b/.test(texto)) return "ouro";
  if (/\bprata\b|\bsilver\b/.test(texto)) return "prata";
  if (/\bbronze\b/.test(texto)) return "bronze";
  return "";
}

export function lerPagamento(abertas, pagasFora, faturas) {
  const abertasN = Number(abertas) || 0;
  const foraN = Number(pagasFora) || 0;
  const total = Number(faturas) || 0;
  if (abertasN > 0) {
    return {
      pagamento: "atraso",
      pagamentoTexto: abertasN === 1 ? "1 fatura em atraso" : `${abertasN} faturas em atraso`,
    };
  }
  if (foraN > 0) {
    return {
      pagamento: "atraso",
      pagamentoTexto: foraN === 1 ? "Pagou 1 fatura fora do prazo" : `Pagou ${foraN} faturas fora do prazo`,
    };
  }
  if (total > 0) return { pagamento: "em-dia", pagamentoTexto: "Paga em dia" };
  return { pagamento: "sem", pagamentoTexto: "Sem faturas recentes" };
}

export function montarEncarte(linha) {
  const nome = String(linha?.Nome ?? linha?.nome ?? "").trim();
  const titulo = String(linha?.Classificacao ?? "").trim();
  const sigla = String(linha?.Codigo ?? "").trim();
  const nivel = nivelDaClassificacao(titulo) || nivelDaClassificacao(sigla);
  const classificacao = nivelDaClassificacao(titulo) ? titulo : nivel && sigla ? sigla : titulo || sigla;
  const pagamento = lerPagamento(linha?.AbertasAtraso, linha?.PagasAtraso, linha?.Faturas);
  return {
    nome,
    nivel,
    classificacao,
    ...pagamento,
    aberto: Number(linha?.Aberto) || 0,
  };
}

export function textoEncarte(encarte) {
  const dados = {
    nome: encarte?.nome || "",
    nivel: encarte?.nivel || "",
    classificacao: encarte?.classificacao || "Sem classificação",
    pagamento: encarte?.pagamento || "sem",
    detalhe: encarte?.pagamentoTexto || encarte?.detalhe || "Sem faturas recentes",
  };
  return "```encarte\n" + JSON.stringify(dados) + "\n```";
}

export function textoEncartes(titulo, encartes) {
  const lista = (encartes ?? []).filter((item) => item?.nome);
  if (!lista.length) return `${titulo}\nNenhum cliente nesse recorte.`;
  return [titulo, ...lista.map((item) => textoEncarte(item))].join("\n\n");
}

export async function relacionamentoPorNomes(pool, nomes) {
  const lista = [...new Set((nomes ?? []).map((nome) => String(nome ?? "").trim()).filter(Boolean))].slice(0, 24);
  if (!lista.length) return [];
  const pedido = pool.request();
  const marcas = lista.map((nome, indice) => {
    pedido.input(`n${indice}`, sql.NVarChar(200), nome);
    return `@n${indice}`;
  });
  const r = await pedido.query(`
    SELECT ${MEDIDAS}
    ${JUNTOS}
    WHERE LTRIM(RTRIM(Cli.Nome)) IN (${marcas.join(", ")})
    GROUP BY LTRIM(RTRIM(Cli.Nome))`);
  return r.recordset.map(montarEncarte).filter((item) => item.nome);
}

const FILTRO_NIVEL = {
  ouro: "(Class.Nome LIKE '%ouro%' OR Class.Nome LIKE '%gold%' OR Class.Codigo LIKE '%ouro%' OR Class.Codigo LIKE '%gold%') AND Class.Nome NOT LIKE '%louro%'",
  prata: "(Class.Nome LIKE '%prata%' OR Class.Nome LIKE '%silver%' OR Class.Codigo LIKE '%prata%' OR Class.Codigo LIKE '%silver%')",
  bronze: "(Class.Nome LIKE '%bronze%' OR Class.Codigo LIKE '%bronze%')",
};

export function niveisPedidos(valor) {
  const texto = Array.isArray(valor) ? valor.join(" ") : String(valor ?? "");
  const pedidos = ["ouro", "prata", "bronze"].filter((nivel) => new RegExp(`\\b${nivel}\\b`, "i").test(texto));
  return pedidos.length ? pedidos : ["ouro", "prata", "bronze"];
}

export async function relacionamentoPorClassificacao(pool, niveis, limite = 8) {
  const pedidos = niveisPedidos(niveis);
  const n = Math.min(12, Math.max(1, Math.round(Number(limite) || 8)));
  const grupos = await Promise.all(
    pedidos.map(async (nivel) => {
      const r = await pool.request().query(`
        SELECT TOP ${n + 1}
          Nome, Classificacao, Codigo, AbertasAtraso, PagasAtraso, Faturas, Aberto
        FROM (
          SELECT ${MEDIDAS}
          ${JUNTOS}
          WHERE Cad.IdPessoa IS NOT NULL
            AND LTRIM(RTRIM(Cli.Nome)) <> ''
            AND ${FILTRO_NIVEL[nivel]}
          GROUP BY LTRIM(RTRIM(Cli.Nome))
        ) Rel
        ORDER BY AbertasAtraso DESC, PagasAtraso DESC, Aberto DESC, Nome`);
      const lista = r.recordset.map(montarEncarte).filter((item) => item.nome && item.nivel === nivel);
      return { nivel, itens: lista.slice(0, n), temMais: lista.length > n };
    }),
  );
  return grupos;
}

const TITULO_NIVEL = { ouro: "Ouro", prata: "Prata", bronze: "Bronze" };

export function textoRelacionamento(grupos) {
  const partes = ["Relacionamento dos clientes"];
  for (const grupo of grupos ?? []) {
    const titulo = TITULO_NIVEL[grupo.nivel] || grupo.nivel;
    partes.push(`**${titulo}**`);
    if (!grupo.itens?.length) {
      partes.push("Nenhum cliente nessa classificação.");
      continue;
    }
    partes.push(...grupo.itens.map((item) => textoEncarte(item)));
    if (grupo.temMais) partes.push(`E mais clientes ${grupo.nivel}.`);
  }
  return partes.join("\n\n");
}

export async function relacionamentoFinanceiro(pool, limite = 8) {
  const n = Math.min(12, Math.max(1, Math.round(Number(limite) || 8)));
  const r = await pool.request().query(`
    SELECT TOP ${n}
      Nome, Classificacao, Codigo, AbertasAtraso, PagasAtraso, Faturas, Aberto
    FROM (
      SELECT ${MEDIDAS}
      ${JUNTOS}
      WHERE Cad.IdPessoa IS NOT NULL
        AND Fat.IdFatura_Financeira IS NOT NULL
        AND LTRIM(RTRIM(Cli.Nome)) <> ''
      GROUP BY LTRIM(RTRIM(Cli.Nome))
    ) Rel
    ORDER BY AbertasAtraso DESC, PagasAtraso DESC, Aberto DESC, Nome`);
  return r.recordset.map(montarEncarte).filter((item) => item.nome);
}
