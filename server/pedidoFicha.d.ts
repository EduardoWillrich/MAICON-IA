type MensagemFicha = { role: string; content?: unknown };
export function nomeCitadoNaFicha(texto: string): string;
export function pedeAssuntoFicha(texto: string): boolean;
export function pedidoFichaCliente(mensagens: MensagemFicha[]): { perguntar: true; cliente?: never } | { cliente: string; perguntar?: never } | null;
export function pedidoRelacionamento(texto: string): { niveis: string[] } | null;
