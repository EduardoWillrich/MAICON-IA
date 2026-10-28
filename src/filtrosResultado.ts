import { camposQueMudaram, rotuloCampo } from "./relatorio";
import type { EventoLog, TipoLog } from "./types";

export type FiltrosResultado = {
  usuario: string;
  tipo: TipoLog;
  campo: string;
};

export const FILTROS_RESULTADO_VAZIOS: FiltrosResultado = {
  usuario: "",
  tipo: 0,
  campo: "",
};

export function usuariosDoResultado(eventos: EventoLog[]): string[] {
  return [...new Set(eventos.map((e) => e.usuario?.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

export function camposDoResultado(eventos: EventoLog[]): { nome: string; rotulo: string }[] {
  const nomes = new Set<string>();
  for (const evento of eventos.slice(0, 300)) {
    for (const campo of camposQueMudaram(evento)) nomes.add(campo.nome);
  }
  return [...nomes]
    .sort((a, b) => rotuloCampo(a).localeCompare(rotuloCampo(b), "pt-BR"))
    .map((nome) => ({ nome, rotulo: rotuloCampo(nome) }));
}

export function filtrarResultado(
  eventos: EventoLog[],
  busca: string,
  filtros: FiltrosResultado,
): EventoLog[] {
  const termo = busca.trim().toLowerCase();
  return eventos.filter((ev) => {
    if (filtros.usuario && ev.usuario?.trim() !== filtros.usuario) return false;
    if (filtros.tipo !== 0 && ev.tipo !== filtros.tipo) return false;
    if (filtros.campo && !camposQueMudaram(ev).some((c) => c.nome === filtros.campo)) {
      return false;
    }
    if (!termo) return true;
    return [
      ev.usuario,
      ev.usuarioWindows,
      ev.computador,
      ev.tabela,
      ev.numeroProcesso ?? "",
      ...(ev.campos ?? []).flatMap((c) => [c.nome, c.valor, c.valorAnterior ?? ""]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(termo);
  });
}
