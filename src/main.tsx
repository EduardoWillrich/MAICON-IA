import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { instalarTokenNaApi } from "./comToken";
import { TelaIa } from "./TelaIa";
import { ErrorBoundary } from "./ErrorBoundary";
import { Login } from "./Login";
import { SymbolLoader } from "./Loader";
import { lerSessao, lerUsuario, limparUsuario, marcarSaida, type UsuarioGoogle } from "./sessao";
import { tentarLoginAutomatico } from "./tokenGmail";
import "./estilos/tela.css";
import "./estilos/pdf.css";
import "./estilos/chat.css";
import "./estilos/ia.css";
import "./estilos/login.css";

instalarTokenNaApi();

const temaSalvo = localStorage.getItem("maicon-tema");
const temaClaro = temaSalvo ? temaSalvo === "claro" : window.matchMedia("(prefers-color-scheme: light)").matches;
document.documentElement.classList.add(temaClaro ? "tema-claro" : "tema-escuro");

function Raiz() {
  const [usuario, setUsuario] = useState<UsuarioGoogle | null>(() => lerUsuario());
  const [pronto, setPronto] = useState(() => Boolean(lerUsuario()));

  useEffect(() => {
    if (usuario) return;
    let ativo = true;
    void tentarLoginAutomatico().then((conta) => {
      if (!ativo) return;
      if (conta) setUsuario(conta);
      setPronto(true);
    });
    return () => {
      ativo = false;
    };
  }, [usuario]);

  if (!usuario && !pronto) {
    return (
      <main className="login">
        <SymbolLoader className="cl-loader--inline" label="Entrando" />
      </main>
    );
  }
  if (!usuario) return <Login onEntrar={setUsuario} />;
  return (
    <TelaIa
      usuario={usuario}
      onSair={() => {
        const sessao = lerSessao();
        if (sessao) {
          void fetch("/api/sessao", { method: "DELETE", headers: { Authorization: `Bearer ${sessao}` } });
        }
        marcarSaida();
        limparUsuario();
        setUsuario(null);
        setPronto(true);
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Raiz />
    </ErrorBoundary>
  </StrictMode>,
);
