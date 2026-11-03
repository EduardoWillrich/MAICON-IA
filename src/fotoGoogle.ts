function ampliar(url: string) {
  return url.replace(/=s\d+(-c)?(?=$|[?#])/, "=s256-c");
}

const cache = new Map<string, Promise<string>>();

export async function fotoDoToken(token: string) {
  const acesso = token.trim();
  if (!acesso) return "";
  const chave = acesso.slice(-16);
  const salva = cache.get(chave);
  if (salva) return salva;
  const pedido = buscarFoto(acesso);
  cache.set(chave, pedido);
  return pedido;
}

async function buscarFoto(acesso: string) {
  try {
    const resp = await fetch("https://people.googleapis.com/v1/people/me?personFields=photos", {
      headers: { Authorization: `Bearer ${acesso}` },
    });
    const dados = (await resp.json().catch(() => ({}))) as { photos?: { url?: string; default?: boolean }[] };
    if (!resp.ok) return "";
    const fotos = Array.isArray(dados.photos) ? dados.photos : [];
    const real = fotos.find((item) => item?.url && item.default === false);
    return real?.url ? ampliar(real.url) : "";
  } catch {
    return "";
  }
}
