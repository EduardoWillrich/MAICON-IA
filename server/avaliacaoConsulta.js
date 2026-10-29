const PREFIXO = /^(cad|mov|sys|aux|imp|viw|tbl)_/i;

function parseJson(texto) {
  try {
    return JSON.parse(String(texto ?? ""));
  } catch {
    return null;
  }
}

function argumentos(chamada) {
  const bruto = chamada?.function?.arguments;
  if (bruto && typeof bruto === "object") return bruto;
  return parseJson(bruto) ?? {};
}

export function tabelasDoSql(sql) {
  const nomes = [];
  const re = /\b(?:from|join)\s+(?:dbo\s*\.\s*|\[dbo\]\s*\.\s*)?\[?([A-Za-z_][A-Za-z0-9_]*)\]?/gi;
  for (const achado of String(sql ?? "").matchAll(re)) {
    if (PREFIXO.test(achado[1])) nomes.push(achado[1]);
  }
  return [...new Set(nomes)];
}

export function colunasDoSql(sql) {
  const nomes = [];
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\.\[?([A-Za-z_][A-Za-z0-9_]*)\]?/g;
  for (const achado of String(sql ?? "").matchAll(re)) {
    if (/^dbo$/i.test(achado[1]) || PREFIXO.test(achado[2])) continue;
    nomes.push(achado[2]);
  }
  return [...new Set(nomes)];
}

function pares(mensagens) {
  const porId = new Map();
  const lista = [];
  for (const mensagem of mensagens ?? []) {
    if (mensagem?.role === "assistant") {
      for (const chamada of mensagem.tool_calls ?? []) porId.set(chamada.id, chamada);
    }
    if (mensagem?.role === "tool") {
      lista.push({ chamada: porId.get(mensagem.tool_call_id), content: String(mensagem.content ?? "") });
    }
  }
  return lista;
}

function desdePergunta(mensagens) {
  let inicio = 0;
  for (let i = (mensagens ?? []).length - 1; i >= 0; i--) {
    if (mensagens[i]?.role === "user") {
      inicio = i;
      break;
    }
  }
  return pares((mensagens ?? []).slice(inicio));
}

export function rodadasDesdePergunta(mensagens) {
  let inicio = 0;
  for (let i = (mensagens ?? []).length - 1; i >= 0; i--) {
    if (mensagens[i]?.role === "user") {
      inicio = i;
      break;
    }
  }
  return (mensagens ?? []).slice(inicio).filter((mensagem) => mensagem?.role === "assistant" && mensagem.tool_calls?.length).length;
}

function catalogo(lista) {
  const tabelas = new Set();
  const colunas = new Set();
  for (const item of lista) {
    const nome = item.chamada?.function?.name;
    if (nome === "buscar_tabelas") {
      for (const linha of item.content.split(/\n+/)) {
        const tabela = linha.trim().replace(/^dbo\./i, "");
        if (PREFIXO.test(tabela)) tabelas.add(tabela.toLowerCase());
      }
    }
    if (nome !== "listar_colunas") continue;
    const args = argumentos(item.chamada);
    const pedidas = Array.isArray(args.tabelas) ? args.tabelas : [args.tabela];
    for (const bruta of pedidas) {
      const tabela = String(bruta ?? "").trim().replace(/^dbo\./i, "");
      if (PREFIXO.test(tabela)) tabelas.add(tabela.toLowerCase());
    }
    const dados = parseJson(item.content);
    const listaColunas = Array.isArray(dados) ? dados : dados?.colunas;
    if (Array.isArray(listaColunas)) {
      for (const coluna of listaColunas) {
        const tabela = String(coluna?.Tabela ?? coluna?.TABLE_NAME ?? "").replace(/^dbo\./i, "");
        const campo = String(coluna?.Coluna ?? coluna?.COLUMN_NAME ?? "");
        if (PREFIXO.test(tabela)) tabelas.add(tabela.toLowerCase());
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(campo)) colunas.add(campo.toLowerCase());
      }
      continue;
    }
    for (const linha of item.content.split(/\n+/)) {
      const texto = linha.trim().replace(/:$/, "");
      if (PREFIXO.test(texto)) tabelas.add(texto.toLowerCase());
      else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(texto)) colunas.add(texto.toLowerCase());
    }
  }
  return { tabelas, colunas };
}

function sqlDaChamada(chamada) {
  return String(argumentos(chamada).sql ?? "");
}

function reprova(motivo, instrucao) {
  return { ok: false, motivo, instrucao };
}

export function conferirTabelas(mensagens) {
  const todos = pares(mensagens);
  const atuais = desdePergunta(mensagens);
  const sqls = atuais.filter((item) => item.chamada?.function?.name === "executar_sql");
  if (!sqls.length) return { ok: true, aviso: "" };
  const ultimo = sqls.at(-1);
  const erro = ultimo.content.trim();
  if (/^Erro:/i.test(erro)) {
    return reprova(
      erro.slice(0, 280),
      `A consulta SQL falhou (${erro.slice(0, 360)}). Leia listar_colunas de novo e corrija o SELECT só com tabelas e colunas do catálogo. Não invente nome. Não responda ao usuário ainda.`,
    );
  }
  const sql = sqlDaChamada(ultimo.chamada);
  const usadas = tabelasDoSql(sql);
  const lido = catalogo(todos);
  const semCatalogo = usadas.filter((tabela) => !lido.tabelas.has(tabela.toLowerCase()));
  if (semCatalogo.length) {
    return reprova(
      `Tabelas fora do catálogo: ${semCatalogo.join(", ")}`,
      `AUTOAVALIAÇÃO: ${semCatalogo.join(", ")} não apareceu em buscar_tabelas nem em listar_colunas. Confirme o nome no catálogo e chame listar_colunas antes de outro SELECT. Não invente tabela, coluna nem chave. Não responda ao usuário ainda.`,
    );
  }
  const listouColunas = todos.some((item) => item.chamada?.function?.name === "listar_colunas");
  if (usadas.length && !listouColunas) {
    return reprova(
      "SQL sem leitura de colunas",
      `AUTOAVALIAÇÃO: o SELECT usou ${usadas.join(", ")} sem listar_colunas. Leia tipo, PK e chave estrangeira dessas tabelas e só então escreva outro SELECT. Não responda ao usuário ainda.`,
    );
  }
  if (usadas.length && listouColunas && !lido.colunas.size && colunasDoSql(sql).length) {
    return reprova(
      "Catálogo sem colunas",
      "AUTOAVALIAÇÃO: listar_colunas não devolveu colunas. Chame de novo com o nome exato da tabela e só então faça outro SELECT. Não responda ao usuário ainda.",
    );
  }
  if (lido.colunas.size) {
    const faltando = colunasDoSql(sql).filter((coluna) => !lido.colunas.has(coluna.toLowerCase())).slice(0, 8);
    if (faltando.length) {
      return reprova(
        `Colunas fora do catálogo: ${faltando.join(", ")}`,
        `AUTOAVALIAÇÃO: ${faltando.join(", ")} não está nas colunas lidas. Chame listar_colunas da tabela certa e reescreva o SELECT só com colunas e chaves estrangeiras confirmadas. Não responda ao usuário ainda.`,
      );
    }
  }
  const dados = parseJson(ultimo.content);
  const vazio = (dados && Array.isArray(dados.linhas) && dados.linhas.length === 0) || /nenhum registro|nenhuma linha/i.test(ultimo.content);
  return {
    ok: true,
    aviso: vazio ? "A última consulta não devolveu registros. Diga isso com clareza. Não invente cliente, valor, data ou processo." : "",
    sql,
    tabelas: usadas,
  };
}

export function amostraDaConsulta(mensagens) {
  return desdePergunta(mensagens)
    .map((item) => item.content.trim())
    .filter((texto) => texto && !/^Erro:/i.test(texto))
    .slice(-2)
    .join("\n\n")
    .slice(0, 1800);
}

export function respostaConfereComRetorno(resposta, mensagens) {
  const texto = String(resposta ?? "");
  if (/```(?:rota|log|painel)/.test(texto)) return true;
  const amostra = amostraDaConsulta(mensagens).replace(/\s+/g, " ").trim();
  if (amostra.length < 80) return false;
  return texto.includes(amostra.slice(0, 80));
}

export function lerJulgamento(texto) {
  const bruto = String(texto ?? "");
  const trecho = bruto.match(/\{[\s\S]*\}/);
  if (!trecho) return { ok: true, motivo: "", deNovo: false };
  try {
    const dados = JSON.parse(trecho[0]);
    if (dados.ok === false) {
      const motivo = String(dados.motivo || "A resposta não confere com a consulta.").slice(0, 400);
      const deNovo = dados.deNovo === true || /tabela|coluna|cat[aá]logo|sql|join|chave/i.test(motivo);
      return { ok: false, motivo, deNovo };
    }
  } catch {
    return { ok: true, motivo: "", deNovo: false };
  }
  return { ok: true, motivo: "", deNovo: false };
}
