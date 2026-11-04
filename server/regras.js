import sql from "mssql";

const NUMERO = /\b([A-Za-z]{1,3}\d{3,6}-\d{2})\b/;

function dataLegivel(valor) {
  if (!valor) return "";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const hora = String(data.getUTCHours()).padStart(2, "0");
  const minuto = String(data.getUTCMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${data.getUTCFullYear()} ${hora}:${minuto}`;
}

function dinheiro(valor) {
  if (valor == null || valor === "") return "";
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function houseDoProcesso(pool, numero) {
  const r = await pool
    .request()
    .input("n", sql.VarChar(30), numero)
    .query(
      "SELECT TOP 1 IdLogistica_House, Numero_Processo FROM mov_Logistica_House WHERE Numero_Processo = @n",
    );
  return r.recordset[0] ?? null;
}

async function acompanhamentos(pool, id, ultimo) {
  const r = await pool.request().input("id", sql.Int, id).query(`
    SELECT
      A.Data AS Data,
      A.Descricao AS Descricao,
      R.Nome AS Responsavel
    FROM mov_Acompanhamento A
    LEFT JOIN cad_Pessoa R ON R.IdPessoa = A.IdResponsavel
    WHERE A.IdProjeto_Atividade = (
      SELECT TOP 1 IdProjeto_Atividade FROM mov_Logistica_House WHERE IdLogistica_House = @id
    )
    ORDER BY A.Data DESC`);
  const linhas = ultimo ? r.recordset.slice(0, 1) : r.recordset;
  if (!linhas.length) return "Não há acompanhamento para esse processo.";
  return linhas
    .map((linha) => {
      const texto = String(linha.Descricao ?? "").replace(/\s+/g, " ").trim();
      const quando = dataLegivel(linha.Data);
      const responsavel = String(linha.Responsavel ?? "").trim();
      return [quando && `${quando}.`, texto, responsavel && `Responsável: ${responsavel}.`].filter(Boolean).join(" ");
    })
    .join("\n");
}

async function taxas(pool, id) {
  let r;
  try {
    r = await pool.request().input("id", sql.Int, id).query(`
    SELECT
      Exb.Nome AS Taxa,
      Tax.Valor_Pagamento_Total AS Valor_Pagamento,
      Tax.Valor_Recebimento_Total AS Valor_Recebimento
    FROM mov_Logistica_Taxa Tax
    LEFT JOIN cad_Taxa_Logistica_Exibicao Exb ON Exb.IdTaxa_Logistica_Exibicao = Tax.IdTaxa_Logistica_Exibicao
    WHERE Tax.IdLogistica_House = @id
    ORDER BY Exb.Nome`);
  } catch (erro) {
    console.error("taxas", erro);
    throw erro;
  }
  if (!r.recordset.length) return "Não há taxas lançadas nesse processo.";
  return r.recordset
    .map((linha) => {
      const nome = String(linha.Taxa ?? "Taxa").trim();
      const pagamento = dinheiro(linha.Valor_Pagamento);
      const recebimento = dinheiro(linha.Valor_Recebimento);
      return `${nome}. Pagamento: ${pagamento || "0,00"}. Recebimento: ${recebimento || "0,00"}.`;
    })
    .join("\n");
}

export function pedeHistorico(texto) {
  return /quem (?:inclu|alter|excl|mud|lan[cç]|cri|apag|cadastr|mexeu)|hist[oó]rico|\blog\b|antes e depois|\bid\s?\d{3,}|\bid_?(?:logistica|projeto|tarefa|atividade|pessoa|acompanhamento)\w*/i.test(
    String(texto ?? ""),
  );
}

const CORTE_NOME = /^(com|sem|os|as|que|para|por|incluindo|inclua|se|ou|ouro|prata|bronze|processos?|propostas?|vendedor|comiss[aã]o|cliente|ficha|abertos?|últimos?|ultimos?|deste|neste|m[eê]s)$/i;

function palavrasDoNome(resto) {
  const palavras = String(resto ?? "")
    .replace(/[.:].*$/, "")
    .split(/\s+/)
    .filter(Boolean);
  const nome = [];
  for (const palavra of palavras) {
    const limpa = palavra.replace(/^[,;]+|[,;]+$/g, "");
    if (!limpa) continue;
    if (CORTE_NOME.test(limpa)) break;
    nome.push(limpa);
    if (nome.length >= 8) break;
  }
  const junto = nome.join(" ").trim();
  return junto.length >= 2 ? junto : "";
}

export function nomeCitadoNaFicha(texto) {
  const t = String(texto ?? "");
  const direto = t.match(/\bficha do cliente\s+(.+)$/i);
  if (direto) {
    const nome = palavrasDoNome(direto[1]);
    if (nome) return nome;
  }
  const da = t.match(/\bficha\s+d[aeo]\s+(.+)$/i);
  if (da) return palavrasDoNome(da[1]);
  return "";
}

export function pedeAssuntoFicha(texto) {
  const t = String(texto ?? "");
  if (/ficha do processo/i.test(t)) return false;
  if (/ficha do cliente/i.test(t)) return true;
  if (/\bficha\s+d[aeo]\s+\S/i.test(t)) return true;
  return /ouro|prata|bronze/i.test(t) && /paga em dia|sem proposta/i.test(t);
}

function pareceNomeDeCliente(texto) {
  const nome = String(texto ?? "").trim();
  if (nome.length < 2 || nome.length > 120) return false;
  if (/[?\n]/.test(nome)) return false;
  if (/\b[A-Za-z]{1,4}\d{2,6}-\d{2}\b/.test(nome)) return false;
  if (/^(qual|quais|como|monte|mostre|liste|quem|quero|preciso|pode)\b/i.test(nome)) return false;
  return /\p{L}{2}/u.test(nome);
}

export function pedidoRelacionamento(texto) {
  const t = String(texto ?? "");
  if (/ficha do processo|sem proposta|último processo|ultimo processo/i.test(t)) return null;
  if (!/relacionamento/i.test(t)) return null;
  const niveis = ["ouro", "prata", "bronze"].filter((nivel) => new RegExp(`\\b${nivel}\\b`, "i").test(t));
  if (niveis.length) return { niveis };
  if (/relacionamento dos clientes/i.test(t)) return { niveis: ["ouro", "prata", "bronze"] };
  return null;
}

export function pedidoFichaCliente(mensagens) {
  const todos = Array.isArray(mensagens) ? mensagens : [];
  const usuarios = todos.filter((item) => item?.role === "user");
  const ultimo = String(usuarios.at(-1)?.content ?? "").trim();
  if (!ultimo) return null;
  if (pedeAssuntoFicha(ultimo)) {
    const nome = nomeCitadoNaFicha(ultimo);
    if (nome) return { cliente: nome };
    return { perguntar: true };
  }
  if (!pareceNomeDeCliente(ultimo)) return null;
  const anterior = String(usuarios.at(-2)?.content ?? "");
  if (pedeAssuntoFicha(anterior)) return { cliente: ultimo };
  const ajuda = [...todos].reverse().find((item) => item?.role === "assistant" && String(item.content ?? "").trim());
  if (/qual cliente|qual deles voc[eê] quer na ficha|encontrei mais de um cliente/i.test(String(ajuda?.content ?? ""))) {
    return { cliente: ultimo };
  }
  return null;
}

export async function responderPorRegra(conectar, texto) {
  const frase = String(texto ?? "");
  const numero = frase.match(NUMERO)?.[1];
  if (!numero) return null;
  if (/rota|navio|rastre/i.test(frase) || pedeHistorico(frase)) return null;
  const assunto = /acompanh/i.test(frase)
    ? "acompanhamento"
    : /\btaxas?\b/i.test(frase)
      ? "taxa"
      : null;
  if (!assunto) return null;
  const pool = await conectar();
  try {
    const house = await houseDoProcesso(pool, numero);
    if (!house) return `Processo ${numero} não encontrado.`;
    if (assunto === "acompanhamento") {
      return await acompanhamentos(pool, house.IdLogistica_House, /últim|ultim/i.test(frase));
    }
    return await taxas(pool, house.IdLogistica_House);
  } finally {
    await pool.close().catch(() => {});
  }
}
