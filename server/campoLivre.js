import sql from "mssql";
import { nomeProprio } from "./itensCarga.js";
import { enriquecerNomes } from "./nomes.js";
import { montarSelect, montarXpaths, parseTabelasXml } from "./query.js";

const PROCESSO = /^[A-Z]{1,4}\d{2,6}-\d{2}$/i;

function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function frase(nome) {
  const texto = String(nome ?? "").trim();
  if (!texto) return "";
  const baixo = texto.toLocaleLowerCase("pt-BR");
  return baixo.charAt(0).toLocaleUpperCase("pt-BR") + baixo.slice(1);
}

function quando(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return { dia: "", hora: "" };
  const relogio = new Date(data.getTime() - 3 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return {
    dia: `${p(relogio.getUTCDate())}/${p(relogio.getUTCMonth() + 1)}/${relogio.getUTCFullYear()}`,
    hora: `${p(relogio.getUTCHours())}:${p(relogio.getUTCMinutes())}`,
  };
}

function diaLocal(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function fatiar(inicio, fim, dias) {
  const partes = [];
  let cursor = new Date(inicio);
  const limite = new Date(fim);
  while (cursor <= limite) {
    const proximo = new Date(cursor);
    proximo.setDate(proximo.getDate() + dias - 1);
    const ate = proximo < limite ? proximo : new Date(limite);
    partes.push([new Date(cursor), ate]);
    cursor = new Date(ate);
    cursor.setDate(cursor.getDate() + 1);
  }
  return partes;
}

function iso(valor) {
  if (!valor) return "";
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? String(valor) : data.toISOString();
}

async function lerFatia(pool, xpaths, inicio, fim) {
  const pedido = pool.request();
  pedido.timeout = 25000;
  pedido.input("Data_Inicio", sql.Date, inicio);
  pedido.input("Data_Termino", sql.Date, fim);
  pedido.input("IdUsuario", sql.Int, 0);
  const resultado = await pedido.query(montarSelect(xpaths));
  const eventos = [];
  for (const linha of resultado.recordset) {
    for (const tabela of parseTabelasXml(linha.Trecho)) {
      eventos.push({
        usuario: nomeProprio(linha.Usuario),
        dataInicioTransacao: iso(linha.Data_Inicio_Transacao),
        dataTerminoTransacao: iso(linha.Data_Termino_Transacao),
        id: "",
        usuarioWindows: linha.Usuario_Windows ?? "",
        computador: linha.Computador ?? "",
        tabela: tabela.nome,
        tipo: tabela.tipo,
        data: iso(linha.Data_Inicio_Transacao),
        indice: tabela.indice,
        tempoTransacao: 0,
        campos: tabela.campos,
      });
    }
  }
  return eventos;
}

async function historico(pool, id, inicio) {
  const xpaths = montarXpaths({
    tabela: "mov_Campo_Livre",
    tipo: 0,
    chaves: [{ nome: "IdCampo_Livre", valor: String(id) }],
  });
  const fim = new Date();
  const fatias = fatiar(inicio, fim, 21).reverse();
  const eventos = [];
  for (const [de, ate] of fatias) {
    eventos.push(...(await lerFatia(pool, xpaths, de, ate)));
    const temInclusao = eventos.some(
      (evento) =>
        evento.tipo === 1 &&
        (evento.campos ?? []).some((campo) => campo.nome === "IdCampo_Livre" && String(campo.valor) === String(id)),
    );
    if (temInclusao || eventos.length >= 60) break;
  }
  eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime() || a.indice - b.indice);
  eventos.forEach((evento, indice) => {
    evento.id = String(indice + 1);
  });
  await enriquecerNomes(pool, eventos, null);
  return eventos;
}

function dataBr(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(data.getDate())}/${p(data.getMonth() + 1)}/${data.getFullYear()}`;
}

function textoDoTipo(campo, qual) {
  if (!campo) return "";
  if (qual === "anterior") return campo.valorAnteriorExibicao || campo.valorAnterior || "";
  return campo.valorExibicao || campo.valor || "";
}

function redigir(numero, campo, eventos) {
  const grupo = frase(campo.Grupo);
  const onde = grupo ? ` na ${grupo}` : "";
  const cabeca = `No processo **${numero}**, o campo livre **${campo.Identificador}**${onde} é o registro **${campo.IdCampo_Livre}**. A busca começa na abertura do processo.`;
  if (!eventos.length) {
    return `${cabeca}\n\nNão achei alteração desse campo no log desde a abertura.`;
  }
  const linhas = eventos.map((evento) => {
    const { dia, hora } = quando(evento.data || evento.dataInicioTransacao);
    const quem = nomeProprio(evento.usuario);
    const tipo = (evento.campos ?? []).find((item) => item.nome === "Valor_Tipo_Fixo");
    if (evento.tipo === 1) {
      const valor = textoDoTipo(tipo, "atual");
      return valor
        ? `**${quem}** incluiu em **${dia}** às **${hora}**, com o tipo fixo **${valor}**.`
        : `**${quem}** incluiu em **${dia}** às **${hora}**.`;
    }
    if (evento.tipo === 2) return `**${quem}** excluiu em **${dia}** às **${hora}**.`;
    const antes = textoDoTipo(tipo, "anterior");
    const agora = textoDoTipo(tipo, "atual");
    if (tipo && antes !== agora) {
      return `**${quem}** em **${dia}** às **${hora}** alterou o tipo fixo de **${antes || "vazio"}** para **${agora || "vazio"}**.`;
    }
    return `**${quem}** alterou em **${dia}** às **${hora}**.`;
  });
  return [cabeca, "", ...linhas].join("\n");
}

export async function explicarCampoLivre(pool, args) {
  const numero = String(args?.numero ?? "").trim().toUpperCase();
  const identificador = String(args?.identificador ?? "").trim();
  const grupo = String(args?.grupo ?? "").trim();
  if (!PROCESSO.test(numero)) return "Informe o número do processo, como IM5008-26.";
  if (!identificador) return "Informe o identificador do campo livre, como OMBL.";

  const pedido = pool.request();
  pedido.input("numero", sql.VarChar(30), numero);
  pedido.input("ident", sql.VarChar(80), identificador);
  const achados = await pedido.query(`
    SELECT
      H.Numero_Processo,
      H.Data_Abertura_Processo,
      Lcl.IdCampo_Livre,
      Cfg.Identificador,
      G.Nome AS Grupo
    FROM mov_Logistica_House H
    JOIN mov_Logistica_Campo_Livre Lcl ON Lcl.IdLogistica_House = H.IdLogistica_House
    JOIN mov_Campo_Livre Mcl ON Mcl.IdCampo_Livre = Lcl.IdCampo_Livre
    JOIN cad_Configuracao_Campo_Livre Cfg ON Cfg.IdConfiguracao_Campo_Livre = Mcl.IdConfiguracao_Campo_Livre
    LEFT JOIN cad_Grupo_Campo_Livre G ON G.IdGrupo_Campo_Livre = Cfg.IdGrupo_Campo_Livre
    WHERE H.Numero_Processo = @numero
      AND (Cfg.Identificador = @ident OR Cfg.Descricao = @ident)
  `);
  let lista = achados.recordset;
  if (grupo) {
    const alvo = semAcento(grupo);
    const noGrupo = lista.filter((linha) => semAcento(linha.Grupo).includes(alvo));
    if (noGrupo.length) lista = noGrupo;
  }
  if (!lista.length) {
    return `Não achei o campo livre ${identificador} no processo ${numero}.`;
  }
  const textos = [];
  const eventos = [];
  let abertura = null;
  for (const campo of lista) {
    const inicio = diaLocal(campo.Data_Abertura_Processo) ?? new Date(Date.now() - 120 * 86400000);
    if (!abertura || inicio < abertura) abertura = inicio;
    const lote = await historico(pool, campo.IdCampo_Livre, inicio);
    eventos.push(...lote);
    textos.push(redigir(numero, campo, lote));
  }
  eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime() || a.indice - b.indice);
  const identificadorCampo = String(lista[0].Identificador ?? identificador).trim();
  return {
    texto: textos.join("\n\n"),
    log: {
      titulo: `Campo Livre ${identificadorCampo} · ${numero}`,
      periodo: `${dataBr(abertura)} a ${dataBr(new Date())}`,
      eventos,
    },
  };
}
