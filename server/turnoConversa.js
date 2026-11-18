export function consultouNoTurno(mensagens) {
  const lista = Array.isArray(mensagens) ? mensagens : [];
  const inicio = lista.findLastIndex((item) => item?.role === "user");
  return inicio >= 0 && lista.slice(inicio + 1).some((item) => item?.role === "tool");
}
