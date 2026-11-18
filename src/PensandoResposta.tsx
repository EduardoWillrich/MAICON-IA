import simboloMaicon from "./assets/maicon-symbol-white.png";
import { memo, type CSSProperties } from "react";

export const PensandoResposta = memo(function PensandoResposta({ status }: { status: string }) {
  return <div className="chat-pensando-resposta" role="status" aria-live="polite" aria-atomic="true" aria-label={status}>
    <span className="pensando-simbolo" aria-hidden="true" style={{ "--pensando-logo": `url(${simboloMaicon})` } as CSSProperties}>
      <img src={simboloMaicon} alt="" /><span className="pensando-brilho"><i /></span>
    </span>
    <span className="pensando-texto" aria-hidden="true">{status.replace(/[.…]+$/u, "")}</span>
    <span className="pensando-pontos" aria-hidden="true"><i /><i /><i /></span>
  </div>;
});
