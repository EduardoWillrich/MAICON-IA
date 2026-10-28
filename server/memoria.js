import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const ARQUIVO = new URL("./memoria.json", import.meta.url);

const PADRAO = {
  preferencias: [
    {
      termo: "atividade",
      tabela: "mov_Atividade",
      campo: "IdAtividade",
      observacao: "Quando o usuário diz 'atividade', use mov_Atividade, não mov_Atividade_Historico.",
    },
  ],
  uso: {},
};

let emMemoria = null;
let gravacao = null;

function carregar() {
  if (emMemoria) return emMemoria;
  try {
    const dados = JSON.parse(readFileSync(ARQUIVO, "utf8"));
    emMemoria = { preferencias: dados.preferencias ?? [], uso: dados.uso ?? {} };
  } catch {
    emMemoria = structuredClone(PADRAO);
  }
  return emMemoria;
}

export function lerMemoria() {
  return structuredClone(carregar());
}

let versao = 0;

export function versaoMemoria() {
  return versao;
}

function salvar(memoria) {
  emMemoria = memoria;
  versao += 1;
  if (gravacao) return;
  gravacao = setTimeout(() => {
    gravacao = null;
    void writeFile(ARQUIVO, JSON.stringify(emMemoria, null, 2)).catch(() => {});
  }, 2000);
}

export function lembrar({ termo, tabela, campo, observacao }) {
  const chave = String(termo ?? "").trim().toLowerCase();
  if (!chave && !observacao) throw new Error("Informe o termo ou a observação.");
  const memoria = lerMemoria();
  const nova = {
    termo: chave,
    tabela: String(tabela ?? "").trim(),
    campo: String(campo ?? "").trim(),
    observacao: String(observacao ?? "").trim(),
  };
  memoria.preferencias = memoria.preferencias.filter((p) => !chave || p.termo !== chave);
  memoria.preferencias.push(nova);
  salvar(memoria);
  return memoria;
}

export function editar(indice, { termo, tabela, campo, observacao }) {
  const memoria = lerMemoria();
  const i = Number(indice);
  if (!Number.isInteger(i) || !memoria.preferencias[i]) throw new Error("Preferência não encontrada.");
  const chave = String(termo ?? "").trim().toLowerCase();
  if (!chave && !observacao) throw new Error("Informe o termo ou a observação.");
  memoria.preferencias[i] = {
    termo: chave,
    tabela: String(tabela ?? "").trim(),
    campo: String(campo ?? "").trim(),
    observacao: String(observacao ?? "").trim(),
  };
  salvar(memoria);
  return memoria;
}

export function esquecer(termo) {
  const chave = String(termo ?? "").trim().toLowerCase();
  const memoria = lerMemoria();
  memoria.preferencias = memoria.preferencias.filter((p) => p.termo !== chave && p.observacao !== termo);
  salvar(memoria);
  return memoria;
}

export function registrarUso({ tabela, campo }) {
  if (!tabela) return;
  const memoria = lerMemoria();
  const atual = memoria.uso[tabela] ?? { vezes: 0, campos: {} };
  atual.vezes += 1;
  if (campo) atual.campos[campo] = (atual.campos[campo] ?? 0) + 1;
  atual.ultima = new Date().toISOString();
  memoria.uso[tabela] = atual;
  salvar(memoria);
}

export function textoMemoria() {
  const { preferencias, uso } = lerMemoria();
  const linhas = [];
  if (preferencias.length) {
    linhas.push("PREFERÊNCIAS APRENDIDAS (siga sempre, têm prioridade sobre buscar_tabelas):");
    for (const p of preferencias) {
      const partes = [];
      if (p.termo) partes.push(`"${p.termo}"`);
      if (p.tabela) partes.push(`→ tabela ${p.tabela}`);
      if (p.campo) partes.push(`campo chave ${p.campo}`);
      linhas.push(`- ${partes.join(" ")}${p.observacao ? ` (${p.observacao})` : ""}`);
    }
  }
  const maisUsadas = Object.entries(uso)
    .sort((a, b) => b[1].vezes - a[1].vezes)
    .slice(0, 10);
  if (maisUsadas.length) {
    linhas.push("TABELAS MAIS CONSULTADAS por este usuário (prefira-as em caso de dúvida):");
    for (const [tabela, u] of maisUsadas) {
      const campo = Object.entries(u.campos ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
      linhas.push(`- ${tabela} (${u.vezes}x${campo ? `, campo ${campo}` : ""})`);
    }
  }
  return linhas.join("\n");
}
