import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { prepararEscolha } from "./escolhaSistema.js";
import { executarNoDesktop } from "./filaDesktop.js";
import { executarComConfirmacao } from "./confirmacaoDesktop.js";

const exec = promisify(execFile);
const pasta = dirname(fileURLToPath(import.meta.url));

export function processoDeTeste(numero) {
  const bruto = String(numero ?? "").trim().replace(/\s+/g, " ");
  const codigo = bruto.replace(/\s+teste$/i, "").toUpperCase();
  if (!/^[A-Z]{1,4}\d{2,6}-\d{2}$/.test(codigo)) return { codigo: "", teste: false, rotulo: "" };
  const teste = /\s+teste$/i.test(bruto);
  return { codigo, teste, rotulo: teste ? `${codigo} teste` : codigo };
}

export function numeroCitado(texto) {
  const achado = String(texto ?? "").match(/\b([A-Za-z]{1,4}\d{2,6}-\d{2})(\s+teste)?\b/i);
  if (!achado) return "";
  return processoDeTeste(`${achado[1]}${achado[2] || ""}`).rotulo;
}

export function numeroParaConsulta(valor, admin) {
  const citado = numeroCitado(valor);
  const lido = processoDeTeste(citado);
  if (!lido.teste) return { ok: true, numero: "" };
  if (!admin) return { ok: false, erro: "Processo de teste só pode ser pedido por um administrador." };
  return { ok: true, numero: lido.rotulo };
}

export function lerSaidaDoBot(stdout) {
  const linhas = String(stdout ?? "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const inicio = linhas.findIndex((item) => /^(OK|ERRO|PERGUNTA)(\s|$)/.test(item.trim()));
  const bloco = (inicio >= 0 ? linhas.slice(inicio) : linhas.filter((item) => item.trim())).join("\n").trim();
  if (!bloco) return { ok: false, texto: "" };
  if (bloco.startsWith("OK")) return { ok: true, texto: bloco.slice(2).trim() };
  if (bloco.startsWith("PERGUNTA")) return { ok: false, texto: bloco.slice("PERGUNTA".length).trim() };
  return { ok: false, texto: bloco.replace(/^ERRO\s*/, "").trim() };
}

export function concluirAtividadeNoHeadCargo(pedido) {
  return executarNoDesktop(() => concluirAtividadeLivre(pedido));
}

export function abrirAtividadeNoHeadCargo({ numero, nome, codigo }) {
  const processo = processoDeTeste(numero);
  if (!processo.codigo || !String(nome || "").trim()) return Promise.resolve({ ok: false, texto: "Processo ou atividade inválidos." });
  if (process.platform !== "win32") return Promise.resolve({ ok: false, texto: "Abra o Maicon no servidor Windows conectado ao HeadCargo." });
  return executarNoDesktop(async () => {
    try {
      const { stdout } = await exec("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(pasta, "abrirAtividade.ps1")], {
        timeout: 180000, windowsHide: true,
        env: { ...process.env, HC_NUMERO: processo.rotulo, HC_NOME: String(nome).trim().slice(0,120), HC_CODIGO: String(codigo || "").trim().slice(0,20) },
      });
      return lerSaidaDoBot(stdout);
    } catch (erro) {
      const lido = lerSaidaDoBot(erro?.stdout || "");
      return { ok: false, texto: lido.texto || "Não consegui abrir a atividade. Confira se o HeadCargo está aberto neste computador." };
    }
  });
}

async function concluirAtividadeLivre({ numero, nome, codigo, caminho, acao = "concluir", botao = "", confirmar }) {
  const pedido = String(botao || (acao === "restaurar" ? "Restaurar" : "Concluir")).trim();
  const chave = pedido.toUpperCase();
  const verbo = chave.startsWith("RESTAUR") ? "restauro" : chave.startsWith("CANCEL") ? "cancelo" : chave.startsWith("CONCLU") ? "concluo" : "altero";
  const rotulo = processoDeTeste(numero);
  if (!rotulo.teste) return { ok: false, texto: `Só ${verbo} atividade de processo teste.` };
  const atividade = String(nome ?? "").trim();
  if (!atividade) return { ok: false, texto: `Diga o nome da atividade para ${pedido.toLowerCase()}.` };
  try {
    const execucao = await executarComConfirmacao(() => exec(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(pasta, "concluirAtividade.ps1")],
      {
        timeout: 180000,
        windowsHide: true,
        env: {
          ...process.env,
          HC_NUMERO: rotulo.rotulo,
          HC_NOME: atividade.slice(0, 120),
          HC_CODIGO: String(codigo ?? "").trim().slice(0, 20),
          HC_CAMINHO: String(caminho ?? "").trim().slice(0, 180),
          HC_ACAO: chave.startsWith("RESTAUR") ? "restaurar" : chave.startsWith("CONCLU") ? "concluir" : "botao",
          HC_BOTAO: chave.slice(0, 40),
          HC_CLICAR: "1",
        },
      },
    ), confirmar);
    if (execucao.confirmado) return { ok: true, texto: "Conclusão confirmada no cadastro do HeadCargo." };
    const lido = lerSaidaDoBot(execucao.stdout);
    if (lido.texto) return lido.ok ? lido : { ok: false, texto: lido.texto };
    return { ok: false, texto: `Não consegui ${pedido.toLowerCase()} a atividade no HeadCargo.` };
  } catch (erro) {
    const lido = lerSaidaDoBot(erro?.stdout || "");
    if (lido.texto) return lido.ok ? lido : { ok: false, texto: lido.texto };
    return { ok: false, texto: "Não consegui falar com o HeadCargo neste computador." };
  }
}

export async function textoDoPreenchimento(pool, { numero, campo, valor }) {
  const preparado = await prepararEscolha(pool, campo, valor);
  if (!preparado.seguir) return preparado.texto;
  return (await preencherCampoNoHeadCargo({ numero, campo, valor: preparado.valor, escolha: preparado.escolha })).texto;
}

export function preencherCampoNoHeadCargo(pedido) {
  return executarNoDesktop(() => preencherCampoLivre(pedido));
}

async function preencherCampoLivre({ numero, campo, valor, escolha = null }) {
  const rotulo = processoDeTeste(numero);
  if (!rotulo.teste) return { ok: false, texto: "O bot só preenche campo de processo teste." };
  const nomeCampo = String(campo ?? "").trim();
  const texto = String(valor ?? "").trim();
  if (!nomeCampo || !texto) return { ok: false, texto: "Diga o campo e o valor que o bot deve digitar." };
  try {
    const { stdout } = await exec(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(pasta, "preencherCampo.ps1")],
      {
        timeout: 150000,
        windowsHide: true,
        env: {
          ...process.env,
          HC_NUMERO: rotulo.rotulo,
          HC_CAMPO: nomeCampo.slice(0, 80),
          HC_VALOR: texto.slice(0, 80),
          HC_ESCOLHA: escolha ? JSON.stringify(escolha).slice(0, 1200) : "",
        },
      },
    );
    const linha = String(stdout ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean).pop() || "";
    if (linha.startsWith("OK")) return { ok: true, texto: linha.slice(2).trim() };
    return { ok: false, texto: linha.replace(/^ERRO\s*/, "") || "Não consegui preencher o campo no HeadCargo." };
  } catch (erro) {
    const saida = String(erro?.stdout || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean).pop() || "";
    if (saida.startsWith("OK")) return { ok: true, texto: saida.slice(2).trim() };
    if (saida) return { ok: false, texto: saida.replace(/^ERRO\s*/, "") };
    return { ok: false, texto: "Não consegui falar com o HeadCargo neste computador." };
  }
}
