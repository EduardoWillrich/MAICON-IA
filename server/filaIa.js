const PROVEDORES = ["google"];

const AMBIENTE_POR_PROVEDOR = {
  google: "GOOGLE_API_KEY",
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
      extra: "",
    });
  }

  return fila;
}

export function estouroDeTokens(erro) {
  const status = statusDoErro(erro);
  const texto = String(erro?.message ?? erro?.error ?? erro ?? "");
  if (status === 402 || status === 429 || status === 413) return true;
  return /insufficient credits|out of credits|quota|rate.?limit|usage limit|billing|payment required|cr[eé]ditos?|key limit|monthly limit|resource has been exhausted|context length|maximum context|context window|too many tokens|token limit|max(?:imum)?[_ ]tokens|prompt is too long|input is too long|exceeds the .{0,40}limit|payload too large|request too large/i.test(texto);
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
  if ([401, 402, 403, 404, 413, 429, 498].includes(status) || status >= 500) return true;
  const texto = String(erro?.message ?? erro?.error ?? erro ?? "");
  return /unauthorized|unauthenticated|invalid(?:\s+api)?\s*key|api key not valid|user not found|quota|rate limit|usage limit|billing|credit|modelo (?:inexistente|indispon[ií]vel|configurado)|model(?:o)?\s+(?:not found|unavailable)|does not exist|do not have access|unsupported|invalid_request|temporar|service unavailable|overload|sobrecarreg|timeout|fetch failed|econn(?:refused|reset)|socket hang up/i.test(texto);
}

function semCredito(erro) {
  const status = statusDoErro(erro);
  const texto = String(erro?.message ?? erro ?? "");
  return status === 402 || /insufficient credits|out of credits|créditos?|quota exceeded|billing|payment required/i.test(texto);
}

function erroIndisponivel(erro) {
  const texto = String(erro?.message ?? "");
  if (/per minute|tokens per minute|retry in\s+[0-9]/i.test(texto)) {
    return new Error("O Google limitou o ritmo desta chave. Espere um minuto e tente de novo.");
  }
  if (semCredito(erro)) return new Error("A cota do Google acabou. Tente de novo mais tarde.");
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
      if (!temReserva || !podeTrocarChave(erro)) {
        if (semCredito(erro)) throw erroIndisponivel(erro);
        throw erro;
      }
    }
  }

  throw erroIndisponivel();
}
