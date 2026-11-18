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
