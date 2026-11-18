import { appSessions } from './centralSessions.js';
import { randomBytes, createHash } from "node:crypto";
import { fotoDaConta, registrarConta } from "./acesso.js";
import { abrirSqlite } from "./sqlite.js";
import { criarSessaoAssinada, lerSessaoAssinada } from "./sessaoAssinada.js";

const db = abrirSqlite("sessoes.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS sessoes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    google TEXT NOT NULL DEFAULT ''
  );
`);

db.exec('CREATE TABLE IF NOT EXISTS sessoes_emissao(credential_ref TEXT PRIMARY KEY,issued_at INTEGER NOT NULL,sid TEXT)');
if (!db.prepare('PRAGMA table_info(sessoes_emissao)').all().some(c => c.name === 'sid')) db.exec('ALTER TABLE sessoes_emissao ADD COLUMN sid TEXT');
for (const row of db.prepare('SELECT credential_ref FROM sessoes_emissao WHERE sid IS NULL').all()) db.prepare('UPDATE sessoes_emissao SET sid=? WHERE credential_ref=?').run(randomBytes(16).toString('base64url'),row.credential_ref);
const pendentes = new Map();
function emitirSessao(email, nome, google) {
  const reference = createHash('sha256').update(google).digest('hex');
  db.prepare('INSERT OR IGNORE INTO sessoes_emissao(credential_ref,issued_at,sid) VALUES(?,?,?)').run(reference, Date.now(),randomBytes(16).toString('base64url'));
  const { issued_at, sid } = db.prepare('SELECT issued_at,sid FROM sessoes_emissao WHERE credential_ref=?').get(reference);
  return criarSessaoAssinada(email, nome, issued_at, sid);
}

function lerSessao(id) {
  return db.prepare("SELECT id, email, nome, google FROM sessoes WHERE id = ?").get(id);
}

function guardarSessao(email, nome, google) {
  const atual = db.prepare("SELECT id FROM sessoes WHERE email = ?").get(email);
  if (atual) {
    db.prepare("UPDATE sessoes SET nome = ?, google = ? WHERE email = ?").run(nome, google, email);
    return emitirSessao(email, nome, google);
  }
  const id = `maicon.${randomBytes(32).toString("base64url")}`;
  db.prepare("INSERT INTO sessoes (id, email, nome, google) VALUES (?, ?, ?, ?)").run(id, email, nome, google);
  return emitirSessao(email, nome, google);
}

export async function adotarTokenGoogle(emailConta, acesso) {
  const email = String(emailConta ?? "").trim().toLowerCase();
  const token = String(acesso ?? "").trim();
  if (!email || !token || token.startsWith("maicon.") || token.length > 4096) return "";
  const cliente = String(process.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
  const corpo = await info.json().catch(() => ({}));
  const dono = String(corpo.email || "").trim().toLowerCase();
  const aud = String(corpo.aud || corpo.azp || corpo.audience || corpo.issued_to || "");
  if (!info.ok || !dono || dono !== email || (cliente && aud && aud !== cliente)) return "";
  const atual = db.prepare("SELECT id FROM sessoes WHERE email = ?").get(email);
  if (!atual) return "";
  db.prepare("UPDATE sessoes SET google = ? WHERE email = ?").run(token, email);
  return token;
}

export function apagarSessao(email) {
  const conta = String(email ?? "").trim().toLowerCase();
  if (!conta) return;
  db.prepare("DELETE FROM sessoes WHERE email = ?").run(conta);
}

async function validarGoogle(acesso) {
  const cliente = String(process.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  if (!cliente) throw new Error("O login do Google não está configurado no servidor.");

  const info = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(acesso)}`,
  );
  const corpo = await info.json().catch(() => ({}));
  const perfil = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${acesso}` },
  });
  const dados = await perfil.json().catch(() => ({}));
  const email = String(dados.email || corpo.email || "").trim().toLowerCase();
  const aud = String(corpo.aud || corpo.azp || corpo.audience || corpo.issued_to || "");
  const verificado =
    dados.email_verified === true ||
    corpo.email_verified === true ||
    corpo.verified_email === true ||
    String(corpo.email_verified) === "true" ||
    String(corpo.verified_email) === "true";
  if (!info.ok || !perfil.ok || !email.includes("@") || !verificado || aud !== cliente) {
    throw new Error("A sessão do Google expirou. Entre de novo.");
  }
  const nome = String(dados.name ?? "").trim() || email;
  const foto = (await fotoDoGoogle(acesso)) || String(dados.picture ?? "").trim();
  registrarConta(email, nome, foto);
  const sessao = guardarSessao(email, nome, acesso);
  return { email, nome, foto, token: acesso, entregarSessao: sessao };
}

const tentativasFoto = new Map();

export function tokenGoogleDaSessao(email) {
  const conta = String(email ?? "").trim().toLowerCase();
  if (!conta) return "";
  const salva = db.prepare("SELECT google FROM sessoes WHERE email = ?").get(conta);
  return String(salva?.google || "");
}

function ampliarFoto(url) {
  return String(url ?? "").trim().replace(/=s\d+(-c)?(?=$|[?#])/, "=s256-c");
}

async function fotoPeople(acesso) {
  const resp = await fetch("https://people.googleapis.com/v1/people/me?personFields=photos", {
    headers: { Authorization: `Bearer ${acesso}` },
    signal: AbortSignal.timeout(4000),
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) return "";
  const fotos = Array.isArray(dados.photos) ? dados.photos : [];
  const real = fotos.find((item) => item?.url && item.default === false);
  return ampliarFoto(real?.url || "");
}

async function fotoUserinfo(acesso) {
  const perfil = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${acesso}` },
    signal: AbortSignal.timeout(4000),
  });
  const dados = await perfil.json().catch(() => ({}));
  if (!perfil.ok) return "";
  return ampliarFoto(dados.picture || "");
}

export async function fotoDoGoogle(token) {
  const acesso = String(token ?? "").trim();
  if (!acesso || acesso.startsWith("maicon.") || acesso.length > 4096) return "";
  try {
    const real = await fotoPeople(acesso);
    if (real) return real;
    return await fotoUserinfo(acesso);
  } catch {
    return "";
  }
}

export async function puxarFotoDaConta(email, token) {
  const conta = String(email ?? "").trim().toLowerCase();
  const acesso = String(token ?? "").trim();
  if (!conta || !acesso || acesso.startsWith("maicon.")) return "";
  const chave = `${conta}:${acesso.slice(-16)}`;
  const agora = Date.now();
  const ultima = tentativasFoto.get(chave) || 0;
  if (agora - ultima < 10 * 60 * 1000) return "";
  tentativasFoto.set(chave, agora);
  const foto = await fotoDoGoogle(acesso);
  if (foto) registrarConta(conta, "", foto);
  return fotoDaConta(conta);
}

export async function completarFotos(emails) {
  const lista = [...emails].slice(0, 24);
  await Promise.all(
    lista.map(async (email) => {
      const token = tokenGoogleDaSessao(email);
      if (!token) return;
      await puxarFotoDaConta(email, token);
    }),
  );
}

async function resolverContaDoToken(token) {
  const acesso = String(token ?? "").trim();
  if (!acesso || acesso.length > 4096) {
    throw new Error("Entre de novo com o Google.");
  }
  if (acesso.startsWith("maicon.v2.")) {
    const assinada = lerSessaoAssinada(acesso);
    if (!assinada) throw new Error("Entre de novo com o Google.");
    const salva = db.prepare("SELECT google FROM sessoes WHERE email = ?").get(assinada.email);
    return {
      email: assinada.email,
      nome: assinada.nome,
      token: String(salva?.google || ""),
      entregarSessao: assinada.renovar ? criarSessaoAssinada(assinada.email, assinada.nome, Date.now(), assinada.sid) : "",
    };
  }
  if (acesso.startsWith("maicon.")) {
    const salva = lerSessao(acesso);
    if (!salva?.email) throw new Error("Entre de novo com o Google.");
    return {
      email: String(salva.email),
      nome: String(salva.nome || salva.email),
      token: String(salva.google || ""),
      entregarSessao: "",
    };
  }
  const emCurso = pendentes.get(acesso);
  if (emCurso) return emCurso;
  const promessa = validarGoogle(acesso).finally(() => {
    if (pendentes.get(acesso) === promessa) pendentes.delete(acesso);
  });
  pendentes.set(acesso, promessa);
  return promessa;
}

export async function contaDoToken(token) {
  if (appSessions.isRevoked(token)) throw Object.assign(new Error('Sessão encerrada pela central. Entre de novo com o Google.'), { code: 'session_revoked' });
  const conta = await resolverContaDoToken(token);
  const signed = String(token || '').startsWith('maicon.v2.') ? lerSessaoAssinada(token) : null;
  const expiresAt = signed?.exp || Date.now() + (String(token || '').startsWith('maicon.') ? 30 * 86400000 : 3600000);
  if (!appSessions.touch(token, { email: conta.email, name: conta.nome, expiresAt })) throw Object.assign(new Error('Sessão encerrada. Entre de novo com o Google.'), { code: 'session_ended' });
  if (conta.entregarSessao) {
    const replacement = lerSessaoAssinada(conta.entregarSessao);
    if (!appSessions.linkTokens(token, conta.entregarSessao, { expiresAt: replacement?.exp })) throw Object.assign(new Error('Sessão encerrada. Entre de novo com o Google.'), { code: 'session_ended' });
  }
  return conta;
}
