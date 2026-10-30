import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatIa } from "./ChatIa";
import marcaIa from "./assets/ia-marca.png";
import { OpcoesPdfModal } from "./OpcoesPdfModal";
import { eventosDoPdf, OPCOES_PDF_PADRAO, PdfHistorico, type LogPdf, type OpcoesPdf } from "./PdfHistorico";
import {
  brParaIso,
  formatarDataHora,
  isoParaBr,
  mascararDataBr,
} from "./datas";
import { colunasDaTabela, NOMES_TABELAS } from "./dicionario";
import { formatarValorNovo, textoValor, VAZIO } from "./legendas";
import {
  camposDoResultado,
  FILTROS_RESULTADO_VAZIOS,
  filtrarResultado,
  usuariosDoResultado,
  type FiltrosResultado,
} from "./filtrosResultado";
import { acoesDoEvento, camposQueMudaram, fraseQuem, fraseResumo, identificacaoDoEvento, montarRelatorio, nomeDaChave, nomeProprio, numeroProcesso, numerosProcesso, paresBusca, quandoFoiFeito, rotuloCampo, verboDoEvento } from "./relatorio";
import { gerarSql, montarXmlChaves } from "./sql";
import { LIMITE_EVENTOS_AVISO, normalizarCadastro, normalizarEventos } from "./normalizar";
import type { UsuarioGoogle } from "./sessao";
import {
  TIPOS,
  rotuloTipo,
  rotuloTipoCompleto,
  type CadastroAtual,
  type ChavePrimaria,
  type EventoLog,
  type FiltrosLog,
  type TipoLog,
} from "./types";

const API = "";
const EVENTOS_POR_PAGINA = 30;

function identificacaoRegistro(
  tabela: string,
  chaves: ChavePrimaria[],
  eventos: EventoLog[],
): string {
  const processo = numeroProcesso(eventos);
  if (processo) return `Processo ${processo}`;
  const ids = chaves.filter((c) => c.valor.trim()).map((c) => nomeDaChave(eventos, c.valor));
  const nome = tabela.replace(/^(mov|cad|arq|sys|aux)_/i, "").replaceAll("_", " ");
  if (ids.length) return `${nome} ${ids.join(" / ")}`;
  return nome || "registro";
}

function novaChave(): ChavePrimaria {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return { id, nome: "", valor: "" };
}

const FILTROS_INICIAIS: FiltrosLog = {
  idUsuario: 0,
  dataInicio: "",
  dataTermino: "",
  tabela: "",
  tipo: 0,
  chaves: [{ id: "pk-1", nome: "", valor: "" }],
};

function Valor({ texto, tipo }: { texto: string; tipo: "antes" | "depois" }) {
  const vazio = texto === VAZIO;
  return <span className={`valor ${tipo}${vazio ? " valor-vazio" : ""}`}>{texto}</span>;
}

function Comparacao({
  antes,
  depois,
  rotuloAntes = "Antes",
  rotuloDepois = "Agora",
}: {
  antes?: string;
  depois: string;
  rotuloAntes?: string;
  rotuloDepois?: string;
}) {
  return (
    <span className="comparacao">
      {antes !== undefined ? (
        <>
          <span className={`lado${antes === VAZIO ? " lado-vazio" : ""}`}>
            <em>{rotuloAntes}</em>
            <Valor texto={antes} tipo="antes" />
          </span>
          <span className="seta" aria-hidden>
            <span />
          </span>
        </>
      ) : null}
      <span className="lado">
        <em>{rotuloDepois}</em>
        <Valor texto={depois} tipo="depois" />
      </span>
    </span>
  );
}

function LinhaCampo({ campo }: { campo: EventoLog["campos"][number] }) {
  const temAntigo = campo.valorAnterior !== undefined;
  const mudou = temAntigo && campo.valorAnterior !== campo.valor;
  return (
    <div className={mudou ? "linha-campo mudou" : "linha-campo"}>
      <span className="linha-campo-nome">{rotuloCampo(campo.nome)}</span>
      <Comparacao
        antes={temAntigo ? textoValor(campo, "anterior") : undefined}
        depois={textoValor(campo, "atual")}
        rotuloDepois={temAntigo ? "Agora" : "Valor"}
      />
    </div>
  );
}
function resumoCampos(evento: EventoLog): string {
  const lista = evento.campos ?? [];
  const mudancas = lista.filter(
    (c) => c.valorAnterior !== undefined && c.valorAnterior !== c.valor,
  );
  if (mudancas.length > 0) {
    const nomes = mudancas.slice(0, 3).map((c) => c.nome);
    const extra = mudancas.length > 3 ? ` +${mudancas.length - 3}` : "";
    return `${mudancas.length} mudança${mudancas.length === 1 ? "" : "s"}: ${nomes.map(rotuloCampo).join(", ")}${extra}`;
  }
  return `${lista.length} campo${lista.length === 1 ? "" : "s"}`;
}

function Campos({ evento, onCopiarXml, xmlCopiado }: { evento: EventoLog; onCopiarXml: (xml: string) => void; xmlCopiado: boolean }) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const todos = evento.campos ?? [];
  const mudaram = camposQueMudaram(evento);
  const base = mostrarTodos ? todos : mudaram;
  const campos = base.slice(0, 40);
  const texto = todos
    .map((c) => `${c.nome}=${c.valorAnterior ?? ""}→${c.valor}`)
    .join("\n");
  return (
    <div className="painel-campos">
      <div className="painel-campos-cab">
        <div>
          <h3>{mostrarTodos ? "Dados gravados" : "O que mudou"}</h3>
          <p>
            {mostrarTodos
              ? `${todos.length} campo${todos.length === 1 ? "" : "s"}`
              : `${mudaram.length} mudança${mudaram.length === 1 ? "" : "s"}`}
            {base.length > campos.length ? ` (mostrando ${campos.length})` : ""}
          </p>
        </div>
        <div className="painel-campos-acoes">
          {todos.length > mudaram.length ? (
            <button type="button" className="ghost pequeno" onClick={() => setMostrarTodos((v) => !v)}>
              {mostrarTodos ? "Só o que mudou" : "Ver todos os campos"}
            </button>
          ) : null}
          <button type="button" className="ghost pequeno" onClick={() => onCopiarXml(texto)}>
            {xmlCopiado ? "Copiado" : "Copiar campos"}
          </button>
        </div>
      </div>
      {campos.length ? (
        <div className="lista-campos lista-campos-completa">
          {campos.map((campo, i) => (
            <LinhaCampo key={`${campo.nome}-${i}`} campo={campo} />
          ))}
        </div>
      ) : (
        <p className="dica">Nenhum campo com valor diferente.</p>
      )}
    </div>
  );
}

function IconeFiltro() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path fill="currentColor" d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
    </svg>
  );
}

function IconeInfo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path fill="currentColor" d="M11 10h2v7h-2zm0-4h2v2h-2z" />
    </svg>
  );
}

function ListaCamposCadastro({ campos }: { campos: CadastroAtual["campos"] }) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  if (!campos?.length) return null;
  const mudou = campos.filter((c) => !c.igual);
  const base = mudou.length ? mudou : campos;
  const visiveis = mostrarTodos ? campos : base.slice(0, 20);
  return (
    <>
      <ul>
        {visiveis.map((campo, i) => (
          <li key={`${campo.nome}-${i}`} className={campo.igual ? undefined : "mudou"}>
            <strong>{rotuloCampo(campo.nome)}</strong>
            <Comparacao
              antes={formatarValorNovo(campo.nome, campo.valorLog, campo.valorLogExibicao)}
              depois={formatarValorNovo(campo.nome, campo.valorAtual, campo.valorAtualExibicao)}
              rotuloAntes="No último log"
              rotuloDepois="No cadastro hoje"
            />
          </li>
        ))}
      </ul>
      {campos.length > visiveis.length ? (
        <button type="button" className="ghost pequeno" onClick={() => setMostrarTodos(true)}>
          Ver todos os {campos.length} campos
        </button>
      ) : null}
    </>
  );
}

function ConferenciaCadastro({ cadastro }: { cadastro: CadastroAtual | null }) {
  const [aberto, setAberto] = useState(true);
  if (!cadastro) return null;
  const registros = cadastro.registros?.length ? cadastro.registros : null;
  const camposLista = cadastro.campos ?? [];
  const divergencias = cadastro.divergencias ?? [];
  const ok =
    cadastro.encontrado &&
    !divergencias.length &&
    !cadastro.aviso &&
    !cadastro.excluido;
  const quantidade = divergencias.length || camposLista.length;
  return (
    <div className={`conferencia ${ok ? "ok" : "alerta"}`}>
      <button type="button" className="conferencia-cab" onClick={() => setAberto((v) => !v)}>
        <strong>Cadastro atual × último log</strong>
        <span>
          {quantidade ? `${quantidade} campo${quantidade === 1 ? "" : "s"}` : ok ? "igual ao log" : ""}
          <span className={`chevron ${aberto ? "aberto" : ""}`}>⌃</span>
        </span>
      </button>
      {aberto ? (
        <>
          {cadastro.aviso ? <p>{cadastro.aviso}</p> : null}
          {registros && registros.length > 1
            ? registros.slice(0, 8).map((registro) => (
                <div key={registro.rotulo} className="conferencia-registro">
                  <p>
                    <strong>{registro.rotulo}</strong>
                    {registro.excluido
                      ? " — excluído"
                      : !registro.encontrado
                        ? " — não está no cadastro"
                        : registro.divergencias.length
                          ? ` — ${registro.divergencias.length} diferença(s)`
                          : " — igual ao log"}
                  </p>
                  <ListaCamposCadastro campos={registro.campos ?? []} />
                </div>
              ))
            : (
              <ListaCamposCadastro
                campos={camposLista.length ? camposLista : divergencias}
              />
            )}
          {registros && registros.length > 8 ? (
            <p className="dica">Mostrando 8 de {registros.length} registros do cadastro.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function App({ usuario, onSair }: { usuario: UsuarioGoogle; onSair: () => void }) {
  const [filtros, setFiltros] = useState<FiltrosLog>(FILTROS_INICIAIS);
  const [de, setDe] = useState(isoParaBr(FILTROS_INICIAIS.dataInicio));
  const [ate, setAte] = useState(isoParaBr(FILTROS_INICIAIS.dataTermino));
  const [busca, setBusca] = useState("");
  const [consultou, setConsultou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [statusConexao, setStatusConexao] = useState("");
  const [sqlAberto, setSqlAberto] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [filtroTabela, setFiltroTabela] = useState(FILTROS_INICIAIS.tabela);
  const [visao, setVisao] = useState<"solicitante" | "tecnico">("solicitante");
  const [copiado, setCopiado] = useState<"sql" | "xml" | "relatorio" | null>(null);
  const [eventosBrutos, setEventosBrutos] = useState<EventoLog[]>([]);
  const [cadastroAtual, setCadastroAtual] = useState<CadastroAtual | null>(null);
  const [filtrosResultado, setFiltrosResultado] = useState<FiltrosResultado>(FILTROS_RESULTADO_VAZIOS);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [mostrarAte, setMostrarAte] = useState(EVENTOS_POR_PAGINA);
  const [resultadoTruncado, setResultadoTruncado] = useState(false);
  const buscaRef = useRef<AbortController | null>(null);
  const [chatAberto, setChatAberto] = useState(false);
  const [chatTelaCheia, setChatTelaCheia] = useState(false);
  const [usuariosSistema, setUsuariosSistema] = useState<{ id: number; nome: string }[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [dicaIa, setDicaIa] = useState(true);
  const fecharChat = useCallback(() => setChatAberto(false), []);
  const abrirChat = useCallback(() => setChatAberto(true), []);
  const [pdfModalAberto, setPdfModalAberto] = useState(false);
  const [opcoesPdf, setOpcoesPdf] = useState<OpcoesPdf>(OPCOES_PDF_PADRAO);
  const [logImpressao, setLogImpressao] = useState<LogPdf | null>(null);
  const [pdfLogAberto, setPdfLogAberto] = useState(false);
  const [opcoesLog, setOpcoesLog] = useState<OpcoesPdf>(OPCOES_PDF_PADRAO);
  const [imprimindoLog, setImprimindoLog] = useState(false);
  const logChatRef = useRef<LogPdf | null>(null);
  const fecharPdfModal = useCallback(() => setPdfModalAberto(false), []);

  const tabelasOpcoes = useMemo(() => {
    const q = filtroTabela.trim().toLowerCase();
    const lista = q
      ? NOMES_TABELAS.filter((t) => t.toLowerCase().includes(q))
      : NOMES_TABELAS;
    if (filtros.tabela && !lista.includes(filtros.tabela)) {
      return [filtros.tabela, ...lista];
    }
    return lista;
  }, [filtroTabela, filtros.tabela]);
  const colunasChave = colunasDaTabela(filtros.tabela);
  const sql = useMemo(() => gerarSql(filtros), [filtros]);
  const xml = useMemo(() => montarXmlChaves(filtros.chaves), [filtros.chaves]);
  const eventos = useMemo(
    () => filtrarResultado(eventosBrutos, busca, filtrosResultado),
    [busca, eventosBrutos, filtrosResultado],
  );
  const usuariosResultado = useMemo(() => usuariosDoResultado(eventosBrutos), [eventosBrutos]);
  const camposResultado = useMemo(() => camposDoResultado(eventosBrutos), [eventosBrutos]);
  const historias = useMemo(() => [...eventos].reverse(), [eventos]);
  const historiasVisiveis = historias.slice(0, mostrarAte);
  const variasChaves = paresBusca(filtros.chaves).length > 1;
  const gradeVisivel = historias.slice(0, mostrarAte);

  function atualizar<K extends keyof FiltrosLog>(campo: K, valor: FiltrosLog[K]) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }

  function aoEscolherTabela(nome: string) {
    const cols = colunasDaTabela(nome);
    setFiltroTabela(nome);
    setFiltros((atual) => ({
      ...atual,
      tabela: nome,
      chaves: atual.chaves.map((c, i) =>
        i === 0 && cols[0] ? { ...c, nome: cols[0] } : c,
      ),
    }));
  }

  function aoDigitarData(qual: "inicio" | "fim", bruto: string) {
    const mask = mascararDataBr(bruto);
    const iso = brParaIso(mask);
    if (qual === "inicio") {
      setDe(mask);
      if (iso) atualizar("dataInicio", iso);
    } else {
      setAte(mask);
      atualizar("dataTermino", iso);
    }
  }

  function atualizarChave(id: string, campo: "nome" | "valor", valor: string) {
    atualizar(
      "chaves",
      filtros.chaves.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)),
    );
  }

  function limpar() {
    setFiltros({
      ...FILTROS_INICIAIS,
      chaves: [novaChave()],
    });
    setFiltroTabela("");
    setDe("");
    setAte("");
    buscaRef.current?.abort();
    buscaRef.current = null;
    setConsultou(false);
    setEventosBrutos([]);
    setCadastroAtual(null);
    setFiltrosResultado(FILTROS_RESULTADO_VAZIOS);
    setMostrarAte(EVENTOS_POR_PAGINA);
    setResultadoTruncado(false);
    setBusca("");
    setErro("");
  }

  async function copiar(texto: string, tipo: "sql" | "xml" | "relatorio") {
    await navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    window.setTimeout(() => setCopiado(null), 1600);
  }

  async function testarConexao() {
    setStatusConexao("Testando…");
    setErro("");
    try {
      const resp = await fetch(`${API}/api/conexao/teste`);
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || "Falha na conexão");
      setStatusConexao(`Conectado ao banco ${dados.Banco}`);
    } catch (e) {
      setStatusConexao("");
      setErro(e instanceof Error ? e.message : "Falha na conexão");
    }
  }

  async function consultar() {
    const inicio = brParaIso(de);
    const fim = ate.trim() ? brParaIso(ate) : "";
    if (!inicio) {
      setErro("Preencha a data inicial no formato 24/08/2026.");
      return;
    }
    if (ate.trim() && !fim) {
      setErro("Se informar a data final, use o formato 24/08/2026.");
      return;
    }
    try {
      await executarBusca({ ...filtros, dataInicio: inicio, dataTermino: fim });
      void fetch(`${API}/api/memoria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "uso", tabela: filtros.tabela, campo: filtros.chaves[0]?.nome }),
      }).catch(() => {});
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setErro("Busca cancelada.");
        return;
      }
      setErro(e instanceof Error ? e.message : "Falha na consulta");
    }
  }

  async function buscarNaApi(f: FiltrosLog, signal?: AbortSignal) {
    const resp = await fetch(`${API}/api/consulta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ filtros: f }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || "Falha na consulta");
    const brutos: unknown[] = Array.isArray(dados.eventos) ? dados.eventos : [];
    return {
      brutos,
      eventos: normalizarEventos(brutos),
      cadastro: normalizarCadastro(dados.cadastroAtual),
    };
  }

  async function executarBusca(f: FiltrosLog) {
    buscaRef.current?.abort();
    const ac = new AbortController();
    buscaRef.current = ac;
    setCarregando(true);
    setErro("");
    setSqlAberto(false);
    try {
      const { brutos, eventos: novos, cadastro } = await buscarNaApi(f, ac.signal);
      setEventosBrutos(novos);
      setCadastroAtual(cadastro);
      setFiltrosResultado(FILTROS_RESULTADO_VAZIOS);
      setBusca("");
      setConsultou(true);
      setExpandido({});
      setMostrarAte(EVENTOS_POR_PAGINA);
      setResultadoTruncado(brutos.length >= LIMITE_EVENTOS_AVISO);
      return { eventos: novos, cadastro };
    } finally {
      if (buscaRef.current === ac) buscaRef.current = null;
      setCarregando(false);
    }
  }

  function relatorioAtual(f: FiltrosLog, lista: EventoLog[], cadastro: CadastroAtual | null) {
    if (!lista.length) return "Nenhum evento encontrado nesse período e nesse registro.";
    const periodo = `${isoParaBr(f.dataInicio) || "—"} a ${isoParaBr(f.dataTermino) || "hoje"}`;
    return montarRelatorio(
      lista,
      `Histórico — ${f.tabela} — ${identificacaoRegistro(f.tabela, f.chaves, lista)} (${periodo})`,
      cadastro,
    );
  }

  async function executarFerramenta(nome: string, args: Record<string, unknown>, sinal?: AbortSignal): Promise<string> {
    const texto = (v: unknown) => (v == null ? "" : String(v).trim());
    if (nome === "lembrar_preferencia" || nome === "esquecer_preferencia") {
      const resp = await fetch(`${API}/api/memoria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...args, acao: nome === "esquecer_preferencia" ? "esquecer" : "lembrar" }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || "Falha ao salvar a memória");
      return nome === "esquecer_preferencia" ? "Preferência removida." : "Preferência salva.";
    }
    if (nome === "localizar_processo") {
      const resp = await fetch(`${API}/api/processo?numero=${encodeURIComponent(texto(args.numero))}`, { signal: sinal });
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
        body: JSON.stringify({ tabela: args.tabela, filtros: args.filtros, colunas: args.colunas }),
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
        body: JSON.stringify({ sql: texto(args.sql), pergunta: texto(args.pergunta) }),
        signal: sinal,
      });
      const dados = await resp.json();
      if (!resp.ok) return `Erro: ${dados.erro || "falha ao executar"}`;
      return JSON.stringify(dados);
    }
    if (nome === "buscar_tabelas") {
      try {
        const resp = await fetch(`${API}/api/catalogo/tabelas?termo=${encodeURIComponent(texto(args.termo))}`);
        const dados = await resp.json();
        if (resp.ok) return dados.tabelas.length ? dados.tabelas.join("\n") : "Nenhuma tabela com esse termo.";
      } catch {
        /* sem banco, usa o dicionário local */
      }
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
      const tabela = NOMES_TABELAS.find((t) => t.toLowerCase() === pedidas[0]?.replace(/^dbo\./i, "").toLowerCase());
      if (!tabela) return "Tabela não encontrada. Use buscar_tabelas.";
      return `${tabela}:\n${colunasDaTabela(tabela).join("\n")}`;
    }
    if (nome === "resultado_atual") {
      if (!consultou) return "Ainda não há consulta na tela.";
      logChatRef.current = {
        eventos,
        titulo: identificacaoRegistro(filtros.tabela, filtros.chaves, eventos),
        periodo: `${de || "—"} a ${ate || "hoje"}`,
      };
      return `SQL:\n${sql}\n\n${relatorioAtual(filtros, eventos, cadastroAtual)}`;
    }
    if (nome === "consultar_log") {
      const tabela = NOMES_TABELAS.find((t) => t.toLowerCase() === texto(args.tabela).toLowerCase());
      if (!tabela) return "Tabela não encontrada. Use buscar_tabelas.";
      const inicio = brParaIso(texto(args.data_inicio));
      if (!inicio) return "data_inicio inválida; use dd/mm/aaaa.";
      const fimBr = texto(args.data_fim);
      const fim = fimBr ? brParaIso(fimBr) : "";
      const tipo = [0, 1, 2, 3].includes(Number(args.tipo)) ? (Number(args.tipo) as TipoLog) : 0;
      const novos: FiltrosLog = {
        idUsuario: Number(args.id_usuario) || 0,
        dataInicio: inicio,
        dataTermino: fim,
        tabela,
        tipo,
        chaves: [
          {
            ...novaChave(),
            nome: texto(args.campo_chave) || colunasDaTabela(tabela)[0] || "",
            valor: texto(args.valores),
          },
        ],
      };
      const { eventos: lista, cadastro } = await buscarNaApi(novos);
      logChatRef.current = {
        eventos: lista,
        titulo: identificacaoRegistro(novos.tabela, novos.chaves, lista),
        periodo: `${isoParaBr(novos.dataInicio) || "—"} a ${isoParaBr(novos.dataTermino) || "hoje"}`,
      };
      void fetch(`${API}/api/memoria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "uso", tabela, campo: novos.chaves[0].nome }),
      }).catch(() => {});
      return `SQL:\n${gerarSql(novos)}\n\n${lista.length} evento(s).\n\n${relatorioAtual(novos, lista, cadastro)}`;
    }
    return `Ferramenta desconhecida: ${nome}`;
  }

  function gerarPdfLog(opcoes: OpcoesPdf) {
    setOpcoesLog(opcoes);
    setPdfLogAberto(false);
    setImprimindoLog(true);
    window.setTimeout(() => {
      const tituloOriginal = document.title;
      document.title = `Histórico ${logImpressao?.titulo ?? ""}`;
      window.print();
      document.title = tituloOriginal;
      setImprimindoLog(false);
    }, 150);
  }

  function gerarPdf(opcoes: OpcoesPdf) {
    setOpcoesPdf(opcoes);
    setPdfModalAberto(false);
    window.setTimeout(() => {
      const tituloOriginal = document.title;
      document.title = `Histórico ${
        numeroProcesso(eventos) || identificacaoRegistro(filtros.tabela, filtros.chaves, eventos)
      }`;
      window.print();
      document.title = tituloOriginal;
    }, 120);
  }

  function cancelarBusca() {
    buscaRef.current?.abort();
  }

  const usuariosOpcoes = useMemo(() => {
    const q = buscaUsuario.trim().toLowerCase();
    const lista = q
      ? usuariosSistema.filter((u) => u.nome.toLowerCase().includes(q))
      : usuariosSistema;
    const escolhido = usuariosSistema.find((u) => u.id === filtros.idUsuario);
    if (escolhido && !lista.some((u) => u.id === escolhido.id)) return [escolhido, ...lista];
    return lista;
  }, [buscaUsuario, usuariosSistema, filtros.idUsuario]);

  useEffect(() => {
    void testarConexao();
    void (async () => {
      try {
        const resp = await fetch(`${API}/api/usuarios`);
        const dados = await resp.json();
        if (resp.ok && Array.isArray(dados.usuarios)) setUsuariosSistema(dados.usuarios);
      } catch {
        /* sem a lista, o campo numérico continua disponível */
      }
    })();
    const timer = window.setTimeout(() => setDicaIa(false), 4200);
    return () => {
      window.clearTimeout(timer);
      buscaRef.current?.abort();
    };
  }, []);

  return (
    <div className={`app${chatAberto && !chatTelaCheia ? " com-chat" : ""}`}>
      <header className="titulo-pagina nao-imprimir">
        <h1>
          Histórico de alterações
          <span className="info-titulo" tabIndex={0}>
            <IconeInfo />
            <span className="info-balao" role="tooltip">
              Mostra quem mudou o registro, quando e o que mudou.
              {statusConexao ? ` ${statusConexao}.` : ""}
            </span>
          </span>
        </h1>
        <div className="titulo-acoes">
          <div className="usuario-logado">
            {usuario.foto ? <img src={usuario.foto} alt="" /> : null}
            <span title={usuario.email}>{usuario.nome}</span>
            <button className="ghost pequeno" type="button" onClick={onSair}>
              Sair
            </button>
          </div>
          <div className="ia-flutuante">
            {dicaIa && !chatAberto ? (
              <p className="ia-dica">Pergunte sobre um processo, cliente ou alteração. Eu consulto e resumo para você.</p>
            ) : null}
            <button type="button" className="ia-botao" onClick={() => setChatAberto(true)} title="Assistente IA" aria-label="Abrir assistente IA">
              <img src={marcaIa} alt="" />
            </button>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={() => setSqlAberto((v) => !v)}
          >
            {sqlAberto ? "Ocultar SQL" : "Ver SQL"}
          </button>
        </div>
      </header>
      <ChatIa
        api={API}
        aberto={chatAberto}
        onAbrir={abrirChat}
        onFechar={fecharChat}
        executar={executarFerramenta}
        capturarLog={() => {
          const atual = logChatRef.current;
          logChatRef.current = null;
          return atual;
        }}
        onImprimirLog={(log) => {
          setLogImpressao(log);
          setPdfLogAberto(true);
        }}
        onTelaCheia={setChatTelaCheia}
      />
      <OpcoesPdfModal
        aberto={pdfLogAberto}
        usuarios={usuariosDoResultado(logImpressao?.eventos ?? [])}
        campos={camposDoResultado(logImpressao?.eventos ?? [])}
        onFechar={() => setPdfLogAberto(false)}
        onGerar={gerarPdfLog}
      />

      <section className="card nao-imprimir">
        <button
          type="button"
          className="card-cab"
          onClick={() => setFiltrosAbertos((v) => !v)}
        >
          <span className="card-titulo">
            <IconeFiltro />
            O que você quer encontrar
          </span>
          <span className={`chevron ${filtrosAbertos ? "aberto" : ""}`}>⌃</span>
        </button>

        {filtrosAbertos && (
          <div className="card-corpo">
            {erro ? <p className="erro">{erro}</p> : null}
            <div className="grid">
              <label>
                De
                <input
                  inputMode="numeric"
                  placeholder="13/08/2026"
                  value={de}
                  onChange={(e) => aoDigitarData("inicio", e.target.value)}
                />
                <span className="dica">dia/mês/ano</span>
              </label>
              <label>
                Até
                <input
                  inputMode="numeric"
                  placeholder="opcional"
                  value={ate}
                  onChange={(e) => aoDigitarData("fim", e.target.value)}
                />
                <span className="dica">vazio busca sem data final</span>
              </label>
              <label>
                Tipo de operação
                <select
                  value={filtros.tipo}
                  onChange={(e) =>
                    atualizar("tipo", Number(e.target.value) as TipoLog)
                  }
                >
                  {TIPOS.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.rotulo}
                    </option>
                  ))}
                </select>
                <span className="dica">inclusão, alteração ou exclusão</span>
              </label>
              <label>
                Quem fez
                {usuariosSistema.length ? (
                  <>
                    <input
                      value={buscaUsuario}
                      onChange={(e) => setBuscaUsuario(e.target.value)}
                      placeholder="Nome da pessoa"
                      spellCheck={false}
                    />
                    <select
                      value={filtros.idUsuario}
                      onChange={(e) => atualizar("idUsuario", Number(e.target.value))}
                    >
                      <option value={0}>Qualquer pessoa</option>
                      {usuariosOpcoes.map((pessoa) => (
                        <option key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome}
                        </option>
                      ))}
                    </select>
                    <span className="dica">
                      {buscaUsuario.trim()
                        ? `${usuariosOpcoes.length} de ${usuariosSistema.length} pessoas`
                        : `${usuariosSistema.length} pessoas`}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={filtros.idUsuario}
                      onChange={(e) => atualizar("idUsuario", Number(e.target.value))}
                    />
                    <span className="dica">0 = qualquer usuário</span>
                  </>
                )}
              </label>
            </div>

            <div className="grid linha-tabela">
              <label>
                Filtrar tabela
                <input
                  value={filtroTabela}
                  onChange={(e) => setFiltroTabela(e.target.value)}
                  placeholder="ex.: mov_Atividade"
                  spellCheck={false}
                />
                <span className="dica">
                  {filtroTabela && tabelasOpcoes.length !== NOMES_TABELAS.length
                    ? `${tabelasOpcoes.length} de ${NOMES_TABELAS.length} tabelas`
                    : `${NOMES_TABELAS.length} tabelas`}
                </span>
              </label>
              <label>
                Tabela
                <select
                  value={filtros.tabela}
                  onChange={(e) => aoEscolherTabela(e.target.value)}
                >
                  <option value="">Selecione a tabela</option>
                  {tabelasOpcoes.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
                <span className="dica">tabela do log</span>
              </label>
            </div>

            <p className="secao-mini">Qual registro</p>
            <p className="dica bloco-dica">
              Vários códigos no mesmo campo, separados por vírgula (ex.: 2242163, 2242164), ou + Outra chave.
            </p>
            {filtros.chaves.map((chave) => (
              <div className="grid chaves" key={chave.id}>
                <label>
                  Campo da chave
                  <select
                    value={chave.nome}
                    onChange={(e) => atualizarChave(chave.id, "nome", e.target.value)}
                  >
                    <option value="">Selecione o campo</option>
                    {(colunasChave.includes(chave.nome) || !chave.nome
                      ? colunasChave
                      : [chave.nome, ...colunasChave]
                    ).map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <span className="dica">
                    {colunasChave.length
                      ? `${colunasChave.length} colunas desta tabela`
                      : "Escolha a tabela primeiro"}
                  </span>
                </label>
                <label>
                  Código
                  <div className="codigo-com-acao">
                    <input
                      placeholder="Ex.: 2242163 ou 2242163, 2242164"
                      value={chave.valor}
                      onChange={(e) => atualizarChave(chave.id, "valor", e.target.value)}
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="ghost pequeno"
                      disabled={filtros.chaves.length === 1}
                      onClick={() =>
                        atualizar(
                          "chaves",
                          filtros.chaves.filter((c) => c.id !== chave.id),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                </label>
              </div>
            ))}

            <div className="acoes">
              <button
                type="button"
                className="btn-aplicar"
                disabled={carregando}
                onClick={consultar}
              >
                <IconeFiltro />
                {carregando ? "Buscando…" : "Buscar histórico"}
              </button>
              {carregando ? (
                <button type="button" className="ghost" onClick={cancelarBusca}>
                  Cancelar busca
                </button>
              ) : (
                <button type="button" className="btn-limpar" onClick={limpar}>
                  Limpar
                </button>
              )}
              <span className="acoes-espaco" />
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  atualizar("chaves", [
                    ...filtros.chaves,
                    {
                      ...novaChave(),
                      nome: filtros.chaves[filtros.chaves.length - 1]?.nome ?? "",
                    },
                  ])
                }
              >
                + Outra chave
              </button>
              <button type="button" className="ghost" onClick={() => copiar(xml, "xml")}>
                {copiado === "xml" ? "XML copiado" : "Copiar XML"}
              </button>
            </div>
          </div>
        )}
      </section>

      {sqlAberto && (
        <section className="card nao-imprimir">
          <div className="card-cab estatico">
            <span className="card-titulo">Script gerado</span>
            <button type="button" className="ghost pequeno" onClick={() => copiar(sql, "sql")}>
              {copiado === "sql" ? "Copiado" : "Copiar SQL"}
            </button>
          </div>
          <div className="card-corpo">
            <pre>{sql}</pre>
          </div>
        </section>
      )}

      <OpcoesPdfModal
        aberto={pdfModalAberto}
        usuarios={usuariosResultado}
        campos={camposResultado}
        onFechar={fecharPdfModal}
        onGerar={gerarPdf}
      />
      {imprimindoLog && logImpressao ? (
        <PdfHistorico
          eventos={eventosDoPdf(logImpressao.eventos, opcoesLog)}
          opcoes={opcoesLog}
          titulo={logImpressao.titulo}
          periodo={logImpressao.periodo}
        />
      ) : null}
      {!imprimindoLog && consultou && eventos.length > 0 ? (
        <PdfHistorico
          eventos={eventosDoPdf(eventos, opcoesPdf)}
          opcoes={opcoesPdf}
          titulo={
            (variasChaves ? numerosProcesso(eventos).join(" · ") : numeroProcesso(eventos)) ||
            identificacaoRegistro(filtros.tabela, filtros.chaves, eventos)
          }
          periodo={`${de || "—"} a ${ate || "hoje"}`}
        />
      ) : null}
      {consultou ? (
        <section className="card relatorio nao-imprimir">
          <div className="relatorio-topo nao-imprimir">
            <div className="relatorio-titulo">
              <h2>Relatório para o solicitante</h2>
              <span>
                {eventos.length}{" "}
                {eventos.length === 1 ? "evento" : "eventos"}
              </span>
            </div>
            {eventos.length > 0 ? (
              <div className="relatorio-acoes">
                <div className="segmento" role="tablist">
                  <button
                    type="button"
                    className={visao === "solicitante" ? "ativo" : ""}
                    onClick={() => setVisao("solicitante")}
                  >
                    Simples
                  </button>
                  <button
                    type="button"
                    className={visao === "tecnico" ? "ativo" : ""}
                    onClick={() => setVisao("tecnico")}
                  >
                    Técnica
                  </button>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    void copiar(
                      montarRelatorio(
                        eventos,
                        `Histórico — ${identificacaoRegistro(filtros.tabela, filtros.chaves, eventos)} (${de} a ${ate})`,
                        cadastroAtual,
                      ),
                      "relatorio",
                    )
                  }
                >
                  {copiado === "relatorio" ? "Copiado" : "Copiar"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setPdfModalAberto(true)}
                >
                  PDF
                </button>
              </div>
            ) : null}
          </div>
          <div className="filtros-resultado nao-imprimir">
            <label>
              Procurar
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, campo ou valor"
              />
            </label>
            <label>
              Quem fez
              <select
                value={filtrosResultado.usuario}
                onChange={(e) => {
                  const usuario = e.target.value;
                  setMostrarAte(EVENTOS_POR_PAGINA);
                  setFiltrosResultado((atual) => ({ ...atual, usuario }));
                }}
              >
                <option value="">Todos</option>
                {usuariosResultado.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={filtrosResultado.tipo}
                onChange={(e) => {
                  const tipo = Number(e.target.value) as TipoLog;
                  setMostrarAte(EVENTOS_POR_PAGINA);
                  setFiltrosResultado((atual) => ({ ...atual, tipo }));
                }}
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Campo que mudou
              <select
                value={filtrosResultado.campo}
                onChange={(e) => {
                  const campo = e.target.value;
                  setMostrarAte(EVENTOS_POR_PAGINA);
                  setFiltrosResultado((atual) => ({ ...atual, campo }));
                }}
              >
                <option value="">Todos</option>
                {camposResultado.map((campo) => (
                  <option key={campo.nome} value={campo.nome}>
                    {campo.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ficha-processo">
            <span className="etiqueta">Processo</span>
            <strong>
              {(variasChaves ? numerosProcesso(eventos).join(" · ") : numeroProcesso(eventos)) ||
                identificacaoRegistro(filtros.tabela, filtros.chaves, eventos)}
            </strong>
            {variasChaves ? (
              <span className="periodo">
                {paresBusca(filtros.chaves)
                  .map((par) => par.valor)
                  .join(" / ")}
              </span>
            ) : null}
            {de && ate ? (
              <span className="periodo">
                {de} a {ate}
              </span>
            ) : null}
          </div>
          <div className="card-corpo relatorio-corpo">
            {resultadoTruncado ? (
              <p className="dica">
                Mostrando os {LIMITE_EVENTOS_AVISO} eventos mais recentes recebidos. Reduza o período se precisar de tudo.
              </p>
            ) : null}
            <ConferenciaCadastro cadastro={cadastroAtual} />
            {eventos.length === 0 ? (
              <p className="vazio">Nada encontrado nesse período e nesse registro.</p>
            ) : visao === "solicitante" ? (
              <>
                <p className="frase-resumo">{fraseResumo(eventos)}</p>
                <ol className="historias">
                  {historiasVisiveis.map((evento) => {
                    const acoes = acoesDoEvento(evento).filter(
                      (acao) =>
                        acao.nome !== "Numero_Processo" &&
                        acao.nome !== "IdLogistica_House" &&
                        acao.nome !== "IdLogistica_Master" &&
                        acao.nome !== "IdProjeto_Atividade",
                    );
                    return (
                      <li key={evento.id} className="historia">
                        {variasChaves ? (
                          <p className="historia-alvo">
                            {identificacaoDoEvento(evento, filtros.chaves)}
                          </p>
                        ) : null}
                        <p className="historia-quando">{quandoFoiFeito(evento)}</p>
                        <h3>
                          {fraseQuem(evento)}
                          <span className={`tipo tipo-${evento.tipo}`}>
                            {rotuloTipo(evento.tipo)}
                          </span>
                        </h3>
                        <p className="historia-onde">
                          {fraseQuem(evento)} {verboDoEvento(evento)}
                          {acoes.length > 0
                            ? ` — ${acoes.length} campo${acoes.length === 1 ? "" : "s"} ${
                                evento.tipo === 1 ? "preenchido" : evento.tipo === 2 ? "removido" : "alterado"
                              }${acoes.length === 1 ? "" : "s"}.`
                            : " — nenhum campo com valor diferente."}
                        </p>
                        {acoes.length > 0 ? (
                          <ul className="o-que-mudou">
                            {acoes.map((acao, i) => {
                              const exclusao = acao.depois === VAZIO && acao.antes !== VAZIO;
                              return (
                                <li key={`${acao.nome}-${i}`} className={exclusao ? "campo-exclusao" : undefined}>
                                  <strong>
                                    {rotuloCampo(acao.nome)}
                                    {exclusao ? <em>Exclusão</em> : null}
                                  </strong>
                                  <Comparacao antes={acao.antes} depois={acao.depois} />
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                {historias.length > historiasVisiveis.length ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setMostrarAte((n) => n + EVENTOS_POR_PAGINA)}
                  >
                    Mostrar mais ({historiasVisiveis.length} de {historias.length})
                  </button>
                ) : null}
              </>
            ) : (
              <div className="nao-imprimir">
                <div className="tabela-wrap grade-wrap">
                  <table className="grade">
                    <thead>
                      <tr>
                        <th>Quando</th>
                        <th>Processo</th>
                        <th>Operação</th>
                        <th>Tabela</th>
                        <th>Usuário</th>
                        <th>Windows</th>
                        <th>Computador</th>
                        <th>Início da transação</th>
                        <th>Fim da transação</th>
                        <th>Duração</th>
                        <th>Índice</th>
                        <th>Campos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeVisivel.map((evento) => {
                        const aberto = expandido[evento.id] ?? false;
                        return (
                          <tr
                            key={evento.id}
                            className={aberto ? "sel" : undefined}
                            onClick={() => setExpandido({ [evento.id]: !aberto })}
                          >
                            <td>{formatarDataHora(evento.data)}</td>
                            <td>{evento.numeroProcesso || "—"}</td>
                            <td>
                              <span className={`tipo tipo-${evento.tipo}`}>
                                {rotuloTipoCompleto(evento.tipo)}
                              </span>
                            </td>
                            <td className="campo-nome">{evento.tabela}</td>
                            <td>{evento.usuario ? nomeProprio(evento.usuario) : "—"}</td>
                            <td>{evento.usuarioWindows || "—"}</td>
                            <td>{evento.computador || "—"}</td>
                            <td>{formatarDataHora(evento.dataInicioTransacao)}</td>
                            <td>{formatarDataHora(evento.dataTerminoTransacao)}</td>
                            <td>{evento.tempoTransacao} s</td>
                            <td>{evento.indice}</td>
                            <td className="celula-campos">{resumoCampos(evento)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {eventos.length > gradeVisivel.length ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setMostrarAte((n) => n + EVENTOS_POR_PAGINA)}
                  >
                    Mostrar mais ({gradeVisivel.length} de {eventos.length})
                  </button>
                ) : null}
                {gradeVisivel.map((evento) =>
                  expandido[evento.id] ? (
                    <Campos
                      key={`campos-${evento.id}`}
                      evento={evento}
                      xmlCopiado={copiado === "xml"}
                      onCopiarXml={(texto) => void copiar(texto, "xml")}
                    />
                  ) : null,
                )}
                {!Object.values(expandido).some(Boolean) ? (
                  <p className="dica-grade">Clique numa linha para ver o que mudou.</p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      ) : (
        <p className="vazio nao-imprimir">
          Informe o período (dd/mm/aaaa), a tabela e o código do registro. Depois
          clique em Buscar histórico.
        </p>
      )}
    </div>
  );
}
