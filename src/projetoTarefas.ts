export const TAMANHO_LOTE_TAREFAS = 20;
export type TarefaProjeto = { id: string; codigo: string; nome: string; precedente: { codigo: string; nome: string } | null };
export type ProjetoTarefas = { codigo: string; nome: string; modalidade: string; processo: string; tarefas: TarefaProjeto[] };
export type ListaProjetoTarefas = { projetos: ProjetoTarefas[] };

export function projetoTarefasDoTexto(texto: string): ListaProjetoTarefas | null {
  const bloco = texto.match(/```tarefas\s*\n([\s\S]*?)```/i);
  if (bloco) {
    try {
      const dados = JSON.parse(bloco[1]);
      if (!Array.isArray(dados?.projetos)) return null;
      for (const p of dados.projetos) {
        if (typeof p.codigo !== "string" || typeof p.nome !== "string" || typeof p.modalidade !== "string" || typeof p.processo !== "string" || !Array.isArray(p.tarefas)) return null;
        for (const t of p.tarefas) if (typeof t.id !== "string" || typeof t.codigo !== "string" || typeof t.nome !== "string" || (t.precedente !== null && (typeof t.precedente?.codigo !== "string" || typeof t.precedente?.nome !== "string"))) return null;
      }
      return dados;
    } catch { return null; }
  }
  const projetos: ProjetoTarefas[] = [];
  let atual: ProjetoTarefas | null = null;
  for (const linha of texto.replace(/\r/g, "").split("\n")) {
    if (!linha.trim()) continue;
    // Legacy task lists have numeric project/activity codes. A report heading
    // such as "Projeto de tarefas" must remain Markdown, including its tables.
    const titulo = linha.trim().match(/^(?:#{1,6}\s*)?Projeto (\d+) (.+?)(?: do modal (IM|IA|EM|EA)| do processo (.+))?$/i);
    if (titulo) { atual = { codigo: titulo[1], nome: titulo[2], modalidade: titulo[3] || "", processo: titulo[4] || "", tarefas: [] }; projetos.push(atual); continue; }
    if (!atual) return null;
    if (/^Este projeto não tem tarefas\.$/i.test(linha.trim()) && !atual.tarefas.length) continue;
    const item = linha.trim().match(/^[-*]\s+(\d+(?:\.\d+)?)\s+(.+?)(?:\. Depois de (\S+)\s*(.*))?$/);
    if (!item) return null;
    atual.tarefas.push({ id: `antiga-${atual.tarefas.length}`, codigo: item[1], nome: item[2], precedente: item[3] ? { codigo: item[3], nome: item[4] } : null });
  }
  return projetos.length ? { projetos } : null;
}
