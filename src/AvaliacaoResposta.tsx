import { memo, useState } from "react";

type Props = { pergunta: string; resposta: string; visao: string };

function enviar(dados: Props & { nota: 1 | -1; comentario?: string }) {
  return fetch("/api/avaliacao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  }).catch(() => {});
}

export const AvaliacaoResposta = memo(function AvaliacaoResposta({ pergunta, resposta, visao }: Props) {
  const [nota, setNota] = useState<1 | -1 | 0>(0);
  const [aberta, setAberta] = useState(false);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);

  if (!pergunta.trim()) return null;
  if (enviado) return <span className="chat-avaliacao-ok">Obrigado, a IA vai levar isso em conta.</span>;

  return (
    <span className="chat-avaliacao">
      <button
        type="button"
        className={nota === 1 ? "ativo" : ""}
        title="Resposta boa"
        aria-label="Resposta boa"
        onClick={() => {
          setNota(1);
          setAberta(false);
          void enviar({ pergunta, resposta, visao, nota: 1 });
          setEnviado(true);
        }}
      >
        👍
      </button>
      <button
        type="button"
        className={nota === -1 ? "ativo" : ""}
        title="Resposta errada"
        aria-label="Resposta errada"
        onClick={() => {
          setNota(-1);
          setAberta(true);
        }}
      >
        👎
      </button>
      {aberta ? (
        <form
          className="chat-avaliacao-form"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar({ pergunta, resposta, visao, nota: -1, comentario });
            setEnviado(true);
          }}
        >
          <input
            autoFocus
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="O que estava errado? Ex.: era o consignatário, não o cliente"
            maxLength={400}
          />
          <button type="submit">Enviar</button>
        </form>
      ) : null}
    </span>
  );
});
