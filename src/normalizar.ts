import type { CadastroAtual, CampoCadastro, CampoLog, EventoLog, RegistroCadastro } from "./types";
import { nomeCanonico } from "./tiposFixos";

const MAX_EVENTOS = 800;
const MAX_CAMPOS = 60;
const MAX_TEXTO = 280;

export function textoSeguro(valor: unknown, max = MAX_TEXTO): string {
  if (valor == null) return "";
  if (typeof valor === "string") {
    return valor.length > max ? `${valor.slice(0, max)}…` : valor;
  }
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return "";
}

function campoLog(bruto: unknown): CampoLog | null {
  if (!bruto || typeof bruto !== "object") return null;
  const c = bruto as Record<string, unknown>;
  const nome = nomeCanonico(textoSeguro(c.nome, 80));
  if (!nome) return null;
  const campo: CampoLog = {
    nome,
    valor: textoSeguro(c.valor),
  };
  if ("valorAnterior" in c) campo.valorAnterior = textoSeguro(c.valorAnterior);
  if (c.valorExibicao) campo.valorExibicao = textoSeguro(c.valorExibicao, 120);
  if (c.valorAnteriorExibicao) {
    campo.valorAnteriorExibicao = textoSeguro(c.valorAnteriorExibicao, 120);
  }
  return campo;
}

export function normalizarEventos(brutos: unknown): EventoLog[] {
  if (!Array.isArray(brutos)) return [];
  return brutos.slice(-MAX_EVENTOS).map((item, indice) => {
    const e = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const campos = Array.isArray(e.campos)
      ? e.campos.map(campoLog).filter((c): c is CampoLog => c !== null).slice(0, MAX_CAMPOS)
      : [];
    return {
      id: textoSeguro(e.id, 40) || String(indice + 1),
      usuario: textoSeguro(e.usuario, 80),
      dataInicioTransacao: textoSeguro(e.dataInicioTransacao, 40),
      dataTerminoTransacao: textoSeguro(e.dataTerminoTransacao, 40),
      tempoTransacao: Number(e.tempoTransacao) || 0,
      usuarioWindows: textoSeguro(e.usuarioWindows, 80),
      computador: textoSeguro(e.computador, 80),
      tabela: textoSeguro(e.tabela, 80),
      tipo: Number(e.tipo) || 0,
      data: textoSeguro(e.data, 40),
      indice: Number(e.indice) || 0,
      campos,
      numeroProcesso: textoSeguro(e.numeroProcesso, 80) || undefined,
    };
  });
}

function campoCadastro(bruto: unknown): CampoCadastro | null {
  if (!bruto || typeof bruto !== "object") return null;
  const c = bruto as Record<string, unknown>;
  const nome = textoSeguro(c.nome, 80);
  if (!nome) return null;
  return {
    nome,
    valorLog: textoSeguro(c.valorLog),
    valorAtual: textoSeguro(c.valorAtual),
    igual: Boolean(c.igual),
    rotulo: c.rotulo ? textoSeguro(c.rotulo, 80) : undefined,
    valorLogExibicao: c.valorLogExibicao ? textoSeguro(c.valorLogExibicao, 120) : undefined,
    valorAtualExibicao: c.valorAtualExibicao
      ? textoSeguro(c.valorAtualExibicao, 120)
      : undefined,
  };
}

function registroCadastro(bruto: unknown): RegistroCadastro | null {
  if (!bruto || typeof bruto !== "object") return null;
  const r = bruto as Record<string, unknown>;
  const campos = Array.isArray(r.campos)
    ? r.campos.map(campoCadastro).filter((c): c is CampoCadastro => c !== null).slice(0, MAX_CAMPOS)
    : [];
  const divergencias = Array.isArray(r.divergencias)
    ? r.divergencias.map(campoCadastro).filter((c): c is CampoCadastro => c !== null).slice(0, MAX_CAMPOS)
    : [];
  return {
    rotulo: textoSeguro(r.rotulo, 80) || "registro",
    encontrado: Boolean(r.encontrado),
    excluido: Boolean(r.excluido),
    campos,
    divergencias,
  };
}

export function normalizarCadastro(bruto: unknown): CadastroAtual | null {
  if (!bruto || typeof bruto !== "object") return null;
  const c = bruto as Record<string, unknown>;
  const campos = Array.isArray(c.campos)
    ? c.campos.map(campoCadastro).filter((x): x is CampoCadastro => x !== null).slice(0, MAX_CAMPOS)
    : [];
  const divergencias = Array.isArray(c.divergencias)
    ? c.divergencias.map(campoCadastro).filter((x): x is CampoCadastro => x !== null).slice(0, MAX_CAMPOS)
    : [];
  const registros = Array.isArray(c.registros)
    ? c.registros.map(registroCadastro).filter((x): x is RegistroCadastro => x !== null).slice(0, 8)
    : undefined;
  return {
    encontrado: Boolean(c.encontrado),
    tabela: textoSeguro(c.tabela, 80),
    campos,
    divergencias,
    registros,
    aviso: c.aviso ? textoSeguro(c.aviso, 400) : undefined,
    excluido: Boolean(c.excluido),
  };
}

export const LIMITE_EVENTOS_AVISO = MAX_EVENTOS;
