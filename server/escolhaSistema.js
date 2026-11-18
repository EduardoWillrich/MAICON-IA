import sql from "mssql";

const FIXOS = {
  tipo_carga: [
    { nome: "Aéreo", codigo: "1", aliases: ["aereo", "aéreo"] },
    { nome: "Break bulk", codigo: "2", aliases: ["breakbulk", "break bulk", "granel", "carga solta"] },
    { nome: "FCL", codigo: "3", aliases: ["container cheio", "full container"] },
    { nome: "LCL", codigo: "4", aliases: ["consolidado", "carga consolidada", "less container load"] },
    { nome: "Ro-Ro", codigo: "5", aliases: ["roro", "ro ro", "roll on roll off"] },
    { nome: "Terrestre", codigo: "6", aliases: ["rodoviario", "rodoviário"] },
  ],
  tipo_servico: [
    { nome: "Porta a porta", codigo: "1", aliases: ["porta a porta", "door to door"] },
    { nome: "Porta a porto", codigo: "2", aliases: ["porta a porto", "door to port"] },
    { nome: "Porto a porta", codigo: "3", aliases: ["porto a porta", "port to door"] },
    { nome: "Porto a porto", codigo: "4", aliases: ["porto a porto", "port to port"] },
  ],
  canal: [
    { nome: "Verde", codigo: "1", aliases: ["canal verde"] },
    { nome: "Amarelo", codigo: "2", aliases: ["canal amarelo"] },
    { nome: "Vermelho", codigo: "3", aliases: ["canal vermelho"] },
    { nome: "Cinza", codigo: "4", aliases: ["canal cinza"] },
  ],
  situacao_embarque: [
    { nome: "Aguardando embarque", aliases: ["aguardando embarque"] },
    { nome: "Embarcado", aliases: ["embarcado"] },
    { nome: "Desembarcado", aliases: ["desembarcado"] },
    { nome: "Cancelado", aliases: ["cancelado"] },
    { nome: "Finalizado", aliases: ["finalizado"] },
  ],
};

export function normalizarEscolha(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function compacto(texto) {
  return normalizarEscolha(texto).replace(/ /g, "");
}

function temPalavra(campo, palavras) {
  const n = ` ${normalizarEscolha(campo)} `;
  return palavras.some((palavra) => n.includes(` ${normalizarEscolha(palavra)} `));
}

export function dominioDoCampo(campo) {
  if (temPalavra(campo, ["tipo de carga", "tipo carga"])) return { dominio: "tipo_carga", papel: "" };
  if (temPalavra(campo, ["tipo de servico", "tipo servico"])) return { dominio: "tipo_servico", papel: "" };
  if (temPalavra(campo, ["canal"])) return { dominio: "canal", papel: "" };
  if (temPalavra(campo, ["situacao embarque", "situacao de embarque", "status embarque"])) return { dominio: "situacao_embarque", papel: "" };
  if (temPalavra(campo, ["incoterm"])) return { dominio: "incoterm", papel: "" };
  if (temPalavra(campo, ["navio", "vessel"])) return { dominio: "navio", papel: "" };
  if (temPalavra(campo, ["origem", "destino", "porto", "aeroporto", "transbordo"]) && !temPalavra(campo, ["data", "previsao", "situacao", "status"])) {
    return { dominio: "origem_destino", papel: "" };
  }
  if (temPalavra(campo, ["companhia", "armador", "transportador", "carrier", "cia"])) return { dominio: "companhia", papel: "" };
  if (temPalavra(campo, ["referencia", "email", "telefone", "fone", "contato", "observacao"])) return { dominio: "", papel: "" };
  if (temPalavra(campo, ["importador"])) return { dominio: "cliente", papel: "importador" };
  if (temPalavra(campo, ["exportador"])) return { dominio: "cliente", papel: "exportador" };
  if (temPalavra(campo, ["cliente"])) return { dominio: "cliente", papel: "cliente" };
  if (temPalavra(campo, ["agente", "despachante", "notify", "consignatario"])) return { dominio: "pessoa", papel: "" };
  return { dominio: "", papel: "" };
}

export function opcaoFixa(dominio, valor) {
  const lista = FIXOS[dominio];
  if (!lista) return null;
  const pedido = normalizarEscolha(valor);
  const curto = compacto(valor);
  if (!curto) return null;
  const achados = lista.filter((item) => [item.nome, ...(item.aliases || [])].some((nome) => {
    const alvo = normalizarEscolha(nome);
    return alvo === pedido || compacto(nome) === curto;
  }));
  return achados.length === 1 ? achados[0] : null;
}

export function decidirCadastro(linhas, valor) {
  const pedido = normalizarEscolha(valor);
  const curto = compacto(valor);
  const notas = (Array.isArray(linhas) ? linhas : []).map((linha) => {
    const nome = normalizarEscolha(linha?.Nome);
    const fantasia = normalizarEscolha(linha?.Fantasia);
    const sigla = normalizarEscolha(linha?.Sigla);
    const codigo = normalizarEscolha(linha?.Codigo);
    let nota = 0;
    if ([nome, fantasia, sigla, codigo].includes(pedido) || [compacto(linha?.Nome), compacto(linha?.Sigla), compacto(linha?.Codigo)].includes(curto)) nota = 3;
    else if (nome.startsWith(`${pedido} `) || nome.startsWith(pedido)) nota = 2;
    else if ((pedido.length >= 4 && (nome.includes(pedido) || fantasia.includes(pedido)))) nota = 1;
    return { ...linha, nota };
  }).filter((linha) => linha.nota > 0);
  const melhor = notas.reduce((maximo, linha) => Math.max(maximo, linha.nota), 0);
  const topo = notas.filter((linha) => linha.nota === melhor);
  if (!topo.length) return { tipo: "vazio", opcoes: [] };
  if (topo.length === 1) return { tipo: "unico", item: topo[0], opcoes: [] };
  return { tipo: "ambiguo", opcoes: topo.slice(0, 6) };
}

export function pontuarTexto(texto, valor, dica = null) {
  const limpo = normalizarEscolha(texto);
  const curto = compacto(texto);
  const alvos = [valor, dica?.nome, dica?.codigo, dica?.sigla, ...(dica?.aliases || [])].filter(Boolean);
  let pontos = 0;
  for (const alvo of alvos) {
    const nome = normalizarEscolha(alvo);
    const codigo = compacto(alvo);
    if (!codigo) continue;
    const exato = limpo === nome || curto === codigo;
    const contem = nome.length >= 3 && (limpo.includes(nome) || curto.includes(codigo));
    pontos = Math.max(pontos, exato ? 50 : contem ? 18 : 0);
  }
  const nome = normalizarEscolha(dica?.nome);
  const sigla = compacto(dica?.sigla);
  if (nome && sigla && limpo.includes(nome) && curto.includes(sigla)) pontos += 25;
  return pontos;
}

export function escolherLinha(palavras, valor, dica = null) {
  const ordenadas = (Array.isArray(palavras) ? palavras : [])
    .map((item) => ({ t: String(item?.t ?? item?.T ?? ""), x: Number(item?.x ?? item?.X) || 0, y: Number(item?.y ?? item?.Y) || 0 }))
    .filter((item) => item.t)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const linhas = [];
  for (const palavra of ordenadas) {
    const ultima = linhas.at(-1);
    if (ultima && Math.abs(palavra.y - ultima.y) <= 8) {
      ultima.palavras.push(palavra);
      ultima.texto = [...ultima.palavras].sort((a, b) => a.x - b.x).map((item) => item.t).join(" ");
    } else {
      linhas.push({ y: palavra.y, palavras: [palavra], texto: palavra.t });
    }
  }
  const notas = linhas
    .map((linha) => ({ ...linha, pontos: pontuarTexto(linha.texto, valor, dica) }))
    .filter((linha) => linha.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.y - b.y);
  if (!notas.length) return { tipo: "vazio", linhas: [] };
  const melhores = notas.filter((linha) => linha.pontos === notas[0].pontos);
  if (melhores.length > 1) return { tipo: "ambiguo", linhas: melhores.map((linha) => linha.texto) };
  return { tipo: "unico", texto: melhores[0].texto, linhas: [] };
}

function textoAmbiguidade(campo, valor, opcoes) {
  const linhas = opcoes.map((item) => {
    const nome = String(item.Nome || item.Fantasia || "").trim();
    const extra = [item.Sigla, item.Codigo].map((parte) => String(parte || "").trim()).filter(Boolean);
    const distintos = [...new Set(extra)];
    return distintos.length ? `${nome} (${distintos.join(", ")})` : nome;
  });
  return `Encontrei mais de um cadastro para "${valor}" no campo ${campo}: ${linhas.join("; ")}. Diga a sigla ou o nome completo.`;
}

function termoSeguro(valor) {
  return String(valor ?? "").trim().slice(0, 60).replace(/[%_[\]]/g, "");
}

async function consultarCadastro(pool, mapa, valor) {
  const termo = termoSeguro(valor);
  if (termo.length < 2) return [];
  const pedido = pool.request().input("exato", sql.NVarChar(60), termo).input("like", sql.NVarChar(70), `%${termo}%`);
  if (mapa.dominio === "origem_destino") {
    const r = await pedido.query(`
      SELECT TOP 15 O.Nome, O.Sigla, O.Codigo, P.Nome AS Pais
      FROM cad_Origem_Destino O
      LEFT JOIN cad_Pais P ON P.IdPais = O.IdPais
      WHERE O.Ativo = 1
        AND (O.Nome LIKE @like OR O.Sigla = @exato OR O.Codigo = @exato)
      ORDER BY O.Nome`);
    return r.recordset || [];
  }
  if (mapa.dominio === "incoterm") {
    const r = await pedido.query(`
      SELECT TOP 15 Nome, Codigo, '' AS Sigla
      FROM cad_Incoterm
      WHERE Nome LIKE @like OR Codigo = @exato
      ORDER BY Codigo`);
    return r.recordset || [];
  }
  if (mapa.dominio === "navio") {
    const r = await pedido.query(`
      SELECT TOP 15 Nome, Codigo, '' AS Sigla
      FROM cad_Navio
      WHERE Nome LIKE @like OR Codigo = @exato
      ORDER BY Nome`);
    return r.recordset || [];
  }
  if (mapa.dominio === "companhia") {
    const r = await pedido.query(`
      SELECT TOP 15 P.Nome, P.Nome_Fantasia AS Fantasia, P.Codigo, T.Sigla
      FROM cad_Companhia_Transporte T
      JOIN cad_Pessoa P ON P.IdPessoa = T.IdPessoa
      WHERE P.Ativo = 1
        AND (P.Nome LIKE @like OR P.Nome_Fantasia LIKE @like OR T.Sigla = @exato OR P.Codigo = @exato)
      ORDER BY P.Nome`);
    return r.recordset || [];
  }
  if (mapa.dominio === "cliente") {
    const filtro = mapa.papel === "importador"
      ? "AND C.Importador = 1"
      : mapa.papel === "exportador"
        ? "AND C.Exportador = 1"
        : "AND C.Cliente = 1";
    const r = await pedido.query(`
      SELECT TOP 15 P.Nome, P.Nome_Fantasia AS Fantasia, P.Codigo, '' AS Sigla
      FROM cad_Cliente C
      JOIN cad_Pessoa P ON P.IdPessoa = C.IdPessoa
      WHERE P.Ativo = 1
        ${filtro}
        AND (P.Nome LIKE @like OR P.Nome_Fantasia LIKE @like OR P.Codigo = @exato)
      ORDER BY P.Nome`);
    return r.recordset || [];
  }
  const r = await pedido.query(`
    SELECT TOP 15 Nome, Nome_Fantasia AS Fantasia, Codigo, '' AS Sigla
    FROM cad_Pessoa
    WHERE Ativo = 1
      AND (Nome LIKE @like OR Nome_Fantasia LIKE @like OR Codigo = @exato)
    ORDER BY Nome`);
  return r.recordset || [];
}

function escolhaDoItem(item) {
  return {
    nome: String(item.Nome || "").trim(),
    codigo: String(item.Codigo || "").trim(),
    sigla: String(item.Sigla || "").trim(),
    aliases: [item.Fantasia, item.Pais].map((parte) => String(parte || "").trim()).filter(Boolean),
  };
}

export async function prepararEscolha(pool, campo, valor) {
  const mapa = dominioDoCampo(campo);
  const fixo = opcaoFixa(mapa.dominio, valor);
  if (fixo) {
    return {
      seguir: true,
      valor: fixo.nome,
      escolha: { nome: fixo.nome, codigo: fixo.codigo || "", sigla: "", aliases: fixo.aliases || [], lista: Boolean(fixo.codigo) },
    };
  }
  const consulta = ["origem_destino", "incoterm", "navio", "companhia", "cliente", "pessoa"].includes(mapa.dominio);
  if (!pool || !consulta) return { seguir: true, valor, escolha: null };
  try {
    const linhas = await consultarCadastro(pool, mapa, valor);
    const decisao = decidirCadastro(linhas, valor);
    if (decisao.tipo === "ambiguo") return { seguir: false, texto: textoAmbiguidade(campo, valor, decisao.opcoes) };
    if (decisao.tipo !== "unico") return { seguir: true, valor, escolha: null };
    const escolha = escolhaDoItem(decisao.item);
    const digitado = mapa.dominio === "incoterm" && escolha.codigo ? escolha.codigo : (escolha.nome || valor);
    return { seguir: true, valor: digitado, escolha };
  } catch {
    return { seguir: true, valor, escolha: null };
  }
}
