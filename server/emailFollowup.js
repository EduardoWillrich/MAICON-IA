import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CAMPOS = [
  "Exportador",
  "Importador",
  "HBL",
  "Navio/Viagem",
  "Origem",
  "Destino",
  "CE Mercante",
  "Destino final",
  "Prev. de embarque",
  "Prev. de desembarque",
  "Data de embarque",
  "Data de desembarque",
  "Modalidade de frete",
  "Mercadoria",
  "Peso bruto",
  "Qtde de volumes",
  "Cubagem",
  "Term. desova",
  "Cia de transporte",
  "Containers",
  "Booking",
];

function texto(valor) {
  return String(valor ?? "").replace(/\s+/g, " ").trim();
}

function esc(valor) {
  return texto(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chave(rotulo) {
  return rotulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function tituloDe(numero) {
  if (/^EM/i.test(numero)) return "Follow-up · Exportação marítima";
  if (/^IA/i.test(numero)) return "Follow-up · Importação aérea";
  if (/^EA/i.test(numero)) return "Follow-up · Exportação aérea";
  return "Follow-up · Importação marítima";
}

function porto(bruto) {
  const valor = texto(bruto);
  const corte = valor.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!corte) return { nome: valor || "—", codigo: "" };
  return { nome: corte[1].trim() || valor, codigo: corte[2].trim() };
}

function dataDoMarco(marcos, nome) {
  const marco = (marcos || []).find((item) => item?.nome === nome && texto(item.valor));
  if (!marco) return "";
  return marco.previsto ? `${nome} previsto ${marco.valor}` : `${nome} ${marco.valor}`;
}

function camposDe(modelo) {
  const vindos = new Map();
  for (const item of modelo.campos || []) {
    if (!item?.label) continue;
    vindos.set(chave(String(item.label)), texto(item.value).replace(/\bm3\b/g, "m³"));
  }
  const origem = porto(modelo.origem);
  const destino = porto(modelo.destino);
  const navio = [texto(modelo.navio), texto(modelo.viagem)].filter(Boolean).join(" / ");
  const reservas = {
    hbl: texto(modelo.conhecimento),
    navioviagem: navio,
    origem: origem.nome === "—" ? "" : origem.nome,
    destino: destino.nome === "—" ? "" : destino.nome,
    cemercante: texto(modelo.ce),
    ciadetransporte: texto(modelo.companhia),
  };
  const usados = new Set(CAMPOS.map(chave));
  const oficiais = CAMPOS.map((label) => {
    const id = chave(label);
    const vindo = vindos.get(id);
    return { label, value: vindo || reservas[id] || "" };
  });
  const extras = (modelo.campos || [])
    .filter((item) => item?.label && !usados.has(chave(String(item.label))))
    .map((item) => ({ label: texto(item.label), value: texto(item.value) }));
  return [...oficiais, ...extras];
}

function notasDe(modelo) {
  return (modelo.acompanhamentos || []).map((nota) => {
    const bruto = texto(nota.texto);
    const partes = bruto.split(/\s*(?=Aviso importante\s*:)/i).map((parte) => parte.trim()).filter(Boolean);
    return {
      data: texto(nota.data) || "Nota",
      autor: "",
      texto: partes.length > 1 ? partes[0] : bruto,
      aviso: partes.length > 1 ? partes.slice(1).join(" ") : "",
    };
  });
}

function valorCampo(modelo, rotulo) {
  const alvo = chaveCampo(rotulo);
  const item = (modelo.campos || []).find((campo) => chaveCampo(campo?.label) === alvo);
  return texto(item?.value);
}

function chaveCampo(rotulo) {
  return String(rotulo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function nomePorto(valor) {
  const nome = porto(valor).nome;
  if (!nome || nome === "—") return "";
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function assuntoDoFollowup(modelo) {
  const rota = [nomePorto(modelo.origem), nomePorto(modelo.destino)].filter(Boolean).join(" X ");
  return [
    `FOLLOW UP - Processo: ${texto(modelo.numero) || "Processo"}`,
    texto(modelo.referencia),
    valorCampo(modelo, "Exportador") ? `Shipper: ${valorCampo(modelo, "Exportador")}` : "",
    valorCampo(modelo, "Importador") || texto(modelo.cliente) ? `Consignee: ${valorCampo(modelo, "Importador") || texto(modelo.cliente)}` : "",
    rota,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function montarCorpoFollowup(modelo, semStatus = false, comLogo = true) {
  const numero = texto(modelo.numero) || "Processo";
  const cliente = texto(modelo.cliente) || "Cliente não informado";
  const titulo = tituloDe(numero);
  const origem = porto(modelo.origem);
  const destino = porto(modelo.destino);
  const embarque = dataDoMarco(modelo.marcos, "Embarque");
  const desembarque = dataDoMarco(modelo.marcos, "Desembarque");
  const navio = texto(modelo.navio) ? `${texto(modelo.navio)}${texto(modelo.viagem) ? ` · viagem ${texto(modelo.viagem)}` : ""}` : "";
  const campos = camposDe(modelo);
  const notas = notasDe(modelo);
  const status = semStatus ? "" : texto(modelo.situacao);
  const meta = [
    ["Referência", numero],
    ["Cliente", cliente],
    modelo.referencia ? ["Ref. cliente", texto(modelo.referencia)] : null,
    modelo.data ? ["Data", texto(modelo.data)] : null,
  ].filter(Boolean);

  const linhasCampo = [];
  for (let i = 0; i < campos.length; i += 2) {
    const par = [campos[i], campos[i + 1]];
    linhasCampo.push(
      `<tr>${par
        .map((campo) =>
          campo
            ? `<td style="width:50%;padding:16px 22px;border-top:1px solid #e6e9f0;vertical-align:top;"><div style="color:#6b7385;font-size:14px;">${esc(campo.label)}</div><div style="margin-top:3px;font-weight:700;font-size:16px;color:#1d2433;">${esc(campo.value || "—")}</div></td>`
            : `<td style="width:50%;border-top:1px solid #e6e9f0;"></td>`,
        )
        .join("")}</tr>`,
    );
  }

  const blocosNota = notas.length
    ? notas
        .map((nota, indice) => {
          const fundo = indice === 0 ? "#fdecec" : "#f4f5f9";
          const aviso = nota.aviso
            ? `<div style="margin-top:8px;padding:14px 16px;border-radius:12px;background:#fff6dd;color:#8a6100;font-size:15px;">${esc(nota.aviso)}</div>`
            : "";
          const corpo = nota.texto
            ? `<div style="margin-top:8px;padding:14px 16px;border-radius:12px;background:${fundo};font-size:16px;color:#1d2433;">${esc(nota.texto)}</div>`
            : "";
          return `<tr><td style="padding:0 28px 18px;"><div style="font-size:15px;"><strong>${esc(nota.data)}</strong></div>${corpo}${aviso}</td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:8px 28px 22px;color:#6b7385;font-size:16px;">Nenhum acompanhamento neste processo.</td></tr>`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f4f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#1d2433;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:920px;margin:0 auto;">
<tr><td style="background:#fff;border:1px solid #e6e9f0;border-bottom:6px solid #e8302d;border-radius:20px;padding:32px 36px;">
<table role="presentation" width="100%"><tr>
<td style="vertical-align:top;">${comLogo ? `<img src="cid:logo-conline" alt="Conline" height="72" style="display:block;height:72px;width:auto;border:0;"/>` : `<div style="font-size:36px;font-weight:800;color:#e8302d;letter-spacing:-0.04em;">conline</div>`}<div style="margin-top:12px;font-size:26px;font-weight:700;">${esc(titulo)}</div></td>
<td style="vertical-align:top;background:#f4f5f9;border-radius:14px;padding:16px 20px;" align="right">${meta
    .map(
      ([rotulo, valor]) =>
        `<div style="font-size:16px;margin:0 0 6px;"><span style="color:#6b7385;">${esc(rotulo)}</span> <strong>${esc(valor)}</strong></div>`,
    )
    .join("")}</td>
</tr></table></td></tr>
<tr><td style="height:14px;"></td></tr>
<tr><td style="background:#fff;border:1px solid #e6e9f0;border-radius:20px;">
<table role="presentation" width="100%" style="padding:8px 0;"><tr>
<td style="padding:24px 28px;vertical-align:top;"><div style="color:#6b7385;font-size:14px;">Origem</div><div style="font-size:28px;font-weight:800;">${esc(origem.nome)}</div>${origem.codigo ? `<div style="color:#6b7385;font-size:14px;">${esc(origem.codigo)}</div>` : ""}${embarque ? `<div style="margin-top:8px;"><span style="background:#fdecec;color:#c42421;border-radius:999px;padding:5px 12px;font-size:14px;font-weight:700;">${esc(embarque)}</span></div>` : ""}</td>
<td style="padding:24px 8px;text-align:center;color:#6b7385;font-size:14px;font-weight:600;" valign="middle">${esc(navio)}<div style="margin-top:10px;border-top:2px dashed #e8302d;"></div></td>
<td style="padding:24px 28px;vertical-align:top;" align="right"><div style="color:#6b7385;font-size:14px;">Destino</div><div style="font-size:28px;font-weight:800;">${esc(destino.nome)}</div>${destino.codigo ? `<div style="color:#6b7385;font-size:14px;">${esc(destino.codigo)}</div>` : ""}${desembarque ? `<div style="margin-top:8px;"><span style="background:#fdecec;color:#c42421;border-radius:999px;padding:5px 12px;font-size:14px;font-weight:700;">${esc(desembarque)}</span></div>` : ""}</td>
</tr></table>
${status ? `<div style="padding:0 28px 18px;"><span style="display:inline-block;background:#e4f6ea;color:#17803d;border-radius:999px;padding:8px 16px;font-size:15px;font-weight:700;">${esc(status)}</span></div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhasCampo.join("")}</table>
</td></tr>
<tr><td style="height:14px;"></td></tr>
<tr><td style="background:#fff;border:1px solid #e6e9f0;border-radius:20px;overflow:hidden;">
<div style="background:#e8302d;color:#fff;font-size:18px;font-weight:700;padding:20px 28px;">Acompanhamentos</div>
<table role="presentation" width="100%" style="padding-top:16px;">${blocosNota}</table>
</td></tr>
<tr><td style="padding:16px 8px 0;text-align:center;color:#6b7385;font-size:14px;">Conline · Acompanhamento de ${esc(titulo.replace(/^Follow-up · /i, "").toLowerCase())}</td></tr>
</table></body></html>`;

  const plano = [
    titulo,
    `Referência: ${numero}`,
    `Cliente: ${cliente}`,
    modelo.referencia ? `Ref. cliente: ${texto(modelo.referencia)}` : "",
    `Origem: ${origem.nome}${origem.codigo ? ` (${origem.codigo})` : ""}`,
    `Destino: ${destino.nome}${destino.codigo ? ` (${destino.codigo})` : ""}`,
    navio ? `Navio: ${navio}` : "",
    "",
    ...campos.map((campo) => `${campo.label}: ${campo.value || "—"}`),
    "",
    "Acompanhamentos",
    ...(notas.length ? notas.map((nota) => `${nota.data}\n${nota.texto}${nota.aviso ? `\n${nota.aviso}` : ""}`) : ["Nenhum acompanhamento neste processo."]),
  ]
    .filter((linha) => linha !== "")
    .join("\n");

  return { html, texto: plano, numero, cliente };
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function dobrar(buffer) {
  return buffer.toString("base64").replace(/.{1,76}/g, "$&\r\n");
}

function cabeca(valor) {
  const limpo = texto(valor);
  if (/^[\x20-\x7E]*$/.test(limpo)) return limpo;
  return `=?UTF-8?B?${Buffer.from(limpo, "utf8").toString("base64")}?=`;
}

function emailsDoModelo(modelo) {
  const achados = [];
  for (const item of modelo?.emailsCliente || []) achados.push(...String(item).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []);
  achados.push(...(String(modelo?.emailCliente ?? "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []));
  const vistos = new Set();
  const lista = [];
  for (const item of achados) {
    const email = item.toLowerCase();
    if (vistos.has(email)) continue;
    vistos.add(email);
    lista.push(email);
  }
  return lista;
}

function destinatarios(para, modelo) {
  const bruto = texto(para);
  if (!bruto || /^cliente$/i.test(bruto)) {
    const cadastro = emailsDoModelo(modelo);
    if (!cadastro.length) throw new Error("O cliente não tem e-mail no cadastro. Informe o endereço.");
    return cadastro.slice(0, 40);
  }
  const lista = (bruto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((item) => item.toLowerCase());
  const unicos = [...new Set(lista)];
  if (!unicos.length || unicos.length > 40) throw new Error("Informe um e-mail válido para enviar o follow-up.");
  return unicos;
}

async function logo() {
  try {
    return await readFile(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "conline-logo-vermelha.png"));
  } catch {
    return null;
  }
}

function listaDeEmails(para, aviso) {
  const lista = (texto(para).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((item) => item.toLowerCase());
  const unicos = [...new Set(lista)];
  if (!unicos.length || unicos.length > 40) throw new Error(aviso);
  return unicos;
}

function textoDoHtml(html) {
  return String(html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 20000);
}

async function enviarPeloGmail(token, { para, assunto, html, textoPlano, numero }) {
  const acesso = texto(token);
  if (!acesso) throw new Error("A sessão do Gmail expirou. Autorize o envio na janela do Google.");
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(acesso)}`);
  const escopo = info.ok ? String((await info.json().catch(() => ({})))?.scope ?? "") : "";
  if (!escopo.includes("gmail.send")) {
    throw new Error("A conta ainda não autorizou o envio de e-mail. Autorize na janela do Google e tente de novo.");
  }
  const imagem = await logo();
  let corpoHtml = String(html ?? "").replace(/<script\b[\s\S]*?<\/script>/gi, "").slice(0, 700000);
  if (imagem) corpoHtml = corpoHtml.replace(/src="data:image\/png;base64,[^"]+"/gi, 'src="cid:logo-conline"');
  const anexaLogo = Boolean(imagem) && corpoHtml.includes("cid:logo-conline");
  const relacionado = "rel-email";
  const alternativo = "alt-email";
  const partes = [
    `To: ${para.join(", ")}`,
    `Subject: ${cabeca(assunto)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${relacionado}"`,
    "",
    `--${relacionado}`,
    `Content-Type: multipart/alternative; boundary="${alternativo}"`,
    "",
    `--${alternativo}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    dobrar(Buffer.from(textoPlano || textoDoHtml(corpoHtml), "utf8")),
    "",
    `--${alternativo}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    dobrar(Buffer.from(corpoHtml, "utf8")),
    "",
    `--${alternativo}--`,
  ];
  if (anexaLogo) {
    partes.push(
      "",
      `--${relacionado}`,
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "Content-ID: <logo-conline>",
      'Content-Disposition: inline; filename="conline.png"',
      "",
      dobrar(imagem),
    );
  }
  partes.push("", `--${relacionado}--`, "");
  const raw = base64url(Buffer.from(partes.join("\r\n"), "utf8"));
  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${acesso}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const dados = await resp.json().catch(() => ({}));
  if (resp.status === 401 || resp.status === 403) {
    throw new Error("O Google não autorizou o envio. Saia e entre de novo, marcando o envio de e-mails.");
  }
  if (!resp.ok) throw new Error(dados?.error?.message || "Não consegui enviar o e-mail.");
  return { enviado: true, para, numero: numero || "", assunto };
}

export async function enviarHtmlGmail(token, opcoes = {}) {
  const assunto = texto(opcoes.assunto);
  const html = String(opcoes.html ?? "");
  if (!assunto || !html.trim()) throw new Error("O e-mail não tem assunto ou corpo para enviar.");
  const para = listaDeEmails(opcoes.para, "Informe um e-mail válido para enviar.");
  return enviarPeloGmail(token, { para, assunto, html, textoPlano: texto(opcoes.texto), numero: texto(opcoes.numero) });
}

export async function enviarFollowupGmail(token, modelo, opcoes = {}) {
  const para = destinatarios(opcoes.para, modelo);
  const imagem = await logo();
  const corpo = montarCorpoFollowup(modelo, Boolean(opcoes.semStatus), Boolean(imagem));
  const assunto = texto(opcoes.assunto) || assuntoDoFollowup(modelo);
  return enviarPeloGmail(token, { para, assunto, html: corpo.html, textoPlano: corpo.texto, numero: corpo.numero });
}
