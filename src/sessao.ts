export type UsuarioGoogle = {
  email: string;
  nome: string;
  foto: string;
};

const CHAVE = "consulta-log-usuario";
const CHAVE_GMAIL = "consulta-log-gmail";
const CHAVE_GMAIL_EXPIRA = "consulta-log-gmail-expira";
const CHAVE_GMAIL_OK = "consulta-log-gmail-ok";
const CHAVE_SAIU = "consulta-log-saiu";
const CHAVE_SESSAO = "consulta-log-sessao";

function lerChave(chave: string) {
  const daAba = sessionStorage.getItem(chave);
  if (daAba) return daAba;
  if (sessionStorage.getItem(CHAVE)) return "";
  return localStorage.getItem(chave) || "";
}

function gravarChave(chave: string, valor: string) {
  localStorage.setItem(chave, valor);
  sessionStorage.setItem(chave, valor);
}

function apagarChave(chave: string) {
  localStorage.removeItem(chave);
  sessionStorage.removeItem(chave);
}

export function lerUsuario(): UsuarioGoogle | null {
  try {
    const bruto = lerChave(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as UsuarioGoogle;
    if (!dados?.email) return null;
    const usuario = { email: dados.email, nome: dados.nome || dados.email, foto: dados.foto || "" };
    gravarChave(CHAVE, JSON.stringify(usuario));
    localStorage.setItem(CHAVE_GMAIL_OK, "1");
    return usuario;
  } catch {
    return null;
  }
}

export function gravarUsuario(usuario: UsuarioGoogle) {
  gravarChave(CHAVE, JSON.stringify(usuario));
}

export function limparUsuario() {
  apagarChave(CHAVE);
  apagarChave(CHAVE_GMAIL);
  apagarChave(CHAVE_GMAIL_EXPIRA);
  apagarChave(CHAVE_SESSAO);
}

export function lerSessao() {
  return lerChave(CHAVE_SESSAO);
}

export function gravarSessao(sessao: string) {
  if (!sessao.startsWith("maicon.")) return;
  gravarChave(CHAVE_SESSAO, sessao);
}

export function gmailJaConcedido() {
  return localStorage.getItem(CHAVE_GMAIL_OK) === "1";
}

export function marcarSaida() {
  sessionStorage.setItem(CHAVE_SAIU, "1");
}

export function limparSaida() {
  sessionStorage.removeItem(CHAVE_SAIU);
}

export function saiuNestaAba() {
  return sessionStorage.getItem(CHAVE_SAIU) === "1";
}

export function gravarTokenGmail(token: string, expiraEm?: number) {
  if (!token) return;
  gravarChave(CHAVE_GMAIL, token);
  const expira = expiraEm && expiraEm > Date.now() ? expiraEm : Date.now() + 55 * 60 * 1000;
  gravarChave(CHAVE_GMAIL_EXPIRA, String(expira));
  localStorage.setItem(CHAVE_GMAIL_OK, "1");
}

export function lerTokenGmail() {
  return lerChave(CHAVE_GMAIL);
}

export function tokenGmailExpira() {
  return Number(lerChave(CHAVE_GMAIL_EXPIRA) || 0);
}

/** Lê o payload do JWT do Google só para mostrar nome e e-mail na sessão. */
export function perfilDoToken(token: string): UsuarioGoogle {
  const parte = token.split(".")[1];
  if (!parte) throw new Error("Resposta do Google sem dados da conta.");
  const json = atob(parte.replace(/-/g, "+").replace(/_/g, "/"));
  const dados = JSON.parse(json) as { email?: string; name?: string; picture?: string };
  if (!dados.email) throw new Error("A conta Google não retornou e-mail.");
  return { email: dados.email, nome: dados.name || dados.email, foto: dados.picture || "" };
}
