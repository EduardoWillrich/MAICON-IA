import { textoMemoria, versaoMemoria } from "./memoria.js";
import { abrirSqlite } from "./sqlite.js";

const db = abrirSqlite("conversas.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS preferencias_usuario (
    email TEXT NOT NULL,
    termo TEXT NOT NULL,
    tabela TEXT NOT NULL,
    campo TEXT NOT NULL,
    observacao TEXT NOT NULL,
    PRIMARY KEY (email, termo)
  );
  CREATE TABLE IF NOT EXISTS correcoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    visao TEXT NOT NULL DEFAULT '',
    pergunta TEXT NOT NULL,
    correcao TEXT NOT NULL,
    criado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS receitas (
    visao TEXT NOT NULL,
    chave TEXT NOT NULL,
    email TEXT NOT NULL,
    ferramentas TEXT NOT NULL,
    vezes INTEGER NOT NULL DEFAULT 1,
    atualizado TEXT NOT NULL,
    PRIMARY KEY (visao, chave)
  );
  CREATE TABLE IF NOT EXISTS glossario (
    termo TEXT PRIMARY KEY,
    significado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS uso_tabela (
    visao TEXT NOT NULL,
    tabela TEXT NOT NULL,
    vezes INTEGER NOT NULL,
    campo TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (visao, tabela)
  );
  CREATE TABLE IF NOT EXISTS falhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    visao TEXT NOT NULL,
    pergunta TEXT NOT NULL,
    motivo TEXT NOT NULL,
    criado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS avaliacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    visao TEXT NOT NULL,
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    nota INTEGER NOT NULL,
    comentario TEXT NOT NULL DEFAULT '',
    criado TEXT NOT NULL
  );
`);

try {
  db.exec(`ALTER TABLE correcoes ADD COLUMN visao TEXT NOT NULL DEFAULT ''`);
} catch {
  /* a coluna já existe nas bases novas */
}

const cacheAprendizado = new Map();
const VALIDADE_CACHE = 5 * 60 * 1000;

export function limparCacheAprendizado() {
  cacheAprendizado.clear();
}

const GLOSSARIO = [
  ["house", "Processo logístico em mov_Logistica_House. Não é endereço residencial."],
  ["ce", "Conhecimento de embarque. No documental, atividades e liberação do CE."],
  ["im", "Modalidade de processo (prefixo IM), tratada junto com o documental."],
  ["inside", "Setor inside sales. Proposta, oferta e atividades do inside."],
  ["comissão", "Comissão de vendedor no período. Use comissao_periodo, não invente SQL."],
  ["consignatário", "Quem recebe a carga. Não confundir com embarcador nem com cliente pagador."],
  ["embarcador", "Quem envia a carga. Não confundir com consignatário."],
];

const exemplosProntos = db.prepare("SELECT COUNT(*) AS n FROM glossario").get();
if (!exemplosProntos.n) {
  const gravar = db.prepare("INSERT INTO glossario (termo, significado) VALUES (?, ?)");
  for (const [termo, significado] of GLOSSARIO) gravar.run(termo, significado);
}

function agora() {
  return new Date().toISOString();
}

function emailDe(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function listarPreferencias(email) {
  return db
    .prepare(
      `SELECT termo, tabela, campo, observacao FROM preferencias_usuario WHERE email = ? ORDER BY termo`,
    )
    .all(emailDe(email));
}

export function lembrarUsuario(email, { termo, tabela, campo, observacao }) {
  const dono = emailDe(email);
  if (!dono) throw new Error("Informe o e-mail.");
  const chave = String(termo ?? "").trim().toLowerCase();
  if (!chave && !observacao) throw new Error("Informe o termo ou a observação.");
  db.prepare(
    `INSERT INTO preferencias_usuario (email, termo, tabela, campo, observacao)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email, termo) DO UPDATE SET tabela = excluded.tabela, campo = excluded.campo, observacao = excluded.observacao`,
  ).run(dono, chave || String(observacao).slice(0, 80).toLowerCase(), String(tabela ?? "").trim(), String(campo ?? "").trim(), String(observacao ?? "").trim());
  limparCacheAprendizado();
  return { preferencias: listarPreferencias(dono) };
}

export function editarUsuario(email, indice, dados) {
  const lista = listarPreferencias(email);
  const atual = lista[Number(indice)];
  if (!atual) throw new Error("Preferência não encontrada.");
  db.prepare(`DELETE FROM preferencias_usuario WHERE email = ? AND termo = ?`).run(emailDe(email), atual.termo);
  return lembrarUsuario(email, dados);
}

export function esquecerUsuario(email, termo) {
  const chave = String(termo ?? "").trim().toLowerCase();
  db.prepare(`DELETE FROM preferencias_usuario WHERE email = ? AND (termo = ? OR observacao = ?)`).run(emailDe(email), chave, String(termo ?? ""));
  limparCacheAprendizado();
  return { preferencias: listarPreferencias(email) };
}

const CORRECAO = /n[aã]o era|tabela errada|errado|n[aã]o [eé] essa|o correto [eé]|use a |cliente [eé] o|era o consignat|era o embarcador/i;

export function pareceCorrecao(texto) {
  return CORRECAO.test(String(texto ?? ""));
}

export function registrarCorrecao(email, pergunta, correcao, visao = "") {
  const dono = emailDe(email);
  const pedido = String(pergunta ?? "").trim().slice(0, 240);
  const texto = String(correcao ?? "").trim().slice(0, 400);
  if (!dono || !pedido || !texto) return;
  db.prepare(`INSERT INTO correcoes (email, visao, pergunta, correcao, criado) VALUES (?, ?, ?, ?, ?)`).run(
    dono,
    String(visao || ""),
    pedido,
    texto,
    agora(),
  );
}

export function correcoesRecentes(email) {
  return db
    .prepare(`SELECT pergunta, correcao FROM correcoes WHERE email = ? ORDER BY id DESC LIMIT 8`)
    .all(emailDe(email));
}

const PROCESSO = /\b[a-z]{1,4}\d{2,6}-\d{2}\b/gi;
const DATA = /\b\d{2}\/\d{2}\/\d{4}\b/g;

function variaveisDa(pergunta) {
  const texto = String(pergunta ?? "");
  return { processos: texto.match(PROCESSO) ?? [], datas: texto.match(DATA) ?? [] };
}

function chavePergunta(pergunta) {
  return String(pergunta ?? "")
    .replace(PROCESSO, "{processo}")
    .replace(DATA, "{data}")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 240);
}

function trocarValores(valor, trocar) {
  if (typeof valor === "string") return trocar(valor);
  if (Array.isArray(valor)) return valor.map((item) => trocarValores(item, trocar));
  if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, trocarValores(v, trocar)]));
  return valor;
}

function comMarcadores(ferramentas, pergunta) {
  const { processos, datas } = variaveisDa(pergunta);
  return trocarValores(ferramentas, (texto) => {
    let saida = texto;
    processos.forEach((numero, i) => (saida = saida.replace(new RegExp(numero.replace(/[-]/g, "\\-"), "gi"), `{processo${i}}`)));
    datas.forEach((data, i) => (saida = saida.split(data).join(`{data${i}}`)));
    return saida;
  });
}

function semMarcadores(ferramentas, pergunta) {
  const { processos, datas } = variaveisDa(pergunta);
  let incompleta = false;
  const lista = trocarValores(ferramentas, (texto) =>
    texto.replace(/\{(processo|data)(\d+)\}/g, (_, tipo, i) => {
      const valor = (tipo === "processo" ? processos : datas)[Number(i)];
      if (!valor) incompleta = true;
      return tipo === "processo" ? String(valor ?? "").toUpperCase() : String(valor ?? "");
    }),
  );
  return incompleta ? null : lista;
}

const PARADA = new Set([
  "que", "para", "com", "dos", "das", "uma", "uns", "nas", "nos", "por", "como", "mais",
  "este", "esta", "isso", "essa", "esse", "nao", "qual", "quais", "sobre", "pelo", "pela",
  "seus", "suas", "meu", "minha", "voce", "sem", "tem", "ter", "foi", "sao", "uma",
]);

function palavras(texto) {
  return new Set(
    String(texto ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9{}]+/)
      .filter((p) => p.length > 2 && !PARADA.has(p)),
  );
}

function parecido(a, b) {
  const x = palavras(a);
  const y = palavras(b);
  if (!x.size || !y.size) return 0;
  let comum = 0;
  for (const p of x) if (y.has(p)) comum += 1;
  return comum / (x.size + y.size - comum);
}

function encaixam(receita, pergunta) {
  const precisa = (texto, marca) => texto.includes(`{${marca}`);
  return (
    precisa(receita, "processo") === precisa(pergunta, "processo") &&
    precisa(receita, "data") === precisa(pergunta, "data")
  );
}

export function guardarReceitaServidor(email, visao, pergunta, ferramentasBrutas) {
  const chave = chavePergunta(pergunta);
  const lista = comMarcadores((Array.isArray(ferramentasBrutas) ? ferramentasBrutas : []).slice(0, 4), pergunta);
  if (!chave || !lista.length) return;
  const area = String(visao || "geral");
  const json = JSON.stringify(lista);
  db.prepare(
    `INSERT INTO receitas (visao, chave, email, ferramentas, vezes, atualizado)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(visao, chave) DO UPDATE SET
       ferramentas = CASE
         WHEN receitas.vezes >= 3 AND receitas.ferramentas != excluded.ferramentas THEN receitas.ferramentas
         ELSE excluded.ferramentas
       END,
       email = CASE
         WHEN receitas.vezes >= 3 AND receitas.ferramentas != excluded.ferramentas THEN receitas.email
         ELSE excluded.email
       END,
       vezes = CASE
         WHEN receitas.ferramentas = excluded.ferramentas THEN vezes + 1
         WHEN receitas.vezes >= 3 THEN vezes
         ELSE 1
       END,
       atualizado = excluded.atualizado`,
  ).run(area, chave, emailDe(email), json, agora());
}

function lerReceita(linha, pergunta) {
  if (!linha || Number(linha.vezes) < 1) return null;
  try {
    const lista = JSON.parse(linha.ferramentas);
    return Array.isArray(lista) && lista.length ? semMarcadores(lista, pergunta) : null;
  } catch {
    return null;
  }
}

export function receitaServidor(email, visao, pergunta) {
  const chave = chavePergunta(pergunta);
  if (!chave) return null;
  const area = String(visao || "geral");
  const exata = db
    .prepare(`SELECT ferramentas, vezes FROM receitas WHERE visao = ? AND chave = ? AND vezes >= 1`)
    .get(area, chave);
  const achada = exata ?? receitaParecida(area, chave);
  const lista = lerReceita(achada, pergunta);
  const pedeFicha = /\bresumo\b/i.test(String(pergunta ?? "")) || (/\bresum(?:a|e|ir)\b/i.test(String(pergunta ?? "")) && /\bprocesso\b/i.test(String(pergunta ?? "")));
  if (Array.isArray(lista) && lista.some((item) => item?.nome === "resumo_processo") && !pedeFicha) return null;
  return lista;
}

function receitaParecida(area, chave) {
  const candidatas = db
    .prepare(`SELECT chave, ferramentas, vezes FROM receitas WHERE visao = ? AND vezes >= 2 ORDER BY vezes DESC LIMIT 300`)
    .all(area);
  let melhor = null;
  let nota = 0.72;
  for (const item of candidatas) {
    if (!encaixam(item.chave, chave)) continue;
    const valor = parecido(chave, item.chave);
    if (valor >= nota) {
      melhor = item;
      nota = valor;
    }
  }
  return melhor;
}

export function registrarAvaliacao(email, { visao, pergunta, resposta, nota, comentario }) {
  const dono = emailDe(email);
  const pedido = String(pergunta ?? "").trim().slice(0, 240);
  const valor = Number(nota) > 0 ? 1 : -1;
  if (!dono || !pedido) throw new Error("Avaliação sem pergunta.");
  const texto = String(comentario ?? "").trim().slice(0, 400);
  db.prepare(
    `INSERT INTO avaliacoes (email, visao, pergunta, resposta, nota, comentario, criado) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(dono, String(visao || "geral"), pedido, String(resposta ?? "").slice(0, 600), valor, texto, agora());
  if (valor < 0 && texto) registrarCorrecao(dono, pedido, texto, visao);
  const chave = chavePergunta(pedido);
  const area = String(visao || "geral");
  if (valor > 0) {
    db.prepare(`UPDATE receitas SET vezes = vezes + 2, atualizado = ? WHERE visao = ? AND chave = ? AND vezes >= 1`).run(agora(), area, chave);
  }
  if (valor < 0) {
    db.prepare(`UPDATE receitas SET vezes = MAX(vezes - 3, 0), atualizado = ? WHERE visao = ? AND chave = ?`).run(agora(), area, chave);
  }
  limparCacheAprendizado();
}

export function revisarAvaliacoes(dias = 7) {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  return db
    .prepare(
      `SELECT email, visao, pergunta, resposta, nota, comentario, criado FROM avaliacoes WHERE criado >= ? AND nota < 0 ORDER BY id DESC LIMIT 40`,
    )
    .all(desde);
}

export function placarAvaliacoes(dias = 30) {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  return db
    .prepare(
      `SELECT visao, SUM(CASE WHEN nota > 0 THEN 1 ELSE 0 END) AS boas, SUM(CASE WHEN nota < 0 THEN 1 ELSE 0 END) AS ruins
       FROM avaliacoes WHERE criado >= ? GROUP BY visao ORDER BY visao`,
    )
    .all(desde);
}

export function listarGlossario() {
  return db.prepare(`SELECT termo, significado FROM glossario ORDER BY termo`).all();
}

export function salvarGlossario(termo, significado) {
  const chave = String(termo ?? "").trim().toLowerCase();
  const texto = String(significado ?? "").trim();
  if (!chave || !texto) throw new Error("Informe o termo e o significado.");
  db.prepare(
    `INSERT INTO glossario (termo, significado) VALUES (?, ?)
     ON CONFLICT(termo) DO UPDATE SET significado = excluded.significado`,
  ).run(chave, texto);
  return listarGlossario();
}

export function apagarGlossario(termo) {
  db.prepare(`DELETE FROM glossario WHERE termo = ?`).run(String(termo ?? "").trim().toLowerCase());
  return listarGlossario();
}

export function registrarUsoVisao(visao, tabela, campo = "") {
  const nome = String(tabela ?? "").trim();
  if (!nome) return;
  const area = String(visao || "geral");
  db.prepare(
    `INSERT INTO uso_tabela (visao, tabela, vezes, campo) VALUES (?, ?, 1, ?)
     ON CONFLICT(visao, tabela) DO UPDATE SET vezes = vezes + 1, campo = CASE WHEN excluded.campo != '' THEN excluded.campo ELSE campo END`,
  ).run(area, nome, String(campo ?? ""));
}

export function ordenarTabelas(visao, tabelas) {
  const uso = new Map(
    db.prepare(`SELECT tabela, vezes FROM uso_tabela WHERE visao = ? ORDER BY vezes DESC`).all(String(visao || "geral")).map((linha) => [linha.tabela, linha.vezes]),
  );
  return [...tabelas].sort((a, b) => (uso.get(b) ?? 0) - (uso.get(a) ?? 0) || String(a).localeCompare(String(b)));
}

export function registrarFalha(email, visao, pergunta, motivo) {
  const pedido = String(pergunta ?? "").trim().slice(0, 240);
  if (!pedido) return;
  db.prepare(`INSERT INTO falhas (email, visao, pergunta, motivo, criado) VALUES (?, ?, ?, ?, ?)`).run(
    emailDe(email),
    String(visao || "geral"),
    pedido,
    String(motivo ?? "").slice(0, 300),
    agora(),
  );
}

export function revisarFalhas(dias = 7) {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  return db
    .prepare(
      `SELECT email, visao, pergunta, motivo, criado FROM falhas WHERE criado >= ? ORDER BY id DESC LIMIT 40`,
    )
    .all(desde);
}

export function resumoDaConversa(mensagens) {
  const lista = Array.isArray(mensagens) ? mensagens : [];
  const perguntas = lista.filter((m) => m.role === "user" && m.content).slice(-3);
  const ultima = [...lista].reverse().find((m) => m.role === "assistant" && String(m.content ?? "").trim());
  if (!perguntas.length) return "";
  const linhas = ["CONTEXTO DESTA CONVERSA (não pergunte de novo o que já está aqui):"];
  for (const item of perguntas) linhas.push(`- Pedido: ${String(item.content).replace(/\s+/g, " ").slice(0, 180)}`);
  if (ultima) linhas.push(`- Última resposta: ${String(ultima.content).replace(/\s+/g, " ").slice(0, 220)}`);
  return linhas.join("\n");
}

const EXEMPLOS = {
  inside: [
    "Pendências da semana → pendencias { escopo: semana }.",
    "Proposta do processo → proposta_processo { numero }.",
    "Lista de propostas de ontem, de hoje ou deste mês → propostas_periodo { quando, situacao }.",
    "Ficha do cliente → processos_abertos_cliente { cliente }.",
  ],
  comercial: [
    "Ficha do cliente → processos_abertos_cliente { cliente }.",
    "Comissão deste mês → comissao_periodo {}.",
    "Proposta do processo → proposta_processo { numero }.",
    "Lista de propostas de ontem, de hoje ou deste mês → propostas_periodo { quando, situacao }.",
    "Pendências da semana → pendencias { escopo: semana }.",
    "Pendências do inside → atividades_pendentes { setor: inside }.",
  ],
  operacional: [
    "Prazos dos próximos 7 dias → prazos { dias: 7 }.",
    "Processos parados há 7 dias → processos_parados { dias: 7 }.",
    "Rota do navio de um processo → rota_processo { numero }.",
  ],
  documental: [
    "Fila do documental CE → documental_ce { foco: fila, caso: ce }.",
    "Fila do documental IM → documental_ce { foco: fila, caso: im }.",
  ],
  financeiro: [
    "Painel do mês → painel_financeiro {}.",
    "Taxas de um processo → taxas_processo { numero }.",
    "Comissão do mês → comissao_periodo {}.",
    "Prazos em 7 dias → prazos { dias: 7 }.",
  ],
  ti: [
    "Painel das últimas 24 horas → painel_ti { horas: 24 }.",
    "Log recente → log_recente { horas: 24 }.",
    "Container duplicado ou quem incluiu o item de carga → explicar_itens_carga { numero }. No resumo, copie o texto inteiro.",
    "Campo livre de um processo, como OMBL → explicar_campo_livre { numero, identificador, grupo }. Copie o texto inteiro.",
  ],
  geral: ["Resumo de um processo → resumo_processo { numero }."],
};

function correcoesRelevantes(email, pergunta, visao) {
  const proprias = db
    .prepare(`SELECT pergunta, correcao FROM correcoes WHERE email = ? ORDER BY id DESC LIMIT 40`)
    .all(emailDe(email));
  const recentes = proprias.slice(0, 2);
  const parecidas = proprias
    .slice(2)
    .map((item) => ({ item, nota: parecido(pergunta, `${item.pergunta} ${item.correcao}`) }))
    .filter((x) => x.nota >= 0.2)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, 3)
    .map((x) => x.item);
  const daVisao = db
    .prepare(`SELECT pergunta, correcao FROM correcoes WHERE visao = ? AND email != ? AND visao != '' ORDER BY id DESC LIMIT 60`)
    .all(String(visao || "geral"), emailDe(email))
    .map((item) => ({ item, nota: parecido(pergunta, `${item.pergunta} ${item.correcao}`) }))
    .filter((x) => x.nota >= 0.28)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, 3)
    .map((x) => x.item);
  return { proprias: [...recentes, ...parecidas], daVisao };
}

function caminhosAprendidos(visao, pergunta) {
  const chave = chavePergunta(pergunta);
  if (!chave) return [];
  return db
    .prepare(`SELECT chave, ferramentas, vezes FROM receitas WHERE visao = ? AND vezes >= 2 ORDER BY vezes DESC LIMIT 80`)
    .all(String(visao || "geral"))
    .filter((item) => encaixam(item.chave, chave))
    .map((item) => ({ ...item, nota: parecido(chave, item.chave) }))
    .filter((item) => item.nota >= 0.34)
    .sort((a, b) => b.nota - a.nota || b.vezes - a.vezes)
    .slice(0, 4);
}

function textoDaReceita(ferramentas) {
  try {
    const lista = JSON.parse(ferramentas);
    if (!Array.isArray(lista)) return "";
    return lista
      .slice(0, 3)
      .map((item) => `${item.nome} ${JSON.stringify(item.args ?? {})}`)
      .join(" e depois ")
      .slice(0, 240);
  } catch {
    return "";
  }
}

export function textoAprendizado({ email, visao, mensagens }) {
  const pergunta = [...(Array.isArray(mensagens) ? mensagens : [])].reverse().find((m) => m.role === "user")?.content ?? "";
  const linhas = [textoFixoAprendizado(email, visao)];
  const correcoes = correcoesRelevantes(email, pergunta, visao);
  if (correcoes.proprias.length) {
    linhas.push("CORREÇÕES JÁ FEITAS POR ESTA PESSOA (não repita o erro):");
    for (const item of correcoes.proprias) linhas.push(`- Depois de "${item.pergunta}", a correção foi: ${item.correcao}`);
  }
  if (correcoes.daVisao.length) {
    linhas.push("CORREÇÕES JÁ CONFIRMADAS NESTA VISÃO (valem para perguntas parecidas):");
    for (const item of correcoes.daVisao) linhas.push(`- Depois de "${item.pergunta}", a correção foi: ${item.correcao}`);
  }
  const caminhos = caminhosAprendidos(visao, pergunta);
  if (caminhos.length) {
    linhas.push("CAMINHOS QUE JÁ DERAM CERTO (repita a ferramenta quando a pergunta for parecida, sem inventar outra):");
    for (const item of caminhos) {
      const texto = textoDaReceita(item.ferramentas);
      if (texto) linhas.push(`- "${item.chave}" → ${texto}`);
    }
  }
  const glossario = glossarioRelevante(pergunta);
  if (glossario.length) {
    linhas.push("GLOSSÁRIO DO NEGÓCIO:");
    for (const item of glossario) linhas.push(`- ${item.termo}: ${item.significado}`);
  }
  const resumo = resumoDaConversa(mensagens);
  if (resumo) linhas.push(resumo);
  return linhas.filter(Boolean).join("\n");
}

function glossarioRelevante(pergunta) {
  const glossario = listarGlossario();
  if (glossario.length <= 12) return glossario;
  const texto = ` ${String(pergunta ?? "").toLowerCase()} `;
  return glossario.filter((item) => new RegExp(`[^\\p{L}]${item.termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\p{L}]`, "u").test(texto));
}

function textoFixoAprendizado(email, visao) {
  const chave = `${emailDe(email)}|${visao || "geral"}|${versaoMemoria()}`;
  const salvo = cacheAprendizado.get(chave);
  if (salvo && Date.now() - salvo.em < VALIDADE_CACHE) return salvo.texto;
  const linhas = [];
  const preferencias = listarPreferencias(email);
  if (preferencias.length) {
    linhas.push("PREFERÊNCIAS DESTA PESSOA (siga sempre):");
    for (const item of preferencias) {
      const regra = item.observacao || [item.tabela && `tabela ${item.tabela}`, item.campo && `campo ${item.campo}`].filter(Boolean).join(", ");
      linhas.push(`- ${item.termo || "pedido"}: ${regra}`);
    }
  }
  const exemplos = EXEMPLOS[visao] ?? EXEMPLOS.geral;
  linhas.push("EXEMPLOS QUE JÁ FUNCIONAM NESTA VISÃO (use a ferramenta pronta quando a pergunta for parecida):");
  for (const item of exemplos) linhas.push(`- ${item}`);
  const usadas = db
    .prepare(`SELECT tabela, vezes, campo FROM uso_tabela WHERE visao = ? ORDER BY vezes DESC LIMIT 8`)
    .all(String(visao || "geral"));
  if (usadas.length) {
    linhas.push("TABELAS MAIS USADAS NESTA VISÃO (prefira estas se houver dúvida):");
    for (const item of usadas) linhas.push(`- ${item.tabela} (${item.vezes}x${item.campo ? `, campo ${item.campo}` : ""})`);
  }
  linhas.push(
    "SE NÃO SOUBER: consulta vazia ou ambígua não autoriza inventar tabela nem dado. " +
      "Diga que não encontrou e peça só o que falta: processo, período ou cliente. Uma pergunta curta.",
  );
  linhas.push(textoMemoria());
  const texto = linhas.join("\n");
  cacheAprendizado.set(chave, { texto, em: Date.now() });
  return texto;
}
