import logo from "./assets/logo-branca.png";
import { formatarDataHora } from "./datas";
import { VAZIO } from "./legendas";
import { acoesDoEvento, fraseResumo, nomeProprio, rotuloCampo, type AcaoCampo } from "./relatorio";
import { rotuloTipo, type EventoLog } from "./types";

const MAX_CAMPOS_INCLUSAO = 6;
const MAX_CAMPOS_ALTERACAO = 8;

const CAMPOS_OCULTOS = new Set([
  "Numero_Processo",
  "IdLogistica_House",
  "IdLogistica_Master",
  "IdProjeto_Atividade",
  "Data_Alteracao",
]);

const PRIORIDADE_INCLUSAO = [
  "IdAtividade",
  "IdTarefa",
  "Situacao",
  "IdResponsavel",
  "Previsao_Inicio",
  "Previsao_Termino",
  "Prioridade",
];

type Bloco = {
  chave: string;
  data: string;
  usuario: string;
  tipo: number;
  acoes: AcaoCampo[];
};

function tecnico(acao: AcaoCampo): boolean {
  if (CAMPOS_OCULTOS.has(acao.nome)) return true;
  const soNumero = (v: string) => v === VAZIO || /^-?\d+$/.test(v);
  return /^Id[A-Z_]/.test(acao.nome) && soNumero(acao.antes) && soNumero(acao.depois);
}

function dataEvento(e: EventoLog) {
  return e.data || e.dataInicioTransacao || e.dataTerminoTransacao;
}

function partes(iso: string) {
  const completo = formatarDataHora(iso);
  const [dia = "—", hora = ""] = completo.split(" ");
  return { dia, hora: hora.slice(0, 5) };
}

function ordenarInclusao(acoes: AcaoCampo[]) {
  const peso = (n: string) => {
    const i = PRIORIDADE_INCLUSAO.indexOf(n);
    return i < 0 ? 99 : i;
  };
  return [...acoes].sort((a, b) => peso(a.nome) - peso(b.nome));
}

export type LogPdf = {
  eventos: EventoLog[];
  titulo: string;
  periodo: string;
};

export type OpcoesPdf = {
  completo: boolean;
  indicadores: boolean;
  resumo: boolean;
  linhaDoTempo: boolean;
  usuarios: string[] | null;
  tipos: number[];
  campos: string[] | null;
};

export const OPCOES_PDF_PADRAO: OpcoesPdf = {
  completo: false,
  indicadores: true,
  resumo: true,
  linhaDoTempo: true,
  usuarios: null,
  tipos: [1, 2, 3],
  campos: null,
};

export function eventosDoPdf(eventos: EventoLog[], opcoes: OpcoesPdf): EventoLog[] {
  return eventos.filter(
    (e) =>
      opcoes.tipos.includes(e.tipo) &&
      (!opcoes.usuarios || opcoes.usuarios.includes(e.usuario?.trim() ?? "")),
  );
}

function montarBlocos(eventos: EventoLog[], opcoes: OpcoesPdf): Bloco[] {
  const ordenados = [...eventos].sort(
    (a, b) => new Date(dataEvento(a)).getTime() - new Date(dataEvento(b)).getTime(),
  );
  const blocos: Bloco[] = [];
  for (const e of ordenados) {
    const acoes = acoesDoEvento(e).filter(
      (a) => (opcoes.completo || !tecnico(a)) && (!opcoes.campos || opcoes.campos.includes(a.nome)),
    );
    if (!acoes.length && (e.tipo === 3 || opcoes.campos)) continue;
    const { dia, hora } = partes(dataEvento(e));
    const chave = `${dia} ${hora}|${e.usuario}|${e.tipo}`;
    const anterior = blocos[blocos.length - 1];
    if (anterior?.chave === chave) {
      for (const a of acoes) {
        const igual = anterior.acoes.findIndex((x) => x.nome === a.nome);
        if (igual >= 0) anterior.acoes[igual] = { ...anterior.acoes[igual], depois: a.depois };
        else anterior.acoes.push(a);
      }
      continue;
    }
    blocos.push({ chave, data: dataEvento(e), usuario: e.usuario, tipo: e.tipo, acoes });
  }
  return blocos;
}

function situacaoFinal(eventos: EventoLog[]): string {
  const ordenados = [...eventos].sort(
    (a, b) => new Date(dataEvento(b)).getTime() - new Date(dataEvento(a)).getTime(),
  );
  for (const e of ordenados) {
    const s = acoesDoEvento(e).find((a) => a.nome === "Situacao");
    if (s && s.depois !== VAZIO) return s.depois;
  }
  return "";
}

export function PdfHistorico({
  eventos,
  titulo,
  periodo,
  opcoes,
}: {
  eventos: EventoLog[];
  titulo: string;
  periodo: string;
  opcoes: OpcoesPdf;
}) {
  const blocos = montarBlocos(eventos, opcoes);
  const usuarios = [...new Set(eventos.map((e) => nomeProprio(e.usuario)))];
  const situacao = situacaoFinal(eventos);
  const ultima = blocos[blocos.length - 1];
  const geradoEm = formatarDataHora(new Date().toISOString()).slice(0, 16);

  let diaAtual = "";

  return (
    <table className="pdf-doc so-imprimir">
      <thead>
        <tr>
          <td className="pdf-espaco" />
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td className="pdf-espaco" />
        </tr>
      </tfoot>
      <tbody>
        <tr>
          <td className="pdf-conteudo">
      <header className="pdf-topo">
        <div>
          <p className="pdf-marca">Histórico de alterações</p>
          <h1>{titulo}</h1>
        </div>
        <div className="pdf-topo-dir">
          <img className="pdf-logo" src={logo} alt="" />
          <div className="pdf-topo-meta">
            <span>Período</span>
            <strong>{periodo}</strong>
            <span>Emitido em</span>
            <strong>{geradoEm}</strong>
          </div>
        </div>
      </header>

      {opcoes.indicadores ? (
      <section className="pdf-indicadores">
        <div>
          <span>Alterações</span>
          <strong>{blocos.length}</strong>
        </div>
        <div>
          <span>Pessoas envolvidas</span>
          <strong>{usuarios.length}</strong>
        </div>
        <div>
          <span>Última alteração</span>
          <strong>{ultima ? partes(ultima.data).dia : "—"}</strong>
        </div>
        {situacao ? (
          <div className="pdf-destaque">
            <span>Situação atual</span>
            <strong>{situacao}</strong>
          </div>
        ) : null}
      </section>
      ) : null}

      {opcoes.resumo ? (
      <section className="pdf-resumo">
        <h2>Resumo</h2>
        <p>{fraseResumo(eventos)}</p>
        <p className="pdf-pessoas">
          <span>Quem alterou:</span> {usuarios.join(", ")}
        </p>
      </section>
      ) : null}

      {opcoes.linhaDoTempo ? (
      <section>
        <h2>Linha do tempo</h2>
        {blocos.length === 0 ? <p className="pdf-mais">Nenhuma alteração com os filtros escolhidos.</p> : null}
        <ol className="pdf-linha">
          {blocos.map((b) => {
            const { dia, hora } = partes(b.data);
            const mostrarDia = dia !== diaAtual;
            diaAtual = dia;
            const limite = opcoes.completo
              ? Infinity
              : b.tipo === 1
                ? MAX_CAMPOS_INCLUSAO
                : MAX_CAMPOS_ALTERACAO;
            const lista = b.tipo === 1 ? ordenarInclusao(b.acoes) : b.acoes;
            const visiveis = lista.slice(0, limite);
            const resto = lista.length - visiveis.length;
            return (
              <li key={b.chave} className={`pdf-evento pdf-tipo-${b.tipo}`}>
                {mostrarDia ? (
                  <p className="pdf-dia">
                    <span>{dia}</span>
                  </p>
                ) : null}
                <div className="pdf-evento-cab">
                  <span className="pdf-hora">{hora}</span>
                  <strong>{nomeProprio(b.usuario)}</strong>
                  <span className="pdf-selo">{rotuloTipo(b.tipo)}</span>
                </div>
                {visiveis.length ? (
                  <table className="pdf-campos">
                    <tbody>
                      {visiveis.map((a, i) => (
                        <tr key={`${a.nome}-${i}`}>
                          <th>{rotuloCampo(a.nome)}</th>
                          <td>
                            {b.tipo === 3 ? (
                              <>
                                <span className="pdf-antes">{a.antes}</span>
                                <span className="pdf-seta">→</span>
                              </>
                            ) : null}
                            <span className="pdf-depois">{b.tipo === 2 ? a.antes : a.depois}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {resto > 0 ? (
                  <p className="pdf-mais">
                    + {resto} outro{resto === 1 ? "" : "s"} campo{resto === 1 ? "" : "s"}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
      ) : null}

      <footer className="pdf-rodape">
        Documento gerado automaticamente a partir do log do sistema · {geradoEm}
      </footer>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
