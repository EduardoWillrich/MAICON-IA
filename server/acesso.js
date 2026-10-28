import { emailsAdmin } from "./env.js";
import { abrirSqlite } from "./sqlite.js";

const db = abrirSqlite("conversas.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS acessos (
    email TEXT PRIMARY KEY,
    nome TEXT NOT NULL DEFAULT '',
    papel TEXT NOT NULL DEFAULT 'usuario',
    ver_log INTEGER NOT NULL DEFAULT 0,
    ver_memoria INTEGER NOT NULL DEFAULT 0,
    ver_pendencias INTEGER NOT NULL DEFAULT 1,
    ver_consulta INTEGER NOT NULL DEFAULT 0,
    fazer_log INTEGER NOT NULL DEFAULT 0,
    fazer_memoria INTEGER NOT NULL DEFAULT 0,
    fazer_sql INTEGER NOT NULL DEFAULT 0,
    fazer_relatorio INTEGER NOT NULL DEFAULT 1,
    visto TEXT NOT NULL DEFAULT ''
  );
`);
try {
  db.exec("ALTER TABLE acessos ADD COLUMN removida INTEGER NOT NULL DEFAULT 0");
} catch {
  /* a coluna já existe */
}
try {
  db.exec("ALTER TABLE acessos ADD COLUMN setor TEXT NOT NULL DEFAULT 'auto'");
} catch {
  /* a coluna já existe */
}
try {
  db.exec("ALTER TABLE acessos ADD COLUMN modalidade TEXT NOT NULL DEFAULT 'auto'");
} catch {
  /* a coluna já existe */
}
try {
  db.exec("ALTER TABLE acessos ADD COLUMN fazer_excel INTEGER NOT NULL DEFAULT 0");
} catch {
  /* a coluna já existe */
}

function adminsDoAmbiente() {
  return emailsAdmin();
}

function adminCompleto(linha) {
  return Boolean(
    linha &&
      linha.papel === "admin" &&
      !linha.removida &&
      linha.ver_log &&
      linha.ver_memoria &&
      linha.ver_pendencias &&
      linha.ver_consulta &&
      linha.fazer_log &&
      linha.fazer_memoria &&
      linha.fazer_sql &&
      linha.fazer_relatorio,
  );
}

function garantirAdminsFixos() {
  const lista = adminsDoAmbiente();
  if (!lista.length) return;
  const marcas = lista.map(() => "?").join(", ");
  const linhas = db.prepare(`SELECT * FROM acessos WHERE email IN (${marcas})`).all(...lista);
  const porEmail = new Map(linhas.map((linha) => [linha.email, linha]));
  const pendentes = lista.filter((email) => !adminCompleto(porEmail.get(email)));
  if (!pendentes.length) return;
  const gravar = db.prepare(
    `INSERT INTO acessos (
      email, nome, papel, ver_log, ver_memoria, ver_pendencias, ver_consulta,
      fazer_log, fazer_memoria, fazer_sql, fazer_relatorio, setor, modalidade, removida, visto
    ) VALUES (?, '', 'admin', 1, 1, 1, 1, 1, 1, 1, 1, 'auto', 'auto', 0, ?)
    ON CONFLICT(email) DO UPDATE SET
      papel = 'admin',
      removida = 0,
      ver_log = 1,
      ver_memoria = 1,
      ver_pendencias = 1,
      ver_consulta = 1,
      fazer_log = 1,
      fazer_memoria = 1,
      fazer_sql = 1,
      fazer_relatorio = 1`,
  );
  const agora = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const email of pendentes) gravar.run(email, agora);
    db.exec("COMMIT");
  } catch (erro) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* a transação já foi encerrada */
    }
    throw erro;
  }
}

function contaDe(email) {
  return String(email ?? "").trim().toLowerCase();
}

function contaReal(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

const PADRAO = {
  papel: "usuario",
  verLog: false,
  verMemoria: false,
  verPendencias: true,
  verConsulta: false,
  fazerLog: false,
  fazerMemoria: false,
  fazerSql: false,
  fazerRelatorio: true,
  fazerExcel: false,
  setorManual: "auto",
  modalidadeManual: "auto",
};

function setorManualDe(linha) {
  const valor = String(linha?.setor ?? "auto");
  return ["inside", "comercial", "operacional", "documental", "financeiro", "gerencia"].includes(valor) ? valor : "auto";
}

function modalidadeManualDe(linha) {
  const valor = String(linha?.modalidade ?? "auto").toUpperCase();
  if (valor === "TODAS") return "todas";
  return ["IA", "EA", "IM", "EM"].includes(valor) ? valor : "auto";
}

function linhaParaPermissao(linha, email) {
  const adminFixo = adminsDoAmbiente().includes(email);
  if (linha?.removida && !adminFixo) {
    return {
      papel: "usuario",
      adminFixo: false,
      removida: true,
      verLog: false,
      verMemoria: false,
      verPendencias: false,
      verConsulta: false,
      fazerLog: false,
      fazerMemoria: false,
      fazerSql: false,
      fazerRelatorio: false,
      fazerExcel: false,
      setorManual: "auto",
      modalidadeManual: "auto",
    };
  }
  const admin = adminFixo || linha?.papel === "admin";
  const base = linha
    ? {
        papel: admin ? "admin" : "usuario",
        verLog: Boolean(linha.ver_log),
        verMemoria: Boolean(linha.ver_memoria),
        verPendencias: Boolean(linha.ver_pendencias),
        verConsulta: Boolean(linha.ver_consulta),
        fazerLog: Boolean(linha.fazer_log),
        fazerMemoria: Boolean(linha.fazer_memoria),
        fazerSql: Boolean(linha.fazer_sql),
        fazerRelatorio: Boolean(linha.fazer_relatorio),
        fazerExcel: Boolean(linha.fazer_excel),
        setorManual: setorManualDe(linha),
        modalidadeManual: modalidadeManualDe(linha),
      }
    : { ...PADRAO };
  if (admin) {
    return {
      papel: "admin",
      adminFixo,
      verLog: true,
      verMemoria: true,
      verPendencias: true,
      verConsulta: true,
      fazerLog: true,
      fazerMemoria: true,
      fazerSql: true,
      fazerRelatorio: true,
      fazerExcel: Boolean(linha?.fazer_excel),
      setorManual: setorManualDe(linha),
      modalidadeManual: modalidadeManualDe(linha),
      removida: false,
    };
  }
  return { ...base, papel: "usuario", adminFixo: false, setorManual: setorManualDe(linha), modalidadeManual: modalidadeManualDe(linha), removida: false };
}

export function permissaoDe(email) {
  const conta = contaDe(email);
  if (adminsDoAmbiente().includes(conta)) {
    try {
      garantirAdminsFixos();
    } catch (erro) {
      console.error("Não atualizou administradores:", erro?.message || erro);
    }
  }
  const linha = db.prepare("SELECT * FROM acessos WHERE email = ?").get(conta);
  return linhaParaPermissao(linha, conta);
}

const VISTO_MS = 10 * 60 * 1000;

export function registrarConta(email, nome) {
  const conta = contaDe(email);
  if (!conta || !contaReal(conta)) return;
  const nomeLimpo = String(nome ?? "").trim().slice(0, 80);
  if (adminsDoAmbiente().includes(conta)) {
    try {
      garantirAdminsFixos();
    } catch (erro) {
      console.error("Não gravou os administradores do .env:", erro?.message || erro);
    }
    if (!nomeLimpo) return;
    const atual = db.prepare("SELECT nome FROM acessos WHERE email = ?").get(conta);
    if (atual?.nome === nomeLimpo) return;
    db.prepare("UPDATE acessos SET nome = ? WHERE email = ?").run(nomeLimpo, conta);
    return;
  }
  const atual = db.prepare("SELECT nome, visto FROM acessos WHERE email = ?").get(conta);
  const agora = new Date();
  if (!atual) {
    db.prepare(`INSERT INTO acessos (email, nome, visto) VALUES (?, ?, ?)`).run(conta, nomeLimpo, agora.toISOString());
    return;
  }
  const visto = atual.visto ? new Date(atual.visto).getTime() : 0;
  const recente = Number.isFinite(visto) && agora.getTime() - visto < VISTO_MS;
  if (recente && (!nomeLimpo || atual.nome === nomeLimpo)) return;
  db.prepare("UPDATE acessos SET nome = CASE WHEN ? <> '' THEN ? ELSE nome END, visto = ? WHERE email = ?").run(
    nomeLimpo,
    nomeLimpo,
    agora.toISOString(),
    conta,
  );
}

export function listarContas() {
  const salvas = db.prepare("SELECT * FROM acessos WHERE removida = 0").all();
  const ocultos = new Set(db.prepare("SELECT email FROM acessos WHERE removida = 1").all().map((linha) => linha.email));
  const emails = new Set([...adminsDoAmbiente(), ...salvas.map((linha) => linha.email)]);
  try {
    for (const linha of db.prepare("SELECT DISTINCT email FROM conversas").all()) {
      if (!ocultos.has(linha.email)) emails.add(linha.email);
    }
  } catch {
    /* a tabela de conversas pode ainda não existir nesta conexão */
  }
  return [...emails]
    .filter((email) => contaReal(email))
    .sort()
    .map((email) => {
      const linha = salvas.find((item) => item.email === email);
      return { email, nome: linha?.nome || "", ...linhaParaPermissao(linha, email) };
    });
}

export function salvarConta(email, dados) {
  const conta = contaDe(email);
  if (!conta) throw new Error("E-mail inválido.");
  if (adminsDoAmbiente().includes(conta)) {
    registrarConta(conta, dados.nome || "");
    db.prepare("UPDATE acessos SET fazer_excel = ? WHERE email = ?").run(dados.fazerExcel ? 1 : 0, conta);
    return listarContas();
  }
  registrarConta(conta, dados.nome || "");
  const admin = dados.papel === "admin";
  const flag = (nome, padrao) => (admin ? 1 : dados[nome] ? 1 : padrao ? 1 : 0);
  db.prepare(
    `UPDATE acessos SET
      papel = ?,
      ver_log = ?, ver_memoria = ?, ver_pendencias = ?, ver_consulta = ?,
      fazer_log = ?, fazer_memoria = ?, fazer_sql = ?, fazer_relatorio = ?, fazer_excel = ?,
      setor = ?,
      modalidade = ?
     WHERE email = ?`,
  ).run(
    admin ? "admin" : "usuario",
    flag("verLog"),
    flag("verMemoria"),
    admin ? 1 : dados.verPendencias === false ? 0 : 1,
    flag("verConsulta"),
    flag("fazerLog"),
    flag("fazerMemoria"),
    flag("fazerSql"),
    admin ? 1 : dados.fazerRelatorio === false ? 0 : 1,
    dados.fazerExcel ? 1 : 0,
    ["inside", "comercial", "operacional", "documental", "financeiro", "gerencia"].includes(dados.setorManual) ? dados.setorManual : "auto",
    modalidadeManualDe({ modalidade: dados.modalidadeManual }),
    conta,
  );
  return listarContas();
}

try {
  garantirAdminsFixos();
} catch (erro) {
  console.error("Não gravou os administradores do .env:", erro?.message || erro);
}

export function apagarConta(email) {
  const conta = contaDe(email);
  if (!conta) throw new Error("E-mail inválido.");
  if (adminsDoAmbiente().includes(conta)) throw new Error("Administrador fixo não pode ser removido.");
  registrarConta(conta, "");
  db.prepare("UPDATE acessos SET removida = 1 WHERE email = ?").run(conta);
  return listarContas();
}
