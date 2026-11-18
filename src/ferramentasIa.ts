import { brParaIso, isoParaBr } from "./datas";
import { LIMITE_EVENTOS_AVISO, normalizarCadastro, normalizarEventos } from "./normalizar";
import { montarRelatorio, nomeDaChave } from "./relatorio";
import type { LogPdf } from "./PdfHistorico";
import type { CadastroAtual, ChavePrimaria, EventoLog, FiltrosLog, TipoLog } from "./types";
import { lerTokenGmail } from "./sessao";
import { garantirEnvioGmail, renovarTokenGmail } from "./tokenGmail";

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

function aplicarLogPedido(args: Record<string, unknown>) {
  const pedido = texto(args.perguntaOriginal);
  const nomeado = pedido.match(/\bmov_logistica_(master|house|taxa)\s+(\d{3,})\b/i);
  if (nomeado) {
    const mapa: Record<string, [string, string]> = {
      master: ["mov_Logistica_Master", "IdLogistica_Master"],
      house: ["mov_Logistica_House", "IdLogistica_House"],
      taxa: ["mov_Logistica_Taxa", "IdLogistica_Taxa"],
    };
    const [tabela, campo] = mapa[nomeado[1].toLowerCase()];
    args.tabela = tabela;
    args.campo_chave = campo;
    args.valores = nomeado[2];
    args.tipo = 0;
  }
  const dia = pedido.match(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/);
  if (!dia || !/\bat[eé]\s+(?:hoje|agora)\b/i.test(pedido)) return;
  let ano = dia[3] ?? String(new Date().getFullYear());
  if (ano.length === 2) ano = `20${ano}`;
  const hoje = new Date();
  const dois = (n: number) => String(n).padStart(2, "0");
  args.data_inicio = `${dois(Number(dia[1]))}/${dois(Number(dia[2]))}/${ano}`;
  args.data_fim = `${dois(hoje.getDate())}/${dois(hoje.getMonth() + 1)}/${hoje.getFullYear()}`;
  args.ancorar = false;
}

function recortarLogPedido(lista: EventoLog[], tabela: string, pedido: string) {
  let eventos = lista.filter((evento) => !evento.tabela || evento.tabela.toLowerCase() === tabela.toLowerCase());
  const querMudanca = /\b(?:alter|mudou|mexeu)\b/i.test(pedido) && !/\binclu/i.test(pedido);
  if (querMudanca) {
    const mudancas = eventos.filter((evento) => evento.tipo !== 1);
    if (mudancas.length) eventos = mudancas;
  }
  return [...eventos].sort((a, b) => {
    const da = new Date(a.data || a.dataInicioTransacao || 0).getTime();
    const db = new Date(b.data || b.dataInicioTransacao || 0).getTime();
    return db - da;
  });
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
  const nome = tabela.replace(/^(mov|cad|arq|sys|aux)_/i, "").replaceAll("_", " ").replace(/\bLogistica\b/g, "Logística");
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
    "tarefa_bot", "rotina_bot", "painel_excecoes", "regras_bot",
    "resumo_processo",
    "ficha_processo",
    "meu_dia",
    "buscar_processos",
    "processos_abertos",
    "acompanhamentos_processo",
    "modelo_followup",
    "email_atividade",
    "montar_proposta",
    "pendencias",
    "o_que_mudou",
    "proposta_processo",
    "propostas_periodo",
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
    "passagens_aereas",
    "relacionamento_clientes",
    "taxas_processo",
    "log_recente",
    "monitoramentos_alterados",
    "explicar_itens_carga",
    "explicar_campo_livre",
    "andamento_atividade",
    "projeto_tarefas",
    "monitores_campo",
    "gatilhos_atividade",
    "comando_bot",
    "aprendizado_bot",
  ]);
  if (funcoesProntas.has(nome)) {
    let token = "";
    if (nome === "montar_proposta") {
      try {
        token = (await renovarTokenGmail()) || lerTokenGmail();
      } catch {
        token = lerTokenGmail();
      }
    }
    const resp = await fetch(`${API}/api/ia/funcoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: sinal,
      body: JSON.stringify({
        funcao: nome,
        args,
        pergunta: String(args.perguntaOriginal || ""),
        email: conta?.email,
        nome: conta?.nome,
        visao: conta?.visao,
        conversaId: conversaDaConsulta(),
        token,
      }),
    });
    const dados = await resp.json();
    if (!resp.ok) return `Erro: ${dados.erro || "falha na consulta"}`;
    const acompanhar = dados.tarefaId && ["fila", "executando"].includes(dados.tarefaEstado) && (nome === "comando_bot" || nome === "andamento_atividade" || (nome === "tarefa_bot" && ["criar", "executar", "retomar"].includes(String(args.acao))));
    if (acompanhar) {
      const inicio = Date.now();
      let ultimoStatus = "";
      try {
        while (["fila", "executando"].includes(dados.tarefaEstado) && Date.now() - inicio < 600000) {
          if (sinal?.aborted) throw new DOMException("Cancelado", "AbortError");
          const r = await fetch(`${API}/api/bot/tarefas/${encodeURIComponent(dados.tarefaId)}`, { signal: sinal });
          const tarefa = await r.json();
          if (!r.ok) { dados.texto = `A execução foi iniciada, mas não consegui consultar o andamento. Peça o andamento da tarefa nesta conversa.`; break; }
          dados.texto = tarefa.texto;
          dados.tarefaEstado = tarefa.estado;
          const status = tarefa.eventos?.at(-1)?.mensagem || "Aguardando a execução no HeadCargo…";
          if (status !== ultimoStatus) {
            window.dispatchEvent(new CustomEvent("maicon-bot-progresso", { detail: String(status).slice(0, 180) }));
            ultimoStatus = status;
          }
          if (["fila", "executando"].includes(tarefa.estado)) await new Promise((resolve) => window.setTimeout(resolve, 750));
        }
      } catch (erro) {
        if (sinal?.aborted) {
          await fetch(`${API}/api/bot/tarefas/${encodeURIComponent(dados.tarefaId)}/controle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "cancelar" }) }).catch(() => {});
          throw erro;
        }
        dados.texto = "A execução continua registrada, mas a conexão de acompanhamento foi interrompida. Peça o andamento da tarefa nesta conversa antes de repetir o comando.";
      }
    }
    const pacote: { sql: string; linhas: unknown[]; texto: string; log?: unknown; tarefaId?: string; tarefaEstado?: string } = {
      sql: typeof dados.sql === "string" ? dados.sql : "",
      linhas: Array.isArray(dados.linhas) ? dados.linhas : [],
      texto: typeof dados.texto === "string" ? dados.texto : "",
    };
    if (dados.tarefaId) { pacote.tarefaId = dados.tarefaId; pacote.tarefaEstado = dados.tarefaEstado; }
    if (dados.log && typeof dados.log === "object") pacote.log = dados.log;
    if (nome === "ficha_processo") {
      const numero = texto(args.numero).toUpperCase();
      if (/^[A-Z]{1,4}\d{2,6}-\d{2}$/.test(numero)) {
        try {
          const token = lerTokenGmail();
          if (token) {
            const extra = await fetch(`${API}/api/gmail/resumo`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: sinal,
              body: JSON.stringify({ token, email: conta?.email, visao: conta?.visao, processo: numero }),
            });
            const lido = await extra.json();
            const trecho = typeof lido.texto === "string" ? lido.texto.trim() : "";
            if (extra.ok && trecho && !/não foi autorizada|expirou|recusou|desligada/i.test(trecho)) {
              pacote.texto = [pacote.texto, trecho].filter(Boolean).join("\n\n");
            }
          }
        } catch {
          /* a ficha segue sem a caixa de entrada */
        }
      }
    }
    return JSON.stringify(pacote);
  }
  if (nome === "emails_gmail") {
    const semAcesso =
      "A caixa de e-mail ainda não está ligada nesta conta. Entre com o Google uma vez, marcando a leitura dos e-mails. Depois disso a IA usa a mesma sessão, sem pedir login de novo.";
    const pedirResumo = (token: string) =>
      fetch(`${API}/api/gmail/resumo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: sinal,
        body: JSON.stringify({
          token,
          email: conta?.email,
          visao: conta?.visao,
          processo: texto(args.processo),
          documentos: args.documentos === true,
        }),
      });
    let token = "";
    try {
      token = (await renovarTokenGmail()) || lerTokenGmail();
    } catch {
      token = lerTokenGmail();
    }
    if (!token) return semAcesso;
    let resp = await pedirResumo(token);
    let dados = await resp.json().catch(() => ({}));
    const textoResposta = typeof dados.texto === "string" ? dados.texto : typeof dados.erro === "string" ? dados.erro : "";
    if (/expirou|não foi autorizada|nao foi autorizada/i.test(textoResposta)) {
      try {
        const novo = await renovarTokenGmail(true);
        if (novo && novo !== token) {
          resp = await pedirResumo(novo);
          dados = await resp.json().catch(() => ({}));
        }
      } catch {
        /* mantém a resposta da tentativa com o token salvo */
      }
    }
    const textoFinal = typeof dados.texto === "string" ? dados.texto : "";
    if (!resp.ok) return typeof dados.erro === "string" && dados.erro ? dados.erro : semAcesso;
    if (/não foi autorizada|nao foi autorizada/i.test(textoFinal)) return semAcesso;
    return JSON.stringify({ texto: textoFinal, sql: "", linhas: [] });
  }
  if (nome === "enviar_followup") {
    const numero = texto(args.numero).toUpperCase();
    const para = texto(args.para);
    if (!/^[A-Z]{1,4}\d{2,6}-\d{2}$/.test(numero)) return "Informe o número do processo, como IM5944-26.";
    if (!para) return "Informe o e-mail de destino, ou diga que é para o cliente.";
    let token = "";
    try {
      token = await garantirEnvioGmail();
    } catch {
      return "Para enviar, autorize o Gmail na janela do Google. Se a janela não abriu, permita o pop-up e peça o envio de novo.";
    }
    const resp = await fetch(`${API}/api/gmail/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: sinal,
      body: JSON.stringify({ token, numero, para, assunto: texto(args.assunto), visao: conta?.visao }),
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) return typeof dados.erro === "string" && dados.erro ? dados.erro : "Não consegui enviar o follow-up.";
    return typeof dados.texto === "string" ? dados.texto : "Follow-up enviado.";
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
    const bruto = texto(args.numero).trim().replace(/\s+/g, " ");
    const formato = bruto.match(/^([A-Za-z]{1,4}\d{2,6}-\d{2})(?:\s+teste)?$/i);
    if (!formato) {
      return `${bruto} não é número de processo. O número tem letras, hífen e ano, como IM5944-26. Processo de teste do administrador termina com a palavra teste, como IM2099-25 teste.`;
    }
    const numero = /\steste$/i.test(bruto) ? `${formato[1].toUpperCase()} teste` : formato[1].toUpperCase();
    const resp = await fetch(`${API}/api/processo?numero=${encodeURIComponent(numero)}&email=${encodeURIComponent(conta?.email ?? "")}&nome=${encodeURIComponent(conta?.nome ?? "")}&visao=${encodeURIComponent(conta?.visao ?? "")}&conversaId=${encodeURIComponent(conversaDaConsulta())}`, { signal: sinal });
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
      body: JSON.stringify({ sql: texto(args.sql), pergunta: texto(args.pergunta), previa: Boolean(args.previa), email: conta?.email, nome: conta?.nome, visao: conta?.visao, conversaId: conversaDaConsulta() }),
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
    aplicarLogPedido(args);
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
    const lista = recortarLogPedido(eventosDasChaves(normalizarEventos(brutos), filtros.chaves), tabela, texto(args.perguntaOriginal));
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
