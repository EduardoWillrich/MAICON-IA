import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { SymbolLoader } from "./Loader";

type Item = { titulo: string; detalhe: string; texto?: string; quando?: string; marca?: string; processo?: string; pergunta?: string; partes?: { texto: string; tom: string }[] };
type Bloco = { titulo: string; itens: Item[]; vazio: string; pergunta?: string };
type Ranking = { titulo: string; detalhe: string; vazio: string; itens: { nome: string; qtd: number }[] };
type Encarte = {
  nome: string;
  nivel: string;
  classificacao: string;
  pagamento: string;
  pagamentoTexto: string;
  detalhe: string;
  pergunta: string;
};
type Resumo = {
  rotulo: string;
  frase: string;
  kpis: { rotulo: string; valor: string; detalhe: string; atencao?: boolean; tom?: string }[];
  principal: Bloco;
  aviso?: Bloco | null;
  secundarios: Bloco[];
  ranking?: Ranking | null;
  relacionamento?: Encarte[] | null;
  favoritos?: Bloco | null;
  placar?: { visao: string; boas: number; ruins: number }[] | null;
};

type Kpi = Resumo["kpis"][number];

const GRUPOS_KPI = [
  { id: "movimento", titulo: "Movimento", rotulos: ["Abertos", "Novos no mês", "Movimentados no mês"] },
  { id: "atencao", titulo: "Precisa de atenção", rotulos: ["Sem proposta", "Atividades atrasadas", "Parados", "Prazos em 7 dias"] },
  { id: "resultado", titulo: "Resultado", rotulos: ["Comissão do mês"] },
];

function gruposDeKpis(kpis: Kpi[]) {
  const usados = new Set<string>();
  const grupos = GRUPOS_KPI.map((grupo) => {
    const itens = grupo.rotulos.flatMap((rotulo) => {
      const item = kpis.find((atual) => atual.rotulo === rotulo);
      if (!item) return [];
      usados.add(item.rotulo);
      return [item];
    });
    return { ...grupo, itens };
  }).filter((grupo) => grupo.itens.length);
  const resto = kpis.filter((item) => !usados.has(item.rotulo));
  if (resto.length) grupos.push({ id: "outros", titulo: "Outros", rotulos: [], itens: resto });
  return grupos.length > 1 ? grupos : null;
}

function CartaoGrupo({ grupo }: { grupo: { id: string; titulo: string; itens: Kpi[] } }) {
  return (
    <article className={`inicio-grupo ${grupo.id}`}>
      <h3>{grupo.titulo}</h3>
      <ul>
        {grupo.itens.map((item) => (
          <li key={item.rotulo} className={item.atencao ? "atencao" : ""}>
            <span>{item.rotulo}</span>
            <strong>{item.valor}</strong>
            <small>{item.detalhe}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}

function colunasDoInicio(resumo: Resumo) {
  const secundarios = resumo.secundarios ?? [];
  if (resumo.aviso || secundarios.length < 3) {
    return {
      equilibrada: false,
      esquerda: [resumo.principal, ...(resumo.aviso ? [resumo.aviso] : [])],
      direita: secundarios,
    };
  }
  const esquerda = [resumo.principal];
  const direita: Bloco[] = [];
  secundarios.forEach((bloco, indice) => {
    if (indice % 2 === 0) direita.push(bloco);
    else esquerda.push(bloco);
  });
  return { equilibrada: true, esquerda, direita };
}

function quantidade(detalhe: string) {
  const achado = detalhe.trim().match(/^(\d[\d.]*)/);
  if (!achado) return null;
  const valor = Number(achado[1].replace(/\./g, ""));
  return Number.isFinite(valor) ? valor : null;
}

function Lista({ bloco, onPerguntar }: { bloco: Bloco; onPerguntar: (pergunta: string) => void }) {
  const valores = bloco.itens.map((item) => (item.partes?.length ? null : quantidade(item.detalhe)));
  const maior = Math.max(0, ...valores.filter((valor): valor is number => valor != null));
  return (
    <section className="inicio-bloco">
      <header>
        <h3>{bloco.titulo}</h3>
        {bloco.pergunta ? (
          <button type="button" onClick={() => onPerguntar(bloco.pergunta || "")}>
            Abrir no chat
          </button>
        ) : null}
      </header>
      {bloco.vazio ? <p className="inicio-vazio">{bloco.vazio}</p> : null}
      <ul>
        {bloco.itens.map((item, indice) => {
          const valor = valores[indice];
          const largura = valor != null && maior > 0 ? Math.max(6, Math.round((valor / maior) * 100)) : 0;
          return (
            <li key={`${bloco.titulo}-${item.titulo}-${item.detalhe}`} className={item.marca === "Não lido" ? "nao-lida" : ""}>
              {item.processo || item.marca ? (
                <span className="inicio-canto">
                  {item.processo ? <em className="processo">{item.processo}</em> : null}
                  {item.marca ? <em className={item.marca === "Atrasada" ? "atrasada" : item.marca === "Hoje" ? "hoje" : ""}>{item.marca}</em> : null}
                </span>
              ) : valor != null ? <em>{valor.toLocaleString("pt-BR")}</em> : null}
              {item.pergunta ? (
                <button type="button" className="inicio-cliente" onClick={() => onPerguntar(item.pergunta || "")}>
                  {item.titulo}
                </button>
              ) : (
                <strong>{item.titulo}</strong>
              )}
              {item.partes?.length ? (
                <small className="inicio-partes">
                  {item.partes.map((parte) => (
                    <span key={parte.tom} className={`inicio-tom-${parte.tom}`}>{parte.texto}</span>
                  ))}
                </small>
              ) : item.detalhe ? <small>{item.detalhe}</small> : null}
              {item.texto ? <p>{item.texto}</p> : null}
              {largura ? (
                <span className="barra" aria-hidden="true">
                  <i style={{ "--w": `${largura}%` } as CSSProperties} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Encartes({ itens, onPerguntar }: { itens: Encarte[]; onPerguntar: (pergunta: string) => void }) {
  if (!itens.length) return null;
  return (
    <section className="inicio-encartes" aria-label="Relacionamento com o cliente">
      <header>
        <h3>Relacionamento</h3>
        <span>Ouro, prata ou bronze, e se paga em dia</span>
      </header>
      <ul>
        {itens.map((item) => (
          <li key={item.nome} className={item.nivel ? `nivel-${item.nivel}` : ""}>
            <button type="button" className="encarte" onClick={() => onPerguntar(item.pergunta)}>
              <em>{item.classificacao}</em>
              <strong>{item.nome}</strong>
              <small className={item.pagamento}>{item.pagamentoTexto}</small>
              {item.detalhe ? <span>{item.detalhe}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RankingFechamentos({ ranking }: { ranking: Ranking }) {
  const maior = Math.max(1, ...ranking.itens.map((item) => item.qtd));
  return (
    <section className="inicio-bloco inicio-ranking" aria-label={ranking.titulo}>
      <header>
        <h3>{ranking.titulo}</h3>
        <span>{ranking.detalhe}</span>
      </header>
      {ranking.itens.length ? (
        <ol>
          {ranking.itens.map((item, indice) => (
            <li key={item.nome}>
              <em>{indice + 1}</em>
              <strong title={item.nome}>{item.nome}</strong>
              <span>{item.qtd.toLocaleString("pt-BR")}</span>
              <i style={{ "--w": `${Math.max(8, Math.round((item.qtd / maior) * 100))}%` } as CSSProperties} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="inicio-vazio">{ranking.vazio}</p>
      )}
    </section>
  );
}

type AtividadeFila = { codigo: string; atividade: string; processo: string; marca?: string; quando?: string };

function agruparFila(atividades: AtividadeFila[], ocultas: string[]) {
  const grupos: {
    chave: string;
    codigo: string;
    atividade: string;
    processos: { processo: string; chaves: string[]; marca: string; quando: string }[];
  }[] = [];
  for (const item of atividades) {
    const chaveItem = `${item.processo}|${item.codigo}|${item.atividade}`;
    if (ocultas.includes(chaveItem)) continue;
    const atividade = item.atividade || "Atividade";
    const codigo = item.codigo || "";
    const chave = `${codigo}|${atividade}`;
    let grupo = grupos.find((atual) => atual.chave === chave);
    if (!grupo) {
      grupo = { chave, codigo, atividade, processos: [] };
      grupos.push(grupo);
    }
    const processo = item.processo || "Sem processo";
    let linha = grupo.processos.find((atual) => atual.processo === processo);
    if (!linha) {
      linha = { processo, chaves: [], marca: item.marca || "", quando: item.quando || "" };
      grupo.processos.push(linha);
    }
    linha.chaves.push(chaveItem);
  }
  return grupos;
}

function FilaInicio({
  api,
  email,
  onPerguntar,
}: {
  api: string;
  email: string;
  onPerguntar: (pergunta: string) => void;
}) {
  const [atividades, setAtividades] = useState<AtividadeFila[] | null>(null);
  const [ocultas, setOcultas] = useState<string[]>([]);

  useEffect(() => {
    try {
      const salvas = JSON.parse(sessionStorage.getItem(`maicon-pendencias:${email}`) || "[]");
      setOcultas(Array.isArray(salvas) ? salvas.map(String) : []);
    } catch {
      setOcultas([]);
    }
  }, [email]);

  useEffect(() => {
    let ativo = true;
    void fetch(`${api}/api/inicio`)
      .then(async (resp) => {
        const dados = (await resp.json()) as { encontrado?: boolean; atividades?: AtividadeFila[] };
        if (ativo && resp.ok && dados.encontrado) setAtividades(Array.isArray(dados.atividades) ? dados.atividades : []);
      })
      .catch(() => {
        if (ativo) setAtividades([]);
      });
    return () => {
      ativo = false;
    };
  }, [api, email]);

  if (!atividades) return null;
  const grupos = agruparFila(atividades, ocultas);
  if (!grupos.length) return null;

  function dispensar(chaves: string[]) {
    setOcultas((atual) => {
      const proximas = [...atual];
      for (const chave of chaves) {
        if (!proximas.includes(chave)) proximas.push(chave);
      }
      sessionStorage.setItem(`maicon-pendencias:${email}`, JSON.stringify(proximas));
      return proximas;
    });
  }

  return (
    <section className="inicio-bloco inicio-fila">
      <header>
        <h3>
          Sua fila
          <em>{grupos.length}</em>
        </h3>
        <button type="button" onClick={() => dispensar(grupos.flatMap((grupo) => grupo.processos.flatMap((linha) => linha.chaves)))}>
          Dispensar
        </button>
      </header>
      <ul>
        {grupos.map((grupo) => (
          <li key={grupo.chave}>
            <strong>
              {grupo.codigo ? <em className="inicio-codigo">{grupo.codigo}</em> : null}
              {grupo.atividade}
            </strong>
            <span className="inicio-fila-processos">
              {grupo.processos.map((linha) => (
                <button
                  key={linha.processo}
                  type="button"
                  onClick={() =>
                    onPerguntar(
                      `Qual o andamento da atividade ${grupo.codigo || grupo.atividade} no processo ${linha.processo === "Sem processo" ? "" : linha.processo}?`,
                    )
                  }
                >
                  {linha.processo}
                  {linha.marca ? (
                    <em className={linha.marca === "Atrasada" ? "atrasada" : linha.marca === "Hoje" ? "hoje" : "sem-previsao"}>
                      {linha.marca}
                      {linha.quando && linha.marca === "Atrasada" ? ` · ${linha.quando}` : ""}
                    </em>
                  ) : null}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MarcarProcesso({ api, onMarcado }: { api: string; onMarcado: (processo: string) => void }) {
  const [numero, setNumero] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function marcar(event: FormEvent) {
    event.preventDefault();
    const processo = numero.trim().toUpperCase();
    if (!/^[A-Z]{1,4}\d{2,6}-\d{2}$/.test(processo)) {
      setErro("Use o número do processo, como IM5223-26.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const resp = await fetch(`${api}/api/favoritos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processo }),
      });
      const texto = await resp.text();
      let dados: { erro?: string } = {};
      try {
        dados = texto ? (JSON.parse(texto) as { erro?: string }) : {};
      } catch {
        dados = {};
      }
      if (!resp.ok) {
        setErro(dados.erro || "Não marquei o processo.");
        return;
      }
      setNumero("");
      onMarcado(processo);
    } catch {
      setErro("Não marquei o processo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="pa-form" onSubmit={(event) => void marcar(event)}>
      <input
        className="pa-input"
        value={numero}
        onChange={(event) => setNumero(event.target.value.toUpperCase())}
        placeholder="IM5328-26"
        aria-label="Número do processo para acompanhar"
      />
      <button className="pa-btn-primary" type="submit" disabled={enviando}>{enviando ? "Acompanhando" : "Acompanhar"}</button>
      {erro ? <small className="pa-erro">{erro}</small> : null}
    </form>
  );
}

function perguntaDoProcesso(numero: string) {
  return `Quais os acompanhamentos do processo ${numero}?`;
}

function perguntaDeTodos(itens: Item[]) {
  const numeros = itens.map((item) => item.processo || item.titulo).filter(Boolean);
  if (numeros.length <= 1) return perguntaDoProcesso(numeros[0] || "");
  const ultimo = numeros[numeros.length - 1];
  const antes = numeros.slice(0, -1).join(", ");
  return `Monte o acompanhamento dos processos ${antes} e ${ultimo}.`;
}

function empresaDoAcompanhado(detalhe: string) {
  return detalhe
    .replace(/\s*·\s*mudou desde ontem/i, "")
    .replace(/\s*·\s*sem novidade desde ontem/i, "")
    .replace(/^acompanhando$/i, "")
    .trim();
}

function ProcessosAcompanhados({
  bloco,
  onPerguntar,
  onMarcado,
  onRemover,
  api,
}: {
  bloco: Bloco;
  onPerguntar: (pergunta: string) => void;
  onMarcado: (processo: string) => void;
  onRemover: (processo: string) => void;
  api: string;
}) {
  const [recolhido, setRecolhido] = useState(true);
  return (
    <section className={`pa-card${recolhido ? " recolhido" : ""}`} aria-label="Processos acompanhados">
      <header className="pa-header">
        <h3 className="pa-title">{bloco.titulo || "Processos acompanhados"}</h3>
        {bloco.itens.length ? <span className="pa-count">{bloco.itens.length}</span> : null}
        <div className="pa-acoes">
          {bloco.itens.length ? (
            <button type="button" className="pa-btn-chat" onClick={() => onPerguntar(perguntaDeTodos(bloco.itens))}>
              Levar ao chat
            </button>
          ) : null}
          <button
            type="button"
            className="pa-recolher"
            aria-expanded={!recolhido}
            aria-label={recolhido ? "Mostrar processos acompanhados" : "Recolher processos acompanhados"}
            onClick={() => setRecolhido((atual) => !atual)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M6 14l6-6 6 6" />
            </svg>
          </button>
        </div>
      </header>
      {recolhido ? null : <MarcarProcesso api={api} onMarcado={onMarcado} />}
      {recolhido || !bloco.vazio ? null : <p className="pa-vazio">{bloco.vazio}</p>}
      {!recolhido && bloco.itens.length ? (
        <ul className="pa-list">
          {bloco.itens.map((item) => {
            const empresa = empresaDoAcompanhado(item.detalhe);
            const mudou = /mudou desde ontem/i.test(item.detalhe);
            return (
              <li key={`${item.processo || item.titulo}-${item.detalhe}`} className="pa-item">
                <button
                  type="button"
                  className="pa-main"
                  onClick={() => onPerguntar(perguntaDoProcesso(item.processo || item.titulo))}
                >
                  <span className="pa-code">{item.titulo}</span>
                  {empresa ? (
                    <span className="pa-company">
                      {empresa}
                      {mudou ? <span className="pa-changed">mudou desde ontem</span> : null}
                    </span>
                  ) : null}
                  {item.texto ? (
                    <span className="pa-note">
                      {item.quando ? <span className="pa-note-quando">{item.quando}</span> : null}
                      <span className="pa-note-texto">{item.texto}</span>
                    </span>
                  ) : null}
                </button>
                <div className="pa-side">
                  <span className="pa-tags">
                    {item.processo ? <span className="pa-tag pa-tag--danger">{item.processo}</span> : null}
                    {item.marca ? <span className="pa-tag">{item.marca}</span> : null}
                  </span>
                  {item.processo ? (
                    <button type="button" className="pa-btn-remove" onClick={() => onRemover(item.processo || "")}>
                      Tirar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function PlacarIa({ itens }: { itens: { visao: string; boas: number; ruins: number }[] }) {
  if (!itens.length) return null;
  return (
    <section className="inicio-bloco inicio-placar">
      <header>
        <h3>Avaliações da semana</h3>
      </header>
      <ul>
        {itens.map((item) => (
          <li key={item.visao}>
            <strong>{item.visao || "geral"}</strong>
            <small>{Number(item.boas) || 0} úteis · {Number(item.ruins) || 0} para corrigir</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InicioPainel({
  api,
  email,
  nome,
  visao,
  mostrarFila = true,
  onPerguntar,
}: {
  api: string;
  email: string;
  nome: string;
  visao: string;
  mostrarFila?: boolean;
  onPerguntar: (pergunta: string) => void;
}) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [ocultos, setOcultos] = useState<string[]>([]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro("");
    void fetch(`${api}/api/inicio/resumo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nome, visao }),
    })
      .then(async (resp) => {
        const dados = (await resp.json()) as Resumo & { erro?: string };
        if (!resp.ok) throw new Error(dados.erro || "Não carregou o início.");
        if (ativo) setResumo(dados);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : "Não carregou o início.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [api, email, nome, visao]);

  const primeiro = nome.trim().split(" ")[0];
  const favoritosBase = resumo?.favoritos ?? { titulo: "Processos acompanhados", itens: [], vazio: "Nenhum processo marcado.", pergunta: "" };
  const jaMarcados = new Set(favoritosBase.itens.map((item) => (item.processo || item.titulo).toUpperCase()));
  const favoritos = {
    ...favoritosBase,
    itens: [
      ...marcados.filter((processo) => !jaMarcados.has(processo)).map((processo) => ({
        titulo: processo,
        detalhe: "acompanhando",
        texto: "",
        processo,
        pergunta: `Quais os acompanhamentos do processo ${processo}?`,
      })),
      ...favoritosBase.itens,
    ].filter((item) => !ocultos.includes((item.processo || item.titulo).toUpperCase())),
    vazio: "",
  };
  if (!favoritos.itens.length) favoritos.vazio = favoritosBase.vazio || "Nenhum processo marcado.";
  const colunas = resumo ? colunasDoInicio(resumo) : null;
  const grupos = resumo && visao === "gerencia" ? gruposDeKpis(resumo.kpis) : null;
  const resultado = grupos?.find((grupo) => grupo.id === "resultado") ?? null;
  const gruposDeCima = grupos?.filter((grupo) => grupo.id !== "resultado") ?? [];
  const resultadoComRanking = Boolean(resultado && resumo?.ranking);

  return (
    <main className="inicio-tela">
      <div className="inicio">
        <header className="inicio-topo">
          <div>
            <h2>{primeiro ? `Olá, ${primeiro}` : "Início"}</h2>
            <p>{carregando ? "Buscando o resumo do seu setor." : resumo?.frase}</p>
          </div>
          {resumo?.rotulo && !carregando ? <span>{resumo.rotulo}</span> : null}
        </header>

        {carregando ? (
          <div className="inicio-carregando">
            <SymbolLoader className="cl-loader--inline" label="Carregando os indicadores" />
          </div>
        ) : null}
        {erro && !carregando ? <p className="chat-erro">{erro}</p> : null}

        {!carregando && resumo?.kpis ? (
          <div className="inicio-conteudo">
            {mostrarFila ? <FilaInicio api={api} email={email} onPerguntar={onPerguntar} /> : null}
            <ProcessosAcompanhados
              api={api}
              bloco={favoritos}
              onPerguntar={onPerguntar}
              onMarcado={(processo) => {
                const alvo = processo.toUpperCase();
                setOcultos((atual) => atual.filter((item) => item !== alvo));
                setMarcados((atual) => atual.includes(alvo) ? atual : [alvo, ...atual]);
              }}
              onRemover={(processo) => {
                const alvo = processo.toUpperCase();
                setOcultos((atual) => atual.includes(alvo) ? atual : [...atual, alvo]);
                setMarcados((atual) => atual.filter((item) => item.toUpperCase() !== alvo));
                void fetch(`${api}/api/favoritos`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ processo: alvo }),
                });
              }}
            />
            {(visao === "ti" || visao === "gerencia") && resumo.placar?.length ? <PlacarIa itens={resumo.placar} /> : null}
            {grupos ? (
              <>
                <section className={`inicio-grupos${resultado ? " dupla" : ""}`} aria-label="Indicadores">
                  {(resultado ? gruposDeCima : grupos).map((grupo) => (
                    <CartaoGrupo key={grupo.id} grupo={grupo} />
                  ))}
                </section>
                {resultadoComRanking && resultado && resumo.ranking ? (
                  <section className="inicio-conjunto" aria-label="Resultado e vendedores">
                    <CartaoGrupo grupo={resultado} />
                    <RankingFechamentos ranking={resumo.ranking} />
                  </section>
                ) : resultado ? (
                  <CartaoGrupo grupo={resultado} />
                ) : null}
              </>
            ) : (
              <section className="inicio-kpis" aria-label="Indicadores">
                {resumo.kpis.map((item) => (
                  <article key={item.rotulo} className={`inicio-kpi${item.atencao ? " atencao" : ""}${item.tom ? ` ${item.tom}` : ""}`}>
                    <span>{item.rotulo}</span>
                    <strong>{item.valor}</strong>
                    <small>{item.detalhe}</small>
                  </article>
                ))}
              </section>
            )}
            {resumo.ranking && !resultadoComRanking ? <RankingFechamentos ranking={resumo.ranking} /> : null}
            {visao !== "comercial" && visao !== "inside" && visao !== "financeiro" && resumo.relacionamento?.length ? (
              <Encartes itens={resumo.relacionamento} onPerguntar={onPerguntar} />
            ) : null}
            <div className={`inicio-grade${colunas?.equilibrada ? " equilibrada" : ""}`}>
              <div className="inicio-coluna">
                {colunas?.esquerda.map((bloco) => (
                  <Lista key={bloco.titulo} bloco={bloco} onPerguntar={onPerguntar} />
                ))}
              </div>
              {colunas?.direita.length ? (
                <div className="inicio-coluna">
                  {colunas.direita.map((bloco) => (
                    <Lista key={bloco.titulo} bloco={bloco} onPerguntar={onPerguntar} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
