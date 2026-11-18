import sql from "mssql";

const normalizar = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toUpperCase();

export async function verificarPreenchimento(pool, etapa, resultado) {
  if (resultado.estado !== "observado") return resultado;
  const campo = normalizar(etapa.campo).toLowerCase();
  const mapeamento = {
    "referencia do cliente": ["Lhs.Referencia_Cliente", "texto"],
    "referencia cliente": ["Lhs.Referencia_Cliente", "texto"],
    "data de embarque": ["Lms.Data_Embarque", "data"],
    "data de desembarque": ["Lms.Data_Desembarque", "data"],
    "peso bruto": ["Lhs.Peso_Bruto", "numero"],
    "quantidade de volumes": ["Lhs.Quantidade_Volumes", "numero"],
  };
  const alvo = mapeamento[campo];
  if (!alvo) return { ...resultado, texto: `${resultado.texto} Evidência: tela; persistência não verificada por consulta para este campo.` };
  const normalizarValor = (v) => {
    if (alvo[1] === "data") {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      const t = String(v || "");
      const partes = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : t.slice(0, 10);
    }
    if (alvo[1] === "numero") return Number(String(v).replace(",", "."));
    return normalizar(v);
  };
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await pool.request().input("numero", sql.VarChar(40), etapa.numero).query(`
      SELECT ${alvo[0]} AS Valor FROM mov_Logistica_House Lhs
      LEFT JOIN mov_Logistica_Master Lms ON Lms.IdLogistica_Master=Lhs.IdLogistica_Master
      WHERE Lhs.Numero_Processo=@numero`);
    if (r.recordset.length === 1 && r.recordset[0].Valor != null && normalizarValor(r.recordset[0].Valor) === normalizarValor(etapa.valor)) {
      return { estado: "confirmado", evidencia: "banco", texto: `${resultado.texto} Persistência confirmada por consulta ao HeadCargo.` };
    }
    if (tentativa < 3) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { estado: "revisao", evidencia: "tela", texto: `${resultado.texto} Persistência não confirmada pela consulta. Confira o valor salvo antes de repetir.` };
}

export async function painelExcecoes(pool, motor, conta) {
  const r = await pool.request().query(`
    SELECT Ati.IdAtividade, Lhs.Numero_Processo AS Processo, Tar.Codigo, Tar.Descricao AS Atividade,
      Res.Nome AS Responsavel, Ati.Previsao_Termino AS Previsao,
      CASE WHEN Ati.Previsao_Termino IS NULL THEN 'sem_previsao' ELSE 'atrasada' END AS Tipo
    FROM mov_Atividade Ati
    JOIN mov_Logistica_House Lhs ON Lhs.IdProjeto_Atividade=Ati.IdProjeto_Atividade
    LEFT JOIN cad_Tarefa Tar ON Tar.IdTarefa=Ati.IdTarefa
    LEFT JOIN cad_Pessoa Res ON Res.IdPessoa=Ati.IdResponsavel
    WHERE Ati.Data_Termino IS NULL AND Ati.Situacao NOT IN (4,5,6)
      AND (Ati.Previsao_Termino IS NULL OR Ati.Previsao_Termino < CAST(GETDATE() AS date))
    ORDER BY CASE WHEN Ati.Previsao_Termino IS NULL THEN 1 ELSE 0 END, Ati.Previsao_Termino, Ati.IdAtividade`);
  const pendencias = r.recordset.map((v) => ({
    id: `atividade:${v.IdAtividade}`, processo: v.Processo, codigo: v.Codigo, titulo: v.Atividade, responsavel: v.Responsavel,
    previsao: v.Previsao, tipo: v.Tipo, origem: "HeadCargo / mov_Atividade", prioridade: v.Tipo === "atrasada" ? 2 : 1,
    motivo: v.Tipo === "atrasada" ? "Atividade aberta com previsão anterior a hoje." : "Atividade aberta sem previsão de término.",
    proximaAcao: v.Tipo === "atrasada" ? "Consultar a atividade e seus requisitos antes de reprogramar ou concluir." : "Definir uma previsão com o responsável.",
  }));
  for (const t of motor.listar(conta)) {
    if (!["aguardando", "revisao", "falhou"].includes(t.estado)) continue;
    const e = t.etapas.find((v) => ["aguardando", "revisao", "falhou", "interrompido"].includes(v.estado));
    pendencias.unshift({ id: `tarefa:${t.id}`, tarefa: t.id, processo: e?.numero, codigo: e?.codigo, titulo: t.titulo, tipo: t.estado, prioridade: 3, origem: "Bot / histórico de execução", motivo: e?.resultado || t.eventos.at(-1)?.mensagem, proximaAcao: "Abrir a tarefa, conferir a evidência e responder à pendência." });
  }
  const anteriores = motor.db.prepare("SELECT dados FROM bot_excecoes WHERE email=?").get(conta);
  const vistos = new Set(anteriores ? JSON.parse(anteriores.dados) : []);
  const atuais = pendencias.map((p) => ({ ...p, nova: !vistos.has(p.id) }));
  motor.db.prepare("INSERT INTO bot_excecoes VALUES (?,?) ON CONFLICT(email) DO UPDATE SET dados=excluded.dados").run(conta, JSON.stringify(atuais.map((p) => p.id)));
  return { atualizado: new Date().toISOString(), total: atuais.length, novas: atuais.filter((p) => p.nova).length, itens: atuais.sort((a,b) => b.prioridade-a.prioridade) };
}
