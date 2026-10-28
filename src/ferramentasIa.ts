import { brParaIso, isoParaBr } from "./datas";
import { LIMITE_EVENTOS_AVISO, normalizarCadastro, normalizarEventos } from "./normalizar";
import { montarRelatorio, nomeDaChave } from "./relatorio";
import type { LogPdf } from "./PdfHistorico";
import type { CadastroAtual, ChavePrimaria, EventoLog, FiltrosLog, TipoLog } from "./types";
import { renovarTokenGmail } from "./tokenGmail";

const API = "";

let logPendente: LogPdf | null = null;

export function capturarLogIa(): LogPdf | null {
  const atual = logPendente;
  logPendente = null;
  return atual;
}

function texto(v: unknown) {
  return v == null ? "" : String(v).trim();
}

function novaChave(): ChavePrimaria {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `id-${Date.now().toString(36)}`;
  return { id, nome: "", valor: "" };
}

const RE_CONTAINER = /\b[A-Z]{4}\d{7}\b/gi;

const RE_PROCESSO = /\b[A-Z]{1,4}\d{2,6}-\d{2}\b/g;
const RE_PERIODO = /\b\d{1,2}[/.-]\d{1,2}\b|\b(?:hoje|ontem|semana|m[eê]s|ano|dias?|horas?|desde|per[ií]odo)\b/i;

export function completarConsultaLog(args: Record<string, unknown>, pedido: string): Record<string, unknown> {
  const processos = [...new Set((pedido.toUpperCase().match(RE_PROCESSO) ?? []))];
  const comPeriodo = RE_PERIODO.test(pedido.replace(RE_PROCESSO, ""));
  const base = {
    ...args,
    ancorar: args.ancorar === true || !comPeriodo,
    ...(processos.length && !args.processo ? { processo: processos.join(", ") } : {}),
  };
  return completarContainers(base, pedido);
}

function completarContainers(args: Record<string, unknown>, pedido: string): Record<string, unknown> {
  const containers = [...new Set((pedido.toUpperCase().match(RE_CONTAINER) ?? []))];
  if (!containers.length) return args;
  const campo = String(args.campo_chave ?? "");
  const informados = String(args.valores ?? "")
    .toUpperCase()
    .split(/[,;\s]+/)
    .filter(Boolean);
  if (/^number$/i.test(campo) && containers.every((item) => informados.includes(item))) return args;
  const tabelaAtual = String(args.tabela ?? "");
  const tabela = /maritima_container/i.test(tabelaAtual) ? tabelaAtual : "mov_Logistica_Maritima_Container";
  return { ...args, tabela, campo_chave: "Number", valores: containers.join(", ") };
}

function identificacao(tabela: string, chaves: ChavePrimaria[], eventos: EventoLog[] = []) {
  const ids = chaves.filter((c) => c.valor.trim()).map((c) => nomeDaChave(eventos, c.valor));
  const nome = tabela.replace(/^(mov|cad|arq|sys|aux)_/i, "").replaceAll("_", " ");
  if (ids.length) return `${nome} ${ids.join(" / ")}`;
  return nome || "registro";
}

function paresDoFiltro(chaves: ChavePrimaria[]) {
  return chaves.flatMap((chave) => {
    const nome = chave.nome.trim();
    if (!nome) return [];
    return chave.valor
      .split(/[,;]+/)
      .map((valor) => valor.trim())
      .filter(Boolean)
      .map((valor) => ({ nome, valor }));
  });
}

function eventoTemPar(evento: EventoLog, nome: string, valor: string) {
  const alvo = valor.toUpperCase();
  const container = /^[A-Z]{4}\d{7}$/.test(alvo);
  return (evento.campos ?? []).some((campo) => {
    const textos = [campo.valor, campo.valorAnterior, campo.valorExibicao, campo.valorAnteriorExibicao].map((item) =>
      String(item ?? "").trim().toUpperCase(),
    );
    if (container && textos.some((item) => item === alvo)) return true;
    if (campo.nome.toLowerCase() !== nome.toLowerCase()) return false;
    return textos.some((item) => item === alvo);
  });
}

function eventosDasChaves(lista: EventoLog[], chaves: ChavePrimaria[]) {
  const pares = paresDoFiltro(chaves);
  if (!pares.length) return lista;
  const mesmoCampo = pares.every((par) => par.nome.toLowerCase() === pares[0].nome.toLowerCase());
  return lista.filter((evento) =>
    mesmoCampo
      ? pares.some((par) => eventoTemPar(evento, par.nome, par.valor))
      : pares.every((par) => eventoTemPar(evento, par.nome, par.valor)),
  );
}

function relatorio(f: FiltrosLog, lista: EventoLog[], cadastro: CadastroAtual | null) {
  if (!lista.length) return "Nenhum evento encontrado nesse período e nesse registro.";
  const periodo = `${isoParaBr(f.dataInicio) || "—"} a ${isoParaBr(f.dataTermino) || "hoje"}`;
  return montarRelatorio(
    lista,
    `Histórico — ${f.tabela} — ${identificacao(f.tabela, f.chaves)} (${periodo})`,
    cadastro,
  );
}

function conversaDaConsulta() {
  try {
    return sessionStorage.getItem("maicon-conversa-id") || "";
  } catch {
    return "";
  }
}

export async function executarFerramentaIa(
  nome: string,
  args: Record<string, unknown>,
  sinal?: AbortSignal,
  conta?: { email?: string; nome?: string; visao?: string },
): Promise<string> {
  const funcoesProntas = new Set([
    "resumo_processo",
    "buscar_processos",
    "acompanhamentos_processo",
    "pendencias",
    "o_que_mudou",
    "proposta_processo",
    "comissao_periodo",
    "processos_abertos_cliente",
    "prazos",
    "processos_parados",
    "documental_ce",
    "atividades_pendentes",
    "divergencias_viagem",
    "rota_processo",
    "fila_setor",
    "painel_ti",
    "painel_financeiro",
    "taxas_processo",
    "log_recente",
    "monitoramentos_alterados",
    "explicar_itens_carga",
    "explicar_campo_livre",
    "andamento_atividade",
  ]);
  if (funcoesProntas.has(nome)) {
    const resp = await fetch(`${API}/api/ia/funcoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: sinal,
      body: JSON.stringify({
        funcao: nome,
        args,
        email: conta?.email,
        nome: conta?.nome,
        visao: conta?.visao,
        conversaId: conversaDaConsulta(),
      }),
    });
    const dados = await resp.json();
    if (!resp.ok) return `Erro: ${dados.erro || "falha na consulta"}`;
    const pacote: { sql: string; linhas: unknown[]; texto: string; log?: unknown } = {
      sql: typeof dados.sql === "string" ? dados.sql : "",
      linhas: Array.isArray(dados.linhas) ? dados.linhas : [],
      texto: typeof dados.texto === "string" ? dados.texto : "",
    };
    if (dados.log && typeof dados.log === "object") pacote.log = dados.log;
    return JSON.stringify(pacote);
  }
  if (nome === "emails_gmail") {
    const resp = await fetch(`${API}/api/gmail/resumo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: sinal,
      body: JSON.stringify({ token: await renovarTokenGmail(), email: conta?.email, visao: conta?.visao }),
    });
    const dados = await resp.json();
    if (!resp.ok) return `Erro: ${dados.erro || "falha ao ler o Gmail"}`;
    return JSON.stringify({ texto: typeof dados.texto === "string" ? dados.texto : "", sql: "", linhas: [] });
  }
  if (nome === "lembrar_preferencia" || nome === "esquecer_preferencia") {
    const resp = await fetch(`${API}/api/memoria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, email: conta?.email, acao: nome === "esquecer_preferencia" ? "esquecer" : "lembrar" }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || "Falha ao salvar a memória");
    return nome === "esquecer_preferencia" ? "Preferência removida." : "Preferência salva.";
  }
  if (nome === "localizar_processo") {
    const resp = await fetch(`${API}/api/processo?numero=${encodeURIComponent(texto(args.numero))}&email=${encodeURIComponent(conta?.email ?? "")}&nome=${encodeURIComponent(conta?.nome ?? "")}&visao=${encodeURIComponent(conta?.visao ?? "")}&conversaId=${encodeURIComponent(conversaDaConsulta())}`, { signal: sinal });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || "Falha ao localizar o processo");
    if (!dados.house?.length && !dados.master?.length) {
      return `Processo ${dados.numero} não encontrado em mov_Logistica_House nem mov_Logistica_Master.`;
    }
    return JSON.stringify(dados);
  }
  if (nome === "consultar_dados") {
    const resp = await fetch(`${API}/api/dados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabela: args.tabela, filtros: args.filtros, colunas: args.colunas, email: conta?.email, nome: conta?.nome, visao: conta?.visao, conversaId: conversaDaConsulta() }),
      signal: sinal,
    });
    const dados = await resp.json();
    if (!resp.ok) return `Erro: ${dados.erro || "falha ao ler os dados"}`;
    if (!dados.total) return `Nenhum registro em ${dados.tabela} com esses filtros.`;
    return JSON.stringify(dados);
  }
  if (nome === "executar_sql") {
    const resp = await fetch(`${API}/api/sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: texto(args.sql), email: conta?.email, nome: conta?.nome, visao: conta?.visao, conversaId: conversaDaConsulta() }),
      signal: sinal,
    });
    const dados = await resp.json();
    if (!resp.ok) return `Erro: ${dados.erro || "falha ao executar"}`;
    return JSON.stringify(dados);
  }
  if (nome === "buscar_tabelas") {
    try {
      const resp = await fetch(`${API}/api/catalogo/tabelas?termo=${encodeURIComponent(texto(args.termo))}&visao=${encodeURIComponent(conta?.visao || "")}`);
      const dados = await resp.json();
      if (resp.ok) return dados.tabelas.length ? dados.tabelas.join("\n") : "Nenhuma tabela com esse termo.";
    } catch {
      /* sem banco, usa o dicionário local */
    }
    const { NOMES_TABELAS } = await import("./dicionario");
    const termo = texto(args.termo).toLowerCase();
    const achadas = NOMES_TABELAS.filter((t) => t.toLowerCase().includes(termo))
      .sort((a, b) => a.length - b.length)
      .slice(0, 40);
    return achadas.length ? achadas.join("\n") : "Nenhuma tabela encontrada com esse termo.";
  }
  if (nome === "listar_colunas") {
    const pedidas = Array.isArray(args.tabelas) ? args.tabelas.map(texto) : [texto(args.tabela)];
    try {
      const resp = await fetch(`${API}/api/catalogo/colunas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabelas: pedidas }),
      });
      const dados = await resp.json();
      if (resp.ok && dados.colunas.length) return JSON.stringify(dados.colunas);
    } catch {
      /* sem banco, usa o dicionário local */
    }
    const { colunasDaTabela, NOMES_TABELAS } = await import("./dicionario");
    const tabela = NOMES_TABELAS.find((t) => t.toLowerCase() === pedidas[0]?.replace(/^dbo\./i, "").toLowerCase());
    if (!tabela) return "Tabela não encontrada. Use buscar_tabelas.";
    return `${tabela}:\n${colunasDaTabela(tabela).join("\n")}`;
  }
  if (nome === "resultado_atual") {
    return "Não há uma consulta aberta na tela. Peça o processo, a tabela ou o período direto na conversa.";
  }
  if (nome === "consultar_log") {
    const { colunasDaTabela, NOMES_TABELAS } = await import("./dicionario");
    const tabela = NOMES_TABELAS.find((t) => t.toLowerCase() === texto(args.tabela).toLowerCase());
    if (!tabela) return "Tabela não encontrada. Use buscar_tabelas.";
    if (!texto(args.valores)) {
      return "Consulta de log sem o código do registro. Passe campo_chave e valores. Sem o código a consulta mistura outros processos e outros containers.";
    }
    const inicio = brParaIso(texto(args.data_inicio));
    if (!inicio) return "data_inicio inválida; use dd/mm/aaaa.";
    const fimBr = texto(args.data_fim);
    const fim = fimBr ? brParaIso(fimBr) : "";
    const tipo = [0, 1, 2, 3].includes(Number(args.tipo)) ? (Number(args.tipo) as TipoLog) : 0;
    const filtros: FiltrosLog = {
      idUsuario: Number(args.id_usuario) || 0,
      dataInicio: inicio,
      dataTermino: fim,
      tabela,
      tipo,
      ancorar: args.ancorar === true,
      processo: texto(args.processo) || undefined,
      chaves: [
        {
          ...novaChave(),
          nome: texto(args.campo_chave) || colunasDaTabela(tabela)[0] || "",
          valor: texto(args.valores),
        },
      ],
    };
    const resp = await fetch(`${API}/api/consulta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: sinal,
      body: JSON.stringify({ filtros }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || "Falha na consulta");
    const brutos: unknown[] = Array.isArray(dados.eventos) ? dados.eventos : [];
    const lista = eventosDasChaves(normalizarEventos(brutos), filtros.chaves);
    const cadastro = normalizarCadastro(dados.cadastroAtual);
    logPendente = {
      eventos: lista,
      titulo: identificacao(filtros.tabela, filtros.chaves, lista),
      periodo: `${isoParaBr(dados.periodo?.inicio ?? filtros.dataInicio) || "—"} a ${isoParaBr(dados.periodo?.fim ?? filtros.dataTermino) || "hoje"}`,
    };
    void fetch(`${API}/api/memoria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "uso", tabela, campo: filtros.chaves[0].nome }),
    }).catch(() => {});
    const aviso = brutos.length >= LIMITE_EVENTOS_AVISO ? "\n\nO resultado pode estar cortado pelo limite de eventos." : "";
    return `${lista.length} evento(s).\n\n${relatorio(filtros, lista, cadastro)}${aviso}`;
  }
  return `Ferramenta desconhecida: ${nome}`;
}
