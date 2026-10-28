import { gravarSessao, lerSessao, lerTokenGmail } from "./sessao";

const original = window.fetch.bind(window);

function urlDe(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function daApi(url: string) {
  try {
    const absoluta = new URL(url, window.location.origin);
    return absoluta.origin === window.location.origin && absoluta.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

export function instalarTokenNaApi() {
  const marca = "__maiconTokenApi";
  if ((window as unknown as Record<string, boolean>)[marca]) return;
  (window as unknown as Record<string, boolean>)[marca] = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlDe(input);
    if (!daApi(url)) return original(input, init);
    const token = lerSessao() || lerTokenGmail();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const resp = await original(input, { ...init, headers });
    const sessao = resp.headers.get("X-Sessao");
    if (sessao) gravarSessao(sessao);
    return resp;
  };
}
