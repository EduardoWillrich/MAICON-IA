import type { CSSProperties } from "react";
import symbolSrc from "./assets/maicon-logo.png";
import "./Loader.css";

type CSSVars = CSSProperties & Record<`--${string}`, string>;

interface LoaderProps {
  /** true = ocupa só o container pai (position: absolute) em vez da tela toda */
  contained?: boolean;
  label?: string;
  className?: string;
}

/** Modelo 1 – somente o símbolo, com brilho percorrendo a forma */
export const SymbolLoader = ({ contained, label = "Carregando", className = "" }: LoaderProps) => (
  <div
    className={`cl-loader ${contained ? "cl-loader--contained" : ""} ${className}`.trim()}
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <div className="cl-symbol" style={{ "--cl-symbol-url": `url(${symbolSrc})` } as CSSVars}>
      <img className="cl-symbol__base" src={symbolSrc} alt="" />
      <span className="cl-symbol__shine" aria-hidden="true" />
    </div>
  </div>
);
