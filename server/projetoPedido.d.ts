export type PedidoProjeto = { numero: string; modalidade?: never } | { modalidade: string; numero?: never };
export function pedidoProjetoTarefas(texto: unknown): PedidoProjeto | null;
export function pedidoProjetoDaConversa(mensagens: unknown): PedidoProjeto | null;
