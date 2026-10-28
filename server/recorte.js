const OPERACAO = /di_re|li_dde|averbacao|canal_liberacao|coleta_destino|local_entrega|data_entrega|previsao_entrega|transportadora_destino|modalidade_entrega|tipo_declaracao|natureza_exportacao|pais_origem_mercadoria|pais_destino_mercadoria/i;
const COMERCIAL = /numero_oferta|valor_oferta|profit|lucro/i;

export function recorteDaVisao(visao, perfil) {
  const setor = visao === "tudo" || visao === "admin" ? "admin" : visao || perfil?.setor || "geral";
  const semComissaoPapel = Boolean(perfil?.semComissao);
  if (setor === "admin") {
    return { visao: "tudo", semOperacional: false, semComercial: false, semComissao: false };
  }
  if (setor === "operacional") {
    return { visao: "operacional", semOperacional: false, semComercial: true, semComissao: true };
  }
  if (setor === "documental") {
    return { visao: "documental", semOperacional: false, semComercial: true, semComissao: true };
  }
  if (setor === "financeiro") {
    return { visao: "financeiro", semOperacional: false, semComercial: false, semComissao: false, financeiro: true };
  }
  if (setor === "gerencia") {
    return { visao: "gerencia", semOperacional: false, semComercial: false, semComissao: false, financeiro: true };
  }
  if (setor === "ti") {
    return { visao: "ti", semOperacional: false, semComercial: false, semComissao: false, tecnico: true };
  }
  if (setor === "inside" || setor === "comercial") {
    return { visao: setor, semOperacional: true, semComercial: false, semComissao: semComissaoPapel };
  }
  return { visao: "geral", semOperacional: false, semComercial: false, semComissao: semComissaoPapel };
}

function mencionaComissao(texto) {
  return /comiss/i.test(String(texto).replace(/comissao_entrega/gi, ""));
}

export function colunaBloqueada(nome, recorte) {
  const n = String(nome ?? "");
  if (recorte?.semOperacional && OPERACAO.test(n)) return true;
  if (recorte?.semComercial && COMERCIAL.test(n)) return true;
  if (recorte?.semComissao && mencionaComissao(n)) return true;
  return false;
}

export function motivoBloqueio(texto, recorte) {
  const sql = String(texto ?? "");
  if (recorte?.semOperacional && OPERACAO.test(sql)) return "Essa informação é do setor operacional.";
  if (recorte?.semComercial && COMERCIAL.test(sql)) return "Essa informação é do comercial.";
  if (recorte?.semComissao && mencionaComissao(sql)) return "Comissão não faz parte deste acesso.";
  return "";
}

function numeroDaLinha(linha) {
  if (!linha || typeof linha !== "object") return "";
  for (const [chave, valor] of Object.entries(linha)) {
    const nome = chave.replaceAll("_", " ").toLowerCase();
    if (nome !== "numero processo" && nome !== "processo") continue;
    const texto = String(valor ?? "").trim().toUpperCase();
    if (/^[A-Z]{2}\d/.test(texto)) return texto;
  }
  return "";
}

export function filtrarLinhas(linhas, recorte) {
  const limpas = (linhas ?? []).map((linha) =>
    Object.fromEntries(Object.entries(linha).filter(([chave]) => !colunaBloqueada(chave, recorte))),
  );
  const modalidade = String(recorte?.modalidade ?? "");
  if (!["IA", "EA", "IM", "EM"].includes(modalidade)) return limpas;
  const comProcesso = limpas.filter((linha) => numeroDaLinha(linha));
  if (comProcesso.length < 2) return limpas;
  return limpas.filter((linha) => {
    const numero = numeroDaLinha(linha);
    return !numero || numero.startsWith(modalidade);
  });
}
