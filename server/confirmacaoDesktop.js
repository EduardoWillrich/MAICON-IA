// Keep the desktop lock until the helper actually exits, including when SQL
// confirms the requested effect before the helper's visual wait has finished.
export async function executarComConfirmacao(iniciar, confirmar, intervaloMs = 700) {
  const execucao = iniciar();
  if (typeof confirmar !== "function") return execucao;
  let finalizado = false, consultando = false, confirmado = false;
  const timer = setInterval(async () => {
    if (finalizado || consultando || confirmado) return;
    consultando = true;
    try {
      if (await confirmar() && !finalizado) {
        confirmado = true;
        execucao.child?.kill();
      }
    } catch { /* SQL unavailable: retain the existing visual verification. */ }
    finally { consultando = false; }
  }, intervaloMs);
  try { const resultado = await execucao; return confirmado ? { ...resultado, confirmado: true } : resultado; }
  catch (erro) { if (confirmado) return { stdout: "", confirmado: true }; throw erro; }
  finally { finalizado = true; clearInterval(timer); }
}
