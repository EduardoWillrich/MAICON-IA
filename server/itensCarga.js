import sql from "mssql";

const PROCESSO = /^[A-Z]{1,4}\d{2,6}-\d{2}$/;
const CONTAINER = /^[A-Z]{4}\d{7}$/;

const PRIMEIROS = {
  joao: "João",
  jose: "José",
  mario: "Mário",
  andre: "André",
  luis: "Luís",
  antonio: "Antônio",
  marcio: "Márcio",
  fabio: "Fábio",
  cesar: "César",
  sergio: "Sérgio",
  monica: "Mônica",
  lucia: "Lúcia",
};

const SOBRENOMES = {
  espindula: "Espíndula",
  araujo: "Araújo",
  goncalves: "Gonçalves",
  conceicao: "Conceição",
};

const QUANTOS = ["", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito"];

export function nomeProprio(login) {
  const partes = String(login ?? "")
    .split(/[.\s_]+/)
    .map((parte) => parte.trim())
    .filter(Boolean);
  if (!partes.length) return "Usuário não identificado";
  return partes
    .map((parte, indice) => {
      const baixo = parte.toLowerCase();
      if (indice === 0 && PRIMEIROS[baixo]) return PRIMEIROS[baixo];
      if (SOBRENOMES[baixo]) return SOBRENOMES[baixo];
      return baixo.charAt(0).toUpperCase() + baixo.slice(1);
    })
    .join(" ");
}

function quantos(n) {
  return QUANTOS[n] || String(n);
}

export function formatarTara(valor) {
  if (valor == null || valor === "") return "";
  const n = Number(String(valor).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return String(valor);
  const negativo = n < 0;
  const abs = Math.abs(n);
  const inteiro = Math.trunc(abs + 1e-9);
  const texto = String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negativo ? "-" : ""}${texto}`;
}

function diaHora(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return { dia: "", hora: "" };
  const p = (n) => String(n).padStart(2, "0");
  return {
    dia: `${p(data.getUTCDate())}/${p(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`,
    hora: `${p(data.getUTCHours())}:${p(data.getUTCMinutes())}`,
  };
}

function diaCurto(isoOuData) {
  if (!isoOuData) return "";
  const { dia } = diaHora(isoOuData);
  return dia;
}

function tipoItem(valor) {
  if (valor == null || valor === "") return "";
  const n = Number(valor);
  if (n === 1) return "Container";
  if (n === 0) return "Não informado";
  return String(valor);
}

function vazio(valor) {
  return valor == null || valor === "";
}

function isoInstante(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? "" : data.toISOString();
}

function campoLog(nome, valor, antes, exibicao, exibicaoAntes) {
  if (vazio(valor) && vazio(antes)) return null;
  const campo = { nome, valor: vazio(valor) ? "" : String(valor) };
  if (!vazio(antes)) campo.valorAnterior = String(antes);
  if (exibicao) campo.valorExibicao = exibicao;
  if (exibicaoAntes) campo.valorAnteriorExibicao = exibicaoAntes;
  return campo;
}

function eventosDoLog(linhas, inclusoes, ajustes, equipamentos) {
  const processo = linhas[0]?.processo || "";
  return [...inclusoes, ...ajustes]
    .sort((a, b) => new Date(a.quando) - new Date(b.quando))
    .map((linha, indice) => {
      const quando = isoInstante(linha.quando);
      const equipamento = nomeEquipamento(equipamentos, linha.equipamentoId);
      const equipamentoAntes = nomeEquipamento(equipamentos, linha.equipamentoAntes);
      const campos = [
        campoLog("Number", linha.number, linha.numberAntes),
        campoLog("Seal", linha.seal, linha.sealAntes),
        campoLog("Tare", linha.tare),
        campoLog("IdEquipamento_Maritimo", linha.equipamentoId, linha.equipamentoAntes, equipamento, equipamentoAntes),
        campoLog("Data_Devolucao", linha.devolucao),
        campoLog("IdConhecimento_Embarque", linha.conhecimentoId),
      ].filter(Boolean);
      return {
        id: String(indice + 1),
        usuario: nomeProprio(linha.usuario),
        dataInicioTransacao: quando,
        dataTerminoTransacao: quando,
        tempoTransacao: 0,
        usuarioWindows: "",
        computador: "",
        tabela: "mov_Logistica_Maritima_Container",
        tipo: Number(linha.tipo) || 1,
        data: quando,
        indice,
        campos,
        numeroProcesso: processo,
      };
    })
    .filter((evento) => evento.data && evento.campos.length);
}

function isoDia(data) {
  const p = (n) => String(n).padStart(2, "0");
  return `${data.getUTCFullYear()}-${p(data.getUTCMonth() + 1)}-${p(data.getUTCDate())}`;
}

function somarDias(data, dias) {
  return new Date(data.getTime() + dias * 86400000);
}

function inicioUtc(data) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

function numerosPedidos(valor) {
  return [
    ...new Set(
      String(valor ?? "")
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .filter((item) => CONTAINER.test(item)),
    ),
  ];
}

function nomeEquipamento(mapa, id) {
  if (vazio(id)) return "";
  return mapa[String(id)] || "";
}

function montarFatos(linhas, inclusoes, ajustes, equipamentos) {
  const porId = new Map(linhas.map((linha) => [String(linha.id), linha]));
  const ajustesPorId = new Map();
  for (const ajuste of ajustes) {
    const id = String(ajuste.id);
    if (!ajustesPorId.has(id)) ajustesPorId.set(id, []);
    ajustesPorId.get(id).push(ajuste);
  }
  const fatos = [];
  for (const inclusao of inclusoes) {
    const id = String(inclusao.id);
    const atual = porId.get(id);
    const quando = diaHora(inclusao.quando);
    const equipamentoInicial = nomeEquipamento(equipamentos, inclusao.equipamentoId);
    const fato = {
      id,
      number: vazio(inclusao.number) ? "" : String(inclusao.number),
      usuario: inclusao.usuario,
      dia: quando.dia,
      hora: quando.hora,
      quando: new Date(inclusao.quando).getTime(),
      conhecimento: vazio(inclusao.conhecimentoId) ? "" : atual?.conhecimento || "",
      equipamento: equipamentoInicial,
      equipamentoInicial,
      tare: vazio(inclusao.tare) ? "" : String(inclusao.tare),
      seal: vazio(inclusao.seal) ? "" : String(inclusao.seal),
      tipo: tipoItem(atual?.tipoItem) === "Container" ? "Container" : tipoItem(inclusao.tipoItem) || tipoItem(atual?.tipoItem),
      semNumeroNoInicio: vazio(inclusao.number),
      horaPreencheu: "",
      lacreGravadoJunto: false,
      lacreTrocado: null,
    };
    const posteriores = (ajustesPorId.get(id) ?? [])
      .filter((ajuste) => new Date(ajuste.quando).getTime() >= fato.quando)
      .filter((ajuste) => diaHora(ajuste.quando).dia === fato.dia)
      .sort((a, b) => new Date(a.quando) - new Date(b.quando));
    for (const ajuste of posteriores) {
      const hora = diaHora(ajuste.quando).hora;
      if (fato.semNumeroNoInicio && vazio(fato.number) && !vazio(ajuste.number)) {
        fato.number = String(ajuste.number);
        fato.horaPreencheu = hora;
        if (vazio(fato.seal) && !vazio(ajuste.seal)) {
          fato.seal = String(ajuste.seal);
          fato.lacreGravadoJunto = true;
        }
      }
      if (!vazio(ajuste.seal) && !vazio(ajuste.sealAntes) && ajuste.seal !== ajuste.sealAntes) {
        fato.lacreTrocado = { de: String(ajuste.sealAntes), para: String(ajuste.seal), hora };
        fato.seal = String(ajuste.seal);
      } else if (vazio(fato.seal) && !vazio(ajuste.seal)) {
        fato.seal = String(ajuste.seal);
      }
      if (!vazio(ajuste.equipamentoId) && String(ajuste.equipamentoId) !== String(inclusao.equipamentoId || "")) {
        fato.equipamento = nomeEquipamento(equipamentos, ajuste.equipamentoId) || fato.equipamento;
      }
      if (vazio(fato.tare) && !vazio(ajuste.tare)) fato.tare = String(ajuste.tare);
      if (!fato.conhecimento && !vazio(ajuste.conhecimentoId)) {
        fato.conhecimento = atual?.conhecimento || "";
      }
    }
    if (fato.semNumeroNoInicio && !fato.number && atual?.number) fato.number = atual.number;
    fatos.push(fato);
  }
  fatos.sort((a, b) => a.quando - b.quando || Number(a.id) - Number(b.id));
  return fatos;
}

function fraseLinha(fato, compacta) {
  if (fato.semNumeroNoInicio && fato.horaPreencheu) {
    const onde = fato.conhecimento ? `, no BL **${fato.conhecimento}**` : "";
    const lacre = fato.lacreGravadoJunto && fato.seal ? ` e o lacre **${fato.seal}**` : "";
    return `**${fato.hora}** — item **${fato.id}** entrou sem número${onde}. Às **${fato.horaPreencheu}** ficou **${fato.number}**${lacre}.`;
  }
  if (compacta) return `**${fato.hora}** — **${fato.id}**, ${fato.number}`;
  const partes = [`**${fato.hora}** — item **${fato.id}**`, `**${fato.number}**`];
  if (fato.tipo && fato.tipo !== "Container") partes.push(`tipo **${fato.tipo}**`);
  const equipamento = fato.equipamentoInicial || fato.equipamento;
  if (equipamento) partes.push(`**${equipamento}**`);
  else partes.push("sem equipamento");
  if (fato.conhecimento) partes.push(`no BL **${fato.conhecimento}**`);
  else partes.push("sem BL");
  if (fato.tare) partes.push(`tara **${formatarTara(fato.tare)}**`);
  if (fato.lacreTrocado) {
    partes.push(`lacre entrou como ${fato.lacreTrocado.de} e foi corrigido para **${fato.lacreTrocado.para}**`);
  } else if (fato.seal) partes.push(`lacre **${fato.seal}**`);
  else partes.push("sem lacre");
  return `${partes.join(", ")}.`;
}

function grupoNoBl(fatos) {
  if (fatos.length < 2) return false;
  if (!fatos.every((fato) => fato.conhecimento && fato.conhecimento === fatos[0].conhecimento)) return false;
  return fatos.every((fato) => fato.equipamento === fatos[0].equipamento && fato.tare === fatos[0].tare);
}

function fraseNoBl(fato) {
  if (fato.semNumeroNoInicio && fato.horaPreencheu) return fraseLinha(fato, false);
  let texto = `**${fato.hora}** — **${fato.id}**, ${fato.number}`;
  if (fato.lacreTrocado) {
    texto += `. O lacre entrou como ${fato.lacreTrocado.de} e foi corrigido para **${fato.lacreTrocado.para}**`;
  } else if (fato.seal) texto += `, lacre **${fato.seal}**`;
  else texto += ", sem lacre";
  return texto.endsWith(".") ? texto : `${texto}.`;
}

function grupoUniforme(fatos) {
  if (fatos.length < 2) return false;
  if (fatos.some((fato) => fato.conhecimento || fato.seal || fato.lacreTrocado || fato.semNumeroNoInicio)) return false;
  if (fatos.some((fato) => fato.tipo && fato.tipo !== "Container")) return false;
  const equipamento = fatos[0].equipamento;
  const tare = fatos[0].tare;
  return fatos.every((fato) => fato.equipamento === equipamento && fato.tare === tare);
}

function cabecalhoGrupo(fatos, depoisSemBl) {
  const quem = nomeProprio(fatos[0].usuario);
  const dia = fatos[0].dia;
  const n = fatos.length;
  if (grupoUniforme(fatos)) {
    const equipamento = fatos[0].equipamento ? `, todas **${fatos[0].equipamento}**` : "";
    const tare = fatos[0].tare ? `, tara **${formatarTara(fatos[0].tare)}**` : "";
    return `**${quem}** incluiu as ${quantos(n)} linhas sem BL em **${dia}**${equipamento}${tare}, sem lacre:`;
  }
  const bls = [...new Set(fatos.map((fato) => fato.conhecimento).filter(Boolean))];
  if (bls.length === 1 && fatos.every((fato) => fato.conhecimento) && n > 1) {
    const verbo = depoisSemBl ? "criou a segunda leva" : `incluiu as ${quantos(n)} linhas`;
    return `**${quem}** ${verbo} em **${dia}**, já no BL **${bls[0]}**:`;
  }
  if (n > 1) return `**${quem}** incluiu as ${quantos(n)} linhas em **${dia}**:`;
  return "";
}

function notaEquipamento(fato, atual, equipamentos) {
  if (!atual) return "";
  const hoje = atual.equipamento || nomeEquipamento(equipamentos, atual.equipamentoId);
  const naInclusao = fato.equipamentoInicial || fato.equipamento;
  if (!hoje || !naInclusao || hoje === naInclusao) return "";
  return `Na inclusão o item **${fato.id}** era **${naInclusao}**; hoje está **${hoje}**.`;
}

function notaDevolucoes(fatos, linhas) {
  const porId = new Map(linhas.map((linha) => [String(linha.id), linha]));
  const itens = [];
  for (const fato of fatos) {
    const atual = porId.get(fato.id);
    if (!atual?.devolucao) continue;
    itens.push(`**${fato.number || atual.number}** (item ${fato.id}) em **${diaCurto(atual.devolucao)}**`);
  }
  if (!itens.length) return "";
  return `As devoluções não estavam na inclusão. Foram preenchidas depois: ${itens.join(", ")}.`;
}

function abertura(linhas, fatos) {
  const porNumero = new Map();
  for (const linha of linhas) {
    const numero = linha.number;
    if (!porNumero.has(numero)) porNumero.set(numero, []);
    porNumero.get(numero).push(linha);
  }
  const repetidos = [...porNumero.entries()].filter(([, lista]) => lista.length > 1);
  if (!repetidos.length) return "";
  const processo = linhas[0]?.processo || "";
  const umNumero = repetidos.length === 1;
  const titulo = umNumero
    ? `O ${repetidos[0][0]} aparece duas vezes no ${processo}`
    : `Os ${quantos(repetidos.length)} números aparecem duas vezes no ${processo}`;
  const motivo = umNumero
    ? "porque são dois itens de carga, gravados separados."
    : "porque cada um virou dois itens de carga.";
  const diasSem = [];
  const diasCom = [];
  for (const [, lista] of repetidos) {
    for (const linha of lista) {
      const fato = fatos.find((item) => item.id === String(linha.id));
      if (!fato) continue;
      if (fato.conhecimento) diasCom.push(fato.dia);
      else diasSem.push(fato.dia);
    }
  }
  const sem = [...new Set(diasSem)];
  const com = [...new Set(diasCom)];
  let ponte = " O sistema aceita o mesmo número no mesmo processo.";
  if (sem.length === 1 && com.length === 1) {
    ponte =
      sem[0] === com[0]
        ? " O sistema aceita o mesmo número no mesmo processo."
        : ` As linhas de ${sem[0]} ficaram sem BL, e em ${com[0]} o mesmo número foi incluído de novo no conhecimento.`;
  }
  return `${titulo} ${motivo}${ponte}`;
}

export function redigirItensCarga(linhas, inclusoes, ajustes, equipamentos = {}) {
  const processo = linhas[0]?.processo || "processo";
  if (!linhas.length) return `Não há item de carga no ${processo}.`;
  const fatos = montarFatos(linhas, inclusoes, ajustes, equipamentos);
  const semLog = linhas.filter((linha) => !fatos.some((fato) => fato.id === String(linha.id)));
  const grupos = [];
  for (const fato of fatos) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.usuario === fato.usuario && ultimo.dia === fato.dia) ultimo.fatos.push(fato);
    else grupos.push({ usuario: fato.usuario, dia: fato.dia, fatos: [fato] });
  }
  const blocos = [abertura(linhas, fatos)].filter(Boolean);
  for (const grupo of grupos) {
    if (grupo.fatos.length === 1) {
      const fato = grupo.fatos[0];
      const nota = notaEquipamento(fato, linhas.find((linha) => String(linha.id) === fato.id), equipamentos);
      const corpo = fraseLinha(fato, false).replace(
        /^\*\*(\d{2}:\d{2})\*\* — /,
        `**${nomeProprio(fato.usuario)}** em **${fato.dia}** às **$1** — `,
      );
      blocos.push([corpo, nota].filter(Boolean).join("\n\n"));
      continue;
    }
    const compacta = grupoUniforme(grupo.fatos);
    const noBl = !compacta && grupoNoBl(grupo.fatos);
    const antes = blocos.join("\n");
    const titulo = cabecalhoGrupo(grupo.fatos, /sem BL/i.test(antes));
    const linhasTexto = grupo.fatos.map((fato) => (noBl ? fraseNoBl(fato) : fraseLinha(fato, compacta)));
    const notas = grupo.fatos
      .map((fato) => notaEquipamento(fato, linhas.find((linha) => String(linha.id) === fato.id), equipamentos))
      .filter(Boolean);
    const aindaSem = compacta && grupo.fatos.every((fato) => {
      const atual = linhas.find((linha) => String(linha.id) === fato.id);
      return atual && !atual.conhecimento;
    });
    const corpo = [
      titulo,
      ...linhasTexto,
      aindaSem
        ? `Essas ${quantos(grupo.fatos.length)} continuam **SEM BL VINCULADO**.`
        : "",
      ...notas,
    ]
      .filter(Boolean)
      .join("\n\n");
    blocos.push(corpo);
  }
  const devolucoes = notaDevolucoes(fatos, linhas);
  if (devolucoes) blocos.push(devolucoes);
  if (semLog.length) {
    const lista = semLog.map((linha) => `**${linha.number}** (item ${linha.id})`).join(", ");
    blocos.push(`Não achei a inclusão destas linhas no período depois da abertura: ${lista}.`);
  }
  return blocos.join("\n\n");
}

async function lerEventos(pool, ids, inicio, fim, tipo) {
  if (!ids.length) return [];
  const filtro = ids.map((id) => `@Value="${id}"`).join(" or ");
  const tipoXml = tipo ? `[@Tipo="${tipo}"]` : "";
  const pedido = pool.request();
  pedido.timeout = 55000;
  pedido.input("ini", sql.DateTime, inicio);
  pedido.input("fim", sql.DateTime, fim);
  const resultado = await pedido.query(`
    SELECT
      Ltb.Data_Inicio,
      Usr.Nome AS Usuario,
      T.Tabela.value('@Tipo', 'int') AS Tipo,
      T.Tabela.value('(Campo[@Nome="IdLogistica_Maritima_Container"]/@Value)[1]', 'varchar(20)') AS IdContainer,
      T.Tabela.value('(Campo[@Nome="Number"]/@Value)[1]', 'varchar(30)') AS Number,
      T.Tabela.value('(Campo[@Nome="Number"]/@OldValue)[1]', 'varchar(30)') AS NumberAntes,
      T.Tabela.value('(Campo[@Nome="Tipo_Item_Carga"]/@Value)[1]', 'varchar(20)') AS TipoItem,
      T.Tabela.value('(Campo[@Nome="IdEquipamento_Maritimo"]/@Value)[1]', 'varchar(20)') AS Equipamento,
      T.Tabela.value('(Campo[@Nome="IdEquipamento_Maritimo"]/@OldValue)[1]', 'varchar(20)') AS EquipamentoAntes,
      T.Tabela.value('(Campo[@Nome="Seal"]/@Value)[1]', 'varchar(40)') AS Seal,
      T.Tabela.value('(Campo[@Nome="Seal"]/@OldValue)[1]', 'varchar(40)') AS SealAntes,
      T.Tabela.value('(Campo[@Nome="Tare"]/@Value)[1]', 'varchar(40)') AS Tare,
      T.Tabela.value('(Campo[@Nome="Data_Devolucao"]/@Value)[1]', 'varchar(40)') AS Devolucao,
      T.Tabela.value('(Campo[@Nome="IdConhecimento_Embarque"]/@Value)[1]', 'varchar(20)') AS Conhecimento
    FROM sys_Log_Tabela Ltb WITH (INDEX(Idx_sys_Log_Tabela_Data_Inicio))
    JOIN sys_Usuario Usr ON Usr.IdUsuario = Ltb.IdUsuario
    CROSS APPLY Ltb.Dados_Log.nodes('/Log/Tabela[@Nome="mov_Logistica_Maritima_Container"]${tipoXml}[Campo[@Nome="IdLogistica_Maritima_Container" and (${filtro})]]') AS T(Tabela)
    WHERE Ltb.Data_Inicio >= @ini
      AND Ltb.Data_Inicio < @fim
    ORDER BY Ltb.Data_Inicio
  `);
  return resultado.recordset.map((linha) => ({
    quando: linha.Data_Inicio,
    usuario: linha.Usuario,
    tipo: linha.Tipo,
    id: linha.IdContainer,
    number: linha.Number,
    numberAntes: linha.NumberAntes,
    tipoItem: linha.TipoItem,
    equipamentoId: linha.Equipamento,
    equipamentoAntes: linha.EquipamentoAntes,
    seal: linha.Seal,
    sealAntes: linha.SealAntes,
    tare: linha.Tare,
    devolucao: linha.Devolucao,
    conhecimentoId: linha.Conhecimento,
  }));
}

async function inclusoesNoPeriodo(pool, ids, abertura) {
  const achados = [];
  const comeco = inicioUtc(abertura);
  const teto = somarDias(comeco, 120);
  const amanha = somarDias(inicioUtc(new Date()), 1);
  const limite = teto < amanha ? teto : amanha;
  for (let cursor = comeco; cursor < limite; cursor = somarDias(cursor, 30)) {
    const fim = somarDias(cursor, 30);
    const ate = fim < limite ? fim : limite;
    const lote = await lerEventos(pool, ids, cursor, ate, 1);
    achados.push(...lote);
    const cobertos = new Set(achados.map((item) => String(item.id)));
    if (ids.every((id) => cobertos.has(String(id)))) break;
  }
  return achados;
}

async function ajustesDosDias(pool, ids, inclusoes) {
  const dias = [...new Set(inclusoes.map((item) => isoDia(new Date(item.quando))))];
  const ajustes = [];
  for (const dia of dias) {
    const inicio = new Date(`${dia}T00:00:00.000Z`);
    const lote = await lerEventos(pool, ids, inicio, somarDias(inicio, 1), 3);
    ajustes.push(...lote);
  }
  return ajustes;
}

export async function explicarItensCarga(pool, args) {
  const numero = String(args?.numero ?? "")
    .trim()
    .toUpperCase();
  if (!PROCESSO.test(numero)) {
    return { texto: "Informe o número do processo, como IM3052-26.", sql: "", linhas: [] };
  }
  const pedido = pool.request();
  pedido.input("numero", sql.VarChar(20), numero);
  const consulta = await pedido.query(`
    SELECT
      H.Numero_Processo,
      H.Data_Abertura_Processo,
      C.IdLogistica_Maritima_Container,
      C.Number,
      C.Tipo_Item_Carga,
      C.IdEquipamento_Maritimo,
      E.Descricao AS Equipamento,
      C.Seal,
      C.Tare,
      C.Data_Devolucao,
      Ce.Numero AS Conhecimento
    FROM mov_Logistica_House H
    JOIN mov_Logistica_Maritima_Container C ON C.IdLogistica_House = H.IdLogistica_House
    LEFT JOIN cad_Equipamento_Maritimo E ON E.IdEquipamento_Maritimo = C.IdEquipamento_Maritimo
    LEFT JOIN mov_Conhecimento_Embarque Ce ON Ce.IdConhecimento_Embarque = C.IdConhecimento_Embarque
    WHERE H.Numero_Processo = @numero
    ORDER BY C.IdLogistica_Maritima_Container
  `);
  const todas = consulta.recordset.map((linha) => ({
    processo: String(linha.Numero_Processo || numero).trim(),
    abertura: linha.Data_Abertura_Processo,
    id: linha.IdLogistica_Maritima_Container,
    number: String(linha.Number ?? "").trim(),
    tipoItem: linha.Tipo_Item_Carga,
    equipamentoId: linha.IdEquipamento_Maritimo,
    equipamento: String(linha.Equipamento ?? "").trim(),
    seal: linha.Seal,
    tare: linha.Tare,
    devolucao: linha.Data_Devolucao,
    conhecimento: String(linha.Conhecimento ?? "").trim(),
  }));
  if (!todas.length) {
    return { texto: `Não há item de carga no ${numero}.`, sql: "", linhas: [] };
  }
  const pedidos = numerosPedidos(args?.numeros);
  const linhas = pedidos.length ? todas.filter((linha) => pedidos.includes(linha.number.toUpperCase())) : todas;
  if (!linhas.length) {
    return {
      texto: `Não achei ${pedidos.join(", ")} na lista de carga do ${numero}.`,
      sql: "",
      linhas: [],
    };
  }
  const ids = [...new Set(linhas.map((linha) => Number(linha.id)).filter((id) => Number.isInteger(id)))];
  const inclusoes = await inclusoesNoPeriodo(pool, ids, linhas[0].abertura);
  const ajustes = await ajustesDosDias(pool, ids, inclusoes);
  const idsEquipamento = [
    ...new Set(
      [
        ...linhas.map((linha) => linha.equipamentoId),
        ...inclusoes.map((item) => item.equipamentoId),
        ...ajustes.flatMap((item) => [item.equipamentoId, item.equipamentoAntes]),
      ]
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const equipamentos = {};
  for (const linha of linhas) {
    if (linha.equipamentoId && linha.equipamento) equipamentos[String(linha.equipamentoId)] = linha.equipamento;
  }
  if (idsEquipamento.length) {
    const nomes = await pool.request().query(`
      SELECT IdEquipamento_Maritimo, Descricao
      FROM cad_Equipamento_Maritimo
      WHERE IdEquipamento_Maritimo IN (${idsEquipamento.join(", ")})
    `);
    for (const linha of nomes.recordset) {
      equipamentos[String(linha.IdEquipamento_Maritimo)] = String(linha.Descricao ?? "").trim();
    }
  }
  const eventos = eventosDoLog(linhas, inclusoes, ajustes, equipamentos);
  const periodo = eventos.length
    ? `${diaCurto(eventos[0].data)} a ${diaCurto(eventos[eventos.length - 1].data)}`
    : "";
  return {
    texto: redigirItensCarga(linhas, inclusoes, ajustes, equipamentos),
    sql: "",
    linhas: [],
    ...(eventos.length
      ? { log: { titulo: `Itens de carga · ${linhas[0]?.processo || numero}`, periodo, eventos } }
      : {}),
  };
}
