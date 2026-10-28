import { useEffect, useState } from "react";
import logo from "./assets/maicon-logo.png";
import { gravarTokenGmail, gravarUsuario, gmailJaConcedido, limparSaida, type UsuarioGoogle } from "./sessao";
import { pedirTokenGmail, prepararLoginGoogle } from "./tokenGmail";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function Login({ onEntrar }: { onEntrar: (usuario: UsuarioGoogle) => void }) {
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let ativo = true;
    void prepararLoginGoogle()
      .then(() => {
        if (ativo) setPronto(true);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        setPronto(false);
        setErro(e instanceof Error ? e.message : "Não foi possível carregar o login do Google.");
      });
    return () => {
      ativo = false;
    };
  }, []);

  function mensagemGoogle(erro: string) {
    if (erro === "popup_closed" || erro === "popup_closed_by_user") {
      return "A janela do Google fechou antes de concluir. Clique outra vez e escolha a conta.";
    }
    if (erro === "popup_failed_to_open") {
      return "O navegador bloqueou a janela do Google. Permita pop-ups deste site e tente de novo.";
    }
    if (erro === "access_denied") return "O Google não autorizou o acesso.";
    if (erro === "timeout") return "O Google não respondeu. Tente outra vez.";
    return "O Google não confirmou a conta.";
  }

  function entrar() {
    if (!CLIENT_ID || !pronto || entrando) return;
    setErro("");
    setEntrando(true);
    limparSaida();
    const pedido = pedirTokenGmail(gmailJaConcedido() ? undefined : "consent");
    void pedido
      .then(async (resp) => {
        if (!resp.access_token) throw new Error(mensagemGoogle(String(resp.error ?? "")));
        const escopo = String(resp.scope ?? "");
        if (escopo && !escopo.includes("gmail.readonly")) {
          throw new Error("A conta entrou, mas o Google não liberou a leitura do Gmail. Entre de novo e marque o acesso aos e-mails.");
        }
        const perfil = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${resp.access_token}` },
        });
        const dados = (await perfil.json()) as { email?: string; name?: string; picture?: string };
        if (!perfil.ok || !dados.email) throw new Error("Não foi possível ler a conta Google.");
        const usuario = { email: dados.email, nome: dados.name || dados.email, foto: dados.picture || "" };
        const segundos = Number(resp.expires_in) || 3600;
        gravarUsuario(usuario);
        gravarTokenGmail(resp.access_token, Date.now() + segundos * 1000);
        onEntrar(usuario);
      })
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : "Falha ao entrar com Google.");
      })
      .finally(() => setEntrando(false));
  }

  return (
    <main className="login">
      <section className="login-card">
        <div className="login-marca">
          <img className="login-logo" src={logo} alt="" />
        </div>
        <p className="login-kicker">Conline</p>
        <h1>Maicon AI</h1>
        <p className="login-texto">Entre com a conta Google para continuar.</p>
        {CLIENT_ID ? (
          <div className="login-anel">
            <span className="login-trilha" aria-hidden="true" />
            <button className="login-google" type="button" onClick={entrar} disabled={!pronto || entrando}>
              <svg className="login-g" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l6.2 5.2C37.4 38.4 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              <span>{entrando ? "Abrindo o Google…" : "Continuar com o Google"}</span>
            </button>
          </div>
        ) : (
          <p className="login-aviso">
            Defina <code>VITE_GOOGLE_CLIENT_ID</code> no arquivo <code>.env</code> e reinicie o Vite para habilitar o botão do Google.
          </p>
        )}
        {erro ? <p className="login-erro" role="alert">{erro}</p> : null}
      </section>
    </main>
  );
}
