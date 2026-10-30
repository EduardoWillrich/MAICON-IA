import { formatarValorNovo } from "./legendas";

type Item = { nome: string; valor: number };
type Painel = {
  titulo: string;
  sub: string;
  banco: string;
  transacoes: number;
  usuarios: number;
  amostra: number;
  chips: { valor: number; rotulo: string }[];
  rankings: { titulo: string; itens: Item[] }[];
};

function milhar(valor: number) {
  return valor.toLocaleString("pt-BR");
}

function numero(texto: string) {
  return Number(texto.replace(/\./g, "")) || 0;
}

export function painelDoTexto(texto: string): Painel | null {
  const limpo = texto.trim();
  const bloco = limpo.match(/```painel\s*([\s\S]*?)```/i);
  if (bloco) {
    try {
      const dados = JSON.parse(bloco[1]) as Painel;
      if (dados?.titulo && dados.banco) return dados;
    } catch {
      return null;
    }
  }
  if (!/^##\s+Painel do TI/m.test(limpo)) return null;
  const banco = limpo.match(/\*\*Banco:\*\*\s*(.+)/)?.[1]?.trim();
  const transacoes = limpo.match(/\*\*Transações de log:\*\*\s*([\d.]+)/);
  const usuarios = limpo.match(/\*\*Usuários que gravaram log:\*\*\s*([\d.]+)/);
  const tipos = limpo.match(/(\d[\d.]*)\s+inclusões,\s*(\d[\d.]*)\s+exclusões,\s*(\d[\d.]*)\s+atualizações/i);
  if (!banco || !transacoes || !usuarios) return null;
  const rankings: Painel["rankings"] = [];
  for (const parte of limpo.split(/^###\s+/m).slice(1)) {
    const [titulo, ...resto] = parte.split("\n");
    const itens = resto
      .map((linha) => linha.match(/^[-*]\s+(.+?)\s+·\s+([\d.]+)\s*$/))
      .filter((item): item is RegExpMatchArray => Boolean(item))
      .map((item) => ({ nome: item[1].trim(), valor: numero(item[2]) }));
    if (titulo.trim() && itens.length) rankings.push({ titulo: titulo.trim(), itens });
  }
  const horas = limpo.match(/últimas\s+(\d+)\s+horas/i)?.[1] ?? "24";
  return {
    titulo: `Painel do TI — últimas ${horas} horas`,
    sub: "Atividade de gravação no banco de dados",
    banco,
    transacoes: numero(transacoes[1]),
    usuarios: numero(usuarios[1]),
    amostra: 0,
    chips: tipos
      ? [
          { valor: numero(tipos[1]), rotulo: "inclusões" },
          { valor: numero(tipos[2]), rotulo: "exclusões" },
          { valor: numero(tipos[3]), rotulo: "atualizações" },
        ]
      : [],
    rankings,
  };
}

function Ranking({ titulo, itens }: { titulo: string; itens: Item[] }) {
  const maior = Math.max(1, ...itens.map((item) => item.valor));
  return (
    <>
      <h2>{titulo}</h2>
      <ol className="painel-rank">
        {itens.map((item, indice) => (
          <li key={`${item.nome}-${item.valor}`} style={{ ["--w" as string]: `${Math.max(8, Math.round((item.valor / maior) * 100))}%` }}>
            <span className="pos">{indice + 1}</span>
            <span className="name">{item.nome}</span>
            <span className="val">{milhar(item.valor)}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

export type MudancaLog = { campo: string; de: string; para: string };

export type EventoLog = {
  hora: string;
  dia?: string;
  tabela: string;
  tipo: "add" | "upd" | "del" | string;
  rotulo: string;
  quem: string;
  windows?: string;
  computador?: string;
  detalhe?: string;
  processo?: string;
  mudancas?: MudancaLog[];
};

function tomDoNome(nome: string) {
  let valor = 0;
  for (const letra of nome) valor = (valor * 33 + letra.charCodeAt(0)) % 360;
  return valor;
}

function textoDoCampo(nome: string, valor: string) {
  const bruto = valor.trim();
  if (!bruto || bruto === "vazio") return "";
  const texto = formatarValorNovo(nome.replace(/ /g, "_"), bruto);
  return !texto || texto === "vazio" ? "" : texto;
}

function codigoInterno(nome: string) {
  const campo = nome.replace(/\s+/g, "_");
  return /^Id(_|$)/i.test(campo) || /(^|_)Id[A-Z_]/.test(campo);
}

function iniciais(nome: string) {
  const partes = nome.split(/[.\s_]+/).filter((parte) => parte.length > 1);
  const a = (partes[0]?.[0] ?? nome[0] ?? "?").toUpperCase();
  const b = (partes[1]?.[0] ?? "").toUpperCase();
  return `${a}${b}`;
}

export type LogPainel = { titulo: string; sub: string; itens: EventoLog[]; aviso?: string };

export function logDoTexto(texto: string): LogPainel | null {
  const bloco = texto.trim().match(/```log\s*([\s\S]*?)```/i);
  if (bloco) {
    try {
      const dados = JSON.parse(bloco[1]) as LogPainel;
      if (dados?.titulo && Array.isArray(dados.itens)) return dados;
    } catch {
      return null;
    }
  }
  if (!/^Log recente\b/m.test(texto)) return null;
  const itens: EventoLog[] = [];
  for (const linha of texto.split("\n")) {
    const achado = linha.match(/^[-*]\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+·\s+(inclusão|exclusão|atualização|operação)\s+·\s+([^·]+?)(?:\s+·\s+(.*))?$/i);
    if (!achado) continue;
    const rotulo = achado[3].toLowerCase();
    itens.push({
      dia: achado[1],
      hora: achado[2],
      rotulo,
      tipo: rotulo.startsWith("exc") ? "del" : rotulo.startsWith("atu") ? "upd" : "add",
      tabela: achado[4].trim(),
      quem: (achado[5] ?? "").split("·")[0]?.trim() ?? "",
      windows: (achado[5] ?? "").split("·")[1]?.trim() ?? "",
      computador: (achado[5] ?? "").split("·").slice(2).join("·").trim(),
    });
  }
  if (!itens.length) return null;
  const sub = texto.match(/^Log recente\s*\(([^)]+)\)/m)?.[1] ?? "Últimas 24 horas";
  return { titulo: "Log recente", sub: `${sub} · ${itens[0].dia ?? ""}`.replace(/\s+·\s*$/, ""), itens };
}

export function LogCard({ log }: { log: LogPainel }) {
  const processos = [...new Set(log.itens.map((item) => item.processo).filter(Boolean))];
  const ref =
    processos.length === 1
      ? processos[0]
      : processos.length === 0
        ? (log.titulo.match(/\b[A-Z]{1,4}\d{2,6}-\d{2}\b/)?.[0] ?? "")
        : "";
  const titulo = ref && log.titulo.includes(ref) ? log.titulo.replace(ref, "").replace(/[·-]\s*$/, "").trim() : log.titulo;
  return (
    <article className="hl-root">
      <div className="hl-painel">
        <header className="hl-topo">
          <h2>
            <span>{titulo || "Log"}</span>
            {ref ? <span className="hl-ref">{ref}</span> : null}
          </h2>
          <span className="hl-contagem">{log.itens.length} {log.itens.length === 1 ? "alteração" : "alterações"}</span>
        </header>
        {log.itens.length ? (
          <ol className="hl-lista">
            {log.itens.map((item, indice) => {
              const mudancas = (item.mudancas ?? [])
                .map((mudanca) => ({ ...mudanca, de: textoDoCampo(mudanca.campo, mudanca.de), para: textoDoCampo(mudanca.campo, mudanca.para) }))
                .filter((mudanca) => !codigoInterno(mudanca.campo))
                .filter((mudanca) => {
                  if (!mudanca.de && !mudanca.para) return false;
                  if (/^n[uú]mero do processo|^processo$/i.test(mudanca.campo) && ref && (mudanca.para === ref || mudanca.de === ref)) return false;
                  return true;
                });
              const onde = [item.tabela.replace(/^(mov|cad|sys)_/i, "").replaceAll("_", " "), item.computador].filter(Boolean).join(" · ").replace(/\bLogistica\b/g, "Logística");
              return (
                <li key={`${item.hora}-${item.quem}-${indice}`} className="hl-item">
                  <time>{item.hora}</time>
                  <span className="hl-trilho" />
                  <div className="hl-card">
                    <div className="hl-quem">
                      <span className="hl-avatar" style={{ ["--h" as string]: tomDoNome(item.quem || item.tabela) }}>{iniciais(item.quem || item.tabela)}</span>
                      <span className="hl-autor">{item.quem || "Usuário"}</span>
                      <span className="hl-tipo">{item.rotulo}</span>
                    </div>
                    {onde ? <p className="hl-onde">{onde}</p> : null}
                    {mudancas.length ? (
                      <ul className="hl-mudancas">
                        {mudancas.map((mudanca) => (
                          <li key={`${mudanca.campo}-${mudanca.de}-${mudanca.para}`}>
                            <span className="hl-campo">{mudanca.campo}</span>
                            <span className="hl-valores">
                              {item.tipo === "add" || !mudanca.de ? (
                                <span className="hl-depois">{mudanca.para || "vazio"}</span>
                              ) : item.tipo === "del" || !mudanca.para ? (
                                <span className="hl-antes">{mudanca.de}</span>
                              ) : (
                                <>
                                  <span className="hl-antes">{mudanca.de}</span>
                                  <span className="hl-seta">→</span>
                                  <span className="hl-depois">{mudanca.para}</span>
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="hl-contagem">{log.aviso || "Nenhum evento nesse recorte."}</p>
        )}
        {log.itens.length && log.aviso ? <p className="hl-contagem hl-aviso">{log.aviso}</p> : null}
      </div>
    </article>
  );
}

export function PainelTiCard({ painel }: { painel: Painel }) {
  return (
    <article className="painel-ti">
      <h1>{painel.titulo}</h1>
      <p className="sub">{painel.sub}</p>
      <div className="grid">
        <div className="stat wide">
          <small>Banco</small>
          <strong className="db">{painel.banco}</strong>
        </div>
        <div className="stat">
          <small>Transações de log</small>
          <strong>{milhar(painel.transacoes)}</strong>
        </div>
        <div className="stat">
          <small>Usuários que gravaram log</small>
          <strong>{milhar(painel.usuarios)}</strong>
        </div>
      </div>
      {painel.chips.length ? (
        <>
          <h2>{painel.amostra > 0 ? `Nas ${painel.amostra} transações mais recentes` : "No período inteiro"}</h2>
          <div className="chips">
            {painel.chips.map((chip) => (
              <span key={chip.rotulo} className="chip">
                <b>{milhar(chip.valor)}</b>
                {chip.rotulo}
              </span>
            ))}
          </div>
        </>
      ) : null}
      {painel.rankings.map((grupo) => (
        <Ranking key={grupo.titulo} titulo={grupo.titulo} itens={grupo.itens} />
      ))}
    </article>
  );
}
