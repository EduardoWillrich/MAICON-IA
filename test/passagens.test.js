import test from "node:test";
import assert from "node:assert/strict";
import { ferramentaDaVisao } from "../server/funcoes.js";
import { esquemaDaFerramenta } from "../server/ia.js";
import { ofertasDaMaxMilhas } from "../server/buscaVoo.js";
import {
  anexarFontes,
  codigoDe,
  fecharComparacao,
  fontesDaResposta,
  linksDosSites,
  montarPedidoPassagem,
  interpretarPassagem,
  ofertasDoGoogleVoos,
  paginaConfereDatas,
  pedidoPassagemDaConversa,
  pesquisarPassagens,
  respostaPassagemIncompleta,
  rotuloDeCodigo,
  blocoDoGrafico,
  textoDaComparacao,
  textoPedido,
  urlGoogleVoosBusca,
} from "../server/passagens.js";

const HOJE = new Date("2026-11-04T15:00:00Z");

test("sem destino ou data a pergunta para na hora e não consulta de novo", () => {
  const atalho = "Compare os preços de passagem aérea. Se eu não informei o destino ou a data de embarque, pergunte só o que falta.";
  assert.match(respostaPassagemIncompleta(atalho), /destino e a data de embarque/);
  assert.match(respostaPassagemIncompleta("Passagem aérea para Lisboa"), /data de embarque para Lisboa/);
  assert.equal(respostaPassagemIncompleta("Passagem aérea em 15/12/2026"), "Informe o destino da passagem.");
  assert.equal(respostaPassagemIncompleta("Compare passagem aérea para Lisboa em 15/12/2026"), "");
});

test("a resposta curta vira origem, destino, ida e volta", () => {
  const pedido = interpretarPassagem("origem navegantes ida 05/11/2026 pra são paulo, volta dia 10/11", HOJE);
  assert.equal(pedido.origem, "navegantes");
  assert.equal(pedido.destino, "são paulo");
  assert.equal(pedido.data_embarque, "05/11/2026");
  assert.equal(pedido.volta, "10/11/2026");
  const virada = interpretarPassagem("passagem aérea para Lisboa ida 20/12/2026 volta dia 05/01", HOJE);
  assert.equal(virada.destino, "Lisboa");
  assert.equal(virada.data_embarque, "20/12/2026");
  assert.equal(virada.volta, "05/01/2027");
  assert.equal(interpretarPassagem("qual a taxa do processo IM1000-26 em 05/11/2026", HOJE), null);
});

test("a passagem exige destino e data de embarque", () => {
  assert.equal(montarPedidoPassagem({}, HOJE).erro, "Informe o destino da passagem.");
  assert.match(montarPedidoPassagem({ destino: "Lisboa" }, HOJE).erro, /data de embarque/);
  assert.match(montarPedidoPassagem({ destino: "Lisboa", data_embarque: "31/02/2026" }, HOJE).erro, /data de embarque/);
  assert.match(montarPedidoPassagem({ destino: "Lisboa", data_embarque: "03/11/2026" }, HOJE).erro, /já passou/);
  const curto = montarPedidoPassagem({ destino: "Lisboa", data_embarque: "15/12" }, HOJE);
  assert.equal(curto.embarque.br, "15/12/2026");
  assert.equal(curto.origem, "São Paulo (GRU)");
  assert.match(textoPedido(curto), /origem padrão/);
});

test("o pedido leva a data de embarque e o destino para a pesquisa", () => {
  const pedido = montarPedidoPassagem(
    { destino: " Lisboa ", data_embarque: "15/12/2026", origem: "São Paulo", volta: "22/12/2026", passageiros: 2 },
    HOJE,
  );
  assert.equal(pedido.destino, "Lisboa");
  assert.equal(pedido.embarque.br, "15/12/2026");
  assert.equal(pedido.volta.br, "22/12/2026");
  const texto = textoPedido(pedido);
  assert.match(texto, /Lisboa/);
  assert.match(texto, /15\/12\/2026/);
  assert.match(texto, /22\/12\/2026/);
  assert.match(texto, /São Paulo/);
  assert.match(texto, /2 adultos/);
});

test("a comparação aponta que o preço precisa ser confirmado", () => {
  const fechado = fecharComparacao("**Melhor preço:** TAP, R$ 3.240,00, no site da TAP.");
  assert.match(fechado, /Melhor preço/);
  assert.match(fechado, /Confirme no site/);
  assert.equal(fecharComparacao("Já está dito. Confirme no site antes."), "Já está dito. Confirme no site antes.");
  assert.throws(() => fecharComparacao("  "), /não devolveu preços/);
});

test("as fontes da pesquisa entram uma vez", () => {
  const fontes = fontesDaResposta({
    annotations: [
      { type: "url_citation", url_citation: { url: "https://www.decolar.com/passagens", title: "Decolar" } },
      { type: "url_citation", url_citation: { url: "https://www.decolar.com/passagens", title: "Decolar" } },
      { url: "nota-interna" },
    ],
  });
  assert.deepEqual(fontes, ["- Decolar: https://www.decolar.com/passagens"]);
  const comFonte = "TAP por R$ 3.240,00 em https://www.decolar.com/passagens";
  assert.equal(anexarFontes(comFonte, fontes), comFonte);
  assert.match(anexarFontes("TAP por R$ 3.240,00.", fontes), /Fontes/);
});

const HTML_VOOS = `
<div data-value="2026-11-05"></div><div data-value="2026-11-10"></div>
<div aria-label="Preço total a partir de 4109 Reais brasileiros, ida e volta. Voo direto da LATAM. Sai do aeroporto Aeroporto Internacional de Navegantes às 11:30 do dia quinta-feira, novembro 5 e chega no aeroporto Aeroporto de São Paulo/Congonhas–Deputado Freitas Nobre às 12:40 do dia quinta-feira, novembro 5."></div>
<div aria-label="Preço total a partir de 3169 Reais brasileiros, ida e volta. Voo da Gol com 3 paradas. Sai do aeroporto Aeroporto Internacional de Navegantes às 14:55 do dia quinta-feira, novembro 5 e chega no aeroporto Aeroporto Internacional de Viracopos às 10:45 do dia sexta-feira, novembro 6."></div>
<div aria-label="Preço total a partir de 999 Reais brasileiros, ida e volta. Voo direto da Azul. Sai do aeroporto Aeroporto Internacional de Navegantes às 08:00 do dia quinta-feira, fevereiro 5 e chega no aeroporto Aeroporto de São Paulo/Congonhas às 09:00 do dia quinta-feira, fevereiro 5."></div>
`;

test("a comparação usa só o preço lido na página das datas pedidas", () => {
  const pedido = montarPedidoPassagem(
    { origem: "Navegantes", destino: "São Paulo", data_embarque: "05/11/2026", volta: "10/11/2026" },
    HOJE,
  );
  assert.equal(paginaConfereDatas(HTML_VOOS, pedido), true);
  assert.equal(paginaConfereDatas("<div data-value=\"2026-11-05\"></div>", pedido), false);
  const ofertas = ofertasDoGoogleVoos(HTML_VOOS, pedido);
  assert.deepEqual(ofertas.map((item) => item.preco), ["R$ 3.169,00", "R$ 4.109,00"]);
  assert.equal(ofertas[0].cia, "GOL");
  assert.equal(ofertas[0].escalas, "3");
  assert.equal(ofertas[1].destino, "São Paulo (CGH)");
  const texto = textoDaComparacao(ofertas, pedido);
  assert.match(texto, /Melhor preço/);
  assert.match(texto, /\*\*Alternativa:\*\* LATAM, R\$ 4\.109,00, sem escalas/);
  assert.match(texto, /```grafico/);
  assert.match(texto, /GOL \| 3169,00/);
  assert.match(texto, /LATAM \| 4109,00/);
  assert.doesNotMatch(texto, /R\$ 999/);
  assert.match(urlGoogleVoosBusca(pedido), /NVT/);
  assert.match(urlGoogleVoosBusca(pedido), /2026-11-05/);
  assert.match(urlGoogleVoosBusca(pedido), /2026-11-10/);
});

test("o centavo do rótulo entra no preço e no gráfico", () => {
  const pedido = montarPedidoPassagem(
    { origem: "Navegantes", destino: "São Paulo", data_embarque: "05/11/2026", volta: "10/11/2026" },
    HOJE,
  );
  const html = HTML_VOOS.replace("4109 Reais brasileiros", "4.109,90 Reais brasileiros");
  const ofertas = ofertasDoGoogleVoos(html, pedido);
  assert.equal(ofertas.find((item) => item.cia === "LATAM").preco, "R$ 4.109,90");
  const grafico = blocoDoGrafico(ofertas, pedido);
  assert.match(grafico, /LATAM \| 4109,90/);
  assert.match(grafico, /Preços para Navegantes → São Paulo/);
});

test("a pesquisa devolve a comparação sem chamar a internet de novo no teste", async () => {
  const texto = await pesquisarPassagens(
    { origem: "Navegantes", destino: "São Paulo", data_embarque: "05/11/2026", volta: "10/11/2026" },
    { agora: HOJE, lerPagina: async () => HTML_VOOS, lerOutros: async () => [] },
  );
  assert.match(texto, /R\$ 3\.169,00/);
  assert.match(texto, /Google Voos/);
  assert.match(texto, /Confirme no site/);
  assert.match(texto, /```grafico/);
  assert.match(texto, /GOL \| 3169,00/);
  assert.match(texto, /```sites/);
  assert.match(texto, /2026-11-05/);
  assert.doesNotMatch(texto, /330/);
});

test("se a pesquisa falha, os sites das datas pedidas ainda aparecem", async () => {
  const texto = await pesquisarPassagens(
    { origem: "Navegantes", destino: "São Paulo", data_embarque: "05/11/2026", volta: "10/11/2026" },
    {
      agora: HOJE,
      lerPagina: async () => {
        throw new Error("sem página");
      },
      lerOutros: async () => [],
    },
  );
  assert.match(texto, /Não achei preço publicado/);
  assert.match(texto, /```sites/);
  assert.match(texto, /2026-11-05/);
  assert.match(texto, /2026-11-10/);
  assert.match(texto, /NVT-SAO/);
});

test("os comparadores abrem nas datas pedidas, com a imagem do site", () => {
  assert.equal(codigoDe("Navegantes"), "NVT");
  assert.equal(codigoDe("São Paulo"), "SAO");
  assert.equal(codigoDe("São Paulo (GRU)"), "GRU");
  assert.equal(codigoDe("Porto Alegre"), "POA");
  const pedido = montarPedidoPassagem(
    { origem: "Navegantes", destino: "São Paulo", data_embarque: "05/11/2026", volta: "10/11/2026" },
    HOJE,
  );
  const links = linksDosSites(pedido);
  assert.equal(links.length, 5);
  for (const site of links) {
    assert.match(site.url, /^https:\/\//);
    assert.match(site.imagem, /^https:\/\/www\.google\.com\/s2\/favicons\?/);
    assert.match(site.imagem, /domain=/);
  }
  const kayak = links.find((site) => site.nome === "Kayak");
  assert.match(kayak.url, /NVT-SAO\/2026-11-05\/2026-11-10/);
  const decolar = links.find((site) => site.nome === "Decolar");
  assert.match(decolar.url, /roundtrip\/NVT\/SAO\/2026-11-05\/2026-11-10/);
  const sky = links.find((site) => site.nome === "Skyscanner");
  assert.match(sky.url, /nvt\/saoa\/261105\/261110/);
  const soIda = linksDosSites(montarPedidoPassagem({ origem: "Lisboa", destino: "São Paulo", data_embarque: "15/12/2026" }, HOJE));
  assert.match(soIda.find((site) => site.nome === "Kayak").url, /LIS-SAO\/2026-12-15\?/);
  assert.doesNotMatch(soIda.find((site) => site.nome === "Kayak").url, /2026-12-16/);
});

test("a maxmilhas entra com o preço lido na data pedida", () => {
  const pedido = montarPedidoPassagem(
    { origem: "Navegantes", destino: "São Paulo", data_embarque: "05/01/2027", volta: "10/01/2027" },
    HOJE,
  );
  const ofertas = ofertasDaMaxMilhas({
    offers: [
      {
        priceDetails: { totalPrices: { total: 980.5 } },
        bounds: [{
          number: 0,
          carrier: "LA",
          totalStops: 0,
          departure: { locationCode: "NVT", dateTime: "2027-01-05T11:30:00Z" },
          arrival: { locationCode: "CGH", dateTime: "2027-01-05T12:40:00Z" },
        }],
      },
      {
        priceDetails: { totalPrices: { total: 400 } },
        bounds: [{
          number: 0,
          carrier: "G3",
          totalStops: 1,
          departure: { locationCode: "NVT", dateTime: "2027-02-05T20:35:00Z" },
          arrival: { locationCode: "GRU", dateTime: "2027-02-05T22:00:00Z" },
        }],
      },
    ],
  }, pedido);
  assert.equal(ofertas.length, 1);
  assert.equal(ofertas[0].cia, "LATAM");
  assert.equal(ofertas[0].hora, "11:30");
  assert.equal(ofertas[0].origem, "NVT");
  assert.equal(ofertas[0].destino, "CGH");
  assert.equal(ofertas[0].escalas, "-");
  assert.equal(ofertas[0].valor, 980.5);
  assert.equal(ofertas[0].onde, "MaxMilhas");
  assert.equal(rotuloDeCodigo("CGH"), "São Paulo (CGH)");
  assert.equal(rotuloDeCodigo("São Paulo (CGH)"), "São Paulo (CGH)");
});

test("a comparação junta google e maxmilhas e o mais barato manda", async () => {
  const texto = await pesquisarPassagens(
    { origem: "Navegantes", destino: "São Paulo", data_embarque: "05/11/2026", volta: "10/11/2026" },
    {
      agora: HOJE,
      lerPagina: async () => HTML_VOOS,
      lerOutros: async () => [{
        cia: "Azul",
        hora: "08:00",
        origem: "Navegantes (NVT)",
        destino: "Campinas (VCP)",
        escalas: "-",
        valor: 900,
        saida: "05/11/2026 08:00",
        preco: "R$ 900,00",
        onde: "MaxMilhas",
      }],
    },
  );
  assert.match(texto, /MaxMilhas/);
  assert.match(texto, /Google Voos/);
  assert.match(texto, /visto no MaxMilhas/);
  assert.match(texto, /R\$ 900,00/);
  assert.match(texto, /Kayak, Decolar, Skyscanner não liberaram/);
});

test("pedir mais resultados repete a busca da mensagem anterior", () => {
  const pedido = pedidoPassagemDaConversa([
    { role: "user", content: "origem navegantes ida 05/01/2027 pra são paulo, volta dia 10/01/2027" },
    { role: "assistant", content: "tabela" },
    { role: "user", content: "me mostre mais resultados" },
  ], HOJE);
  assert.equal(pedido.origem, "navegantes");
  assert.equal(pedido.destino, "são paulo");
  assert.equal(pedido.data_embarque, "05/01/2027");
  assert.equal(pedido.volta, "10/01/2027");
  assert.equal(pedidoPassagemDaConversa([{ role: "user", content: "me mostre mais resultados" }], HOJE), null);
});

test("só o financeiro e a gerência comparam passagem", () => {
  const esquema = esquemaDaFerramenta("passagens_aereas");
  assert.equal(esquema.parameters.required.includes("destino"), true);
  assert.equal(esquema.parameters.required.includes("data_embarque"), true);
  assert.equal(ferramentaDaVisao("passagens_aereas", "financeiro"), true);
  assert.equal(ferramentaDaVisao("passagens_aereas", "gerencia"), true);
  assert.equal(ferramentaDaVisao("passagens_aereas", "operacional"), false);
  assert.equal(ferramentaDaVisao("passagens_aereas", "comercial"), false);
  assert.equal(ferramentaDaVisao("passagens_aereas", "admin"), false);
});
