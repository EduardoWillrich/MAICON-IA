import { useEffect, useState } from "react";
import { OPCOES_PDF_PADRAO, type OpcoesPdf } from "./PdfHistorico";

const TIPOS_PDF = [
  { valor: 1, rotulo: "Inclusão" },
  { valor: 3, rotulo: "Atualização" },
  { valor: 2, rotulo: "Exclusão" },
];

function alternar<T>(lista: T[], item: T): T[] {
  return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
}

export function OpcoesPdfModal({
  aberto,
  usuarios,
  campos,
  onFechar,
  onGerar,
}: {
  aberto: boolean;
  usuarios: string[];
  campos: { nome: string; rotulo: string }[];
  onFechar: () => void;
  onGerar: (opcoes: OpcoesPdf) => void;
}) {
  const [completo, setCompleto] = useState(false);
  const [secoes, setSecoes] = useState({ indicadores: true, resumo: true, linhaDoTempo: true });
  const [tipos, setTipos] = useState<number[]>(OPCOES_PDF_PADRAO.tipos);
  const [usuariosSel, setUsuariosSel] = useState<string[]>(usuarios);
  const [camposSel, setCamposSel] = useState<string[]>(campos.map((c) => c.nome));

  useEffect(() => {
    if (!aberto) return;
    setUsuariosSel(usuarios);
    setCamposSel(campos.map((c) => c.nome));
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, usuarios, campos, onFechar]);

  if (!aberto) return null;

  const nadaSelecionado =
    !Object.values(secoes).some(Boolean) || !tipos.length || !usuariosSel.length || !camposSel.length;

  function gerar() {
    onGerar({
      completo,
      ...secoes,
      tipos,
      usuarios: usuariosSel.length === usuarios.length ? null : usuariosSel,
      campos: camposSel.length === campos.length ? null : camposSel,
    });
  }

  return (
    <div className="chat-fundo nao-imprimir" onClick={onFechar}>
      <div className="pdf-modal" role="dialog" aria-label="Opções do PDF" onClick={(e) => e.stopPropagation()}>
        <header className="chat-cab">
          <div>
            <strong>Gerar PDF</strong>
            <span>Escolha o que vai no documento.</span>
          </div>
          <button type="button" className="ghost pequeno" onClick={onFechar}>
            Fechar
          </button>
        </header>

        <div className="pdf-modal-corpo">
          <fieldset>
            <legend>Conteúdo</legend>
            <div className="segmento" role="tablist">
              <button type="button" className={!completo ? "ativo" : ""} onClick={() => setCompleto(false)}>
                Resumido
              </button>
              <button type="button" className={completo ? "ativo" : ""} onClick={() => setCompleto(true)}>
                Completo
              </button>
            </div>
            <p className="dica">
              {completo
                ? "Todos os campos de cada evento, inclusive os técnicos."
                : "Só os campos principais, até 6 na inclusão e 8 por alteração."}
            </p>
          </fieldset>

          <fieldset>
            <legend>Seções</legend>
            {(
              [
                ["indicadores", "Indicadores"],
                ["resumo", "Resumo"],
                ["linhaDoTempo", "Linha do tempo"],
              ] as const
            ).map(([chave, rotulo]) => (
              <label key={chave} className="pdf-check">
                <input
                  type="checkbox"
                  checked={secoes[chave]}
                  onChange={() => setSecoes((s) => ({ ...s, [chave]: !s[chave] }))}
                />
                {rotulo}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Tipo de operação</legend>
            {TIPOS_PDF.map((t) => (
              <label key={t.valor} className="pdf-check">
                <input type="checkbox" checked={tipos.includes(t.valor)} onChange={() => setTipos((l) => alternar(l, t.valor))} />
                {t.rotulo}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>
              Quem fez
              <button type="button" className="link" onClick={() => setUsuariosSel(usuarios)}>todos</button>
              <button type="button" className="link" onClick={() => setUsuariosSel([])}>nenhum</button>
            </legend>
            {usuarios.map((u) => (
              <label key={u} className="pdf-check">
                <input type="checkbox" checked={usuariosSel.includes(u)} onChange={() => setUsuariosSel((l) => alternar(l, u))} />
                {u}
              </label>
            ))}
          </fieldset>

          <fieldset className="pdf-modal-campos">
            <legend>
              Campos ({camposSel.length} de {campos.length})
              <button type="button" className="link" onClick={() => setCamposSel(campos.map((c) => c.nome))}>todos</button>
              <button type="button" className="link" onClick={() => setCamposSel([])}>nenhum</button>
            </legend>
            <div className="pdf-modal-grade">
              {campos.map((c) => (
                <label key={c.nome} className="pdf-check">
                  <input
                    type="checkbox"
                    checked={camposSel.includes(c.nome)}
                    onChange={() => setCamposSel((l) => alternar(l, c.nome))}
                  />
                  {c.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="pdf-modal-rodape">
          {nadaSelecionado ? <span className="dica">Selecione pelo menos um item em cada grupo.</span> : <span />}
          <button type="button" className="btn-aplicar" disabled={nadaSelecionado} onClick={gerar}>
            Gerar PDF
          </button>
        </footer>
      </div>
    </div>
  );
}
