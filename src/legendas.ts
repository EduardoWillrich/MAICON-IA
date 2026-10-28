import { formatarValorCampo } from "./datas";
import { nomeCanonico, TIPOS_FIXOS } from "./tiposFixos";
import type { CampoLog } from "./types";

const SITUACAO: Record<string, string> = {
  "1": "Não iniciada",
  "2": "Em andamento",
  "3": "Paralisada",
  "4": "Concluída",
  "5": "Não realizada",
  "6": "Cancelada",
};

const PRIORIDADE: Record<string, string> = {
  "0": "Normal",
  "1": "Alta",
  "2": "Urgente",
};

const SIM_NAO: Record<string, string> = {
  "0": "Não",
  "1": "Sim",
};

const MENSAGEM_AUTOMATICA: Record<string, string> = {
  "0": "Não",
  "1": "Sim",
  "2": "Conforme o modelo",
};

const LOCAL_ARMAZENAMENTO: Record<string, string> = {
  "0": "Banco de dados",
  "1": "Disco",
  "2": "Externo",
};

const LEGENDAS: Record<string, Record<string, string>> = {
  Situacao: SITUACAO,
  Prioridade: PRIORIDADE,
  Acompanhamento_Automatico: SIM_NAO,
  Mensagem_Automatica: MENSAGEM_AUTOMATICA,
  Ativo: SIM_NAO,
  Modelo: SIM_NAO,
  Storage: SIM_NAO,
  Exibir_Portal_Cliente: SIM_NAO,
  Solicitar_Verificacao: SIM_NAO,
  Carga_Perigosa: SIM_NAO,
  Seguro: SIM_NAO,
  Agenciamento_Carga: SIM_NAO,
  Desembaraco_Aduaneiro: SIM_NAO,
  Demurrage_Detention: SIM_NAO,
  Atualizacao_Taxas_Comercial: SIM_NAO,
  Local_Armazenamento: LOCAL_ARMAZENAMENTO,
  Valor_Boleano: SIM_NAO,
  ...TIPOS_FIXOS,
};

export const VAZIO = "vazio";

const CAMPOS_VALOR_NAO_MOEDA = new Set([
  "Valor_Inteiro",
  "Valor_Tipo_Fixo",
  "Valor_Boleano",
  "Valor_Data",
  "Valor_Alfanumerico",
  "Valor_Texto",
  "Valor_Real4",
]);

function campoDeMoeda(nomeCampo: string): boolean {
  const chave = nomeCanonico(nomeCampo);
  if (CAMPOS_VALOR_NAO_MOEDA.has(chave)) return false;
  return /^Valor(_|$)/i.test(chave) || /Importancia_Segurada/i.test(chave) || /^Total_Mercadoria$/i.test(chave);
}

function numeroMonetario(texto: string): number | null {
  const t = texto.trim();
  if (/^-?\d{1,3}(?:\.\d{3})+,\d+$/.test(t) || /^-?\d+,\d+$/.test(t)) {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarValorNovo(
  nomeCampo: string,
  valor: string,
  exibicao?: string,
): string {
  const texto = valor == null ? "" : String(valor).trim();
  if (texto === "" || /^null$/i.test(texto) || /^[-–—]+$/.test(texto)) return VAZIO;
  if (exibicao) return String(exibicao);
  const chave = nomeCanonico(nomeCampo);
  const mapa = LEGENDAS[chave] ?? LEGENDAS[nomeCampo];
  if (mapa?.[texto] !== undefined) return mapa[texto];
  if (campoDeMoeda(nomeCampo)) {
    const n = numeroMonetario(texto);
    if (n != null) return formatarMoeda(n);
  }
  return formatarValorCampo(texto);
}

export function textoValor(campo: CampoLog, qual: "atual" | "anterior"): string {
  if (qual === "anterior") {
    return formatarValorNovo(
      campo.nome,
      campo.valorAnterior ?? "",
      campo.valorAnteriorExibicao,
    );
  }
  return formatarValorNovo(campo.nome, campo.valor, campo.valorExibicao);
}

export const VERBO_SITUACAO: Record<string, string> = {
  "1": "marcou como não iniciada",
  "2": "colocou em andamento",
  "3": "paralisou",
  "4": "concluiu",
  "5": "marcou como não realizada",
  "6": "cancelou",
};

export function chaveDoRegistro(tabela: string, campos: { nome: string; valor: string }[]): string {
  const id = campos.find((c) => c.nome === "IdAtividade")
    ?? campos.find((c) => /^Id[A-Z]/.test(c.nome));
  return `${tabela}:${id?.nome ?? ""}=${id?.valor ?? ""}`;
}
