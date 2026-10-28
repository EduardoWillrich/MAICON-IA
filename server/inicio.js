import sql from "mssql";
import { nomeDe, pessoasPorLogin } from "./pessoas.js";
import { parseCamposXml } from "./query.js";
import { perfilDaConta } from "./setor.js";

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

export async function painelDoUsuario(pool, email, nome, admin = false) {
  const conta = String(email ?? "").trim().toLowerCase();
  let pessoa = (
    await pool.request().input("email", sql.VarChar(180), conta).query(`
      SELECT TOP 1 IdPessoa, Nome
      FROM cad_Pessoa
      WHERE LOWER(LTRIM(RTRIM(ISNULL(EMail, '')))) = @email
         OR LOWER(LTRIM(RTRIM(ISNULL(EMail_Pessoal, '')))) = @email
    `)
  ).recordset[0];

  const nomeSistema = tokens(nome, conta);
  if (!pessoa && nomeSistema) {
    pessoa = (
      await pool
        .request()
        .input("primeiro", sql.VarChar(80), nomeSistema.primeiro)
        .input("ultimo", sql.VarChar(80), nomeSistema.ultimo)
        .query(`
          SELECT TOP 1 IdPessoa, Nome
          FROM cad_Pessoa
          WHERE Nome LIKE @primeiro + ' %'
            AND Nome LIKE '% ' + @ultimo
          ORDER BY LEN(Nome)
        `)
    ).recordset[0];
  }

  if (!pessoa) {
    return { encontrado: false, nome: nome || conta };
  }

  const id = Number(pessoa.IdPessoa);
  const semTeste = admin
    ? ""
    : "AND (Lhs.Numero_Processo IS NULL OR UPPER(Lhs.Numero_Processo) NOT LIKE '%TESTE%')";
  const atividades = (
    await pool.request().input("id", sql.Int, id).query(`
      SELECT TOP 200
        Tar.Codigo AS Codigo,
        Tar.Descricao AS Atividade,
        Lhs.Numero_Processo AS Processo,
        Ati.Previsao_Termino AS Previsao,
        CASE
          WHEN Ati.Previsao_Termino IS NULL THEN 'Sem previsão'
          WHEN Ati.Previsao_Termino < CAST(GETDATE() AS date) THEN 'Atrasada'
          ELSE 'Hoje'
        END AS Marca
      FROM mov_Atividade Ati
      LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
      LEFT JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
      WHERE Ati.IdResponsavel = @id
        AND Ati.Data_Termino IS NULL
        AND Ati.Situacao NOT IN (4, 5, 6)
        AND (
          Ati.Previsao_Termino IS NULL
          OR (
            Ati.Previsao_Termino >= DATEADD(month, -6, CAST(GETDATE() AS date))
            AND Ati.Previsao_Termino < DATEADD(day, 1, CAST(GETDATE() AS date))
          )
        )
        ${semTeste}
      ORDER BY
        CASE
          WHEN Ati.Previsao_Termino >= CAST(GETDATE() AS date) THEN 0
          WHEN Ati.Previsao_Termino IS NOT NULL THEN 1
          ELSE 2
        END,
        Ati.Previsao_Termino DESC,
        Tar.Descricao
    `)
  ).recordset;

  const lista = atividades.map((linha) => ({
    codigo: String(linha.Codigo ?? linha.codigo ?? linha.CODIGO ?? "").trim(),
    atividade: String(linha.Atividade ?? "").trim(),
    processo: String(linha.Processo ?? "").trim(),
    marca: String(linha.Marca ?? ""),
    quando: linha.Previsao ? diaCurto(linha.Previsao) : "",
  }));
  const processos = [];
  const vistos = new Set();
  for (const item of lista) {
    if (!item.processo || vistos.has(item.processo)) continue;
    vistos.add(item.processo);
    processos.push({ processo: item.processo, cliente: "" });
    if (processos.length >= 12) break;
  }

  return {
    encontrado: true,
    nome: String(pessoa.Nome ?? nome).trim(),
    processos,
    atividades: lista,
  };
}

function diaCurto(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(data);
}

async function localizarPessoa(pool, email, nome) {
  const conta = String(email ?? "").trim().toLowerCase();
  const porEmail = await pool.request().input("email", sql.VarChar(180), conta).query(`
    SELECT TOP 1 IdPessoa, Nome
    FROM cad_Pessoa
    WHERE LOWER(LTRIM(RTRIM(ISNULL(EMail, '')))) = @email
       OR LOWER(LTRIM(RTRIM(ISNULL(EMail_Pessoal, '')))) = @email`);
  if (porEmail.recordset[0]) return porEmail.recordset[0];
  const nomeSistema = tokens(nome, conta);
  if (!nomeSistema) return null;
  const porNome = await pool
    .request()
    .input("primeiro", sql.VarChar(80), nomeSistema.primeiro)
    .input("ultimo", sql.VarChar(80), nomeSistema.ultimo)
    .query(`
      SELECT TOP 1 IdPessoa, Nome
      FROM cad_Pessoa
      WHERE Nome LIKE @primeiro + ' %' AND Nome LIKE '% ' + @ultimo
      ORDER BY LEN(Nome)`);
  return porNome.recordset[0] ?? null;
}

async function pendenciasDaPessoa(pool, email, nome) {
  const pessoa = await localizarPessoa(pool, email, nome);
  if (!pessoa) return { encontrado: false, atrasadas: 0, hoje: 0, semana: 0, itens: [] };
  const id = Number(pessoa.IdPessoa);
  const totais = await pool.request().input("id", sql.Int, id).query(`
    SELECT
      SUM(CASE WHEN CAST(Ati.Previsao_Termino AS date) < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS Atrasadas,
      SUM(CASE WHEN CAST(Ati.Previsao_Termino AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS Hoje,
      SUM(CASE WHEN CAST(Ati.Previsao_Termino AS date) > CAST(GETDATE() AS date)
                AND CAST(Ati.Previsao_Termino AS date) < DATEADD(day, 8, CAST(GETDATE() AS date)) THEN 1 ELSE 0 END) AS Semana
    FROM mov_Atividade Ati
    WHERE Ati.IdResponsavel = @id
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND Ati.Previsao_Termino IS NOT NULL`);
  const itens = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 6
      Tar.Descricao AS Atividade,
      Lhs.Numero_Processo AS Processo,
      Ati.Previsao_Termino AS Previsao,
      CASE
        WHEN CAST(Ati.Previsao_Termino AS date) < CAST(GETDATE() AS date) THEN 'atrasada'
        WHEN CAST(Ati.Previsao_Termino AS date) = CAST(GETDATE() AS date) THEN 'hoje'
        ELSE 'semana'
      END AS Situacao
    FROM mov_Atividade Ati
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
    LEFT JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    WHERE Ati.IdResponsavel = @id
      AND Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND Ati.Previsao_Termino IS NOT NULL
      AND CAST(Ati.Previsao_Termino AS date) < DATEADD(day, 8, CAST(GETDATE() AS date))
    ORDER BY Ati.Previsao_Termino`);
  const casa = totais.recordset[0] ?? {};
  return {
    encontrado: true,
    nome: String(pessoa.Nome ?? "").trim(),
    atrasadas: Number(casa.Atrasadas) || 0,
    hoje: Number(casa.Hoje) || 0,
    semana: Number(casa.Semana) || 0,
    itens: itens.recordset.map((linha) => ({
      atividade: String(linha.Atividade ?? "Atividade").trim(),
      processo: String(linha.Processo ?? "").trim(),
      quando: diaCurto(linha.Previsao),
      situacao: String(linha.Situacao ?? "semana"),
    })),
  };
}

async function alteracoes24h(pool) {
  const totais = await pool.request().input("horas", sql.Int, 24).query(`
    SELECT COUNT(*) AS Transacoes, COUNT(DISTINCT Ltb.IdUsuario) AS Usuarios
    FROM sys_Log_Tabela Ltb
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())`);
  const tipos = await pool.request().input("horas", sql.Int, 24).query(`
    SELECT
      SUM(CASE WHEN Tab.Tipo = 1 THEN 1 ELSE 0 END) AS Inclusoes,
      SUM(CASE WHEN Tab.Tipo = 2 THEN 1 ELSE 0 END) AS Exclusoes,
      SUM(CASE WHEN Tab.Tipo = 3 THEN 1 ELSE 0 END) AS Atualizacoes
    FROM sys_Log_Tabela Ltb
    CROSS APPLY Ltb.Dados_Log.nodes('/Log/Tabela[1]') T(N)
    CROSS APPLY (SELECT N.value('@Tipo', 'smallint') AS Tipo) Tab
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())`);
  const pessoas = await pool.request().input("horas", sql.Int, 24).query(`
    SELECT TOP 5 Usr.Nome, COUNT(*) AS Transacoes
    FROM sys_Log_Tabela Ltb
    JOIN sys_Usuario Usr ON Usr.IdUsuario = Ltb.IdUsuario
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())
    GROUP BY Usr.Nome
    ORDER BY COUNT(*) DESC`);
  const tabelas = await pool.request().input("horas", sql.Int, 24).query(`
    SELECT TOP 5 Tab.Tabela, COUNT(*) AS Qtd
    FROM sys_Log_Tabela Ltb
    CROSS APPLY Ltb.Dados_Log.nodes('/Log/Tabela[1]') T(N)
    CROSS APPLY (SELECT N.value('@Nome', 'varchar(128)') AS Tabela) Tab
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())
    GROUP BY Tab.Tabela
    ORDER BY COUNT(*) DESC`);
  const apagados = await exclusoesRecentes(pool);
  const nomesCasa = await pessoasPorLogin(pool, pessoas.recordset.map((linha) => linha.Nome));
  const casa = totais.recordset[0] ?? {};
  const tipo = tipos.recordset[0] ?? {};
  return {
    transacoes: Number(casa.Transacoes) || 0,
    usuarios: Number(casa.Usuarios) || 0,
    inclusoes: Number(tipo.Inclusoes) || 0,
    exclusoes: Number(tipo.Exclusoes) || 0,
    atualizacoes: Number(tipo.Atualizacoes) || 0,
    tabelas: tabelas.recordset.map((linha) => ({
      nome: String(linha.Tabela ?? "").trim(),
      qtd: Number(linha.Qtd) || 0,
    })),
    pessoas: pessoas.recordset.map((linha) => ({
      nome: nomeDe(nomesCasa, linha.Nome),
      qtd: Number(linha.Transacoes) || 0,
    })),
    apagados,
  };
}

function pareceProcesso(valor) {
  return /^[A-Za-z]{1,4}\d{2,}[-/]\d{2}/.test(String(valor ?? "").trim());
}

function notaCodigo(valor) {
  const texto = String(valor ?? "").trim();
  if (!pareceProcesso(texto)) return 0;
  if (/^(IA|EA|IM|EM)/i.test(texto)) return 3;
  if (/^PF/i.test(texto)) return 2;
  return 1;
}

function valorCampo(campos, nome) {
  const lista = campos
    .filter((campo) => campo.nome === nome)
    .map((campo) => String(campo.valor ?? "").trim())
    .filter(Boolean);
  return lista.find((valor) => pareceProcesso(valor)) || lista[0] || "";
}

function candidatoDireto(campos) {
  return {
    Processo: valorCampo(campos, "Numero_Processo"),
    Proposta: valorCampo(campos, "Numero_Proposta"),
    Oferta: valorCampo(campos, "Numero_Oferta") || valorCampo(campos, "Referencia"),
    Cliente: "",
  };
}

function melhorCodigo(candidatos) {
  let escolhido = null;
  let nota = 0;
  for (const item of candidatos) {
    if (!item) continue;
    const cliente = String(item.Cliente ?? "").trim();
    for (const valor of [item.Processo, item.Proposta, item.Oferta]) {
      const texto = String(valor ?? "").trim();
      const atual = notaCodigo(texto);
      if (atual > nota) {
        nota = atual;
        escolhido = { Processo: texto, Cliente: cliente };
      }
    }
  }
  return escolhido;
}

const CAMPOS_PAI = [
  "IdOferta_Frete",
  "IdProposta_Frete",
  "IdProposta_Frete_Carga",
  "IdAcompanhamento",
  "IdProjeto_Atividade",
  "IdLogistica_House",
  "IdLogistica_Master",
  "IdLogistica_Taxa",
  "IdOferta_Frete_Taxa",
  "IdAtividade",
];

function completarCodigo(atual, outro) {
  const base = atual || {
    Processo: "",
    Proposta: "",
    Oferta: "",
    Cliente: "",
    IdProposta_Frete: 0,
    IdOferta_Frete: 0,
    IdProjeto_Atividade: 0,
  };
  if (!outro) return base;
  return {
    Processo: base.Processo || outro.Processo || "",
    Proposta: base.Proposta || outro.Proposta || "",
    Oferta: base.Oferta || outro.Oferta || "",
    Cliente: base.Cliente || outro.Cliente || "",
    IdProposta_Frete: base.IdProposta_Frete || outro.IdProposta_Frete || 0,
    IdOferta_Frete: base.IdOferta_Frete || outro.IdOferta_Frete || 0,
    IdProjeto_Atividade: base.IdProjeto_Atividade || outro.IdProjeto_Atividade || 0,
  };
}

async function completarCodigosVivos(pool, mapa) {
  const idsDe = (nome) => [...mapa.values()].map((item) => item[nome]).filter((id) => id > 0);
  const [propostas, ofertas, projetos] = await Promise.all([
    mapaPorIds(pool, idsDe("IdProposta_Frete"), `
      SELECT Pro.IdProposta_Frete AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        Cli.Nome AS Cliente
      FROM mov_Proposta_Frete Pro
      OUTER APPLY (
        SELECT TOP 1 Numero_Processo, IdCliente
        FROM mov_Logistica_House
        WHERE IdProjeto_Atividade = Pro.IdProjeto_Atividade
        ORDER BY CASE WHEN NULLIF(Numero_Processo, '') IS NULL THEN 1 ELSE 0 END, IdLogistica_House DESC
      ) Hou
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = COALESCE(Hou.IdCliente, Pro.IdCliente)
      WHERE Pro.IdProposta_Frete IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, idsDe("IdOferta_Frete"), `
      SELECT Ofe.IdOferta_Frete AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        Ofe.Numero_Oferta AS Oferta,
        Cli.Nome AS Cliente
      FROM mov_Oferta_Frete Ofe
      OUTER APPLY (
        SELECT TOP 1 Numero_Processo, IdCliente
        FROM mov_Logistica_House
        WHERE IdOferta_Frete = Ofe.IdOferta_Frete
        ORDER BY CASE WHEN NULLIF(Numero_Processo, '') IS NULL THEN 1 ELSE 0 END, IdLogistica_House DESC
      ) Hou
      LEFT JOIN mov_Proposta_Frete Pro ON Pro.IdProposta_Frete = Ofe.IdProposta_Frete
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = COALESCE(Hou.IdCliente, Pro.IdCliente)
      WHERE Ofe.IdOferta_Frete IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, idsDe("IdProjeto_Atividade"), `
      SELECT Proj.IdProjeto_Atividade AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        COALESCE(CliH.Nome, CliP.Nome) AS Cliente
      FROM mov_Projeto_Atividade Proj
      OUTER APPLY (
        SELECT TOP 1 Numero_Processo, IdCliente
        FROM mov_Logistica_House
        WHERE IdProjeto_Atividade = Proj.IdProjeto_Atividade
        ORDER BY CASE WHEN NULLIF(Numero_Processo, '') IS NULL THEN 1 ELSE 0 END, IdLogistica_House DESC
      ) Hou
      OUTER APPLY (
        SELECT TOP 1 Numero_Proposta, IdCliente
        FROM mov_Proposta_Frete
        WHERE IdProjeto_Atividade = Proj.IdProjeto_Atividade
        ORDER BY IdProposta_Frete DESC
      ) Pro
      LEFT JOIN cad_Pessoa CliH ON CliH.IdPessoa = Hou.IdCliente
      LEFT JOIN cad_Pessoa CliP ON CliP.IdPessoa = Pro.IdCliente
      WHERE Proj.IdProjeto_Atividade IN (/*IDS*/)`, "Id"),
  ]);
  for (const [chave, item] of mapa) {
    mapa.set(chave, completarCodigo(
      completarCodigo(
        completarCodigo(item, propostas.get(item.IdProposta_Frete)),
        ofertas.get(item.IdOferta_Frete),
      ),
      projetos.get(item.IdProjeto_Atividade),
    ));
  }
}

async function codigosNoLog(pool, alvos, profundidade = 0) {
  const unicos = [];
  const vistos = new Set();
  for (const alvo of alvos) {
    if (!CAMPOS_PAI.includes(alvo.campo) || !(alvo.id > 0)) continue;
    const chave = `${alvo.campo}:${alvo.id}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push(alvo);
  }
  const mapa = new Map();
  if (!unicos.length) return mapa;
  try {
  const request = pool.request();
  const filtros = unicos.slice(0, 40).map((alvo, indice) => {
    request.input(`v${indice}`, sql.VarChar(20), String(alvo.id));
    return `Ltb.Dados_Log.exist('/Log/Tabela/Campo[@Nome="${alvo.campo}"][@Value=sql:variable("@v${indice}")]') = 1`;
  });
  const r = await request.query(`
    SELECT TOP 60 CONVERT(nvarchar(max), Ltb.Dados_Log) AS Campos
    FROM sys_Log_Tabela Ltb
    WHERE Ltb.Data_Inicio >= DATEADD(day, -3, GETDATE())
      AND (${filtros.join(" OR ")})
    ORDER BY Ltb.Data_Inicio DESC`);
  for (const linha of r.recordset) {
    const campos = parseCamposXml(linha.Campos);
    const direto = candidatoDireto(campos);
    for (const alvo of unicos) {
      if (idCampo(campos, alvo.campo) !== alvo.id) continue;
      const chave = `${alvo.campo}:${alvo.id}`;
      mapa.set(chave, completarCodigo(mapa.get(chave) || {
        Processo: "",
        Proposta: "",
        Oferta: "",
        Cliente: "",
        IdProposta_Frete: 0,
        IdOferta_Frete: 0,
        IdProjeto_Atividade: 0,
      }, {
        ...direto,
        IdProposta_Frete: idCampo(campos, "IdProposta_Frete"),
        IdOferta_Frete: idCampo(campos, "IdOferta_Frete"),
        IdProjeto_Atividade: idCampo(campos, "IdProjeto_Atividade"),
      }));
    }
  }
  if (profundidade > 0) return mapa;
  await completarCodigosVivos(pool, mapa);
  const proximo = [];
  for (const item of mapa.values()) {
    if (melhorCodigo([item])) continue;
    if (item.IdProposta_Frete) proximo.push({ campo: "IdProposta_Frete", id: item.IdProposta_Frete });
    if (item.IdOferta_Frete) proximo.push({ campo: "IdOferta_Frete", id: item.IdOferta_Frete });
    if (item.IdProjeto_Atividade) proximo.push({ campo: "IdProjeto_Atividade", id: item.IdProjeto_Atividade });
  }
  const extra = await codigosNoLog(pool, proximo, 1);
  for (const [chave, item] of mapa) {
    mapa.set(chave, completarCodigo(item, melhorComoCampos(
      extra.get(`IdProposta_Frete:${item.IdProposta_Frete}`),
      extra.get(`IdOferta_Frete:${item.IdOferta_Frete}`),
      extra.get(`IdProjeto_Atividade:${item.IdProjeto_Atividade}`),
    )));
  }
  return mapa;
  } catch {
    return mapa;
  }
}

function melhorComoCampos(...itens) {
  const escolhido = melhorCodigo(itens);
  if (!escolhido) return null;
  const nota = notaCodigo(escolhido.Processo);
  return {
    Processo: nota === 3 ? escolhido.Processo : "",
    Proposta: nota === 2 ? escolhido.Processo : "",
    Oferta: nota === 1 ? escolhido.Processo : "",
    Cliente: escolhido.Cliente,
  };
}

function idCampo(campos, nome) {
  const n = Number(campos.find((campo) => campo.nome === nome)?.valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function textoCampo(campos, nomes) {
  for (const nome of nomes) {
    const valor = String(campos.find((campo) => campo.nome === nome)?.valor ?? "").replace(/\s+/g, " ").trim();
    if (valor) return valor.slice(0, 110);
  }
  return "";
}

function rotuloTabela(nome) {
  const conhecidas = {
    mov_Acompanhamento: "Acompanhamento",
    mov_Atividade_Historico: "Histórico da atividade",
    mov_Logistica_Taxa: "Taxa",
    mov_Logistica_Taxa_Composicao: "Composição de taxa",
    mov_Logistica_Comissao: "Comissão",
    mov_Logistica_Campo_Livre: "Campo livre",
    mov_Oferta_Frete_Viagem: "Viagem da oferta",
    mov_Nota_Fiscal_Servico_Item: "Item da nota fiscal",
    aux_Nota_Fiscal_Servico_Fatura: "Nota ligada à fatura",
    sys_Relatorio: "Relatório",
    mov_Movimentacao_Financeira_Custo: "Custo financeiro",
  };
  if (conhecidas[nome]) return conhecidas[nome];
  return String(nome ?? "").replace(/^(mov|cad|aux|arq|sys)_/, "").replaceAll("_", " ").trim();
}

async function mapaPorIds(pool, ids, comando, coluna) {
  const unicos = [...new Set(ids.filter((id) => id > 0))].slice(0, 40);
  if (!unicos.length) return new Map();
  const request = pool.request();
  const marcas = unicos.map((id, indice) => {
    request.input(`id${indice}`, sql.Int, id);
    return `@id${indice}`;
  });
  const r = await request.query(comando.replace("/*IDS*/", marcas.join(", ")));
  return new Map(r.recordset.map((linha) => [Number(linha[coluna]), linha]));
}

async function exclusoesRecentes(pool) {
  const r = await pool.request().input("horas", sql.Int, 24).query(`
    SELECT TOP 12
      CONVERT(char(5), Ltb.Data_Inicio, 108) AS Hora,
      Usr.Nome AS Usuario,
      Tab.Tabela,
      CONVERT(nvarchar(max), Ltb.Dados_Log) AS Campos
    FROM sys_Log_Tabela Ltb
    JOIN sys_Usuario Usr ON Usr.IdUsuario = Ltb.IdUsuario
    CROSS APPLY Ltb.Dados_Log.nodes('/Log/Tabela[1]') T(N)
    CROSS APPLY (
      SELECT N.value('@Nome', 'varchar(128)') AS Tabela, N.value('@Tipo', 'smallint') AS Tipo
    ) Tab
    WHERE Ltb.Data_Inicio >= DATEADD(hour, -@horas, GETDATE())
      AND Tab.Tipo = 2
    ORDER BY Ltb.Data_Inicio DESC`);
  const linhas = r.recordset.map((linha) => ({
    hora: String(linha.Hora ?? "").trim(),
    usuario: String(linha.Usuario ?? "").trim(),
    tabela: String(linha.Tabela ?? "").trim(),
    campos: parseCamposXml(linha.Campos),
  }));
  const nomes = await pessoasPorLogin(pool, linhas.map((linha) => linha.usuario));
  for (const linha of linhas) linha.usuario = nomeDe(nomes, linha.usuario);
  const ids = (nome) => linhas.map((linha) => idCampo(linha.campos, nome));
  const casaDoProjeto = `
    OUTER APPLY (
      SELECT TOP 1 Numero_Processo, IdCliente
      FROM mov_Logistica_House
      WHERE IdProjeto_Atividade = Proj.IdProjeto_Atividade
      ORDER BY CASE WHEN NULLIF(Numero_Processo, '') IS NULL THEN 1 ELSE 0 END, IdLogistica_House DESC
    ) Hou
    OUTER APPLY (
      SELECT TOP 1 Numero_Proposta, IdCliente
      FROM mov_Proposta_Frete
      WHERE IdProjeto_Atividade = Proj.IdProjeto_Atividade
      ORDER BY IdProposta_Frete DESC
    ) Pro`;
  const [casas, masters, projetos, taxas, taxasOferta, ofertas, atividades, notas, relatorios, registros, projetosSoltos, propostas, cargas, acompanhamentos] = await Promise.all([
    mapaPorIds(pool, ids("IdLogistica_House"), `
      SELECT Lhs.IdLogistica_House AS Id, Lhs.Numero_Processo AS Processo, Cli.Nome AS Cliente
      FROM mov_Logistica_House Lhs
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE Lhs.IdLogistica_House IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdLogistica_Master"), `
      SELECT IdLogistica_Master AS Id, Numero_Processo AS Processo
      FROM mov_Logistica_Master
      WHERE IdLogistica_Master IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdProjeto_Atividade"), `
      SELECT Proj.IdProjeto_Atividade AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        COALESCE(CliH.Nome, CliP.Nome) AS Cliente
      FROM mov_Projeto_Atividade Proj
      ${casaDoProjeto}
      LEFT JOIN cad_Pessoa CliH ON CliH.IdPessoa = Hou.IdCliente
      LEFT JOIN cad_Pessoa CliP ON CliP.IdPessoa = Pro.IdCliente
      WHERE Proj.IdProjeto_Atividade IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdLogistica_Taxa"), `
      SELECT Tax.IdLogistica_Taxa AS Id,
        COALESCE(H.Numero_Processo, M.Numero_Processo) AS Processo,
        Cli.Nome AS Cliente
      FROM mov_Logistica_Taxa Tax
      LEFT JOIN mov_Logistica_House H ON H.IdLogistica_House = Tax.IdLogistica_House
      LEFT JOIN mov_Logistica_Master M ON M.IdLogistica_Master = Tax.IdLogistica_Master
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = H.IdCliente
      WHERE Tax.IdLogistica_Taxa IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdOferta_Frete_Taxa"), `
      SELECT Tax.IdOferta_Frete_Taxa AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        Ofe.Numero_Oferta AS Oferta,
        Cli.Nome AS Cliente
      FROM mov_Oferta_Frete_Taxa Tax
      JOIN mov_Oferta_Frete Ofe ON Ofe.IdOferta_Frete = Tax.IdOferta_Frete
      OUTER APPLY (
        SELECT TOP 1 Numero_Processo, IdCliente
        FROM mov_Logistica_House
        WHERE IdOferta_Frete = Ofe.IdOferta_Frete
           OR IdProjeto_Atividade = (
             SELECT IdProjeto_Atividade FROM mov_Proposta_Frete WHERE IdProposta_Frete = Ofe.IdProposta_Frete
           )
        ORDER BY CASE WHEN IdOferta_Frete = Ofe.IdOferta_Frete THEN 0 ELSE 1 END,
          CASE WHEN NULLIF(Numero_Processo, '') IS NULL THEN 1 ELSE 0 END,
          IdLogistica_House DESC
      ) Hou
      LEFT JOIN mov_Proposta_Frete Pro ON Pro.IdProposta_Frete = Ofe.IdProposta_Frete
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = COALESCE(Hou.IdCliente, Pro.IdCliente)
      WHERE Tax.IdOferta_Frete_Taxa IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdOferta_Frete"), `
      SELECT Ofe.IdOferta_Frete AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        Ofe.Numero_Oferta AS Oferta,
        Cli.Nome AS Cliente
      FROM mov_Oferta_Frete Ofe
      OUTER APPLY (
        SELECT TOP 1 Numero_Processo, IdCliente
        FROM mov_Logistica_House
        WHERE IdOferta_Frete = Ofe.IdOferta_Frete
           OR IdProjeto_Atividade = (
             SELECT IdProjeto_Atividade FROM mov_Proposta_Frete WHERE IdProposta_Frete = Ofe.IdProposta_Frete
           )
        ORDER BY CASE WHEN IdOferta_Frete = Ofe.IdOferta_Frete THEN 0 ELSE 1 END,
          CASE WHEN NULLIF(Numero_Processo, '') IS NULL THEN 1 ELSE 0 END,
          IdLogistica_House DESC
      ) Hou
      LEFT JOIN mov_Proposta_Frete Pro ON Pro.IdProposta_Frete = Ofe.IdProposta_Frete
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = COALESCE(Hou.IdCliente, Pro.IdCliente)
      WHERE Ofe.IdOferta_Frete IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdAtividade"), `
      SELECT Ati.IdAtividade AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        COALESCE(CliH.Nome, CliP.Nome) AS Cliente,
        Tar.Descricao AS Tarefa
      FROM mov_Atividade Ati
      LEFT JOIN mov_Projeto_Atividade Proj ON Proj.IdProjeto_Atividade = Ati.IdProjeto_Atividade
      ${casaDoProjeto}
      LEFT JOIN cad_Pessoa CliH ON CliH.IdPessoa = Hou.IdCliente
      LEFT JOIN cad_Pessoa CliP ON CliP.IdPessoa = Pro.IdCliente
      LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa
      WHERE Ati.IdAtividade IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdNota_Fiscal_Servico"), `
      SELECT IdNota_Fiscal_Servico AS Id, Numero
      FROM mov_Nota_Fiscal_Servico
      WHERE IdNota_Fiscal_Servico IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdRelatorio"), `
      SELECT IdRelatorio AS Id, Nome
      FROM sys_Relatorio
      WHERE IdRelatorio IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdRegistro_Financeiro"), `
      SELECT IdRegistro_Financeiro AS Id, Referencia AS Processo
      FROM mov_Registro_Financeiro
      WHERE IdRegistro_Financeiro IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdProjeto_Atividade"), `
      SELECT IdProjeto_Atividade AS Id, Referencia AS Processo
      FROM mov_Projeto_Atividade
      WHERE IdProjeto_Atividade IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdProposta_Frete"), `
      SELECT Pro.IdProposta_Frete AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        Cli.Nome AS Cliente
      FROM mov_Proposta_Frete Pro
      OUTER APPLY (
        SELECT TOP 1 H.Numero_Processo, H.IdCliente
        FROM mov_Logistica_House H
        WHERE H.IdProjeto_Atividade = Pro.IdProjeto_Atividade
           OR H.IdOferta_Frete IN (
             SELECT O.IdOferta_Frete FROM mov_Oferta_Frete O WHERE O.IdProposta_Frete = Pro.IdProposta_Frete
           )
        ORDER BY CASE WHEN NULLIF(H.Numero_Processo, '') IS NULL THEN 1 ELSE 0 END, H.IdLogistica_House DESC
      ) Hou
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = COALESCE(Hou.IdCliente, Pro.IdCliente)
      WHERE Pro.IdProposta_Frete IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdProposta_Frete_Carga"), `
      SELECT Car.IdProposta_Frete_Carga AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        Cli.Nome AS Cliente
      FROM mov_Proposta_Frete_Carga Car
      JOIN mov_Proposta_Frete Pro ON Pro.IdProposta_Frete = Car.IdProposta_Frete
      OUTER APPLY (
        SELECT TOP 1 H.Numero_Processo, H.IdCliente
        FROM mov_Logistica_House H
        WHERE H.IdProjeto_Atividade = Pro.IdProjeto_Atividade
           OR H.IdOferta_Frete IN (
             SELECT O.IdOferta_Frete FROM mov_Oferta_Frete O WHERE O.IdProposta_Frete = Pro.IdProposta_Frete
           )
        ORDER BY CASE WHEN NULLIF(H.Numero_Processo, '') IS NULL THEN 1 ELSE 0 END, H.IdLogistica_House DESC
      ) Hou
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = COALESCE(Hou.IdCliente, Pro.IdCliente)
      WHERE Car.IdProposta_Frete_Carga IN (/*IDS*/)`, "Id"),
    mapaPorIds(pool, ids("IdAcompanhamento"), `
      SELECT Aco.IdAcompanhamento AS Id,
        Hou.Numero_Processo AS Processo,
        Pro.Numero_Proposta AS Proposta,
        COALESCE(CliH.Nome, CliP.Nome) AS Cliente
      FROM mov_Acompanhamento Aco
      LEFT JOIN mov_Projeto_Atividade Proj ON Proj.IdProjeto_Atividade = Aco.IdProjeto_Atividade
      ${casaDoProjeto}
      LEFT JOIN cad_Pessoa CliH ON CliH.IdPessoa = Hou.IdCliente
      LEFT JOIN cad_Pessoa CliP ON CliP.IdPessoa = Pro.IdCliente
      WHERE Aco.IdAcompanhamento IN (/*IDS*/)`, "Id"),
  ]);
  const ligados = (linha) => {
    const id = (nome) => idCampo(linha.campos, nome);
    return [
      candidatoDireto(linha.campos),
      casas.get(id("IdLogistica_House")),
      projetos.get(id("IdProjeto_Atividade")),
      taxas.get(id("IdLogistica_Taxa")),
      taxasOferta.get(id("IdOferta_Frete_Taxa")),
      atividades.get(id("IdAtividade")),
      masters.get(id("IdLogistica_Master")),
      registros.get(id("IdRegistro_Financeiro")),
      ofertas.get(id("IdOferta_Frete")),
      propostas.get(id("IdProposta_Frete")),
      cargas.get(id("IdProposta_Frete_Carga")),
      acompanhamentos.get(id("IdAcompanhamento")),
      projetosSoltos.get(id("IdProjeto_Atividade")),
    ];
  };
  const semCodigo = linhas.filter((linha) => !melhorCodigo(ligados(linha)));
  const historico = await codigosNoLog(pool, semCodigo.flatMap((linha) => (
    CAMPOS_PAI.map((campo) => ({ campo, id: idCampo(linha.campos, campo) }))
  )));
  return linhas.map((linha) => {
    const id = (nome) => idCampo(linha.campos, nome);
    const casa = melhorCodigo([
      ...ligados(linha),
      ...CAMPOS_PAI.map((campo) => historico.get(`${campo}:${id(campo)}`)),
    ]);
    const processo = String(casa?.Processo ?? "").trim();
    const cliente = String(casa?.Cliente ?? "").trim();
    const nota = notas.get(idCampo(linha.campos, "IdNota_Fiscal_Servico"));
    const relatorio = relatorios.get(idCampo(linha.campos, "IdRelatorio"));
    const tarefa = String(atividades.get(idCampo(linha.campos, "IdAtividade"))?.Tarefa ?? "").trim();
    const descricao = textoCampo(linha.campos, ["Descricao", "Titulo", "Complemento", "Numero_Controle", "Nome"]);
    const assunto = [rotuloTabela(linha.tabela), tarefa, descricao, relatorio?.Nome ? String(relatorio.Nome).trim() : ""].filter(Boolean);
    const unico = [];
    for (const parte of assunto) {
      if (!unico.some((item) => item.toLowerCase() === parte.toLowerCase())) unico.push(parte);
    }
    const titulo = nota?.Numero && !processo ? `Nota ${nota.Numero}` : unico[0] || rotuloTabela(linha.tabela);
    const detalhe = [cliente, linha.usuario].filter(Boolean).join(" · ");
    const texto = unico.filter((parte) => parte.toLowerCase() !== titulo.toLowerCase()).join(" · ");
    return { hora: linha.hora, titulo, detalhe, texto, processo };
  });
}

function kpi(rotulo, valor, detalhe, atencao = false, tom = "") {
  return { rotulo, valor: valor == null || valor === "" ? "—" : String(valor), detalhe, atencao, tom };
}

function bloco(titulo, itens, vazio, pergunta) {
  return { titulo, itens, vazio: itens.length ? "" : vazio, pergunta };
}

function item(titulo, detalhe, texto = "", marca = "", processo = "", pergunta = "") {
  return { titulo, detalhe, texto, marca, processo, ...(pergunta ? { pergunta } : {}) };
}

function perguntaCliente(nome) {
  const limpo = String(nome ?? "").replace(/["']/g, "").trim();
  return `Ficha do cliente ${limpo}: processos abertos, vendedor, quantos estão sem proposta, o último processo e a comissão deste mês.`;
}

async function cadastroDaPessoa(pool, email, nome) {
  const conta = String(email ?? "").trim().toLowerCase();
  const porEmail = await pool.request().input("email", sql.VarChar(180), conta).query(`
    SELECT TOP 1 IdPessoa, Nome
    FROM cad_Pessoa
    WHERE LOWER(LTRIM(RTRIM(ISNULL(EMail, '')))) = @email
       OR LOWER(LTRIM(RTRIM(ISNULL(EMail_Pessoal, '')))) = @email`);
  if (porEmail.recordset[0]) return porEmail.recordset[0];
  const nomeSistema = tokens(nome, conta);
  if (!nomeSistema) return null;
  const porNome = await pool
    .request()
    .input("primeiro", sql.VarChar(80), nomeSistema.primeiro)
    .input("ultimo", sql.VarChar(80), nomeSistema.ultimo)
    .query(`
      SELECT TOP 1 IdPessoa, Nome
      FROM cad_Pessoa
      WHERE Nome LIKE @primeiro + ' %' AND Nome LIKE '% ' + @ultimo
      ORDER BY LEN(Nome)`);
  return porNome.recordset[0] ?? null;
}

function consultaComercial(pool, id) {
  const pedido = pool.request();
  if (id) pedido.input("id", sql.Int, id);
  return pedido;
}

function reais(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function modalidadeSql(modalidade) {
  return ["IA", "EA", "IM", "EM"].includes(modalidade) ? `AND Lhs.Numero_Processo LIKE '${modalidade}%'` : "";
}

async function contar(pool, comando) {
  const r = await pool.request().query(comando);
  return Number(r.recordset[0]?.Total ?? r.recordset[0]?.Qtd ?? 0) || 0;
}

async function telaTi(pool) {
  const alteracoes = await alteracoes24h(pool);
  return {
    setor: "ti",
    rotulo: "TI",
    frase: "O que mudou no sistema nas últimas 24 horas.",
    kpis: [
      kpi("Alterações", alteracoes.transacoes, "últimas 24 horas"),
      kpi("Inclusões", alteracoes.inclusoes, "últimas 24 horas"),
      kpi("Atualizações", alteracoes.atualizacoes, "últimas 24 horas"),
      kpi("Exclusões", alteracoes.exclusoes, "últimas 24 horas", alteracoes.exclusoes > 0),
    ],
    principal: bloco(
      "Últimas exclusões",
      alteracoes.apagados.map((linha) => item(linha.titulo, linha.detalhe, linha.texto, linha.hora, linha.processo)),
      "Nenhuma exclusão nas últimas 24 horas.",
      "Quais exclusões aconteceram nas últimas 24 horas? Diga usuário, tabela e horário.",
    ),
    secundarios: [
      bloco(
        "Tabelas mais alteradas",
        alteracoes.tabelas.map((linha) => item(linha.nome, `${linha.qtd} alterações`)),
        "Nenhuma tabela alterada nesse período.",
        "Monte o painel do TI das últimas 24 horas, com as tabelas mais alteradas.",
      ),
      bloco(
        "Quem mais gravou",
        alteracoes.pessoas.map((linha) => item(linha.nome, `${linha.qtd} registros`)),
        "Ninguém gravou log nesse período.",
        "Quem mais gravou log nas últimas 24 horas?",
      ),
    ],
  };
}

async function telaFinanceiro(pool) {
  const mes = `
    Lhs.Data_Abertura_Processo >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
    AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))`;
  const [comissao, taxasTotais, taxas, maiores] = await Promise.all([
    pool.request().query(`
      SELECT SUM(Com.Valor_Comissao) AS Comissao, COUNT(*) AS Qtd
      FROM mov_Logistica_House Lhs
      JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
      WHERE ${mes}`),
    pool.request().query(`
      SELECT
        SUM(Tax.Valor_Pagamento_Total) AS Pagamento,
        SUM(Tax.Valor_Recebimento_Total) AS Recebimento
      FROM mov_Logistica_Taxa Tax
      JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Tax.IdLogistica_House
      WHERE ${mes}`),
    pool.request().query(`
      SELECT TOP 6
        Exb.Nome AS Taxa,
        SUM(Tax.Valor_Pagamento_Total) AS Pagamento,
        SUM(Tax.Valor_Recebimento_Total) AS Recebimento
      FROM mov_Logistica_Taxa Tax
      JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Tax.IdLogistica_House
      LEFT JOIN cad_Taxa_Logistica_Exibicao Exb ON Exb.IdTaxa_Logistica_Exibicao = Tax.IdTaxa_Logistica_Exibicao
      WHERE ${mes}
      GROUP BY Exb.Nome
      ORDER BY SUM(Tax.Valor_Recebimento_Total) DESC`),
    pool.request().query(`
      SELECT TOP 6
        Lhs.Numero_Processo,
        Pes.Nome AS Comissionado,
        Com.Valor_Comissao
      FROM mov_Logistica_House Lhs
      JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
      LEFT JOIN cad_Pessoa Pes ON Pes.IdPessoa = Com.IdPessoa
      WHERE ${mes}
      ORDER BY Com.Valor_Comissao DESC`),
  ]);
  const casa = comissao.recordset[0] ?? {};
  const totais = taxasTotais.recordset[0] ?? {};
  const pagamento = Number(totais.Pagamento) || 0;
  const recebimento = Number(totais.Recebimento) || 0;
  const saldo = recebimento - pagamento;
  return {
    setor: "financeiro",
    rotulo: "Financeiro",
    frase: "Comissão, pagamento e recebimento dos processos abertos neste mês.",
    kpis: [
      kpi("Comissão do mês", reais(casa.Comissao), `${Number(casa.Qtd) || 0} lançamentos`),
      kpi("Pagamento", reais(pagamento), "taxas do mês", false, "pagamento"),
      kpi("Recebimento", reais(recebimento), "taxas do mês", false, "recebimento"),
      kpi("Saldo", reais(saldo), "recebimento menos pagamento", saldo < 0),
    ],
    principal: bloco(
      "Taxas com maior recebimento",
      taxas.recordset.map((linha) => ({
        ...item(String(linha.Taxa ?? "Taxa").trim() || "Taxa", ""),
        partes: [
          { texto: `Pagamento ${reais(linha.Pagamento)}`, tom: "pagamento" },
          { texto: `Recebimento ${reais(linha.Recebimento)}`, tom: "recebimento" },
        ],
      })),
      "Nenhuma taxa neste mês.",
      "Quais as taxas deste mês, com nome, pagamento e recebimento?",
    ),
    secundarios: [
      bloco(
        "Maiores comissões",
        maiores.recordset.map((linha) => item(
          String(linha.Numero_Processo ?? "").trim(),
          [String(linha.Comissionado ?? "").trim(), reais(linha.Valor_Comissao)].filter(Boolean).join(" · "),
        )),
        "Nenhuma comissão neste mês.",
        "Qual a comissão de vendedor neste mês, com os valores?",
      ),
    ],
  };
}

async function telaDocumental(pool) {
  const base = `
    FROM mov_Atividade Ati
    JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
    WHERE Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 6)
      AND Lhs.Data_Fechamento_Processo IS NULL
      AND Lhs.Data_Cancelamento IS NULL
      AND Lhs.Numero_Processo LIKE '%-26'`;
  const existe = (filtro) => `AND EXISTS (
    SELECT 1 FROM mov_Projeto_Atividade_Responsavel Pap
    WHERE Pap.IdProjeto_Atividade = Ati.IdProjeto_Atividade
      AND Pap.IdResponsavel = Ati.IdResponsavel
      AND ${filtro}
  )`;
  const ce = "Pap.IdPapel_Projeto = 7";
  const im = "Pap.IdPapel_Projeto IN (6, 18) AND Lhs.Numero_Processo LIKE 'IM%'";
  const [filaCe, filaIm, semLiberacao, lista] = await Promise.all([
    contar(pool, `SELECT COUNT(*) AS Total ${base} ${existe(ce)}`),
    contar(pool, `SELECT COUNT(*) AS Total ${base} ${existe(im)}`),
    contar(pool, `SELECT COUNT(*) AS Total ${base} AND ISNULL(Sta.Descricao, '') <> 'CE LIBERADO' ${existe(`(${ce} OR (${im}))`)}`),
    pool.request().query(`
      SELECT TOP 6
        Lhs.Numero_Processo,
        Cli.Nome AS Cliente,
        Tar.Descricao AS Atividade,
        ISNULL(Sta.Descricao, '') AS Situacao,
        CASE WHEN EXISTS (
          SELECT 1 FROM mov_Projeto_Atividade_Responsavel Ce
          WHERE Ce.IdProjeto_Atividade = Ati.IdProjeto_Atividade
            AND Ce.IdPapel_Projeto = 7 AND Ce.IdResponsavel = Ati.IdResponsavel
        ) THEN 'CE' ELSE 'IM' END AS Caso
      ${base.replace("LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico", "LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico")}
      ${existe(`(${ce} OR (${im}))`)}
      ORDER BY Lhs.Data_Abertura_Processo DESC`),
  ]);
  const sem = lista.recordset.filter((linha) => String(linha.Situacao).toUpperCase() !== "CE LIBERADO").slice(0, 6);
  return {
    setor: "documental",
    rotulo: "Documental",
    frase: "Fila do CE e do IM, e o que ainda não está com CE liberado.",
    kpis: [
      kpi("Fila do CE", filaCe, "atividades abertas"),
      kpi("Fila do IM", filaIm, "atividades abertas"),
      kpi("Sem CE liberado", semLiberacao, "CE e IM", semLiberacao > 0),
      kpi("Na amostra", lista.recordset.length, "processos mais recentes"),
    ],
    principal: bloco(
      "Fila atual",
      lista.recordset.map((linha) => item(
        String(linha.Numero_Processo ?? "").trim(),
        [linha.Caso, String(linha.Atividade ?? "").trim(), String(linha.Cliente ?? "").trim()].filter(Boolean).join(" · "),
        "",
        String(linha.Situacao).toUpperCase() === "CE LIBERADO" ? "Liberado" : "Pendente",
      )),
      "Nenhuma atividade aberta no documental.",
      "Quais atividades estão agora com o documental CE e com o documental IM?",
    ),
    secundarios: [
      bloco(
        "Ainda sem CE liberado",
        sem.map((linha) => item(String(linha.Numero_Processo ?? "").trim(), String(linha.Situacao ?? "").trim() || "Sem situação", "", linha.Caso)),
        "Nada pendente de liberação nessa amostra.",
        "Quais atividades do documental CE e do documental IM ainda não têm o CE liberado?",
      ),
    ],
  };
}

async function telaOperacional(pool, email, nome, modalidade) {
  const filtro = modalidadeSql(modalidade);
  const ondeAberto = `Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Cancelamento IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date)) ${filtro}`;
  const ondePrazo = `(
    (Lms.Data_Embarque IS NULL AND Lms.Data_Previsao_Embarque IS NOT NULL AND Lms.Data_Previsao_Embarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
    OR (Lms.Data_Desembarque IS NULL AND Lms.Data_Previsao_Desembarque IS NOT NULL AND Lms.Data_Previsao_Desembarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
    OR (Lhs.Data_Entrega IS NULL AND Lhs.Data_Previsao_Entrega IS NOT NULL AND Lhs.Data_Previsao_Entrega < DATEADD(day, 7, CAST(GETDATE() AS date)))
  )`;
  const modais = ["IA", "EA", "IM", "EM"].includes(modalidade) ? [modalidade] : ["IA", "IM", "EA", "EM"];
  const movimentoSql = modais
    .map((modal) => {
      const coluna = modal.startsWith("E") ? "Lms.Data_Embarque" : "Lms.Data_Desembarque";
      const evento = modal.startsWith("E") ? "Embarcou" : "Desembarcou";
      return `
        SELECT Lhs.Numero_Processo, Cli.Nome AS Cliente, '${evento}' AS Evento
        FROM mov_Logistica_House Lhs
        LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
        LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
        WHERE Lhs.Data_Cancelamento IS NULL
          AND Lhs.Numero_Processo LIKE '${modal}%'
          AND CAST(${coluna} AS date) = CAST(GETDATE() AS date)`;
    })
    .join(" UNION ALL ");
  const [prazosQtd, paradosQtd, pendencias, prazos, parados, movimento] = await Promise.all([
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master WHERE ${ondeAberto} AND ${ondePrazo}`),
    contar(pool, `
      SELECT COUNT(*) AS Total
      FROM mov_Logistica_House Lhs
      OUTER APPLY (SELECT MAX(A.Data) AS Data FROM mov_Acompanhamento A WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade) Ult
      WHERE ${ondeAberto} AND (Ult.Data IS NULL OR Ult.Data < DATEADD(day, -7, GETDATE()))`),
    pendenciasDaPessoa(pool, email, nome),
    pool.request().query(`
      SELECT TOP 6 Lhs.Numero_Processo, Cli.Nome AS Cliente
      FROM mov_Logistica_House Lhs
      LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE ${ondeAberto} AND ${ondePrazo}
      ORDER BY COALESCE(Lms.Data_Previsao_Embarque, Lms.Data_Previsao_Desembarque, Lhs.Data_Previsao_Entrega)`),
    pool.request().query(`
      SELECT TOP 6 Lhs.Numero_Processo, Cli.Nome AS Cliente
      FROM mov_Logistica_House Lhs
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      OUTER APPLY (SELECT MAX(A.Data) AS Data FROM mov_Acompanhamento A WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade) Ult
      WHERE ${ondeAberto} AND (Ult.Data IS NULL OR Ult.Data < DATEADD(day, -7, GETDATE()))
      ORDER BY Lhs.Numero_Processo`),
    pool.request().query(`
      SELECT TOP 8 Numero_Processo, Cliente, Evento
      FROM (${movimentoSql}) Mov
      ORDER BY Evento, Numero_Processo`),
  ]);
  return {
    setor: "operacional",
    rotulo: modalidade ? `Operacional ${modalidade}` : "Operacional",
    frase: modalidade.startsWith("E")
      ? "Prazos dos próximos 7 dias, embarques de hoje e as suas atividades."
      : modalidade.startsWith("I")
        ? "Prazos dos próximos 7 dias, desembarques de hoje e as suas atividades."
        : "Prazos dos próximos 7 dias, embarques e desembarques de hoje e as suas atividades.",
    kpis: [
      kpi("Prazos em 7 dias", prazosQtd, "embarque, desembarque ou entrega", prazosQtd > 0),
      kpi("Parados", paradosQtd, "sem nota há 7 dias", paradosQtd > 0),
      kpi("Atrasadas", pendencias.encontrado ? pendencias.atrasadas : "—", "suas atividades", pendencias.atrasadas > 0),
      kpi("Para hoje", pendencias.encontrado ? pendencias.hoje : "—", "suas atividades"),
    ],
    principal: bloco(
      "Prazos vencendo",
      prazos.recordset.map((linha) => item(String(linha.Numero_Processo ?? "").trim(), String(linha.Cliente ?? "").trim())),
      "Nenhum prazo nesse recorte.",
      "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?",
    ),
    aviso: bloco(
      modalidade.startsWith("E") ? "Embarcados hoje" : modalidade.startsWith("I") ? "Desembarcados hoje" : "Movimento de hoje",
      movimento.recordset.map((linha) =>
        item(
          String(linha.Numero_Processo ?? "").trim(),
          String(linha.Cliente ?? "").trim(),
          "",
          modais.length > 1 ? String(linha.Evento ?? "") : "",
        ),
      ),
      modalidade.startsWith("E")
        ? "Nenhum embarque registrado hoje."
        : modalidade.startsWith("I")
          ? "Nenhum desembarque registrado hoje."
          : "Nenhum embarque ou desembarque registrado hoje.",
      modalidade.startsWith("E")
        ? `Quais processos ${modalidade} embarcaram hoje?`
        : modalidade.startsWith("I")
          ? `Quais processos ${modalidade} desembarcaram hoje?`
          : "Quais processos embarcaram ou desembarcaram hoje?",
    ),
    secundarios: [
      bloco(
        "Sem acompanhamento",
        parados.recordset.map((linha) => item(String(linha.Numero_Processo ?? "").trim(), String(linha.Cliente ?? "").trim())),
        "Nenhum processo parado há 7 dias.",
        "Quais processos estão parados há 7 dias sem acompanhamento?",
      ),
      bloco(
        "Suas pendências",
        (pendencias.itens ?? []).map((linha) => item(linha.atividade, [linha.processo, linha.quando].filter(Boolean).join(" · "), "", linha.situacao === "atrasada" ? "Atrasada" : linha.situacao === "hoje" ? "Hoje" : "Semana")),
        pendencias.encontrado ? "Nada atrasado nem previsto para a semana." : "Não localizei seu cadastro.",
        "Quais são minhas pendências atrasadas, de hoje e da semana?",
      ),
    ],
  };
}

async function rankingFechamentos(pool) {
  const linhas = await pool.request().query(`
    SELECT TOP 8 Nome, Qtd
    FROM (
      SELECT
        LTRIM(RTRIM(Ven.Nome)) AS Nome,
        COUNT(*) AS Qtd
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
      WHERE Lhs.Data_Cancelamento IS NULL
        AND Lhs.IdVendedor IS NOT NULL
        AND Lhs.Numero_Processo NOT LIKE 'DEMU%'
        AND Lhs.Numero_Processo NOT LIKE 'TESTE%'
        AND Lhs.Data_Abertura_Processo >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
        AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      GROUP BY LTRIM(RTRIM(Ven.Nome))
    ) Ranking
    WHERE Nome <> ''
    ORDER BY Qtd DESC, Nome`);
  return linhas.recordset.map((linha) => ({
    nome: String(linha.Nome ?? "").trim(),
    qtd: Number(linha.Qtd) || 0,
  }));
}

async function telaComercial(pool, email, nome, inside, escondeComissao, admin) {
  const pessoa = admin ? null : await cadastroDaPessoa(pool, email, nome);
  const id = admin ? 0 : Number(pessoa?.IdPessoa) || 0;
  const pendencias = await pendenciasDaPessoa(pool, email, nome);
  const pendenciasBloco = bloco(
    "Suas pendências",
    (pendencias.itens ?? []).map((linha) => item(linha.atividade, [linha.processo, linha.quando].filter(Boolean).join(" · "), "", linha.situacao === "atrasada" ? "Atrasada" : linha.situacao === "hoje" ? "Hoje" : "Semana")),
    pendencias.encontrado ? "Nada atrasado nem previsto para a semana." : "Não localizei seu cadastro.",
    "Quais são minhas pendências atrasadas, de hoje e da semana?",
  );
  const vazioCarteira = "Não localizei seu cadastro para montar a carteira.";
  if (!admin && !id) {
    return {
      setor: inside ? "inside" : "comercial",
      rotulo: "Comercial",
      frase: "Não localizei seu cadastro de vendedor para montar a carteira.",
      kpis: [
        kpi("Sem proposta", "—", "sua carteira"),
        kpi("Comissão do mês", "—", escondeComissao ? "fora deste acesso" : "sua carteira"),
        kpi("Atrasadas", pendencias.encontrado ? pendencias.atrasadas : "—", "suas atividades", pendencias.atrasadas > 0),
        kpi("Para hoje", pendencias.encontrado ? pendencias.hoje : "—", `${pendencias.semana || 0} na semana`),
      ],
      principal: pendenciasBloco,
      secundarios: [
        bloco("Com mais processos abertos", [], vazioCarteira, ""),
        bloco("Com processo sem proposta", [], vazioCarteira, ""),
        bloco("Sem movimento", [], vazioCarteira, ""),
      ],
      ranking: null,
    };
  }

  const filtro = id ? "AND Lhs.IdVendedor = @id" : "";
  const real = "Lhs.Data_Cancelamento IS NULL AND Lhs.Numero_Processo NOT LIKE '%TESTE%' AND Lhs.Numero_Processo NOT LIKE 'DEMU%'";
  const aberto = `${real} AND Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`;
  const inicioMes = "DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)";
  const doMes = `${inicioMes} AND Lhs.Data_Abertura_Processo < DATEADD(month, 1, ${inicioMes})`;
  const recorte = admin ? "da empresa" : "da sua carteira";
  const [semProposta, comissao, maisAbertos, semPropostaClientes, semMovimento, fechamentos] = await Promise.all([
    consultaComercial(pool, id).query(`SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs WHERE ${aberto} AND Lhs.IdOferta_Frete IS NULL ${filtro}`),
    escondeComissao
      ? Promise.resolve(null)
      : consultaComercial(pool, id).query(`
          SELECT SUM(Com.Valor_Comissao) AS Comissao
          FROM mov_Logistica_House Lhs
          JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
          WHERE Lhs.Data_Abertura_Processo >= ${doMes}
            ${id ? "AND (Lhs.IdVendedor = @id OR Com.IdPessoa = @id)" : ""}`),
    consultaComercial(pool, id).query(`
      SELECT TOP 6 Nome, Qtd
      FROM (
        SELECT LTRIM(RTRIM(Cli.Nome)) AS Nome, COUNT(*) AS Qtd
        FROM mov_Logistica_House Lhs
        JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
        WHERE ${aberto} ${filtro}
        GROUP BY LTRIM(RTRIM(Cli.Nome))
      ) C
      WHERE Nome <> ''
      ORDER BY Qtd DESC, Nome`),
    consultaComercial(pool, id).query(`
      SELECT TOP 6 Nome, Qtd
      FROM (
        SELECT LTRIM(RTRIM(Cli.Nome)) AS Nome, COUNT(*) AS Qtd
        FROM mov_Logistica_House Lhs
        JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
        WHERE ${aberto} AND Lhs.IdOferta_Frete IS NULL ${filtro}
        GROUP BY LTRIM(RTRIM(Cli.Nome))
      ) C
      WHERE Nome <> ''
      ORDER BY Qtd DESC, Nome`),
    consultaComercial(pool, id).query(`
      SELECT TOP 6 Nome, Dias
      FROM (
        SELECT LTRIM(RTRIM(Cli.Nome)) AS Nome,
          DATEDIFF(day, MAX(Lhs.Data_Abertura_Processo), CAST(GETDATE() AS date)) AS Dias
        FROM mov_Logistica_House Lhs
        JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
        WHERE ${real} ${filtro}
        GROUP BY LTRIM(RTRIM(Cli.Nome))
        HAVING MAX(Lhs.Data_Abertura_Processo) < DATEADD(day, -90, CAST(GETDATE() AS date))
      ) C
      WHERE Nome <> ''
      ORDER BY Dias DESC, Nome`),
    admin && !inside ? rankingFechamentos(pool) : Promise.resolve([]),
  ]);
  const totalSemProposta = Number(semProposta.recordset[0]?.Total) || 0;
  const casa = comissao?.recordset[0] ?? {};
  const clientes = (linhas, sufixo) => linhas.recordset.map((linha) => {
    const cliente = String(linha.Nome ?? "").trim();
    return item(cliente, `${Number(linha.Qtd) || 0} ${sufixo}`, "", "", "", perguntaCliente(cliente));
  });
  return {
    setor: inside ? "inside" : "comercial",
    rotulo: "Comercial",
    frase: admin
      ? inside
        ? "Processos sem proposta, clientes e as atividades que estão com você."
        : "Clientes, comissão do mês e as suas pendências."
      : "Sua carteira: clientes, comissão do mês e as suas pendências.",
    kpis: [
      kpi("Sem proposta", totalSemProposta, `abertos nos últimos 6 meses, ${recorte}`, totalSemProposta > 0),
      kpi("Comissão do mês", escondeComissao ? "—" : reais(casa.Comissao), escondeComissao ? "fora deste acesso" : recorte),
      kpi("Atrasadas", pendencias.encontrado ? pendencias.atrasadas : "—", "suas atividades", pendencias.atrasadas > 0),
      kpi("Para hoje", pendencias.encontrado ? pendencias.hoje : "—", `${pendencias.semana || 0} na semana`),
    ],
    principal: pendenciasBloco,
    secundarios: [
      bloco(
        "Com mais processos abertos",
        clientes(maisAbertos, "abertos"),
        "Nenhum cliente com processo aberto.",
        "Quais clientes têm mais processos abertos?",
      ),
      bloco(
        "Com processo sem proposta",
        clientes(semPropostaClientes, "sem proposta"),
        "Nenhum cliente com processo sem proposta.",
        "Quais clientes têm processo aberto sem proposta?",
      ),
      bloco(
        "Sem movimento",
        semMovimento.recordset.map((linha) => {
          const cliente = String(linha.Nome ?? "").trim();
          return item(cliente, `${Number(linha.Dias) || 0} dias sem abrir`, "", "", "", perguntaCliente(cliente));
        }),
        "Nenhum cliente sem movimento há 90 dias.",
        "Quais clientes já abriram processo e não abrem há 90 dias?",
      ),
    ],
    ranking: admin && !inside
      ? {
          titulo: "Quem fechou mais",
          detalhe: "processos abertos neste mês",
          vazio: "Nenhum processo aberto neste mês.",
          itens: fechamentos,
        }
      : null,
  };
}

async function telaGeral(pool, email, nome) {
  const casa = await pendenciasDaPessoa(pool, email, nome);
  const fila = (casa.atrasadas || 0) + (casa.hoje || 0) + (casa.semana || 0);
  const pendencias = (casa.itens ?? []).map((linha) => item(linha.atividade, [linha.processo, linha.quando].filter(Boolean).join(" · "), "", linha.situacao === "atrasada" ? "Atrasada" : linha.situacao === "hoje" ? "Hoje" : "Semana"));
  return {
    setor: "geral",
    rotulo: "Geral",
    frase: "As atividades que estão com você.",
    kpis: [
      kpi("Com você", casa.encontrado ? fila : "—", "atrasadas, hoje e na semana"),
      kpi("Atrasadas", casa.encontrado ? casa.atrasadas : "—", "suas atividades", casa.atrasadas > 0),
      kpi("Para hoje", casa.encontrado ? casa.hoje : "—", "suas atividades"),
      kpi("Na semana", casa.encontrado ? casa.semana : "—", "próximos 7 dias"),
    ],
    principal: bloco(
      "Suas pendências",
      pendencias,
      casa.encontrado ? "Nada atrasado nem previsto para a semana." : "Não localizei seu cadastro.",
      "Quais são minhas pendências atrasadas, de hoje e da semana?",
    ),
    secundarios: [],
  };
}

async function telaTudo(pool) {
  const [abertos, semProposta, atrasadas, parados] = await Promise.all([
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs WHERE Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Cancelamento IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`),
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs WHERE Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Cancelamento IS NULL AND Lhs.IdOferta_Frete IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`),
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Atividade Ati WHERE Ati.Data_Termino IS NULL AND Ati.Situacao NOT IN (4, 6) AND Ati.Previsao_Termino IS NOT NULL AND CAST(Ati.Previsao_Termino AS date) < CAST(GETDATE() AS date) AND Ati.Previsao_Termino >= DATEADD(month, -6, CAST(GETDATE() AS date))`),
    contar(pool, `
      SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs
      OUTER APPLY (SELECT MAX(A.Data) AS Data FROM mov_Acompanhamento A WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade) Ult
      WHERE Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Cancelamento IS NULL
        AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))
        AND (Ult.Data IS NULL OR Ult.Data < DATEADD(day, -7, GETDATE()))`),
  ]);
  return {
    setor: "tudo",
    rotulo: "Todos os setores",
    frase: "Panorama dos últimos 6 meses: abertos, sem proposta, atrasados e parados.",
    kpis: [
      kpi("Abertos", abertos, "processos"),
      kpi("Sem proposta", semProposta, "inside e comercial", semProposta > 0),
      kpi("Atividades atrasadas", atrasadas, "todos os setores", atrasadas > 0),
      kpi("Parados", parados, "sem nota há 7 dias", parados > 0),
    ],
    principal: bloco("Como ler estes números", [
      item("Abertos", "Processos dos últimos 6 meses que ainda não fecharam."),
      item("Sem proposta", "Abertos que ainda não têm oferta ligada."),
      item("Atividades atrasadas", "Previsão de término anterior a hoje."),
      item("Parados", "Sem acompanhamento registrado há 7 dias."),
    ], "", "Como está a fila dos setores: processos abertos, sem proposta, atrasados e parados?"),
    secundarios: [],
  };
}

const NOMES_MODAL = { IA: "importação aérea", EA: "exportação aérea", IM: "importação marítima", EM: "exportação marítima" };

async function telaGerencia(pool, modalidade) {
  const filtro = modalidadeSql(modalidade);
  const real = `Lhs.Data_Cancelamento IS NULL AND Lhs.Numero_Processo NOT LIKE '%TESTE%' AND Lhs.Numero_Processo NOT LIKE 'DEMU%' ${filtro}`;
  const aberto = `${real} AND Lhs.Data_Fechamento_Processo IS NULL AND Lhs.Data_Abertura_Processo >= DATEADD(month, -6, CAST(GETDATE() AS date))`;
  const inicioMes = "DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)";
  const doMes = (coluna) => `${coluna} >= ${inicioMes} AND ${coluna} < DATEADD(month, 1, ${inicioMes})`;
  const atrasada = `
    FROM mov_Atividade Ati
    JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade = Ati.IdProjeto_Atividade
    WHERE Ati.Data_Termino IS NULL
      AND Ati.Situacao NOT IN (4, 5, 6)
      AND Ati.Previsao_Termino < CAST(GETDATE() AS date)
      AND Ati.Previsao_Termino >= DATEADD(month, -6, CAST(GETDATE() AS date))
      AND ${real}`;
  const prazo = `(
    (Lms.Data_Embarque IS NULL AND Lms.Data_Previsao_Embarque IS NOT NULL AND Lms.Data_Previsao_Embarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
    OR (Lms.Data_Desembarque IS NULL AND Lms.Data_Previsao_Desembarque IS NOT NULL AND Lms.Data_Previsao_Desembarque < DATEADD(day, 7, CAST(GETDATE() AS date)))
    OR (Lhs.Data_Entrega IS NULL AND Lhs.Data_Previsao_Entrega IS NOT NULL AND Lhs.Data_Previsao_Entrega < DATEADD(day, 7, CAST(GETDATE() AS date)))
  )`;
  const semNota = `OUTER APPLY (SELECT MAX(A.Data) AS Data FROM mov_Acompanhamento A WHERE A.IdProjeto_Atividade = Lhs.IdProjeto_Atividade) Ult`;
  const parado = "(Ult.Data IS NULL OR Ult.Data < DATEADD(day, -7, GETDATE()))";

  const [
    abertos, novos, movimentados, semProposta, atrasadas, parados, prazos,
    financeiro, porOperacao, carga, gargalos, clientes, listaPrazos, vendedores,
  ] = await Promise.all([
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs WHERE ${aberto}`),
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs WHERE ${real} AND ${doMes("Lhs.Data_Abertura_Processo")}`),
    contar(pool, `
      SELECT COUNT(*) AS Total
      FROM mov_Logistica_House Lhs
      JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
      WHERE ${real}
        AND ((LEFT(Lhs.Numero_Processo, 1) = 'E' AND ${doMes("Lms.Data_Embarque")})
          OR (LEFT(Lhs.Numero_Processo, 1) = 'I' AND ${doMes("Lms.Data_Desembarque")}))`),
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs WHERE ${aberto} AND Lhs.IdOferta_Frete IS NULL`),
    contar(pool, `SELECT COUNT(*) AS Total ${atrasada}`),
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs ${semNota} WHERE ${aberto} AND ${parado}`),
    contar(pool, `SELECT COUNT(*) AS Total FROM mov_Logistica_House Lhs LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master WHERE ${aberto} AND ${prazo}`),
    pool.request().query(`
      SELECT
        (SELECT SUM(Com.Valor_Comissao) FROM mov_Logistica_House Lhs
          JOIN mov_Oferta_Frete_Comissao Com ON Com.IdOferta_Frete = Lhs.IdOferta_Frete
          WHERE ${real} AND ${doMes("Lhs.Data_Abertura_Processo")}) AS Comissao,
        (SELECT SUM(Tax.Valor_Recebimento_Total) - SUM(Tax.Valor_Pagamento_Total) FROM mov_Logistica_Taxa Tax
          JOIN mov_Logistica_House Lhs ON Lhs.IdLogistica_House = Tax.IdLogistica_House
          WHERE ${real} AND ${doMes("Lhs.Data_Abertura_Processo")}) AS Saldo`),
    pool.request().query(
      modalidade
        ? `SELECT TOP 6 ISNULL(Sta.Descricao, 'Sem situação') AS Nome, COUNT(*) AS Qtd
           FROM mov_Logistica_House Lhs
           LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico = Lhs.IdStatus_Processo_Logistico
           WHERE ${aberto}
           GROUP BY Sta.Descricao
           ORDER BY COUNT(*) DESC`
        : `SELECT LEFT(Lhs.Numero_Processo, 2) AS Nome, COUNT(*) AS Qtd
           FROM mov_Logistica_House Lhs
           WHERE ${aberto} AND LEFT(Lhs.Numero_Processo, 2) IN ('IA', 'EA', 'IM', 'EM')
           GROUP BY LEFT(Lhs.Numero_Processo, 2)
           ORDER BY COUNT(*) DESC`,
    ),
    pool.request().query(`
      SELECT TOP 8 LTRIM(RTRIM(Res.Nome)) AS Nome, COUNT(*) AS Qtd
      ${atrasada.replace("WHERE", "JOIN cad_Pessoa Res ON Res.IdPessoa = Ati.IdResponsavel WHERE")}
      GROUP BY LTRIM(RTRIM(Res.Nome))
      ORDER BY COUNT(*) DESC`),
    pool.request().query(`
      SELECT TOP 6 Tar.Descricao AS Nome, COUNT(*) AS Qtd
      ${atrasada.replace("WHERE", "JOIN cad_Tarefa Tar ON Tar.IdTarefa = Ati.IdTarefa WHERE")}
      GROUP BY Tar.Descricao
      ORDER BY COUNT(*) DESC`),
    pool.request().query(`
      SELECT TOP 6 LTRIM(RTRIM(Cli.Nome)) AS Nome, COUNT(*) AS Qtd
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE ${aberto}
      GROUP BY LTRIM(RTRIM(Cli.Nome))
      ORDER BY COUNT(*) DESC`),
    pool.request().query(`
      SELECT TOP 6 Lhs.Numero_Processo, Cli.Nome AS Cliente
      FROM mov_Logistica_House Lhs
      LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master = Lhs.IdLogistica_Master
      LEFT JOIN cad_Pessoa Cli ON Cli.IdPessoa = Lhs.IdCliente
      WHERE ${aberto} AND ${prazo}
      ORDER BY COALESCE(Lms.Data_Previsao_Embarque, Lms.Data_Previsao_Desembarque, Lhs.Data_Previsao_Entrega)`),
    pool.request().query(`
      SELECT TOP 8 LTRIM(RTRIM(Ven.Nome)) AS Nome, COUNT(*) AS Qtd
      FROM mov_Logistica_House Lhs
      JOIN cad_Pessoa Ven ON Ven.IdPessoa = Lhs.IdVendedor
      WHERE ${real} AND ${doMes("Lhs.Data_Abertura_Processo")}
      GROUP BY LTRIM(RTRIM(Ven.Nome))
      ORDER BY COUNT(*) DESC`),
  ]);

  const fin = financeiro.recordset[0] ?? {};
  const saldo = Number(fin.Saldo) || 0;
  const contagem = (linhas, sufixo) => linhas.recordset.map((linha) => item(String(linha.Nome ?? "").trim() || "—", `${Number(linha.Qtd) || 0} ${sufixo}`));
  const nomeModal = modalidade ? `${modalidade} · ${NOMES_MODAL[modalidade]}` : "";
  const sobre = modalidade ? ` de ${modalidade}` : "";
  return {
    setor: "gerencia",
    rotulo: modalidade ? `Gerência ${modalidade}` : "Gerência",
    frase: modalidade
      ? `Panorama da equipe de ${nomeModal}: volume, atrasos, gargalos e resultado do mês.`
      : "Panorama da equipe em todas as operações: volume, atrasos, gargalos e resultado do mês.",
    kpis: [
      kpi("Abertos", abertos, "últimos 6 meses"),
      kpi("Novos no mês", novos, "processos abertos"),
      kpi("Movimentados no mês", movimentados, "embarques e desembarques"),
      kpi("Sem proposta", semProposta, "abertos sem oferta", semProposta > 0),
      kpi("Atividades atrasadas", atrasadas, "últimos 6 meses", atrasadas > 0),
      kpi("Parados", parados, "sem nota há 7 dias", parados > 0),
      kpi("Prazos em 7 dias", prazos, "embarque, desembarque ou entrega", prazos > 0),
      kpi("Comissão do mês", reais(fin.Comissao), `saldo de taxas ${reais(saldo)}`, saldo < 0),
    ],
    ranking: {
      titulo: "Processos por vendedor",
      detalhe: modalidade ? `abertos neste mês em ${modalidade}` : "abertos neste mês",
      vazio: "Nenhum processo aberto neste mês.",
      itens: vendedores.recordset.map((linha) => ({ nome: String(linha.Nome ?? "").trim(), qtd: Number(linha.Qtd) || 0 })),
    },
    principal: bloco(
      modalidade ? "Abertos por situação" : "Abertos por operação",
      modalidade
        ? contagem(porOperacao, "processos")
        : porOperacao.recordset.map((linha) => item(`${linha.Nome} · ${NOMES_MODAL[linha.Nome] ?? ""}`, `${Number(linha.Qtd) || 0} processos`)),
      "Nenhum processo aberto.",
      `Quantos processos${sobre} estão abertos, separados por ${modalidade ? "situação" : "operação"}?`,
    ),
    aviso: bloco(
      "Carga por responsável",
      contagem(carga, "atividades atrasadas"),
      "Ninguém com atividade atrasada.",
      `Quem da equipe${sobre} tem mais atividades atrasadas, e quais são?`,
    ),
    secundarios: [
      bloco(
        "Gargalos: etapas que mais atrasam",
        contagem(gargalos, "atrasadas"),
        "Nenhuma etapa com atraso.",
        `Quais tarefas${sobre} mais acumulam atividades atrasadas?`,
      ),
      bloco(
        "Prazos vencendo",
        listaPrazos.recordset.map((linha) => item(String(linha.Numero_Processo ?? "").trim(), String(linha.Cliente ?? "").trim())),
        "Nenhum prazo nos próximos 7 dias.",
        "Quais prazos de embarque, desembarque e entrega vencem nos próximos 7 dias?",
      ),
      bloco(
        "Clientes com mais processos abertos",
        contagem(clientes, "abertos"),
        "Nenhum cliente com processo aberto.",
        `Quais clientes têm mais processos${sobre} abertos?`,
      ),
    ],
  };
}

export async function resumoInicial(pool, { email, nome, token, visao, admin, setorManual, modalidadeManual }) {
  const perfil = await perfilDaConta(pool, email, nome).catch(() => ({ setor: "geral", modalidade: "", semComissao: true }));
  const opcoes = ["ti", "financeiro", "documental", "operacional", "comercial", "inside", "tudo", "gerencia"];
  const manual = setorManual && setorManual !== "auto" ? setorManual : "";
  const setor = admin && opcoes.includes(visao) ? visao : (manual || perfil.setor || "geral");
  const modalManual = ["IA", "EA", "IM", "EM"].includes(modalidadeManual) ? modalidadeManual : "";
  if (setor === "gerencia") return telaGerencia(pool, admin ? "" : modalManual);
  const modalidade = !admin && setor === "operacional"
    ? modalManual || (modalidadeManual === "todas" ? "" : String(perfil.modalidade ?? ""))
    : "";
  if (setor === "ti") return telaTi(pool);
  if (setor === "financeiro") return telaFinanceiro(pool);
  if (setor === "documental") return telaDocumental(pool);
  if (setor === "operacional") return telaOperacional(pool, email, nome, modalidade);
  if (setor === "comercial" || setor === "inside") return telaComercial(pool, email, nome, setor === "inside", Boolean(perfil.semComissao) && !admin, Boolean(admin));
  if (setor === "tudo") return telaTudo(pool);
  return telaGeral(pool, email, nome);
}
