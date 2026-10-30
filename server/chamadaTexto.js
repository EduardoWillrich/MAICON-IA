const INICIO_DSML = /<\s*[|｜]\s*DSML\s*[|｜]/i;

export function extrairChamadasDoTexto(bruto) {
  const original = String(bruto ?? "");
  const inicio = original.search(INICIO_DSML);
  if (inicio < 0) return { texto: original, chamadas: [] };
  const marcado = original.slice(inicio);
  const chamadas = [];
  const invoke = /<\s*[|｜]\s*DSML\s*[|｜]\s*invoke\b([^>]*)>([\s\S]*?)(?=<\s*\/\s*[|｜]\s*DSML\s*[|｜]\s*invoke\s*>|<\s*[|｜]\s*DSML\s*[|｜]\s*invoke\b|$)/gi;
  for (const achado of marcado.matchAll(invoke)) {
    const nome = achado[1].match(/\bname\s*=\s*"([^"]+)"/i)?.[1]?.trim();
    if (!nome) continue;
    const args = {};
    const parametro = /<\s*[|｜]\s*DSML\s*[|｜]\s*parameter\b([^>]*)>([\s\S]*?)(?=<\s*\/\s*[|｜]\s*DSML\s*[|｜]\s*parameter\s*>|<\s*[|｜]\s*DSML\s*[|｜]\s*parameter\b|$)/gi;
    for (const item of achado[2].matchAll(parametro)) {
      const chave = item[1].match(/\bname\s*=\s*"([^"]+)"/i)?.[1]?.trim();
      if (!chave) continue;
      const valor = item[2].trim();
      if (/string\s*=\s*"true"/i.test(item[1])) {
        args[chave] = valor;
        continue;
      }
      try {
        args[chave] = JSON.parse(valor);
      } catch {
        args[chave] = valor;
      }
    }
    chamadas.push({
      id: `dsml_${chamadas.length + 1}`,
      type: "function",
      function: { name: nome, arguments: JSON.stringify(args) },
    });
  }
  return { texto: original.slice(0, inicio).trim(), chamadas };
}

export function criarFiltroDeChamada(aoTexto) {
  let pendente = "";
  const soltarAntesDaMarca = () => {
    const marca = pendente.search(INICIO_DSML);
    if (marca < 0) return false;
    const antes = pendente.slice(0, marca);
    pendente = pendente.slice(marca);
    if (antes) aoTexto?.(antes);
    return true;
  };
  return {
    receber(pedaco) {
      if (!pedaco) return;
      pendente += pedaco;
      if (soltarAntesDaMarca() || INICIO_DSML.test(pendente)) return;
      const lt = pendente.lastIndexOf("<");
      if (lt >= 0 && pendente.length - lt < 32 && !pendente.slice(lt).includes(">")) {
        const antes = pendente.slice(0, lt);
        pendente = pendente.slice(lt);
        if (antes) aoTexto?.(antes);
        return;
      }
      if (pendente) aoTexto?.(pendente);
      pendente = "";
    },
    finalizar() {
      if (!pendente || INICIO_DSML.test(pendente)) return;
      aoTexto?.(pendente);
      pendente = "";
    },
  };
}
