const normalizar = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function botaoDaPergunta(texto) {
  const t = normalizar(texto);
  if (!/atividad/.test(t)) return "";
  const verbos = [
    ["desbloqueie|desbloqueia|desbloquear", "DESBLOQUEAR"], ["bloqueie|bloqueia|bloquear", "BLOQUEAR"],
    ["cancele|cancela|cancelar", "CANCELAR"], ["conclua|conclui|concluir", "CONCLUIR"],
    ["restaure|restaura|restaurar|reative|reativa|reativar", "RESTAURAR"],
    ["encerre|encerra|encerrar", "ENCERRAR"], ["reabra|reabre|reabrir", "REABRIR"],
    ["inicie|inicia|iniciar", "INICIAR"], ["retome|retoma|retomar", "RETOMAR"],
    ["pause|pausa|pausar", "PAUSAR"], ["libere|libera|liberar", "LIBERAR"],
  ];
  for (const [verbo, botao] of verbos) {
    const comando = new RegExp(`(?:^|[;.!?]|\\be\\s+(?:depois\\s+)?)(?:\\s*(?:por favor|agora)[,:]?\\s*)?(?:${verbo})\\b`);
    const pedido = new RegExp(`\\b(?:pode|poderia|quero|preciso|gostaria|mande|manda|peca)\\s+(?:que\\s+)?(?:(?:o|a)\\s+)?(?:bot\\s+)?(?:para\\s+)?(?:${verbo})\\b`);
    if ((comando.test(t) || pedido.test(t)) && !new RegExp(`\\b(?:nao|sem)\\s+(?:${verbo})\\b`).test(t)) return botao;
  }
  return "";
}

export function consultaDeAtividade(texto) {
  const t = normalizar(texto);
  return /atividad/.test(t) && !botaoDaPergunta(t) && /\b(?:leia|ler|consulte|consultar|mostre|mostrar|veja|ver|diga|qual|quais|como|o que falta|o que precisa|sem alterar|sem concluir)\b/.test(t);
}
