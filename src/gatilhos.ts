export type GatilhoProjeto = {
  id: string;
  origem: { codigo: string; nome: string };
  evento: string;
  destino: { codigo: string; nome: string };
  situacao: string;
  geraAtividade: boolean;
  observacao: string;
};
export type ProjetoGatilhos = { codigo: string; nome: string; gatilhos: GatilhoProjeto[] };
export type ListaGatilhos = { projetos: ProjetoGatilhos[] };

export function gatilhosDoTexto(texto: string): ListaGatilhos | null {
  const bloco = texto.match(/```gatilhos\s*\n([\s\S]*?)```/i);
  if (bloco) {
    try {
      const dados = JSON.parse(bloco[1]);
      if (!Array.isArray(dados?.projetos)) return null;
      const projetos: ProjetoGatilhos[] = [];
      for (const p of dados.projetos) {
        if (typeof p.codigo !== "string" || typeof p.nome !== "string" || !Array.isArray(p.gatilhos)) return null;
        for (const g of p.gatilhos) {
          if (typeof g.id !== "string" || typeof g.origem?.codigo !== "string" || typeof g.origem?.nome !== "string" || typeof g.destino?.codigo !== "string" || typeof g.destino?.nome !== "string" || typeof g.evento !== "string" || typeof g.situacao !== "string" || typeof g.geraAtividade !== "boolean" || typeof g.observacao !== "string") return null;
        }
        projetos.push(p);
      }
      return { projetos };
    } catch { return null; }
  }
  // Old conversations keep their original text. Render every stored line in
  // the new layout too, without turning the first rule into a subtitle.
  const projetos: ProjetoGatilhos[] = [];
  let atual: ProjetoGatilhos | null = null;
  for (const linha of texto.replace(/\r/g, "").split("\n")) {
    const cabecalho = linha.trim().match(/^(?:#{1,6}\s*)?Gatilhos do projeto\s+(\S+)\s+(.+)$/i);
    if (cabecalho) { atual = { codigo: cabecalho[1], nome: cabecalho[2], gatilhos: [] }; projetos.push(atual); continue; }
    if (!atual || !/^\s*[-*]\s+/.test(linha)) continue;
    const regra = linha.trim().match(/^[-*]\s+(.+?): quando fica (.+?), (.+?) fica ([^.]+)\.(?:\s*(Gera uma atividade nova\.))?\s*(.*)$/i);
    if (!regra) return null;
    const atividade = (v: string) => { const partes = v.match(/^(\S+)\s+(.+)$/); return partes ? { codigo: partes[1], nome: partes[2] } : { codigo: "", nome: v }; };
    atual.gatilhos.push({ id: `antigo-${atual.gatilhos.length}`, origem: atividade(regra[1]), evento: regra[2], destino: atividade(regra[3]), situacao: regra[4], geraAtividade: Boolean(regra[5]), observacao: regra[6] });
  }
  return projetos.length ? { projetos } : null;
}
