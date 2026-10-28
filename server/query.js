export function xpathSeguro(valor) {
  const texto = String(valor ?? "").trim();
  if (/['"<>]/.test(texto)) {
    throw new Error("Filtro inválido: não use aspas ou < > nos campos.");
  }
  return texto;
}

export function paresChave(chaves) {
  const pares = [];
  for (const chave of chaves ?? []) {
    const nome = xpathSeguro(chave.nome);
    if (!nome) continue;
    const partes = String(chave.valor ?? "")
      .split(/[,;]+/)
      .map((v) => xpathSeguro(v))
      .filter(Boolean);
    for (const valor of partes) pares.push({ nome, valor });
  }
  return pares;
}

export function montarXpaths({ tabela, tipo, chaves }) {
  let base = "/Log/Tabela";
  const nomeTabela = xpathSeguro(tabela);
  if (nomeTabela) base += `[@Nome="${nomeTabela}"]`;
  if (Number(tipo) !== 0) base += `[@Tipo="${Number(tipo)}"]`;
  const pares = paresChave(chaves);
  if (!pares.length) return [base];
  const mesmoCampo = pares.every((p) => p.nome === pares[0].nome);
  if (mesmoCampo) {
    const valores = pares.map((p) => `@Value="${p.valor}"`).join(" or ");
    return [`${base}[Campo[@Nome="${pares[0].nome}" and (${valores})]]`];
  }
  let xpath = base;
  for (const p of pares) {
    xpath += `[Campo[@Nome="${p.nome}"][@Value="${p.valor}"]]`;
  }
  return [xpath];
}

export function montarXpath(filtros) {
  return montarXpaths(filtros).join(" | ");
}

export function parseCamposXml(xml) {
  if (!xml) return [];
  const texto = String(xml);
  const campos = [];
  const re = /<Campo\b([^>]*)(?:\/>|>([\s\S]*?)<\/Campo>)/gi;
  let match;
  while ((match = re.exec(texto))) {
    const attrs = match[1] ?? "";
    const inner = (match[2] ?? "").trim();
    const nome = atributoExato(attrs, "Nome");
    const valor =
      atributoExato(attrs, "Value") ??
      atributoExato(attrs, "Valor") ??
      atributoExato(attrs, "Novo") ??
      inner ??
      "";
    const oldAttr =
      atributoExato(attrs, "OldValue") ??
      atributoExato(attrs, "ValorAnterior") ??
      atributoExato(attrs, "Anterior") ??
      atributoExato(attrs, "Valor_Anterior");
    const temOld = /(?:^|\s)(OldValue|ValorAnterior|Anterior|Valor_Anterior)="/i.test(
      attrs,
    );
    if (nome) {
      campos.push({
        nome: nomeCanonico(nome),
        valor,
        ...(temOld ? { valorAnterior: oldAttr ?? "" } : {}),
      });
    }
  }
  return campos;
}

function nomeCanonico(nome) {
  const bruto = String(nome ?? "").trim();
  if (!bruto || bruto.includes("_")) return bruto;
  return bruto.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/^Id_/, "Id");
}

export function parseTabelasXml(xml) {
  const texto = String(xml ?? "");
  const tabelas = [];
  const re = /<Tabela\b([^>]*)(?:\/>|>([\s\S]*?)<\/Tabela>)/gi;
  let match;
  while ((match = re.exec(texto))) {
    const attrs = match[1] ?? "";
    const inner = match[2] ?? "";
    tabelas.push({
      nome: atributoExato(attrs, "Nome") ?? "",
      tipo: Number(atributoExato(attrs, "Tipo")) || 0,
      data: atributoExato(attrs, "Data") ?? "",
      indice: Number(atributoExato(attrs, "Indice")) || 0,
      campos: parseCamposXml(inner),
    });
  }
  return tabelas;
}

function atributoExato(attrs, nome) {
  const m = attrs.match(new RegExp(`(?:^|\\s)${nome}="([^"]*)"`, "i"));
  return m ? m[1] : undefined;
}

export function montarSelect(xpaths) {
  const lista = Array.isArray(xpaths) ? xpaths : [xpaths];
  const partes = lista.map(
    (xpath) => `
Select
  Coalesce(NullIf(LTrim(RTrim(Pessoa.Nome)), ''), Usr.Nome) as Usuario,
  Ltb.Data_Inicio as Data_Inicio_Transacao,
  Ltb.Data_Termino as Data_Termino_Transacao,
  DateDiff(second, Ltb.Data_Inicio, Ltb.Data_Termino) as Tempo_Transacao,
  Ltb.Dados_Log.value('(/Log/@WindowsUser)[1]', 'VarChar(300)') as Usuario_Windows,
  Ltb.Dados_Log.value('(/Log/@ComputerName)[1]', 'VarChar(300)') as Computador,
  Convert(nVarChar(Max), Ltb.Dados_Log.query('${xpath}')) as Trecho
From (
  Select
    Ltb.IdUsuario,
    Ltb.Data_Inicio,
    Ltb.Data_Termino,
    Ltb.Dados_Log
  From
    sys_Log_Tabela Ltb WITH (INDEX(Idx_sys_Log_Tabela_Data_Inicio))
  Where
    ((@IdUsuario = 0) or (Ltb.IdUsuario = @IdUsuario))
  And
    (@Data_Inicio Is Null Or Ltb.Data_Inicio >= @Data_Inicio)
  And
    (@Data_Termino Is Null Or Ltb.Data_Inicio < DateAdd(day, 1, @Data_Termino))
  And
    Ltb.Dados_Log.exist('${xpath}') = 1
) Ltb
Join
  sys_Usuario Usr on Usr.IdUsuario = Ltb.IdUsuario
Outer Apply (
  Select Top 1 Pes.Nome
  From cad_Funcionario Fun
  Join cad_Pessoa Pes On Pes.IdPessoa = Fun.IdPessoa
  Where Fun.IdUsuario_Correspondente = Usr.IdUsuario
    And Pes.Nome Is Not Null
    And LTrim(RTrim(Pes.Nome)) <> ''
  Order By Fun.IdPessoa
) Pessoa
`,
  );

  if (partes.length === 1) {
    return `${partes[0]}
Order By
  Ltb.Data_Inicio Desc`;
  }

  return `
Select Top 800 *
From (
${partes.join("\nUnion All\n")}
) as Resultado
Order By
  Data_Inicio_Transacao Desc
`;
}
