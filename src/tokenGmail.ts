import { gravarTokenGmail, lerTokenGmail, lerUsuario, tokenGmailExpira, type UsuarioGoogle } from "./sessao";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const ESCOPO = "openid email profile https://www.googleapis.com/auth/gmail.readonly";

type TokenClient = {
  requestAccessToken: (opcoes?: { prompt?: string }) => void;
};

type ErroGoogle = { type?: string; message?: string };

type TokenResp = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
};

function googleOAuth():
  | { initTokenClient: (cfg: {
      client_id: string;
      scope: string;
      callback: (resp: TokenResp) => void;
      error_callback?: (erro: ErroGoogle) => void;
    }) => TokenClient }
  | undefined {
  return (window as unknown as {
    google?: { accounts?: { oauth2?: { initTokenClient: (cfg: {
      client_id: string;
      scope: string;
      callback: (resp: TokenResp) => void;
      error_callback?: (erro: ErroGoogle) => void;
    }) => TokenClient } } };
  }).google?.accounts?.oauth2;
}

function carregarScript(): Promise<void> {
  if (googleOAuth()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let encerrado = false;
    let timer = 0;
    const falhar = () => {
      if (encerrado) return;
      encerrado = true;
      window.clearInterval(timer);
      reject(new Error("Não foi possível carregar o login do Google."));
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-google-gsi="1"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.dataset.googleGsi = "1";
      script.addEventListener("error", falhar, { once: true });
      document.head.appendChild(script);
    }
    const inicio = Date.now();
    timer = window.setInterval(() => {
      if (googleOAuth()) {
        if (encerrado) return;
        encerrado = true;
        window.clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - inicio > 8000) falhar();
    }, 50);
  });
}

let cliente: TokenClient | null = null;
let aoToken: (resp: TokenResp) => void = () => {};
let aoErro: (erro: ErroGoogle) => void = () => {};

async function clientePronto() {
  if (!CLIENT_ID) return null;
  await carregarScript();
  const oauth = googleOAuth();
  if (!oauth) return null;
  if (!cliente) {
    cliente = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: ESCOPO,
      callback: (resp) => aoToken(resp),
      error_callback: (erro) => aoErro(erro),
    });
  }
  return cliente;
}

export function prepararLoginGoogle() {
  return clientePronto().then((pronto) => {
    if (!pronto) throw new Error("O login do Google ainda não está disponível.");
  });
}

export function pedirTokenGmail(prompt?: "consent"): Promise<TokenResp> {
  if (!cliente) return Promise.reject(new Error("O login do Google ainda não está disponível."));
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => resolve({ error: "timeout" }), 120000);
    const concluir = (resp: TokenResp) => {
      window.clearTimeout(timer);
      resolve(resp);
    };
    aoToken = concluir;
    aoErro = (erro) => concluir({ error: erro.type || erro.message || "popup_closed" });
    try {
      if (prompt) cliente?.requestAccessToken({ prompt });
      else cliente?.requestAccessToken();
    } catch (erro) {
      window.clearTimeout(timer);
      reject(erro instanceof Error ? erro : new Error("Falha ao falar com o Google."));
    }
  });
}

let renovacao: Promise<string> | null = null;
let avisoRenovacao = 0;

function agendarRenovacao(expiraEm: number) {
  window.clearTimeout(avisoRenovacao);
  const espera = Math.max(60_000, expiraEm - Date.now() - 5 * 60_000);
  avisoRenovacao = window.setTimeout(() => {
    void renovarTokenGmail(true);
  }, espera);
}

async function renovarDeVerdade() {
  await prepararLoginGoogle();
  const resp = await pedirTokenGmail();
  if (!resp.access_token) {
    const atual = lerTokenGmail();
    if (atual && resp.error !== "access_denied") return atual;
    throw new Error(resp.error || "Não foi possível renovar o Gmail.");
  }
  const segundos = Number(resp.expires_in) || 3600;
  const expiraEm = Date.now() + segundos * 1000;
  gravarTokenGmail(resp.access_token, expiraEm);
  agendarRenovacao(expiraEm);
  return resp.access_token;
}

export function renovarTokenGmail(forcar = false): Promise<string> {
  const atual = lerTokenGmail();
  const expira = tokenGmailExpira();
  if (!forcar && atual && expira - Date.now() > 2 * 60_000) {
    agendarRenovacao(expira);
    return Promise.resolve(atual);
  }
  if (!renovacao) {
    renovacao = renovarDeVerdade().finally(() => {
      renovacao = null;
    });
  }
  return renovacao;
}

export function tentarLoginAutomatico(): Promise<UsuarioGoogle | null> {
  return Promise.resolve(lerUsuario());
}
