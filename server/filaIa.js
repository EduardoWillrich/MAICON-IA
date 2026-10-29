const PROVEDORES = ["groq", "gemini", "openrouter", "ollama"];

const AMBIENTE_POR_PROVEDOR = {
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  ollama: "OLLAMA_API_KEY",
};

const MENSAGEM_INDISPONIVEL = "A IA não respondeu agora. Tente novamente em instantes.";

function chaveLimpa(valor) {
  return String(valor ?? "").trim();
}

function acrescentarChave(fila, vistos, item) {
  const provedor = String(item?.provedor ?? "").trim().toLowerCase();
  const chave = chaveLimpa(item?.chave);
  if (!PROVEDORES.includes(provedor) || !chave) return;
  const identificador = `${provedor}\0${chave}`;
  if (vistos.has(identificador)) return;
  vistos.add(identificador);
  fila.push({ provedor, chave, extra: String(item?.extra ?? "").trim() });
}

export function filaDeChaves(chavesPessoais, ambiente = process.env) {
  const pessoais = Array.isArray(chavesPessoais) ? chavesPessoais : [];
  const fila = [];
  const vistos = new Set();

  for (const provedor of PROVEDORES) {
    for (const item of pessoais) {
      if (String(item?.provedor ?? "").trim().toLowerCase() === provedor) {
        acrescentarChave(fila, vistos, item);
      }
    }
    acrescentarChave(fila, vistos, {
      provedor,
      chave: ambiente[AMBIENTE_POR_PROVEDOR[provedor]],
      extra: provedor === "ollama" ? ambiente.OLLAMA_URL : "",
    });
  }

  return fila;
}

export function statusDoErro(erro) {
  const candidatos = [
    erro?.status,
    erro?.statusCode,
    erro?.status_code,
    erro?.response?.status,
    erro?.cause?.status,
  ];
  for (const valor of candidatos) {
    const status = Number(valor);
    if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
  }
  const texto = String(erro?.message ?? erro ?? "");
  const encontrado = texto.match(/(?:^|\D)(401|402|403|429|498|5\d\d)(?:\D|$)/);
  return encontrado ? Number(encontrado[1]) : 0;
}

function abortado(erro) {
  return erro?.name === "AbortError" || erro?.code === "ABORT_ERR";
}

export function podeTrocarChave(erro) {
  if (abortado(erro)) return false;
  const status = statusDoErro(erro);
  if ([401, 402, 403, 413, 429, 498].includes(status) || status >= 500) return true;
  const texto = String(erro?.message ?? erro?.error ?? erro ?? "");
  return /unauthorized|unauthenticated|invalid(?:\s+api)?\s*key|api key not valid|user not found|quota|rate limit|usage limit|billing|credit|modelo (?:inexistente|indispon[ií]vel|configurado)|model(?:o)?\s+(?:not found|unavailable)|does not exist|do not have access|unsupported|invalid_request|temporar|service unavailable|overload|sobrecarreg|timeout|fetch failed|econn(?:refused|reset)|socket hang up/i.test(texto);
}

function erroIndisponivel() {
  return new Error(MENSAGEM_INDISPONIVEL);
}

export async function executarFilaComFallback(fila, chamar, aoFalhar = () => {}) {
  if (!Array.isArray(fila) || !fila.length) throw erroIndisponivel();

  for (let indice = 0; indice < fila.length; indice += 1) {
    const item = fila[indice];
    try {
      return await chamar(item, { indice, total: fila.length });
    } catch (erro) {
      if (abortado(erro)) throw erro;
      aoFalhar({ provedor: item.provedor, status: statusDoErro(erro) || null });
      const temReserva = indice < fila.length - 1;
      if (!temReserva || !podeTrocarChave(erro)) throw erroIndisponivel();
    }
  }

  throw erroIndisponivel();
}
