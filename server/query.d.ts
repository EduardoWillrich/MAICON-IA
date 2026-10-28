export function montarXpaths(filtros: {
  tabela?: string;
  tipo?: number;
  chaves?: { nome?: string; valor?: string }[];
}): string[];

export function montarSelect(xpaths: string[]): string;
