import { useEffect, useState, type CSSProperties } from "react";
import { SymbolLoader } from "./Loader";

type Item = { titulo: string; detalhe: string; texto?: string; marca?: string; processo?: string; pergunta?: string; partes?: { texto: string; tom: string }[] };
type Bloco = { titulo: string; itens: Item[]; vazio: string; pergunta?: string };
type Ranking = { titulo: string; detalhe: string; vazio: string; itens: { nome: string; qtd: number }[] };
type Resumo = {
  rotulo: string;
  frase: string;
  kpis: { rotulo: string; valor: string; detalhe: string; atencao?: boolean; tom?: string }[];
  principal: Bloco;
  aviso?: Bloco | null;
  secundarios: Bloco[];
  ranking?: Ranking | null;
};

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
  const colunas = resumo ? colunasDoInicio(resumo) : null;

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
            <section className="inicio-kpis" aria-label="Indicadores">
              {resumo.kpis.map((item) => (
                <article key={item.rotulo} className={`inicio-kpi${item.atencao ? " atencao" : ""}${item.tom ? ` ${item.tom}` : ""}`}>
                  <span>{item.rotulo}</span>
                  <strong>{item.valor}</strong>
                  <small>{item.detalhe}</small>
                </article>
              ))}
            </section>
            {resumo.ranking ? <RankingFechamentos ranking={resumo.ranking} /> : null}
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
