import sql from "mssql";
import { pessoasPorLogin } from "./pessoas.js";

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EH_ID = /^Id[A-Z]/;
const SUFIXOS =
  /_(Criacao|Alteracao|Original|Superior|Vinculo|Temp|Precedente|Retorno|Legal|Responsavel|Comissao|Limite_Credito|Origem|Destino)$/i;
const ROTULOS = [
  "Nome",
  "Descricao",
  "Sigla",
  "Nome_Fantasia",
  "Numero_Processo",
  "Numero",
  "Numero_Documento",
  "Numero_Conhecimento",
  "Numero_Oferta",
  "Numero_Proposta",
  "Referencia",
  "Titulo",
  "Assunto",
  "Codigo",
];

const ALIAS_CAMPO = {
  IdResponsavel: { tabela: "cad_Pessoa", id: "IdPessoa", nome: "Nome" },
  IdResponsavel_Original: { tabela: "cad_Pessoa", id: "IdPessoa", nome: "Nome" },
  IdResponsavel_Legal: { tabela: "cad_Pessoa", id: "IdPessoa", nome: "Nome" },
  IdFuncionario_Responsavel: { tabela: "cad_Pessoa", id: "IdPessoa", nome: "Nome" },
  IdVendedor_Responsavel: { tabela: "cad_Pessoa", id: "IdPessoa", nome: "Nome" },
  IdIndicacao: { tabela: "cad_Pessoa", id: "IdPessoa", nome: "Nome" },
  IdPessoa_Vinculo: { tabela: "cad_Pessoa", id: "IdPessoa", nome: "Nome" },
  IdUsuario_Criacao: { tabela: "sys_Usuario", id: "IdUsuario", nome: "Nome" },
  IdUsuario_Alteracao: { tabela: "sys_Usuario", id: "IdUsuario", nome: "Nome" },
  IdCampo_Livre: {
    tabela: "mov_Campo_Livre",
    id: "IdCampo_Livre",
    nome: "Descricao",
    via: {
      coluna: "IdConfiguracao_Campo_Livre",
      tabela: "cad_Configuracao_Campo_Livre",
      id: "IdConfiguracao_Campo_Livre",
    },
  },
  IdEtapa_Atividade: { tabela: "cad_Etapa_Tarefa", id: "IdEtapa_Tarefa", nome: "Descricao" },
  IdMoeda_Comissao: { tabela: "cad_Moeda", id: "IdMoeda", nome: "Sigla" },
  IdMoeda_Origem: { tabela: "cad_Moeda", id: "IdMoeda", nome: "Sigla" },
  IdMoeda_Destino: { tabela: "cad_Moeda", id: "IdMoeda", nome: "Sigla" },
  IdMoeda_Limite_Credito: { tabela: "cad_Moeda", id: "IdMoeda", nome: "Sigla" },
  IdRegistro_Recebimento: {
    tabela: "mov_Registro_Financeiro",
    id: "IdRegistro_Financeiro",
    nome: "Numero",
  },
  IdRegistro_Pagamento: {
    tabela: "mov_Registro_Financeiro",
    id: "IdRegistro_Financeiro",
    nome: "Numero",
  },
  IdLogistica_Taxa: { tabela: "mov_Logistica_Taxa", id: "IdLogistica_Taxa", viaColuna: "IdTaxa_Logistica_Exibicao" },
  IdTaxa_Master: { tabela: "mov_Logistica_Taxa", id: "IdLogistica_Taxa", viaColuna: "IdTaxa_Logistica_Exibicao" },
  IdTaxa_Referente: { tabela: "mov_Logistica_Taxa", id: "IdLogistica_Taxa", viaColuna: "IdTaxa_Logistica_Exibicao" },
  IdLogistica_Master_Taxa: {
    tabela: "mov_Logistica_Master_Taxa",
    id: "IdLogistica_Master_Taxa",
    viaColuna: "IdTaxa_Logistica_Exibicao",
  },
  IdOferta_Frete_Taxa: {
    tabela: "mov_Oferta_Frete_Taxa",
    id: "IdOferta_Frete_Taxa",
    viaColuna: "IdTaxa_Logistica_Exibicao",
  },
  ...Object.fromEntries(
    [
      "IdAtividade",
      "IdAtividade_Superior",
      "IdAtividade_Precedente",
      "IdAtividade_Retorno",
      "IdAtividade_Escolha",
      "IdAtividade_Concluida",
    ].map((campo) => [
      campo,
      {
        tabela: "mov_Atividade",
        id: "IdAtividade",
        nome: "Descricao",
        via: { coluna: "IdTarefa", tabela: "cad_Tarefa", id: "IdTarefa" },
      },
    ]),
  ),
};

function nomeCanonico(nome) {
  const bruto = String(nome ?? "").trim();
  if (!bruto || bruto.includes("_")) return bruto;
  return bruto.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/^Id_/, "Id");
}

let esquemaCache = null;

function idValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function preferenciaTabela(nome) {
  if (nome.startsWith("cad_")) return 0;
  if (nome.startsWith("sys_")) return 1;
  if (nome.startsWith("vis_")) return 2;
  if (nome.startsWith("mov_")) return 3;
  return 4;
}

function escolherTabela(tabelas, rotuloPorTabela) {
  return [...tabelas]
    .filter((t) => rotuloPorTabela.get(t))
    .sort((a, b) => preferenciaTabela(a) - preferenciaTabela(b) || a.localeCompare(b))[0];
}

function rotuloDaTabela(tabela, rotuloPorTabela) {
  const cols = rotuloPorTabela.get(tabela) ?? [];
  return ROTULOS.find((c) => cols.includes(c));
}

async function carregarEsquema(pool) {
  if (esquemaCache) return esquemaCache;
  const [fks, pks, cols] = await Promise.all([
    pool.request().query(`
      Select
        OBJECT_NAME(fc.parent_object_id) as Origem,
        COL_NAME(fc.parent_object_id, fc.parent_column_id) as Coluna,
        OBJECT_NAME(fk.referenced_object_id) as Tabela,
        COL_NAME(fc.referenced_object_id, fc.referenced_column_id) as ColunaId
      From sys.foreign_keys fk
      Join sys.foreign_key_columns fc On fc.constraint_object_id = fk.object_id
    `),
    pool.request().query(`
      Select OBJECT_NAME(ic.object_id) as Tabela, COL_NAME(ic.object_id, ic.column_id) as Coluna
      From sys.indexes i
      Join sys.index_columns ic
        On ic.object_id = i.object_id And ic.index_id = i.index_id
      Where i.is_primary_key = 1
    `),
    pool.request().query(`
      Select Table_Name as Tabela, Column_Name as Coluna
      From Information_Schema.Columns
      Where Column_Name In (${ROTULOS.map((r) => `'${r}'`).join(",")})
    `),
  ]);

  const rotuloPorTabela = new Map();
  for (const linha of cols.recordset) {
    if (!rotuloPorTabela.has(linha.Tabela)) rotuloPorTabela.set(linha.Tabela, []);
    rotuloPorTabela.get(linha.Tabela).push(linha.Coluna);
  }

  const fkPorColuna = new Map();
  const fkPorTabelaColuna = new Map();
  for (const linha of fks.recordset) {
    if (!IDENT.test(linha.Tabela) || !IDENT.test(linha.ColunaId)) continue;
    const alvo = { tabela: linha.Tabela, id: linha.ColunaId };
    if (!fkPorColuna.has(linha.Coluna)) fkPorColuna.set(linha.Coluna, []);
    fkPorColuna.get(linha.Coluna).push(alvo);
    const chave = `${linha.Origem}.${linha.Coluna}`;
    if (!fkPorTabelaColuna.has(chave)) fkPorTabelaColuna.set(chave, []);
    fkPorTabelaColuna.get(chave).push(alvo);
  }

  const tabelasPorPk = new Map();
  const pkCount = new Map();
  for (const linha of pks.recordset) {
    pkCount.set(linha.Tabela, (pkCount.get(linha.Tabela) ?? 0) + 1);
  }
  for (const linha of pks.recordset) {
    if (pkCount.get(linha.Tabela) !== 1) continue;
    if (!IDENT.test(linha.Tabela) || !IDENT.test(linha.Coluna)) continue;
    if (!tabelasPorPk.has(linha.Coluna)) tabelasPorPk.set(linha.Coluna, []);
    tabelasPorPk.get(linha.Coluna).push(linha.Tabela);
  }

  esquemaCache = { fkPorColuna, fkPorTabelaColuna, tabelasPorPk, rotuloPorTabela };
  return esquemaCache;
}

function resolverTabela(tabela, id, esquema) {
  const nome = rotuloDaTabela(tabela, esquema.rotuloPorTabela);
  if (nome) return { tabela, id, nome };
  const herdadas = esquema.fkPorTabelaColuna.get(`${tabela}.${id}`) ?? [];
  for (const alvo of herdadas) {
    const nomeAlvo = rotuloDaTabela(alvo.tabela, esquema.rotuloPorTabela);
    if (nomeAlvo) {
      return { tabela, id, nome: nomeAlvo, via: { coluna: id, tabela: alvo.tabela, id: alvo.id } };
    }
  }
  return null;
}

function resolverAlias(alias, esquema) {
  if (!alias.viaColuna) return alias;
  const alvo = (esquema.fkPorTabelaColuna.get(`${alias.tabela}.${alias.viaColuna}`) ?? [])[0];
  if (!alvo) return null;
  const nome = rotuloDaTabela(alvo.tabela, esquema.rotuloPorTabela);
  if (!nome) return null;
  return {
    tabela: alias.tabela,
    id: alias.id,
    nome,
    via: { coluna: alias.viaColuna, tabela: alvo.tabela, id: alvo.id },
  };
}

function destinoDoCampo(campo, esquema) {
  const chave = nomeCanonico(campo);
  const alias = ALIAS_CAMPO[chave] ?? ALIAS_CAMPO[campo];
  if (alias) {
    const destino = resolverAlias(alias, esquema);
    if (destino) return destino;
  }

  const fks = esquema.fkPorColuna.get(chave) ?? esquema.fkPorColuna.get(campo) ?? [];
  const alvos = [...new Map(fks.map((f) => [`${f.tabela}.${f.id}`, f])).values()].sort(
    (a, b) => preferenciaTabela(a.tabela) - preferenciaTabela(b.tabela),
  );
  for (const fk of alvos) {
    const destino = resolverTabela(fk.tabela, fk.id, esquema);
    if (destino) return destino;
  }

  const candidatosPk = [chave, campo];
  const entidade = chave.replace(/^Id/, "").replace(SUFIXOS, "");
  if (entidade && `Id${entidade}` !== campo) candidatosPk.push(`Id${entidade}`);

  for (const pk of candidatosPk) {
    const tabelas = [...(esquema.tabelasPorPk.get(pk) ?? [])].sort(
      (a, b) => preferenciaTabela(a) - preferenciaTabela(b),
    );
    for (const tabela of tabelas) {
      const destino = resolverTabela(tabela, pk, esquema);
      if (destino) return destino;
    }
  }
  return null;
}

function coletarDeCampo(campo, destino) {
  if (!campo?.nome) return;
  const nome = nomeCanonico(campo.nome);
  if (!EH_ID.test(nome) && !EH_ID.test(campo.nome)) return;
  for (const v of [campo.valor, campo.valorAnterior, campo.valorLog, campo.valorAtual]) {
    const n = idValido(v);
    if (!n) continue;
    if (!destino.has(nome)) destino.set(nome, new Set());
    destino.get(nome).add(n);
  }
}

function coletarPorCampo(eventos, cadastro) {
  const destino = new Map();
  for (const evento of eventos ?? []) {
    for (const campo of evento.campos ?? []) coletarDeCampo(campo, destino);
    const n = idValido(evento.usuario);
    if (n) {
      if (!destino.has("IdUsuario")) destino.set("IdUsuario", new Set());
      destino.get("IdUsuario").add(n);
    }
  }
  const blocos = [
    ...(cadastro?.campos ?? []),
    ...(cadastro?.divergencias ?? []),
    ...(cadastro?.registros ?? []).flatMap((r) => [...(r.campos ?? []), ...(r.divergencias ?? [])]),
  ];
  for (const campo of blocos) coletarDeCampo(campo, destino);
  return destino;
}

async function mapaConsulta(pool, ids, destino) {
  const mapa = {};
  const { tabela, id, nome, via } = destino;
  const nomes = [tabela, id, nome, via?.coluna, via?.tabela, via?.id].filter(Boolean);
  if (!ids.length || !nomes.every((n) => IDENT.test(n))) return mapa;
  const req = pool.request();
  const placeholders = ids.map((valor, i) => {
    req.input(`id${i}`, sql.Int, valor);
    return `@id${i}`;
  });
  const origemNome = via ? `J.[${nome}]` : `T.[${nome}]`;
  const join = via ? `Join [${via.tabela}] J On J.[${via.id}] = T.[${via.coluna}]` : "";
  const r = await req.query(
    `Select T.[${id}] as Id, ${origemNome} as Nome From [${tabela}] T ${join} Where T.[${id}] In (${placeholders.join(",")})`,
  );
  for (const linha of r.recordset) {
    const texto = String(linha.Nome ?? "").trim();
    if (texto) mapa[String(linha.Id)] = texto;
  }
  return mapa;
}

function aplicar(campo, mapa) {
  if (!mapa) return;
  if (!campo.valorExibicao && mapa[campo.valor]) campo.valorExibicao = mapa[campo.valor];
  if (campo.valorAnterior !== undefined && !campo.valorAnteriorExibicao && mapa[campo.valorAnterior]) {
    campo.valorAnteriorExibicao = mapa[campo.valorAnterior];
  }
  if (!campo.valorLogExibicao && mapa[campo.valorLog]) campo.valorLogExibicao = mapa[campo.valorLog];
  if (!campo.valorAtualExibicao && mapa[campo.valorAtual]) campo.valorAtualExibicao = mapa[campo.valorAtual];
}

async function enriquecerProcessos(pool, eventos) {
  const idsHouse = [];
  const idsProjeto = [];
  const idsAtividade = [];
  const idsMaster = [];
  for (const evento of eventos ?? []) {
    for (const campo of evento.campos ?? []) {
      const n = idValido(campo.valor) || idValido(campo.valorAnterior);
      if (!n) continue;
      if (campo.nome === "IdLogistica_House") idsHouse.push(n);
      if (campo.nome === "IdProjeto_Atividade") idsProjeto.push(n);
      if (campo.nome === "IdAtividade") idsAtividade.push(n);
      if (campo.nome === "IdLogistica_Master") idsMaster.push(n);
    }
  }
  const porHouse = {};
  const porProjeto = {};
  const porAtividade = {};
  const porMaster = {};

  if (idsHouse.length || idsProjeto.length) {
    try {
      const req = pool.request();
      const partes = [];
      if (idsHouse.length) {
        const ph = [...new Set(idsHouse)].map((id, i) => {
          req.input(`h${i}`, sql.Int, id);
          return `@h${i}`;
        });
        partes.push(`IdLogistica_House In (${ph.join(",")})`);
      }
      if (idsProjeto.length) {
        const ph = [...new Set(idsProjeto)].map((id, i) => {
          req.input(`p${i}`, sql.Int, id);
          return `@p${i}`;
        });
        partes.push(`IdProjeto_Atividade In (${ph.join(",")})`);
      }
      const r = await req.query(
        `Select IdLogistica_House, IdProjeto_Atividade, Numero_Processo
         From mov_Logistica_House
         Where ${partes.join(" Or ")}`,
      );
      for (const linha of r.recordset) {
        const n = String(linha.Numero_Processo ?? "").trim();
        if (!n) continue;
        if (linha.IdLogistica_House) porHouse[String(linha.IdLogistica_House)] = n;
        if (linha.IdProjeto_Atividade) porProjeto[String(linha.IdProjeto_Atividade)] = n;
      }
    } catch {
      /* processo segue com o id */
    }
  }

  if (idsMaster.length) {
    try {
      const req = pool.request();
      const ph = [...new Set(idsMaster)].map((id, i) => {
        req.input(`m${i}`, sql.Int, id);
        return `@m${i}`;
      });
      const r = await req.query(
        `Select IdLogistica_Master, Numero_Processo, Numero_Conhecimento
         From mov_Logistica_Master
         Where IdLogistica_Master In (${ph.join(",")})`,
      );
      for (const linha of r.recordset) {
        const n = String(linha.Numero_Processo ?? linha.Numero_Conhecimento ?? "").trim();
        if (n) porMaster[String(linha.IdLogistica_Master)] = n;
      }
    } catch {
      /* master segue com o id */
    }
  }

  if (idsAtividade.length) {
    try {
      const req = pool.request();
      const ph = [...new Set(idsAtividade)].map((id, i) => {
        req.input(`a${i}`, sql.Int, id);
        return `@a${i}`;
      });
      const r = await req.query(
        `Select A.IdAtividade, H.Numero_Processo, T.Descricao
         From mov_Atividade A
         Left Join mov_Logistica_House H On H.IdProjeto_Atividade = A.IdProjeto_Atividade
         Left Join cad_Tarefa T On T.IdTarefa = A.IdTarefa
         Where A.IdAtividade In (${ph.join(",")})`,
      );
      for (const linha of r.recordset) {
        const n = String(linha.Numero_Processo ?? "").trim();
        const tarefa = String(linha.Descricao ?? "").trim();
        porAtividade[String(linha.IdAtividade)] = { numero: n, tarefa };
      }
    } catch {
      /* atividade segue com o id */
    }
  }

  for (const evento of eventos ?? []) {
    let numero = "";
    for (const campo of evento.campos ?? []) {
      if (campo.nome === "Numero_Processo" && campo.valor) numero = String(campo.valor).trim();
      if (campo.nome === "IdLogistica_Master") {
        aplicar(campo, porMaster);
        numero = campo.valorExibicao || porMaster[campo.valor] || numero;
      }
      if (campo.nome === "IdLogistica_House") {
        aplicar(campo, porHouse);
        numero = campo.valorExibicao || porHouse[campo.valor] || numero;
      }
      if (campo.nome === "IdProjeto_Atividade") {
        aplicar(campo, porProjeto);
        numero = campo.valorExibicao || porProjeto[campo.valor] || numero;
      }
      if (campo.nome === "IdAtividade" && porAtividade[campo.valor]) {
        const info = porAtividade[campo.valor];
        if (info.tarefa) campo.valorExibicao = info.tarefa;
        if (campo.valorAnterior && porAtividade[campo.valorAnterior]?.tarefa) {
          campo.valorAnteriorExibicao = porAtividade[campo.valorAnterior].tarefa;
        }
        numero = info.numero || numero;
      }
    }
    evento.numeroProcesso = numero || "";
  }
}

async function montarMapas(pool, porCampo) {
  const esquema = await carregarEsquema(pool);
  const grupos = new Map();
  const mapas = new Map();

  for (const [campo, ids] of porCampo) {
    const dest = destinoDoCampo(campo, esquema);
    if (!dest) continue;
    const chave = `${dest.tabela}|${dest.id}|${dest.nome}|${dest.via?.tabela ?? ""}`;
    if (!grupos.has(chave)) grupos.set(chave, { dest, campos: [], ids: new Set() });
    const grupo = grupos.get(chave);
    grupo.campos.push(campo);
    for (const id of ids) grupo.ids.add(id);
  }

  await Promise.all(
    [...grupos.values()].map(async (grupo) => {
      try {
        const mapa = await mapaConsulta(pool, [...grupo.ids], grupo.dest);
        for (const campo of grupo.campos) mapas.set(campo, mapa);
      } catch {
        /* campo segue com o número */
      }
    }),
  );
  return mapas;
}

function aplicarEventos(eventos, mapas) {
  for (const evento of eventos ?? []) {
    for (const campo of evento.campos ?? []) {
      aplicar(campo, mapas.get(campo.nome));
    }
    const mapaUsuario = mapas.get("IdUsuario");
    if (mapaUsuario && mapaUsuario[evento.usuario]) {
      evento.usuario = mapaUsuario[evento.usuario];
    }
  }
}

function aplicarCadastro(cadastro, mapas) {
  if (!cadastro) return;
  const blocos = [
    ...(cadastro.campos ?? []),
    ...(cadastro.divergencias ?? []),
    ...(cadastro.registros ?? []).flatMap((r) => [...(r.campos ?? []), ...(r.divergencias ?? [])]),
  ];
  for (const campo of blocos) aplicar(campo, mapas.get(campo.nome));
}

function indiceNoNivelZero(texto, palavra) {
  let profundidade = 0;
  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i];
    if (char === "(") profundidade += 1;
    else if (char === ")") profundidade = Math.max(0, profundidade - 1);
    else if (profundidade === 0 && palavra.test(texto.slice(i))) return i;
  }
  return -1;
}

function indiceFrom(sqlTexto) {
  return indiceNoNivelZero(sqlTexto, /^FROM\b/i);
}

function fimDoFrom(resto) {
  const fim = indiceNoNivelZero(resto, /^(?:WHERE|GROUP|ORDER|HAVING)\b/i);
  return fim < 0 ? resto.length : fim;
}

function lerJuncao(texto) {
  const itens = [];
  const re = /\b(?:FROM|JOIN)\s+(?:dbo\.)?\[?([A-Za-z_][A-Za-z0-9_]*)\]?(?:\s+AS)?\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  let achado;
  while ((achado = re.exec(texto))) {
    const depois = texto.slice(re.lastIndex);
    const on = depois.match(/^\s+ON\b/i);
    let condicao = "";
    let fim = re.lastIndex;
    if (on) {
      const inicio = re.lastIndex + on[0].length;
      const corte = indiceNoNivelZero(
        texto.slice(inicio),
        /^(?:(?:LEFT|RIGHT|FULL|INNER|CROSS)(?:\s+OUTER)?\s+)?JOIN\b|^(?:WHERE|GROUP|ORDER|HAVING)\b/i,
      );
      fim = corte < 0 ? texto.length : inicio + corte;
      condicao = texto.slice(inicio, fim);
    }
    itens.push({ tabela: achado[1], alias: achado[2], on: condicao, inicio: achado.index, fim });
  }
  return itens;
}

function tabelaDe(juncao, alias) {
  return juncao.find((item) => item.alias.toLowerCase() === String(alias).toLowerCase())?.tabela ?? "";
}

function igualdadeUnica(on) {
  const achados = [...String(on).matchAll(/\b([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g)];
  if (achados.length !== 1) return null;
  const resto = on.replace(achados[0][0], "").replace(/[\s()]+/g, "");
  if (resto) return null;
  return {
    aAlias: achados[0][1],
    aCol: achados[0][2],
    bAlias: achados[0][3],
    bCol: achados[0][4],
  };
}

function ladosDoJoin(join, eq) {
  if (!eq?.aAlias || !join?.alias) return null;
  if (eq.aAlias.toLowerCase() === join.alias.toLowerCase()) {
    return { col: eq.aCol, outroAlias: eq.bAlias, outroCol: eq.bCol };
  }
  if (eq.bAlias.toLowerCase() === join.alias.toLowerCase()) {
    return { col: eq.bCol, outroAlias: eq.aAlias, outroCol: eq.aCol };
  }
  return null;
}

function mesmoTexto(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function garantirJoin(juncao, joins, contador, tabela, id, origemAlias, origemCol) {
  const existente = juncao.find((item) => {
    if (!mesmoTexto(item.tabela, tabela)) return false;
    const lados = ladosDoJoin(item, igualdadeUnica(item.on));
    return Boolean(lados) && mesmoTexto(lados.col, id) && mesmoTexto(lados.outroAlias, origemAlias) && mesmoTexto(lados.outroCol, origemCol);
  });
  if (existente) return existente.alias;
  contador.n += 1;
  const alias = `Nom${contador.n}`;
  const on = `${alias}.${id} = ${origemAlias}.${origemCol}`;
  joins.push(`LEFT OUTER JOIN ${tabela} ${alias} ON ${on}`);
  juncao.push({ tabela, alias, on, inicio: -1, fim: -1 });
  return alias;
}

function substituirIds(select, trocar) {
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\.(Id[A-Za-z0-9_]*)(\s+AS\s+([A-Za-z_][A-Za-z0-9_]*))?/gi;
  let profundidade = 0;
  let saida = "";
  let i = 0;
  while (i < select.length) {
    const char = select[i];
    if (char === "(") profundidade += 1;
    if (char === ")") profundidade = Math.max(0, profundidade - 1);
    if (profundidade === (char === "(" ? 1 : 0) && char !== ")") {
      re.lastIndex = i;
      const achado = re.exec(select);
      if (achado && achado.index === i) {
        saida += trocar(achado[0], achado[1], achado[2], achado[4]);
        i = re.lastIndex;
        continue;
      }
    }
    saida += char;
    i += 1;
  }
  return saida;
}

function inicioDoJoin(texto, indice) {
  const antes = texto.slice(0, indice);
  const qualificador = antes.match(/(?:\b(?:LEFT|RIGHT|FULL|INNER|CROSS)(?:\s+OUTER)?\s*)$/i);
  return qualificador ? indice - qualificador[0].length : indice;
}

function removerTrecho(texto, inicio, fim) {
  let de = inicio;
  if (de > 0 && texto[de - 1] === "\n") de -= 1;
  const depois = texto.slice(fim);
  const separador = depois && !/^\s/.test(depois) ? "\n" : "";
  return texto.slice(0, de) + separador + depois;
}

function mesmoVinculo(lados, outros) {
  return Boolean(
    outros &&
      mesmoTexto(outros.col, lados.col) &&
      mesmoTexto(outros.outroAlias, lados.outroAlias) &&
      mesmoTexto(outros.outroCol, lados.outroCol),
  );
}

function aliasPreferido(atual, outro) {
  const atualNom = /^Nom\d+b?$/i.test(atual.alias);
  const outroNom = /^Nom\d+b?$/i.test(outro.alias);
  if (atualNom !== outroNom) return atualNom ? outro.alias : atual.alias;
  return atual.inicio <= outro.inicio ? atual.alias : outro.alias;
}

export function enxugarSql(sqlTexto) {
  let sql = String(sqlTexto ?? "");
  for (let volta = 0; volta < 30; volta += 1) {
    const todas = lerJuncao(sql);
    const juncao = todas.filter((item) => item.on);
    let mudou = false;
    for (const join of juncao) {
      const lados = ladosDoJoin(join, igualdadeUnica(join.on));
      if (!lados || mesmoTexto(lados.outroAlias, join.alias)) continue;
      const outraTabela = tabelaDe(todas, lados.outroAlias);
      const identidade = mesmoTexto(lados.col, lados.outroCol) && mesmoTexto(outraTabela, join.tabela);
      const outro = juncao.find((item) => {
        if (mesmoTexto(item.alias, join.alias) || !mesmoTexto(item.tabela, join.tabela)) return false;
        return mesmoVinculo(lados, ladosDoJoin(item, igualdadeUnica(item.on)));
      });
      if (!identidade && !outro) continue;
      const destino = outro ? aliasPreferido(join, outro) : lados.outroAlias;
      const aliasRemovido = outro && !mesmoTexto(destino, outro.alias) ? outro.alias : join.alias;
      if (mesmoTexto(aliasRemovido, destino)) continue;
      const atual = lerJuncao(sql).find((item) => mesmoTexto(item.alias, aliasRemovido) && item.on);
      if (!atual) continue;
      sql = removerTrecho(sql, inicioDoJoin(sql, atual.inicio), atual.fim);
      sql = sql.replace(new RegExp(`\\b${aliasRemovido}\\b`, "gi"), destino);
      mudou = true;
      break;
    }
    if (!mudou) break;
  }
  return sql.replace(/\n{3,}/g, "\n\n");
}

export function aplicarNomesNoSql(sqlTexto, destinoDe) {
  const corte = indiceFrom(sqlTexto);
  if (corte < 0) return enxugarSql(sqlTexto);
  const resto = sqlTexto.slice(corte);
  const juncao = lerJuncao(resto);
  const joins = [];
  const contador = { n: 0 };
  const select = substituirIds(sqlTexto.slice(0, corte), (tudo, apelido, coluna, rotulo) => {
    const destino = destinoDe(coluna);
    if (!destino?.tabela || !destino.nome) return tudo;
    const rotuloFinal = rotulo || coluna.replace(/^Id_?/, "");
    const mesmaLinha =
      mesmoTexto(tabelaDe(juncao, apelido), destino.tabela) && mesmoTexto(coluna, destino.id);
    const base = mesmaLinha ? apelido : garantirJoin(juncao, joins, contador, destino.tabela, destino.id, apelido, coluna);
    if (destino.via) {
      const via = garantirJoin(juncao, joins, contador, destino.via.tabela, destino.via.id, base, destino.via.coluna);
      return `${via}.${destino.nome} AS ${rotuloFinal}`;
    }
    return `${base}.${destino.nome} AS ${rotuloFinal}`;
  });
  let montado = `${select}${resto}`;
  if (joins.length) {
    const fim = fimDoFrom(resto);
    const from = resto.slice(0, fim).trimEnd();
    const cauda = resto.slice(fim).replace(/^\s*/, "");
    montado = `${select.trimEnd()}\n${from}\n${joins.join("\n")}\n${cauda}`;
  }
  return enxugarSql(montado);
}

export async function nomearSql(pool, sqlTexto) {
  const esquema = await carregarEsquema(pool);
  return aplicarNomesNoSql(sqlTexto, (coluna) => destinoDoCampo(coluna, esquema));
}

function mapaItens(texto) {
  const mapa = new Map();
  for (const parte of String(texto ?? "").split(/\r?\n/)) {
    const item = parte.match(/^\s*(\d+)\s*=\s*(.*)$/);
    if (item && item[2].trim()) mapa.set(item[1], item[2].trim());
  }
  return mapa;
}

function idDoCampo(campos, nome, qual) {
  const campo = (campos ?? []).find((c) => nomeCanonico(c.nome) === nome);
  if (!campo) return 0;
  if (qual === "anterior") return idValido(campo.valorAnterior);
  return idValido(campo.valor) || idValido(campo.valorAtual) || idValido(campo.valorLog);
}

function configDoBloco(campos, qual, cfgPorCampo) {
  const direto = idDoCampo(campos, "IdConfiguracao_Campo_Livre", qual);
  if (direto) return direto;
  const campo = idDoCampo(campos, "IdCampo_Livre", qual);
  if (campo && cfgPorCampo[campo]) return cfgPorCampo[campo];
  const outro = qual === "atual" ? "anterior" : "atual";
  const cfgOutro = idDoCampo(campos, "IdConfiguracao_Campo_Livre", outro);
  if (cfgOutro) return cfgOutro;
  const campoOutro = idDoCampo(campos, "IdCampo_Livre", outro);
  return cfgPorCampo[campoOutro] || 0;
}

function rotuloTipoFixo(itensPorCfg, cfg, valor) {
  const chave = String(valor ?? "").trim();
  if (!chave || !cfg) return "";
  return itensPorCfg[cfg]?.get(chave) || "";
}

function aplicarTipoFixo(campos, cfgPorCampo, itensPorCfg) {
  const tipo = (campos ?? []).find((c) => nomeCanonico(c.nome) === "Valor_Tipo_Fixo");
  if (!tipo) return;
  const agora = rotuloTipoFixo(itensPorCfg, configDoBloco(campos, "atual", cfgPorCampo), tipo.valor);
  const antes = rotuloTipoFixo(itensPorCfg, configDoBloco(campos, "anterior", cfgPorCampo), tipo.valorAnterior);
  const log = rotuloTipoFixo(itensPorCfg, configDoBloco(campos, "atual", cfgPorCampo), tipo.valorLog);
  const atual = rotuloTipoFixo(itensPorCfg, configDoBloco(campos, "atual", cfgPorCampo), tipo.valorAtual);
  if (agora && !tipo.valorExibicao) tipo.valorExibicao = agora;
  if (antes && !tipo.valorAnteriorExibicao) tipo.valorAnteriorExibicao = antes;
  if (log && !tipo.valorLogExibicao) tipo.valorLogExibicao = log;
  if (atual && !tipo.valorAtualExibicao) tipo.valorAtualExibicao = atual;
}

async function enriquecerTipoFixo(pool, eventos, cadastro) {
  const blocos = [];
  for (const evento of eventos ?? []) {
    if ((evento.campos ?? []).some((c) => nomeCanonico(c.nome) === "Valor_Tipo_Fixo")) blocos.push(evento.campos);
  }
  for (const registro of cadastro?.registros ?? []) {
    if ((registro.campos ?? []).some((c) => nomeCanonico(c.nome) === "Valor_Tipo_Fixo")) blocos.push(registro.campos);
  }
  if ((cadastro?.campos ?? []).some((c) => nomeCanonico(c.nome) === "Valor_Tipo_Fixo")) blocos.push(cadastro.campos);
  if (!blocos.length) return;

  const idsCampo = new Set();
  const idsCfg = new Set();
  for (const campos of blocos) {
    for (const campo of campos) {
      const nome = nomeCanonico(campo.nome);
      if (nome !== "IdCampo_Livre" && nome !== "IdConfiguracao_Campo_Livre") continue;
      const destino = nome === "IdCampo_Livre" ? idsCampo : idsCfg;
      for (const valor of [campo.valor, campo.valorAnterior, campo.valorLog, campo.valorAtual]) {
        const n = idValido(valor);
        if (n) destino.add(n);
      }
    }
  }

  const cfgPorCampo = {};
  if (idsCampo.size) {
    const req = pool.request();
    const ph = [...idsCampo].map((id, i) => {
      req.input(`c${i}`, sql.Int, id);
      return `@c${i}`;
    });
    const r = await req.query(
      `Select IdCampo_Livre, IdConfiguracao_Campo_Livre From mov_Campo_Livre Where IdCampo_Livre In (${ph.join(",")})`,
    );
    for (const linha of r.recordset) {
      const cfg = idValido(linha.IdConfiguracao_Campo_Livre);
      if (cfg) {
        cfgPorCampo[linha.IdCampo_Livre] = cfg;
        idsCfg.add(cfg);
      }
    }
  }

  const itensPorCfg = {};
  if (idsCfg.size) {
    const req = pool.request();
    const ph = [...idsCfg].map((id, i) => {
      req.input(`g${i}`, sql.Int, id);
      return `@g${i}`;
    });
    const r = await req.query(
      `Select IdConfiguracao_Campo_Livre, Cast(Itens as nvarchar(max)) as Itens
       From cad_Configuracao_Campo_Livre
       Where IdConfiguracao_Campo_Livre In (${ph.join(",")})`,
    );
    for (const linha of r.recordset) itensPorCfg[linha.IdConfiguracao_Campo_Livre] = mapaItens(linha.Itens);
  }

  for (const campos of blocos) aplicarTipoFixo(campos, cfgPorCampo, itensPorCfg);
}

export async function enriquecerNomes(pool, eventos, cadastro) {
  await enriquecerProcessos(pool, eventos);
  const porCampo = coletarPorCampo(eventos, cadastro);
  if (porCampo.size) {
    try {
      const mapas = await montarMapas(pool, porCampo);
      aplicarEventos(eventos, mapas);
      aplicarCadastro(cadastro, mapas);
    } catch {
      esquemaCache = null;
    }
  }
  try {
    await enriquecerTipoFixo(pool, eventos, cadastro);
  } catch {
    /* tipo fixo segue com o número */
  }
  try {
    await enriquecerPessoas(pool, eventos, cadastro);
  } catch {
    /* usuário segue com o login */
  }
  return eventos;
}

function camposDeUsuario(eventos, cadastro) {
  const campos = [];
  const guardar = (lista) => {
    for (const campo of lista ?? []) {
      if (/^IdUsuario/.test(nomeCanonico(campo?.nome))) campos.push(campo);
    }
  };
  for (const evento of eventos ?? []) guardar(evento.campos);
  guardar(cadastro?.campos);
  guardar(cadastro?.divergencias);
  for (const registro of cadastro?.registros ?? []) {
    guardar(registro.campos);
    guardar(registro.divergencias);
  }
  return campos;
}

function textosDeUsuario(campo) {
  return [campo.valorExibicao, campo.valorAnteriorExibicao, campo.valorLogExibicao, campo.valorAtualExibicao]
    .map((texto) => String(texto ?? "").trim())
    .filter(Boolean);
}

async function enriquecerPessoas(pool, eventos, cadastro) {
  const campos = camposDeUsuario(eventos, cadastro);
  if (!campos.length) return;
  const mapa = await pessoasPorLogin(pool, campos.flatMap(textosDeUsuario));
  const trocar = (texto) => {
    const chave = String(texto ?? "").trim();
    return chave && mapa.get(chave) ? mapa.get(chave) : texto;
  };
  for (const campo of campos) {
    if (campo.valorExibicao) campo.valorExibicao = trocar(campo.valorExibicao);
    if (campo.valorAnteriorExibicao) campo.valorAnteriorExibicao = trocar(campo.valorAnteriorExibicao);
    if (campo.valorLogExibicao) campo.valorLogExibicao = trocar(campo.valorLogExibicao);
    if (campo.valorAtualExibicao) campo.valorAtualExibicao = trocar(campo.valorAtualExibicao);
  }
}
