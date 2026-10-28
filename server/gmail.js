function cabeca(mensagem, nome) {
  const headers = mensagem?.payload?.headers ?? [];
  const item = headers.find((h) => String(h.name).toLowerCase() === nome);
  return String(item?.value ?? "").replace(/\s+/g, " ").trim();
}

function dataLegivel(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(n));
  return texto.replace(",", "");
}

function remetente(bruto) {
  const texto = String(bruto ?? "").replace(/\\"/g, "").trim();
  const email = texto.match(/<([^>]+)>/)?.[1]?.trim() ?? "";
  let nome = email ? texto.slice(0, texto.lastIndexOf("<")) : texto;
  nome = nome.replace(/^["']+|["']+$/g, "").replace(/["']/g, "").replace(/\s+/g, " ").trim();
  if (nome && email) return `${nome} · ${email}`;
  return nome || email;
}

function decodificar(data) {
  const bruto = String(data ?? "").replace(/-/g, "+").replace(/_/g, "/");
  if (!bruto) return "";
  try {
    return Buffer.from(bruto, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function partesDe(payload, achados = []) {
  if (!payload) return achados;
  if (payload.body?.data) achados.push({ tipo: String(payload.mimeType ?? ""), texto: decodificar(payload.body.data) });
  for (const parte of payload.parts ?? []) partesDe(parte, achados);
  return achados;
}

function htmlParaTexto(html) {
  return String(html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<\/(p|div|tr|h\d|li|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;/g, " ");
}

function semLinks(texto) {
  return texto
    .replace(/\[[^\]]*\]\(https?:\/\/[^)]*\)/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .split("\n")
    .map((linha) => linha.replace(/\(\s*\)/g, " ").replace(/[ \t]{2,}/g, " ").trim())
    .filter((linha) => linha && !/^[\[\]()A-Za-z0-9+/=_-]{24,}$/.test(linha))
    .join("\n");
}

function corpoDoEmail(mensagem) {
  const partes = partesDe(mensagem.payload);
  const plano = partes.find((parte) => parte.tipo === "text/plain" && parte.texto.trim());
  const html = partes.find((parte) => parte.tipo === "text/html" && parte.texto.trim());
  const textoHtml = html ? htmlParaTexto(html.texto) : "";
  const textoPlano = plano?.texto?.trim() ?? "";
  const base = textoHtml.length > textoPlano.length + 40 ? textoHtml : textoPlano || textoHtml || String(mensagem.snippet ?? "");
  const linhas = base
    .replace(/\r/g, "")
    .split("\n")
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .filter((linha) => linha && !/[{};]|font-family|!important|^\.[\w-]+/.test(linha));
  const unico = [];
  for (const linha of linhas) {
    if (unico.at(-1) !== linha) unico.push(linha);
  }
  return semLinks(unico.join("\n")).slice(0, 1200);
}

function trechoLimpo(snippet) {
  let texto = String(snippet ?? "").replace(/<[^>]+>/g, " ");
  const corte = texto.search(/\bhtml\b|\bbody\s*\{|\{[^}]{0,80}!important|font-family\s*:/i);
  if (corte > 20) texto = texto.slice(0, corte);
  return texto.replace(/\s+/g, " ").trim().slice(0, 180);
}

async function lerCaixa(acesso, consulta, limite) {
  const lista = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limite}&q=${encodeURIComponent(consulta)}`,
    { headers: { Authorization: `Bearer ${acesso}` } },
  );
  const dados = await lista.json();
  if (lista.status === 401 || lista.status === 403) {
    const motivo = String(dados?.error?.message ?? "").trim();
    const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(acesso)}`);
    const corpo = info.ok ? await info.json().catch(() => ({})) : {};
    const escopos = String(corpo?.scope ?? "");
    if (!info.ok || !escopos) {
      return { erro: "A sessão do Gmail expirou.", expirado: true };
    }
    if (!escopos.includes("gmail.readonly")) {
      return { erro: "O login atual não inclui a leitura do Gmail. Saia e entre de novo. Na tela do Google, marque o acesso aos e-mails." };
    }
    if (/has not been used|is disabled|accessNotConfigured/i.test(motivo)) {
      return { erro: "A conta autorizou o Gmail, mas a API do Gmail está desligada no projeto do Google Cloud. Ative a Gmail API nesse projeto e tente outra vez." };
    }
    const texto = motivo
      ? `O Google recusou a leitura da caixa de entrada: ${motivo}`
      : "O Google recusou a leitura da caixa de entrada. Saia e entre de novo, marcando o acesso aos e-mails.";
    return { erro: texto };
  }
  if (!lista.ok) throw new Error(dados?.error?.message || "Falha ao ler o Gmail.");
  const ids = Array.isArray(dados.messages) ? dados.messages.slice(0, limite) : [];
  const mensagens = [];
  for (const item of ids) {
    const resp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=full`,
      { headers: { Authorization: `Bearer ${acesso}` } },
    );
    const mensagem = await resp.json();
    if (!resp.ok) continue;
    const naoLida = Array.isArray(mensagem.labelIds) && mensagem.labelIds.includes("UNREAD");
    const deBruto = cabeca(mensagem, "from");
    const assunto = cabeca(mensagem, "subject") || "(sem assunto)";
    const trecho = corpoDoEmail(mensagem) || trechoLimpo(mensagem.snippet);
    mensagens.push({
      de: remetente(deBruto),
      email: (deBruto.match(/<([^>]+)>/)?.[1] || deBruto).trim().toLowerCase(),
      resposta: (cabeca(mensagem, "reply-to").match(/<([^>]+)>/)?.[1] || cabeca(mensagem, "reply-to")).trim().toLowerCase(),
      autenticacao: cabeca(mensagem, "authentication-results"),
      assunto,
      data: dataLegivel(mensagem.internalDate),
      trecho,
      naoLida,
      chamado: /chamado|ticket|help\s*desk|suporte/i.test(`${assunto} ${trecho}`),
      head: /head\s*cargo|headcargo|integra[cç][aã]o|falha|erro|exception|timeout/i.test(`${assunto} ${trecho}`),
      suspeito: sinaisSuspeitos(deBruto, cabeca(mensagem, "reply-to"), cabeca(mensagem, "authentication-results"), `${assunto} ${trecho}`),
    });
  }
  return { mensagens };
}

function numerosDeProcesso(mensagens) {
  const achados = new Set();
  for (const item of mensagens) {
    const texto = `${item.assunto} ${item.trecho}`;
    for (const numero of texto.match(/\b[A-Z]{1,4}\d{2,6}-\d{2}\b/g) ?? []) achados.add(numero);
  }
  return [...achados].slice(0, 12);
}

export async function resumirGmail(token, visao = "") {
  const acesso = String(token ?? "").trim();
  if (!acesso) {
    return {
      texto: "A leitura do Gmail ainda não foi autorizada. Saia e entre de novo com o Google para permitir o resumo dos e-mails.",
      processos: [],
    };
  }
  const recentes = await lerCaixa(acesso, "in:inbox newer_than:7d", 10);
  if (recentes.erro) return { texto: recentes.erro, processos: [] };
  const parados = await lerCaixa(acesso, "in:inbox older_than:2d newer_than:21d", 8);
  const paradas = parados.erro ? [] : parados.mensagens;
  const clientes = recentes.mensagens.filter((item) => item.email && !/conline/i.test(item.email));
  const processos = numerosDeProcesso([...recentes.mensagens, ...paradas]);
  const texto =
    visao === "ti"
      ? [bloco("E-mails parados", paradas, "Nenhum e-mail parado há mais de 2 dias."), textoDoTi(recentes.mensagens)].filter(Boolean).join("\n\n")
      : [
          bloco("E-mails parados", paradas, "Nenhum e-mail parado há mais de 2 dias."),
          bloco("Respostas de clientes", clientes, "Nenhuma resposta de cliente nos últimos 7 dias."),
          bloco("Outras mensagens recentes", recentes.mensagens.filter((item) => !clientes.includes(item)).slice(0, 6), ""),
        ]
          .filter(Boolean)
          .join("\n\n");
  return { texto, processos };
}

async function estimarCaixa(acesso, consulta) {
  const lista = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=${encodeURIComponent(consulta)}`,
    { headers: { Authorization: `Bearer ${acesso}` } },
  );
  const dados = await lista.json().catch(() => ({}));
  if (!lista.ok) return null;
  return Number(dados.resultSizeEstimate) || 0;
}

export async function cartoesGmail(token) {
  const acesso = String(token ?? "").trim();
  if (!acesso) return { autorizado: false, naoLidas: 0, itens: [] };
  const [recentes, naoLidas] = await Promise.all([
    lerCaixa(acesso, "in:inbox newer_than:7d", 6),
    estimarCaixa(acesso, "in:inbox is:unread newer_than:7d"),
  ]);
  if (recentes.erro) {
    return { autorizado: true, erro: recentes.erro, expirado: Boolean(recentes.expirado), naoLidas: 0, itens: [] };
  }
  return {
    autorizado: true,
    naoLidas: naoLidas ?? recentes.mensagens.filter((item) => item.naoLida).length,
    itens: recentes.mensagens.slice(0, 5).map((item) => ({
      de: item.de,
      assunto: item.assunto,
      data: item.data,
      trecho: String(item.trecho ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
      naoLida: Boolean(item.naoLida),
    })),
  };
}

function dominio(email) {
  return String(email ?? "").split("@")[1] || "";
}

function sinaisSuspeitos(de, resposta, autenticacao, texto) {
  const sinais = [];
  const email = (String(de).match(/<([^>]+)>/)?.[1] || "").toLowerCase();
  const reply = (String(resposta).match(/<([^>]+)>/)?.[1] || String(resposta)).toLowerCase();
  const interno = /conline/i.test(dominio(email));
  if (!interno && email && reply && reply.includes("@") && dominio(email) !== dominio(reply)) {
    sinais.push("a resposta vai para outro domínio");
  }
  if (/spf=fail|dkim=fail|dmarc=fail/i.test(autenticacao)) sinais.push("a autenticação do remetente falhou");
  if (/senha|credencial|pix|boleto|urgente|clique aqui|confirme sua conta|wire transfer/i.test(texto)) {
    sinais.push("pede ação sensível ou pagamento");
  }
  const nome = String(de).replace(/<[^>]+>/, "");
  if (email && /conline/i.test(nome) && !/conline/i.test(email)) sinais.push("o nome parece da empresa, mas o endereço não");
  return sinais;
}

function corpoArrumado(trecho, assunto) {
  const rotulos = /^(chamado|tipo|solicitante|pedido|cliente|processo)$/i;
  const linhas = String(trecho ?? "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha && linha !== assunto && !/^sirius system$/i.test(linha));
  const saida = [];
  for (let i = 0; i < linhas.length; i++) {
    if (rotulos.test(linhas[i]) && linhas[i + 1] && !rotulos.test(linhas[i + 1])) {
      saida.push(`**${linhas[i]}:** ${linhas[i + 1]}`);
      i += 1;
    } else if (!rotulos.test(linhas[i])) {
      saida.push(linhas[i]);
    }
  }
  return saida.slice(0, 10).join("\n");
}

function cartao(item) {
  const dados = {
    assunto: item.assunto,
    de: item.de,
    data: item.data,
    naoLida: Boolean(item.naoLida),
    alerta: item.suspeito.length ? item.suspeito.join("; ") : "",
    corpo: corpoArrumado(item.trecho, item.assunto),
  };
  return "```email\n" + JSON.stringify(dados) + "\n```";
}

function bloco(titulo, itens, vazio) {
  if (!itens.length) return vazio ? `#### ${titulo}\n\n${vazio}` : "";
  return `#### ${titulo}\n\n${itens.map(cartao).join("\n")}`;
}

function textoDoTi(mensagens) {
  const alertas = mensagens.filter((item) => item.suspeito.length);
  const chamadosAbertos = mensagens.filter((item) => item.chamado && !/conclu[ií]d|encerrad|resolvid/i.test(item.assunto));
  const chamadosFechados = mensagens.filter((item) => item.chamado && /conclu[ií]d|encerrad|resolvid/i.test(item.assunto));
  const head = mensagens.filter((item) => item.head && !item.chamado);
  const prioridade = [...alertas, ...chamadosAbertos, ...head.filter((item) => item.naoLida)].filter(
    (item, indice, lista) => lista.findIndex((outro) => outro.assunto === item.assunto && outro.data === item.data) === indice,
  );
  const resto = mensagens.filter((item) => !prioridade.includes(item) && !chamadosFechados.includes(item) && !head.includes(item));
  return [
    bloco("O que priorizar", prioridade.slice(0, 5), "Nada urgente nesta amostra."),
    bloco("Alertas para o TI", alertas, "Nenhum sinal de e-mail suspeito nesta amostra."),
    bloco("Chamados em aberto", chamadosAbertos, "Nenhum chamado em aberto nesta amostra."),
    bloco("Chamados concluídos", chamadosFechados, ""),
    bloco("Head e integração", head, ""),
    bloco("Demais mensagens", resto.slice(0, 6), ""),
  ]
    .filter(Boolean)
    .join("\n\n");
}
