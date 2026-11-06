import { textoSemPensamento } from "./chamadaTexto.js";
import { lerJsonDaMaxMilhas, ofertasDaMaxMilhas } from "./buscaVoo.js";

const DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const AVISO = "Confirme no site antes de comprar. Isto não é reserva nem cotação fechada.";
const SEM_PRECO = "Não achei preço publicado para essas datas. Os sites abaixo abrem a mesma busca.";

function limpar(valor, limite) {
  return String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, limite);
}

function destinoDaPassagem(fala) {
  const achado = fala.match(/\bpara\s+(?:o\s+|a\s+)?([A-Za-zÀ-ú][\p{L}.' -]{1,40})/iu);
  if (!achado) return "";
  const nome = achado[1].replace(/\s+(?:em|no|na|dia|de)\b[\s\S]*$/i, "").trim();
  if (!nome || /^(?:o|a|um|uma|eu|mim|hoje|amanh[aã]|esse|essa|este|esta)$/i.test(nome)) return "";
  if (/\b(?:destino|embarque|passagem|pre[cç]o|data)\b/i.test(nome)) return "";
  return nome;
}

export function respostaPassagemIncompleta(texto) {
  const fala = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (!/passag(?:em|ens)\s+a[eé]rea/i.test(fala)) return "";
  const temData = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(fala);
  const destino = destinoDaPassagem(fala);
  if (temData && destino) return "";
  if (!temData && !destino) return "Informe o destino e a data de embarque, no formato dd/mm/aaaa. Se quiser, diga a origem e a volta.";
  if (!temData) return `Informe a data de embarque para ${destino}, no formato dd/mm/aaaa.`;
  return "Informe o destino da passagem.";
}

export function dataBr(valor) {
  const texto = String(valor ?? "").trim();
  const achado = texto.match(DATA);
  if (!achado) return null;
  const dia = Number(achado[1]);
  const mes = Number(achado[2]);
  const ano = Number(achado[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return { dia, mes, ano, br: `${achado[1]}/${achado[2]}/${achado[3]}` };
}

function hojeSaoPaulo(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const numero = (tipo) => Number(partes.find((item) => item.type === tipo)?.value);
  return { ano: numero("year"), mes: numero("month"), dia: numero("day") };
}

function ordem(data) {
  return data.ano * 10000 + data.mes * 100 + data.dia;
}

function passou(data, agora) {
  return ordem(data) < ordem(hojeSaoPaulo(agora));
}

function completarData(bruta, agora, referencia = "") {
  const pedaco = String(bruta ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!pedaco) return "";
  const dia = pedaco[1].padStart(2, "0");
  const mes = pedaco[2].padStart(2, "0");
  let ano = pedaco[3] ? Number(pedaco[3]) : 0;
  if (ano && ano < 100) ano += 2000;
  if (!ano) {
    const base = dataBr(referencia);
    const hoje = hojeSaoPaulo(agora);
    ano = base?.ano || hoje.ano;
    const candidata = dataBr(`${dia}/${mes}/${ano}`);
    const piso = base || hoje;
    if (candidata && ordem(candidata) < ordem(piso)) ano += 1;
  }
  return dataBr(`${dia}/${mes}/${ano}`)?.br || "";
}

function trechoDestino(fala) {
  const achado = fala.match(/\b(?:para|pra)\s+(.+?)(?=\s*,|\s+volta\b|\s+ida\b|$)/i);
  if (!achado) return "";
  return achado[1].replace(/[,.;]+$/g, "").replace(/\s+(?:em|no|na|dia)\b[\s\S]*$/i, "").trim();
}

export function pedidoPassagemDaConversa(mensagens, agora = new Date()) {
  const lista = Array.isArray(mensagens) ? mensagens : [];
  const ultima = [...lista].reverse().find((item) => item?.role === "user")?.content ?? "";
  const direto = interpretarPassagem(ultima, agora);
  if (direto) return direto;
  if (!/\bmais\s+(?:resultados|op[cç][oõ]es|voos|pre[cç]os)\b/i.test(String(ultima))) return null;
  for (const item of [...lista].reverse()) {
    if (item?.role !== "user") continue;
    const pedido = interpretarPassagem(item.content, agora);
    if (pedido) return pedido;
  }
  return null;
}

export function interpretarPassagem(texto, agora = new Date()) {
  const fala = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (!/\b(?:origem|passag(?:em|ens))\b/i.test(fala) || !/\d{1,2}\/\d{1,2}/.test(fala)) return null;
  if (/\b(?:processo|cliente|taxa|comiss[aã]o|proposta|relat[oó]rio)\b/i.test(fala)) return null;
  const origem = (fala.match(/\borigem\s+(.+?)(?=\s+(?:ida|volta|pra|para)\b|,|$)/i)?.[1] || "").replace(/[,.;]+$/g, "").trim();
  const destino = trechoDestino(fala);
  const semVolta = fala.replace(/\bvolta\s+(?:dia\s+|em\s+)?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/i, "");
  const idaBruta =
    fala.match(/\bida\s+(?:dia\s+|em\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i)?.[1] ||
    semVolta.match(/\b(?:em|dia)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i)?.[1] ||
    "";
  const voltaBruta = fala.match(/\bvolta\s+(?:dia\s+|em\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i)?.[1] || "";
  if (!destino || !idaBruta) return null;
  const data_embarque = completarData(idaBruta, agora);
  if (!data_embarque) return null;
  const volta = voltaBruta ? completarData(voltaBruta, agora, data_embarque) : "";
  return { origem, destino, data_embarque, ...(volta ? { volta } : {}) };
}

export function montarPedidoPassagem(args, agora = new Date()) {
  const dados = args && typeof args === "object" ? args : {};
  const destino = limpar(dados.destino, 80);
  const origem = limpar(dados.origem, 80) || "São Paulo (GRU)";
  const embarqueBruto = limpar(dados.data_embarque ?? dados.data, 20);
  const embarque = dataBr(embarqueBruto) || dataBr(completarData(embarqueBruto, agora));
  const voltaInformada = limpar(dados.volta, 20);
  const voltaBruta = voltaInformada ? dataBr(voltaInformada) || dataBr(completarData(voltaInformada, agora, embarque?.br || "")) : null;
  const volta = voltaBruta;
  const passageiros = Number(dados.passageiros);
  if (!destino) return { erro: "Informe o destino da passagem." };
  if (!embarque) return { erro: "Informe a data de embarque em dd/mm/aaaa." };
  if (passou(embarque, agora)) {
    return { erro: `A data de embarque ${embarque.br} já passou. Informe uma data a partir de hoje.` };
  }
  if (voltaInformada && !volta) return { erro: "A data de volta precisa estar em dd/mm/aaaa." };
  if (volta && passou(volta, agora)) return { erro: `A data de volta ${volta.br} já passou.` };
  if (volta && ordem(volta) < ordem(embarque)) return { erro: "A volta não pode ser antes do embarque." };
  return {
    destino,
    origem,
    embarque,
    volta,
    passageiros: Number.isInteger(passageiros) && passageiros >= 1 && passageiros <= 9 ? passageiros : 1,
  };
}

export function textoPedido(pedido) {
  const trecho = pedido.volta
    ? `Ida em ${pedido.embarque.br} e volta em ${pedido.volta.br}.`
    : `Somente ida, embarque em ${pedido.embarque.br}.`;
  const de = /^são paulo \(gru\)$/i.test(pedido.origem)
    ? "Saindo de São Paulo (GRU), origem padrão. Diga outra cidade se a saída for outra."
    : `Saindo de ${pedido.origem}.`;
  const pessoas = pedido.passageiros === 1 ? "1 adulto" : `${pedido.passageiros} adultos`;
  return [
    `Compare preços públicos de passagem aérea para ${pedido.destino}.`,
    trecho,
    de,
    `${pessoas}, classe econômica.`,
    "Pesquise agora. Use Google Voos, Decolar, Skyscanner, Kayak e os sites das companhias.",
    "Traga as opções mais baratas para essa data de embarque e esse destino.",
  ].join(" ");
}

export function fontesDaResposta(mensagem) {
  const lista = Array.isArray(mensagem?.annotations) ? mensagem.annotations : [];
  const vistas = new Set();
  const linhas = [];
  for (const item of lista) {
    const cita = item?.url_citation ?? item;
    const url = String(cita?.url ?? "").trim();
    if (!/^https?:\/\//i.test(url) || vistas.has(url)) continue;
    vistas.add(url);
    const titulo = String(cita?.title ?? "").replace(/\s+/g, " ").trim();
    linhas.push(titulo ? `- ${titulo}: ${url}` : `- ${url}`);
  }
  return linhas.slice(0, 8);
}

export function fecharComparacao(bruto) {
  const texto = textoSemPensamento(bruto).trim();
  if (!texto) throw new Error("A pesquisa de passagens não devolveu preços.");
  return /confirme no site/i.test(texto) ? texto : `${texto}\n\n${AVISO}`;
}

export function anexarFontes(texto, fontes) {
  const novas = fontes.filter((linha) => {
    const url = linha.slice(linha.lastIndexOf("http"));
    return url && !texto.includes(url);
  });
  if (!novas.length) return texto;
  return `${texto}\n\nFontes\n${novas.join("\n")}`;
}

function semAcento(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const LUGARES = [
  ["navegantes", "NVT", "aeroporto"],
  ["nvt", "NVT", "aeroporto"],
  ["itajai", "NVT", "cidade"],
  ["balneario camboriu", "NVT", "cidade"],
  ["florianopolis", "FLN", "aeroporto"],
  ["fln", "FLN", "aeroporto"],
  ["joinville", "JOI", "aeroporto"],
  ["joi", "JOI", "aeroporto"],
  ["chapeco", "XAP", "aeroporto"],
  ["xap", "XAP", "aeroporto"],
  ["curitiba", "CWB", "aeroporto"],
  ["cwb", "CWB", "aeroporto"],
  ["sao jose dos pinhais", "CWB", "aeroporto"],
  ["londrina", "LDB", "aeroporto"],
  ["maringa", "MGF", "aeroporto"],
  ["foz do iguacu", "IGU", "aeroporto"],
  ["igu", "IGU", "aeroporto"],
  ["porto alegre", "POA", "aeroporto"],
  ["poa", "POA", "aeroporto"],
  ["caxias do sul", "CXJ", "aeroporto"],
  ["sao paulo", "SAO", "cidade"],
  ["sampa", "SAO", "cidade"],
  ["sp", "SAO", "cidade"],
  ["guarulhos", "GRU", "aeroporto"],
  ["gru", "GRU", "aeroporto"],
  ["congonhas", "CGH", "aeroporto"],
  ["cgh", "CGH", "aeroporto"],
  ["campinas", "VCP", "aeroporto"],
  ["viracopos", "VCP", "aeroporto"],
  ["vcp", "VCP", "aeroporto"],
  ["sao jose dos campos", "SJK", "aeroporto"],
  ["ribeirao preto", "RAO", "aeroporto"],
  ["rio de janeiro", "RIO", "cidade"],
  ["rio", "RIO", "cidade"],
  ["galeao", "GIG", "aeroporto"],
  ["gig", "GIG", "aeroporto"],
  ["santos dumont", "SDU", "aeroporto"],
  ["sdu", "SDU", "aeroporto"],
  ["belo horizonte", "BHZ", "cidade"],
  ["bhz", "BHZ", "cidade"],
  ["confins", "CNF", "aeroporto"],
  ["cnf", "CNF", "aeroporto"],
  ["brasilia", "BSB", "aeroporto"],
  ["bsb", "BSB", "aeroporto"],
  ["salvador", "SSA", "aeroporto"],
  ["ssa", "SSA", "aeroporto"],
  ["recife", "REC", "aeroporto"],
  ["rec", "REC", "aeroporto"],
  ["fortaleza", "FOR", "aeroporto"],
  ["for", "FOR", "aeroporto"],
  ["natal", "NAT", "aeroporto"],
  ["nat", "NAT", "aeroporto"],
  ["joao pessoa", "JPA", "aeroporto"],
  ["maceio", "MCZ", "aeroporto"],
  ["aracaju", "AJU", "aeroporto"],
  ["vitoria", "VIX", "aeroporto"],
  ["vix", "VIX", "aeroporto"],
  ["goiania", "GYN", "aeroporto"],
  ["cuiaba", "CGB", "aeroporto"],
  ["campo grande", "CGR", "aeroporto"],
  ["manaus", "MAO", "aeroporto"],
  ["mao", "MAO", "aeroporto"],
  ["belem", "BEL", "aeroporto"],
  ["sao luis", "SLZ", "aeroporto"],
  ["teresina", "THE", "aeroporto"],
  ["palmas", "PMW", "aeroporto"],
  ["porto velho", "PVH", "aeroporto"],
  ["rio branco", "RBR", "aeroporto"],
  ["macapa", "MCP", "aeroporto"],
  ["boa vista", "BVB", "aeroporto"],
  ["porto seguro", "BPS", "aeroporto"],
  ["ilheus", "IOS", "aeroporto"],
  ["fernando de noronha", "FEN", "aeroporto"],
  ["uberlandia", "UDI", "aeroporto"],
  ["petrolina", "PNZ", "aeroporto"],
  ["lisboa", "LIS", "aeroporto"],
  ["lis", "LIS", "aeroporto"],
  ["porto", "OPO", "cidade"],
  ["opo", "OPO", "aeroporto"],
  ["madrid", "MAD", "aeroporto"],
  ["barcelona", "BCN", "aeroporto"],
  ["paris", "PAR", "cidade"],
  ["londres", "LON", "cidade"],
  ["roma", "ROM", "cidade"],
  ["milao", "MIL", "cidade"],
  ["frankfurt", "FRA", "aeroporto"],
  ["amsterda", "AMS", "aeroporto"],
  ["amsterdam", "AMS", "aeroporto"],
  ["nova york", "NYC", "cidade"],
  ["nova iorque", "NYC", "cidade"],
  ["nyc", "NYC", "cidade"],
  ["miami", "MIA", "aeroporto"],
  ["mia", "MIA", "aeroporto"],
  ["orlando", "MCO", "aeroporto"],
  ["buenos aires", "BUE", "cidade"],
  ["montevideu", "MVD", "aeroporto"],
  ["lima", "LIM", "aeroporto"],
  ["bogota", "BOG", "aeroporto"],
  ["cidade do mexico", "MEX", "cidade"],
  ["cancun", "CUN", "aeroporto"],
  ["punta cana", "PUJ", "aeroporto"],
  ["toronto", "YTO", "cidade"],
  ["los angeles", "LAX", "aeroporto"],
  ["dubai", "DXB", "aeroporto"],
];

const CODIGOS = new Set(LUGARES.map((item) => item[1]));

const SKYSCANNER = {
  SAO: "saoa",
  RIO: "rioa",
  BHZ: "bhza",
  LON: "lond",
  NYC: "nyca",
  PAR: "pari",
  BUE: "buea",
  MIL: "mila",
  ROM: "roma",
  YTO: "ytoa",
};

function lugarNaFrase(chave, nome) {
  const padrao = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?:^|\\s)${padrao}(?:\\s|$)`).test(chave);
}

export function codigoDe(texto) {
  const chave = semAcento(texto);
  if (!chave) return "";
  let aeroporto = "";
  let aeroportoTam = 0;
  let cidade = "";
  let cidadeTam = 0;
  for (const [nome, codigo, tipo] of LUGARES) {
    if (!lugarNaFrase(chave, nome)) continue;
    if (tipo === "aeroporto" && nome.length > aeroportoTam) {
      aeroporto = codigo;
      aeroportoTam = nome.length;
    } else if (tipo !== "aeroporto" && nome.length > cidadeTam) {
      cidade = codigo;
      cidadeTam = nome.length;
    }
  }
  if (aeroporto) return aeroporto;
  if (cidade) return cidade;
  const token = chave.match(/\b([a-z]{3})\b/);
  return token && CODIGOS.has(token[1].toUpperCase()) ? token[1].toUpperCase() : "";
}

const ROTULOS = {
  NVT: "Navegantes (NVT)",
  CGH: "São Paulo (CGH)",
  GRU: "São Paulo (GRU)",
  VCP: "Campinas (VCP)",
  SAO: "São Paulo",
  SDU: "Rio de Janeiro (SDU)",
  GIG: "Rio de Janeiro (GIG)",
  RIO: "Rio de Janeiro",
  CNF: "Belo Horizonte (CNF)",
  BHZ: "Belo Horizonte",
  BSB: "Brasília (BSB)",
  FLN: "Florianópolis (FLN)",
  CWB: "Curitiba (CWB)",
  POA: "Porto Alegre (POA)",
  SSA: "Salvador (SSA)",
  REC: "Recife (REC)",
  FOR: "Fortaleza (FOR)",
  MAO: "Manaus (MAO)",
  BEL: "Belém (BEL)",
  GYN: "Goiânia (GYN)",
  CGB: "Cuiabá (CGB)",
  VIX: "Vitória (VIX)",
  NAT: "Natal (NAT)",
  MCZ: "Maceió (MCZ)",
  LIS: "Lisboa (LIS)",
  MIA: "Miami (MIA)",
};

export function rotuloDeCodigo(codigo) {
  const texto = String(codigo || "").trim();
  const chave = texto.toUpperCase();
  if (!/^[A-Z]{3}$/.test(chave)) return texto;
  return ROTULOS[chave] || texto;
}

function dataIso(data) {
  return `${data.ano}-${String(data.mes).padStart(2, "0")}-${String(data.dia).padStart(2, "0")}`;
}

function dataCurta(data) {
  return `${String(data.ano).slice(2)}${String(data.mes).padStart(2, "0")}${String(data.dia).padStart(2, "0")}`;
}

function imagemDoSite(dominio) {
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(dominio)}`;
}

export function urlGoogleVoosBusca(pedido) {
  const de = codigoDe(pedido.origem) || pedido.origem || "";
  const para = codigoDe(pedido.destino) || pedido.destino;
  const pessoas = pedido.passageiros > 1 ? ` ${pedido.passageiros} adults` : "";
  const ida = dataIso(pedido.embarque);
  const frase = pedido.volta
    ? `Flights from ${de} to ${para} on ${ida} through ${dataIso(pedido.volta)}${pessoas}`
    : `One way flights from ${de} to ${para} on ${ida}${pessoas}`;
  return `https://www.google.com/travel/flights?hl=pt-BR&curr=BRL&q=${encodeURIComponent(frase)}`;
}

function urlGoogleVoos(pedido) {
  return urlGoogleVoosBusca(pedido);
}

function urlKayak(pedido, origem, destino) {
  if (!origem || !destino) return "";
  const rota = pedido.volta
    ? `${origem}-${destino}/${dataIso(pedido.embarque)}/${dataIso(pedido.volta)}`
    : `${origem}-${destino}/${dataIso(pedido.embarque)}`;
  return `https://www.kayak.com.br/flights/${rota}?sort=price_a&adults=${pedido.passageiros}`;
}

function urlDecolar(pedido, origem, destino) {
  if (!origem || !destino) return "";
  const tipo = pedido.volta ? "roundtrip" : "oneway";
  const datas = pedido.volta ? `${dataIso(pedido.embarque)}/${dataIso(pedido.volta)}` : dataIso(pedido.embarque);
  return `https://www.decolar.com/shop/flights/results/${tipo}/${origem}/${destino}/${datas}/${pedido.passageiros}/0/0/NA/NA/NA/NA/NA?from=SB&di=1`;
}

function urlSkyscanner(pedido, origem, destino) {
  if (!origem || !destino) return "";
  const de = SKYSCANNER[origem] || origem.toLowerCase();
  const para = SKYSCANNER[destino] || destino.toLowerCase();
  const datas = pedido.volta ? `${dataCurta(pedido.embarque)}/${dataCurta(pedido.volta)}` : dataCurta(pedido.embarque);
  const volta = pedido.volta ? 1 : 0;
  return `https://www.skyscanner.com.br/transporte/passagens-aereas/${de}/${para}/${datas}/?adultsv2=${pedido.passageiros}&cabinclass=economy&rtn=${volta}`;
}

function urlMaxMilhas(pedido, origem, destino) {
  if (!origem || !destino) return "";
  const tipo = pedido.volta ? "RT" : "OW";
  const datas = pedido.volta ? `${dataIso(pedido.embarque)}/${dataIso(pedido.volta)}` : dataIso(pedido.embarque);
  return `https://www.maxmilhas.com.br/busca-passagens-aereas/${tipo}/${origem}/${destino}/${datas}/${pedido.passageiros}/0/0/EC`;
}

export function linksDosSites(pedido) {
  const origem = codigoDe(pedido.origem);
  const destino = codigoDe(pedido.destino);
  const candidatos = [
    { nome: "Google Voos", dominio: "www.google.com", url: urlGoogleVoos(pedido) },
    { nome: "Kayak", dominio: "www.kayak.com.br", url: urlKayak(pedido, origem, destino) },
    { nome: "Decolar", dominio: "www.decolar.com", url: urlDecolar(pedido, origem, destino) },
    { nome: "Skyscanner", dominio: "www.skyscanner.com.br", url: urlSkyscanner(pedido, origem, destino) },
    { nome: "MaxMilhas", dominio: "www.maxmilhas.com.br", url: urlMaxMilhas(pedido, origem, destino) },
  ];
  return candidatos
    .filter((item) => /^https:\/\//.test(item.url))
    .map((item) => ({ ...item, imagem: imagemDoSite(item.dominio) }));
}

function trechoDosSites(pedido) {
  const de = pedido.origem || "Origem a confirmar";
  const volta = pedido.volta ? `volta ${pedido.volta.br}` : "somente ida";
  return `${de} → ${pedido.destino} · ida ${pedido.embarque.br} · ${volta}`;
}

export function blocoDosSites(pedido) {
  const sites = linksDosSites(pedido);
  if (!sites.length) return "";
  return "```sites\n" + JSON.stringify({ titulo: "Onde comparar", trecho: trechoDosSites(pedido), sites }) + "\n```";
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function reais(valor) {
  const [inteiro, centavos] = Number(valor).toFixed(2).split(".");
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${milhar},${centavos}`;
}

function valorDoRotulo(label) {
  const achado = String(label ?? "").match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s+Reais brasileiros/i);
  if (!achado) return 0;
  const inteiro = Number(achado[1].replace(/\./g, ""));
  const centavos = achado[2] ? Number(achado[2].padEnd(2, "0").slice(0, 2)) / 100 : 0;
  return inteiro + centavos;
}

function centavosDoGrafico(valor) {
  return Number(valor).toFixed(2).replace(".", ",");
}

function nomesDoGrafico(ofertas) {
  const contagem = new Map();
  for (const item of ofertas) contagem.set(item.cia, (contagem.get(item.cia) || 0) + 1);
  const usados = new Map();
  return ofertas.map((item) => {
    if ((contagem.get(item.cia) || 0) < 2) return item.cia;
    const vez = (usados.get(item.cia) || 0) + 1;
    usados.set(item.cia, vez);
    return item.hora ? `${item.cia} ${item.hora}` : `${item.cia} ${vez}`;
  });
}

export function blocoDoGrafico(ofertas, pedido) {
  const nomes = nomesDoGrafico(ofertas);
  const linhas = ofertas.map((item, indice) => `${nomes[indice]} | ${centavosDoGrafico(item.valor)}`);
  const de = pedido.origem ? `${pedido.origem} → ${pedido.destino}` : pedido.destino;
  return ["```grafico", `Preços para ${de}`, ...linhas, "```"].join("\n");
}

function aeroportoCurto(nome) {
  const texto = String(nome ?? "").replace(/^Aeroporto(?: Internacional)?(?: de)?\s+/i, "").trim();
  if (/congonhas/i.test(texto)) return "São Paulo (CGH)";
  if (/guarulhos|franco montoro/i.test(texto)) return "São Paulo (GRU)";
  if (/viracopos/i.test(texto)) return "Campinas (VCP)";
  if (/navegantes/i.test(texto)) return "Navegantes (NVT)";
  return texto.split(/[–—-]/)[0].trim().slice(0, 40);
}

function companhiaDaOferta(texto) {
  const direto = texto.match(/Voo direto da ([^.]+)/i);
  const comParada = texto.match(/Voo da ([^.]+?) com (\d+) paradas?/i);
  const nome = (direto?.[1] || comParada?.[1] || "").replace(/\s+Operado por[\s\S]*$/i, "").trim();
  if (!nome) return null;
  const cia = /^gol$/i.test(nome) ? "GOL" : /latam/i.test(nome) ? "LATAM" : /^azul$/i.test(nome) ? "Azul" : nome;
  const escalas = direto || /direto|sem escalas/i.test(texto) ? "-" : comParada?.[2] || "-";
  return { cia, escalas };
}

export function paginaConfereDatas(html, pedido) {
  const texto = String(html ?? "");
  if (!texto.includes(dataIso(pedido.embarque))) return false;
  if (pedido.volta && !texto.includes(dataIso(pedido.volta))) return false;
  return true;
}

export function ofertasDoGoogleVoos(html, pedido) {
  const mes = MESES[pedido.embarque.mes - 1];
  const dia = new RegExp(`${mes} ${pedido.embarque.dia}(?!\\d)`, "i");
  const vistas = new Set();
  const ofertas = [];
  for (const achado of String(html ?? "").matchAll(/aria-label="(Preço total[^"]+)"/g)) {
    const label = achado[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
    if (!dia.test(label)) continue;
    const valor = valorDoRotulo(label);
    const voo = companhiaDaOferta(label);
    const hora = label.match(/às (\d{1,2}:\d{2})/)?.[1] || "";
    const origem = aeroportoCurto(label.match(/Sai do aeroporto (.+?) às/i)?.[1]);
    const destino = aeroportoCurto(label.match(/chega no aeroporto (.+?) às/i)?.[1]);
    if (!valor || !voo || !origem || !destino) continue;
    const chave = `${voo.cia}|${hora}|${destino}|${valor}|${voo.escalas}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    ofertas.push({ ...voo, hora, origem, destino, valor, saida: `${pedido.embarque.br} ${hora}`.trim(), preco: reais(valor), onde: "Google Voos" });
  }
  return escolherOfertas(ofertas);
}

function escolherOfertas(lista) {
  const ordenadas = [...lista].sort((a, b) => a.valor - b.valor || String(a.hora).localeCompare(String(b.hora)));
  const escolhidas = [];
  for (const item of ordenadas) {
    const onde = item.onde || "Google Voos";
    const doSite = escolhidas.filter((outra) => outra.onde === onde);
    if (doSite.length >= 5) continue;
    const repetida = doSite.some((outra) => outra.cia === item.cia && outra.hora === item.hora && outra.destino === item.destino && outra.valor === item.valor);
    if (repetida) continue;
    const jaTemCia = doSite.some((outra) => outra.cia === item.cia);
    const diretaNova = item.escalas === "-" && !doSite.some((outra) => outra.cia === item.cia && outra.escalas === "-");
    if (jaTemCia && !diretaNova && doSite.length >= 3) continue;
    escolhidas.push({ ...item, onde });
    if (escolhidas.length === 12) break;
  }
  return escolhidas.sort((a, b) => a.valor - b.valor || String(a.hora).localeCompare(String(b.hora)));
}

export function textoDaComparacao(ofertas, pedido) {
  const volta = pedido.volta ? `, Volta: ${pedido.volta.br}` : "";
  const linhas = [
    `Origem: ${pedido.origem || "—"}, Destino: ${pedido.destino}, Ida: ${pedido.embarque.br}${volta}.`,
    "",
    "| Companhia | Origem | Destino | Saída | Escalas | Preço | Onde viu |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...ofertas.map((item) => `| ${item.cia} | ${item.origem} | ${item.destino} | ${item.saida} | ${item.escalas} | ${item.preco} | ${item.onde || "Google Voos"} |`),
    "",
    `**Melhor preço:** ${ofertas[0].preco} na ${ofertas[0].cia}, ${ofertas[0].escalas === "-" ? "sem escalas" : `${ofertas[0].escalas} escalas`}, visto no ${ofertas[0].onde || "Google Voos"}.`,
    fraseDasFontes(ofertas),
  ];
  const direta = ofertas.find((item) => item.escalas === "-" && item !== ofertas[0]);
  if (ofertas[0].escalas !== "-" && direta) linhas.push(`**Alternativa:** ${direta.cia}, ${direta.preco}, sem escalas.`);
  linhas.push("", AVISO, "", blocoDoGrafico(ofertas, pedido));
  return linhas.join("\n");
}

async function lerGoogleVoos(pedido) {
  const resp = await fetch(urlGoogleVoosBusca(pedido), {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error("A página do Google Voos não abriu.");
  return resp.text();
}

function fraseDasFontes(ofertas) {
  const fontes = [...new Set(ofertas.map((item) => item.onde || "Google Voos"))];
  return fontes.length === 1
    ? `Preços lidos no ${fontes[0]} nesta consulta.`
    : `Preços lidos nesta consulta: ${fontes.join(", ")}.`;
}

function notaDosSites(ofertas) {
  const lidos = new Set(ofertas.map((item) => item.onde || "Google Voos"));
  const faltam = ["Kayak", "Decolar", "Skyscanner", "MaxMilhas"].filter((nome) => !lidos.has(nome));
  if (!ofertas.length || !faltam.length) return "";
  if (faltam.length === 1) return `${faltam[0]} não liberou a leitura automática. O link abaixo abre a mesma busca.`;
  return `${faltam.join(", ")} não liberaram a leitura automática. Os links abaixo abrem a mesma busca.`;
}

function comparacaoComSites(texto, pedido, ofertas = []) {
  const nota = notaDosSites(ofertas);
  const bloco = blocoDosSites(pedido);
  return [texto, nota, bloco].filter(Boolean).join("\n\n");
}

function completarOferta(item, pedido) {
  const hora = item.hora || "";
  return {
    ...item,
    origem: rotuloDeCodigo(item.origem),
    destino: rotuloDeCodigo(item.destino),
    saida: `${pedido.embarque.br} ${hora}`.trim(),
    preco: reais(item.valor),
    onde: item.onde || "Google Voos",
  };
}

async function ofertasDaMax(pedido) {
  const url = linksDosSites(pedido).find((site) => site.nome === "MaxMilhas")?.url;
  if (!url) return [];
  const blocos = await lerJsonDaMaxMilhas(url);
  return ofertasDaMaxMilhas(blocos, pedido).map((item) => completarOferta(item, pedido));
}

export async function pesquisarPassagens(args, opcoes = {}) {
  const pedido = montarPedidoPassagem(args, opcoes.agora);
  if (pedido.erro) return pedido.erro;
  const ler = opcoes.lerPagina ?? lerGoogleVoos;
  const lerOutros = opcoes.lerOutros ?? ofertasDaMax;
  const [google, outros] = await Promise.all([
    Promise.resolve()
      .then(() => ler(pedido))
      .then((html) => (html && paginaConfereDatas(html, pedido) ? ofertasDoGoogleVoos(html, pedido) : []))
      .catch(() => []),
    Promise.resolve()
      .then(() => lerOutros(pedido))
      .then((lista) => (Array.isArray(lista) ? lista : []))
      .catch(() => []),
  ]);
  const ofertas = escolherOfertas([...google, ...outros]);
  const texto = ofertas.length ? textoDaComparacao(ofertas, pedido) : SEM_PRECO;
  return comparacaoComSites(texto, pedido, ofertas);
}
