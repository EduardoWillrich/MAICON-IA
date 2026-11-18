import { randomUUID } from "node:crypto";
import { abrirSqlite } from "./sqlite.js";
import { camposValidos } from "./comandosBot.js";

const finais = new Set(["concluida", "cancelada"]);
const acoes = new Set(["ler", "preencher", "concluir", "restaurar", "cancelar", "iniciar", "encerrar", "botao"]);
const agora = () => new Date().toISOString();
const texto = (v, n = 500) => String(v ?? "").trim().slice(0, n);
const email = (v) => texto(v, 180).toLowerCase();
const teste = (v) => /^[A-Z]{1,4}\d{2,6}-\d{2} teste$/i.test(v);

export function textoTarefa(t) {
  const nomes = { previa: "Prévia", fila: "Na fila", executando: "Executando", aguardando: "Aguardando sua resposta", pausada: "Pausada", revisao: "Precisa de conferência", concluida: "Etapas finalizadas", cancelada: "Cancelada", falhou: "Não foi possível continuar" };
  const e = t.etapas.find((v) => ["executando", "aguardando", "revisao", "falhou", "interrompido"].includes(v.estado));
  const feitas = t.etapas.filter((v) => ["confirmado", "observado"].includes(v.estado));
  let saida = `**${t.titulo}** — ${nomes[t.estado] || t.estado}.\n\n`;
  if (t.estado === "previa") {
    saida += t.etapas.map((v, i) => `${i + 1}. ${v.acao} em ${v.numero}${v.campo ? `: ${v.campo} = ${v.valor || "valor a informar"}` : v.codigo ? `, atividade ${v.codigo}` : ""}.`).join("\n");
    return `${saida}\n\nPosso executar essas etapas?`;
  }
  if (feitas.length) saida += feitas.map((v) => `- ${v.resultado || `${v.acao}: ${v.numero}`}${v.evidencia === "tela" ? " (Verificado na tela; gravação não conferida por consulta.)" : ""}`).join("\n") + "\n\n";
  if (e?.resultado) saida += `${e.resultado}\n\n`;
  if (e?.campos?.length) saida += `Informe os valores de ${e.campos.filter((c) => !e.valoresPendentes?.[c]).join("; ")}. Vou continuar do ponto em que parei.`;
  else if (e?.acao === "preencher" && e.estado === "aguardando") saida += `Qual valor devo colocar em ${e.campo} no processo ${e.numero}?`;
  else if (t.estado === "revisao") saida += "Confira essa etapa no HeadCargo e diga se ela foi realizada ou se devo repeti-la.";
  if (["fila", "executando"].includes(t.estado)) saida += `${feitas.length} de ${t.etapas.length} etapas realizadas. ${e ? `Etapa atual: ${e.acao}${e.campo ? ` ${e.campo}` : e.codigo ? ` ${e.codigo}` : ""} em ${e.numero}.` : "Aguardando a vez de executar."}`;
  return saida.trim();
}

export function validarEtapas(etapas) {
  if (!Array.isArray(etapas) || !etapas.length || etapas.length > 100) throw new Error("Informe de 1 a 100 etapas.");
  return etapas.map((e) => {
    const etapa = { acao: texto(e.acao, 20).toLowerCase(), numero: texto(e.numero, 40), codigo: texto(e.codigo, 40), campo: texto(e.campo, 80), valor: texto(e.valor, 80), caminho: texto(e.caminho, 180), botao: texto(e.botao, 40) };
    if (!acoes.has(etapa.acao)) throw new Error("Ação da rotina inválida.");
    if (etapa.acao === "botao" && !etapa.botao) throw new Error("Informe o rótulo do botão.");
    if (!etapa.numero || (etapa.acao !== "ler" && !teste(etapa.numero))) throw new Error("Alterações exigem o número completo de um processo teste.");
    if (etapa.acao === "preencher" && !etapa.campo) throw new Error("Informe o campo a preencher.");
    if (!["ler", "preencher"].includes(etapa.acao) && !etapa.codigo) throw new Error("Informe o código da atividade.");
    return { ...etapa, id: randomUUID(), estado: "pendente", tentativas: 0 };
  });
}

export function classificarResultado(resultado, etapa) {
  if (resultado && typeof resultado === "object" && resultado.estado) return resultado;
  const t = texto(resultado?.texto ?? resultado, 6000);
  const campos = camposValidos(t.match(/pediu para preencher:\s*([\s\S]+?)(?:\.\s*(?:Diga|$)|$)/i)?.[1]
    ?.split(";").map((v) => v.trim().replace(/\.$/, "")).filter(Boolean) || []);
  if (/reconectar|conex[aã]o.*(?:perdid|servidor)|minimizar.*maximizar/i.test(t)) return { estado: "revisao", texto: "O HeadCargo exibiu um aviso de conexão ou da janela, não campos obrigatórios. Confira a conexão e o estado da atividade antes de continuar." };
  if (campos.length) return { estado: "aguardando", texto: t, campos };
  if (/qual seguir|pediu um caminho|qual deles|mais de um cadastro|Diga o (?:código|valor)|Encontrei \d+ atividades/i.test(t)) return { estado: "aguardando", texto: t };
  if (/persistência não confirmada|não confirmou|não foi possível confirmar|revisão necessária/i.test(t)) return { estado: "revisao", texto: t };
  if (/^(Concluí|Restaurei|Cancelei|Iniciei)|já está concluída/i.test(t)) return { estado: "confirmado", evidencia: "banco", texto: t };
  if (/^O bot .+confirmou os dados na tela/i.test(t)) return { estado: "observado", evidencia: "tela", texto: t };
  if (etapa.acao === "ler" && !/^Não encontrei|^ERRO/i.test(t)) return { estado: "confirmado", evidencia: "consulta", texto: t };
  if (/bot (?:digitou|selecionou|clicou)|clique enviado/i.test(t)) return { estado: "revisao", texto: t };
  return { estado: "falhou", texto: t || "O bot não retornou evidência da execução." };
}

export class MotorOperacoes {
  constructor(db, executar, { recuperar = true } = {}) {
    this.db = db;
    this.executar = executar;
    this.rodando = new Set();
    this.fila = Promise.resolve();
    db.exec(`CREATE TABLE IF NOT EXISTS bot_tarefas (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, estado TEXT NOT NULL, dados TEXT NOT NULL, atualizado TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS bot_tarefas_conta ON bot_tarefas(email, atualizado);
    CREATE TABLE IF NOT EXISTS bot_rotinas (
      id TEXT NOT NULL, email TEXT NOT NULL, versao INTEGER NOT NULL, dados TEXT NOT NULL,
      PRIMARY KEY(id, email, versao)
    );
    CREATE TABLE IF NOT EXISTS bot_regras (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, dados TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bot_excecoes (
      email TEXT PRIMARY KEY, dados TEXT NOT NULL
    );`);
    if (recuperar) {
      for (const r of db.prepare("SELECT dados FROM bot_tarefas WHERE estado IN ('executando','fila')").all()) {
        const t = JSON.parse(r.dados);
        t.estado = "revisao";
        for (const e of t.etapas) if (e.estado === "executando") e.estado = "interrompido";
        this.evento(t, "Serviço reiniciado. Confira a etapa interrompida antes de retomar.");
        this.salvar(t);
      }
    }
  }
  evento(t, mensagem) {
    t.eventos = [...(t.eventos || []), { data: agora(), mensagem }].slice(-200);
  }
  salvar(t) {
    t.atualizado = agora();
    this.db.prepare(`INSERT INTO bot_tarefas VALUES (?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET estado=excluded.estado, dados=excluded.dados, atualizado=excluded.atualizado`)
      .run(t.id, t.email, t.estado, JSON.stringify(t), t.atualizado);
    return structuredClone(t);
  }
  obter(id, conta) {
    const r = this.db.prepare("SELECT dados FROM bot_tarefas WHERE id=? AND email=?").get(texto(id, 80), email(conta));
    if (!r) throw new Error("Tarefa não encontrada nesta conta.");
    return JSON.parse(r.dados);
  }
  async aguardar(id, conta, { progresso = () => {}, sinal, limiteMs = 600000 } = {}) {
    const inicio = Date.now();
    let ultima = "";
    while (true) {
      const t = this.obter(id, conta);
      if (sinal?.aborted) {
        if (!finais.has(t.estado)) this.controlar(id, conta, "cancelar");
        throw new DOMException("Cancelado", "AbortError");
      }
      const mensagem = t.eventos.at(-1)?.mensagem || t.estado;
      if (ultima !== mensagem) { progresso(mensagem); ultima = mensagem; }
      if (!["fila", "executando"].includes(t.estado) || Date.now() - inicio > limiteMs) return t;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  listar(conta) {
    return this.db.prepare("SELECT dados FROM bot_tarefas WHERE email=? ORDER BY CASE WHEN estado IN ('concluida','cancelada') THEN 1 ELSE 0 END, atualizado DESC LIMIT 40")
      .all(email(conta)).map((r) => JSON.parse(r.dados));
  }
  criar(conta, pedido) {
    if (!email(conta)) throw new Error("Conta obrigatória.");
    if (Number(this.db.prepare("SELECT COUNT(*) AS total FROM bot_tarefas WHERE email=? AND estado NOT IN ('concluida','cancelada')").get(email(conta)).total) >= 30) throw new Error("Conclua ou cancele tarefas abertas antes de criar outras.");
    const t = { id: randomUUID(), email: email(conta), titulo: texto(pedido.titulo, 120) || "Rotina HeadCargo", estado: "previa", criado: agora(), etapas: validarEtapas(pedido.etapas), rotina: pedido.rotina || null, eventos: [] };
    this.evento(t, "Prévia criada. Nenhuma alteração executada.");
    return this.salvar(t);
  }
  controlar(id, conta, acao, dados = {}) {
    const t = this.obter(id, conta);
    if (finais.has(t.estado)) throw new Error("Esta tarefa já foi encerrada.");
    if (acao === "pausar" || acao === "cancelar") {
      if (this.rodando.has(id)) t.solicitacao = acao;
      else t.estado = acao === "pausar" ? "pausada" : "cancelada";
      this.evento(t, this.rodando.has(id) ? `${acao === "pausar" ? "Pausa" : "Cancelamento"} solicitado. A ação em curso termina antes da interrupção.` : `Tarefa ${t.estado}.`);
      return this.salvar(t);
    }
    if (!["executar", "retomar"].includes(acao)) throw new Error("Controle de tarefa inválido.");
    if (this.rodando.has(id) || t.estado === "fila") return t;
    const bloqueada = t.etapas.find((e) => ["aguardando", "falhou", "revisao", "interrompido"].includes(e.estado));
    if (bloqueada) {
      // Unknown side effects must never be retried silently.
      if (["revisao", "interrompido"].includes(bloqueada.estado)) {
        if (dados.resolucao === "confirmado") {
          bloqueada.estado = "confirmado";
          bloqueada.evidencia = "conferencia_manual";
          this.evento(t, "Etapa conferida manualmente pelo solicitante.");
        } else if (dados.resolucao === "repetir") {
          bloqueada.estado = "pendente";
          this.evento(t, "Repetição da etapa solicitada após revisão.");
        } else throw new Error("Confira a etapa e informe se foi confirmada ou se deve ser repetida.");
      } else {
        if (bloqueada.campos?.length) {
          const valores = { ...(bloqueada.valoresPendentes || {}), ...(dados.valores || {}) };
          const faltam = bloqueada.campos.filter((c) => !texto(valores[c], 80));
          if (faltam.length) {
            bloqueada.valoresPendentes = valores;
            bloqueada.resultado = `Ainda preciso dos valores de ${faltam.join("; ")}. Os demais valores informados foram guardados.`;
            t.estado = "aguardando";
            this.evento(t, bloqueada.resultado);
            return this.salvar(t);
          }
          const preenchimentos = validarEtapas(bloqueada.campos.map((c) => ({ acao: "preencher", numero: bloqueada.numero, campo: c, valor: valores[c] })));
          if (t.etapas.length + preenchimentos.length > 100) throw new Error("A tarefa excederia 100 etapas.");
          t.etapas.splice(t.etapas.indexOf(bloqueada), 0, ...preenchimentos);
          bloqueada.campos = [];
          delete bloqueada.valoresPendentes;
        }
        if (dados.valor != null) bloqueada.valor = texto(dados.valor, 80);
        if (dados.caminho != null) bloqueada.caminho = texto(dados.caminho, 180);
        if (dados.codigo != null) bloqueada.codigo = texto(dados.codigo, 40);
        bloqueada.estado = "pendente";
      }
    }
    delete t.solicitacao;
    t.estado = "fila";
    this.evento(t, "Tarefa colocada na fila.");
    this.salvar(t);
    // Work continues independently of the HTTP request or chat stream.
    this.fila = this.fila.then(() => this.rodar(t.id, t.email)).catch(() => {});
    return t;
  }
  async rodar(id, conta) {
    if (this.rodando.has(id)) return;
    this.rodando.add(id);
    try {
      let t = this.obter(id, conta);
      if (t.estado !== "fila") return;
      t.estado = "executando";
      this.salvar(t);
      while (true) {
        t = this.obter(id, conta);
        if (t.solicitacao) {
          t.estado = t.solicitacao === "pausar" ? "pausada" : "cancelada";
          delete t.solicitacao;
          this.evento(t, `Tarefa ${t.estado}.`);
          this.salvar(t);
          return;
        }
        const e = t.etapas.find((item) => item.estado === "pendente");
        if (!e) {
          t.estado = "concluida";
          this.evento(t, "Todas as etapas terminaram. Consulte o nível de evidência de cada resultado.");
          this.salvar(t);
          return;
        }
        if (e.acao === "concluir" && !e.regrasConferidas) {
          const regras = this.regras(conta).filter((r) => r.codigo === e.codigo && (!r.processo || r.processo.toLowerCase() === e.numero.toLowerCase()));
          const faltam = regras.filter((r) => !t.etapas.some((p) => p.numero === e.numero && p.campo === r.campo && ["confirmado", "observado"].includes(p.estado)));
          e.regrasConferidas = true;
          if (faltam.length) {
            if (t.etapas.length + faltam.length > 100) throw new Error("A tarefa excederia 100 etapas com os requisitos validados.");
            t.etapas.splice(t.etapas.indexOf(e), 0, ...validarEtapas(faltam.map((r) => ({ acao: "preencher", numero: e.numero, campo: r.campo, valor: "" }))));
            this.evento(t, `Requisitos validados: ${faltam.map((r) => `${r.campo} (${r.justificativa})`).join("; ")}.`);
            this.salvar(t);
            continue;
          }
        }
        if (e.acao === "preencher" && !e.valor) {
          e.estado = "aguardando";
          e.resultado = `Diga o valor do campo ${e.campo}.`;
          t.estado = "aguardando";
          this.salvar(t);
          return;
        }
        e.estado = "executando";
        e.tentativas++;
        this.evento(t, `${e.acao}: ${e.numero}${e.campo ? ` / ${e.campo}` : e.codigo ? ` / ${e.codigo}` : ""}.`);
        this.salvar(t);
        let r;
        try { r = classificarResultado(await this.executar(e, conta), e); }
        catch (erro) { r = { estado: "revisao", texto: `Execução interrompida: ${erro.message}. Confira o HeadCargo antes de repetir.` }; }
        // Reload to preserve pause/cancel requests made while the desktop was busy.
        t = this.obter(id, conta);
        const atual = t.etapas.find((item) => item.id === e.id);
        Object.assign(atual, { estado: r.estado, resultado: r.texto, evidencia: r.evidencia || "", campos: r.campos || [], terminado: agora() });
        this.evento(t, r.texto);
        if (!["confirmado", "observado"].includes(r.estado)) {
          t.estado = t.solicitacao === "cancelar" ? "cancelada" : t.solicitacao === "pausar" ? "pausada" : r.estado === "aguardando" ? "aguardando" : r.estado === "revisao" ? "revisao" : "falhou";
          delete t.solicitacao;
          this.salvar(t);
          return;
        }
        this.salvar(t);
      }
    } catch (erro) {
      const t = this.obter(id, conta);
      t.estado = "revisao";
      this.evento(t, `Execução suspensa: ${erro.message}`);
      this.salvar(t);
    } finally { this.rodando.delete(id); }
  }
  salvarRotina(conta, pedido) {
    const etapas = validarEtapas(pedido.etapas);
    const id = texto(pedido.id, 80) || randomUUID();
    const versao = Number(this.db.prepare("SELECT MAX(versao) AS v FROM bot_rotinas WHERE id=? AND email=?").get(id, email(conta)).v || 0) + 1;
    const rotina = { id, versao, nome: texto(pedido.nome, 120) || "Rotina", etapas, criado: agora() };
    this.db.prepare("INSERT INTO bot_rotinas VALUES (?,?,?,?)").run(id, email(conta), versao, JSON.stringify(rotina));
    return rotina;
  }
  rotinas(conta) {
    return this.db.prepare(`SELECT r.dados FROM bot_rotinas r WHERE email=? AND versao=(
      SELECT MAX(s.versao) FROM bot_rotinas s WHERE s.id=r.id AND s.email=r.email)`)
      .all(email(conta)).map((r) => JSON.parse(r.dados));
  }
  daRotina(conta, pedido) {
    const r = this.db.prepare("SELECT dados FROM bot_rotinas WHERE email=? AND id=? AND versao=?")
      .get(email(conta), texto(pedido.id, 80), Number(pedido.versao));
    if (!r) throw new Error("Versão da rotina não encontrada.");
    const rotina = JSON.parse(r.dados);
    const processos = pedido.processos;
    if (!Array.isArray(processos) || !processos.length || processos.length > 20) throw new Error("Informe de 1 a 20 processos.");
    return this.criar(conta, { titulo: rotina.nome, rotina: { id: rotina.id, versao: rotina.versao }, etapas: processos.flatMap((numero) => rotina.etapas.map((e) => ({ ...e, numero, valor: pedido.valores?.[e.campo] ?? e.valor }))) });
  }
  regras(conta) {
    return this.db.prepare("SELECT dados FROM bot_regras WHERE email=?").all(email(conta)).map((r) => JSON.parse(r.dados));
  }
  salvarRegra(conta, pedido) {
    if (!pedido.codigo || !pedido.campo || !pedido.justificativa) throw new Error("Informe código, campo obrigatório e justificativa.");
    if (pedido.processo && !/^[A-Z]{1,4}\d{2,6}-\d{2}( teste)?$/i.test(texto(pedido.processo, 40))) throw new Error("Processo da regra inválido.");
    const regra = { id: randomUUID(), codigo: texto(pedido.codigo, 40), campo: texto(pedido.campo, 80), justificativa: texto(pedido.justificativa, 500), processo: texto(pedido.processo, 40), validada: true, validadoPor: email(conta), criado: agora() };
    this.db.prepare("INSERT INTO bot_regras VALUES (?,?,?)").run(regra.id, email(conta), JSON.stringify(regra));
    return regra;
  }
  removerRegra(conta, id) {
    return this.db.prepare("DELETE FROM bot_regras WHERE email=? AND id=?").run(email(conta), texto(id, 80)).changes > 0;
  }
}

let motor;
export function operacoesBot(executar) {
  if (!motor && !executar) throw new Error("O serviço de operações ainda não foi inicializado.");
  if (!motor) motor = new MotorOperacoes(abrirSqlite("operacoes.sqlite"), executar);
  return motor;
}
