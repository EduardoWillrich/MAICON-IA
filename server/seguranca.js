const PROIBIDOS =
  /\b(insert|update|delete|merge|drop|alter|create|truncate|exec|execute|grant|revoke|deny|into|openrowset|opendatasource|openquery|bulk|shutdown|backup|restore|dbcc|reconfigure|waitfor|kill)\b|\b(sp|xp)_\w+/i;

export function exigirSomenteLeitura(texto) {
  const comando = String(texto ?? "");
  const semComentarios = comando.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  if (!/^\s*(select|with)\b/i.test(semComentarios)) {
    throw new Error("Bloqueado: só consultas de leitura (Select) são permitidas.");
  }
  if (/^\s*with\b/i.test(semComentarios) && !/\bselect\b/i.test(semComentarios)) {
    throw new Error("Bloqueado: a consulta precisa de um Select.");
  }
  const proibido = semComentarios.match(PROIBIDOS);
  if (proibido) {
    throw new Error(`Bloqueado: comando "${proibido[0]}" não é permitido. Esta ferramenta só lê dados.`);
  }
  if (/;\s*\S/.test(semComentarios)) {
    throw new Error("Bloqueado: apenas um comando por consulta.");
  }
}

export function protegerPool(pool) {
  const criar = pool.request.bind(pool);
  pool.request = () => {
    const req = criar();
    const consultar = req.query.bind(req);
    req.query = (texto, ...resto) => {
      exigirSomenteLeitura(texto);
      return consultar(texto, ...resto);
    };
    req.batch = () => Promise.reject(new Error("Bloqueado: batch não é permitido."));
    req.execute = () => Promise.reject(new Error("Bloqueado: procedures não são permitidas."));
    req.bulk = () => Promise.reject(new Error("Bloqueado: bulk não é permitido."));
    return req;
  };
  pool.query = () => Promise.reject(new Error("Bloqueado: use pool.request()."));
  pool.batch = () => Promise.reject(new Error("Bloqueado: batch não é permitido."));
  pool.transaction = () => {
    throw new Error("Bloqueado: transações não são permitidas.");
  };
  return pool;
}
