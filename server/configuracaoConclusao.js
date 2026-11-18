import sql from "mssql";

function decodificarXml(v) {
  return String(v ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

export function comandoDoCadastro(xml) {
  return [...String(xml ?? "").matchAll(/<CommandText(?:\s[^>]*)?>([\s\S]*?)<\/CommandText>/gi)].map((m) => decodificarXml(m[1])).join("\n");
}
const semComentarios = (v) => String(v).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\r\n]*/g, " ").replace(/[\[\]]/g, "");

export function mensagemDaCondicao(xml) {
  const comando = comandoDoCadastro(xml);
  const expressao = comando.match(/@Mensagem\s*=\s*([\s\S]*?)(?:,\s*@Condicao\s*=|\bFrom\b|$)/i)?.[1];
  if (expressao) {
    const literais = [...expressao.matchAll(/N?'((?:''|[^'])*)'/g)].map((m) => m[1].replace(/''/g, "'").trim()).filter(Boolean);
    if (literais.length) return literais.join(" ").replace(/\s+/g, " ").trim();
  }
  return decodificarXml(String(xml ?? "").match(/<Mensagem>([\s\S]*?)<\/Mensagem>/i)?.[1] || "").trim();
}

// Recognize a small, explicit subset of configured rules. Never execute the
// SQL stored in Dados_Registro: it can contain assignments and other commands.
export function analisarMonitorConclusao(monitor) {
  const comando = semComentarios(comandoDoCadastro(monitor.Dados_Registro));
  if (!/@Situacao\s*=\s*(?:4\b|Case\b[\s\S]*?(?:Then|Else)\s+4\b)/i.test(comando)) return null;
  const nome = String(monitor.Descricao ?? "").trim();
  const grupo = comando.match(/\bSet\s+@IdArquivo_Grupo\s*=\s*(\d+)\b/i)?.[1];
  const regraArquivo = /@Situacao\s*=\s*Case\s+When\s+\w+\.IdArquivo_Grupo\s*=\s*@IdArquivo_Grupo\s+Then\s+4\s+Else\s+Null\s+End\b/i.test(comando);
  const eventos = comando.match(/@Evento\s+in\s*\(([^)]+)\)/i)?.[1]?.split(",").map((n) => Number(n.trim())).filter(Number.isFinite) || [];
  if (grupo && regraArquivo && /TProjetoAtividadeArquivo/i.test(monitor.Classe) && eventos.some((n) => [1,3].includes(n))) {
    return { tipo: "arquivo_grupo", nome, grupo: Number(grupo), eventos };
  }
  return { tipo: "outra_regra", nome, observacao: String(monitor.Observacao || "").trim() };
}

export function avaliarCondicaoConclusao(condicao, estado) {
  const comando = semComentarios(comandoDoCadastro(condicao.Dados_Registro));
  const mensagem = mensagemDaCondicao(condicao.Dados_Registro);
  const exigeStatus = /@Condicao\s*=\s*Case\s+When\s+(?:COALESCE|ISNULL)\s*\(\s*(?:\w+\.)?IdStatus_Processo_Logistico\s*,\s*0\s*\)\s*=\s*0\s+Then\s+0\s+Else\s+1\s+End\b/i.test(comando);
  if (exigeStatus) return { nome: condicao.Descricao, mensagem, tipo: "status_preenchido", estado: Number(estado.IdStatus_Processo_Logistico || 0) !== 0 ? "atendida" : "pendente", valor: estado.Status || "Sem status" };
  return { nome: condicao.Descricao, mensagem, tipo: "outra_condicao", estado: "nao_verificada", observacao: String(condicao.Observacao || "").trim() };
}

export async function lerConfiguracaoConclusao(pool, { numero, codigo }) {
  const pedido = () => pool.request().input("numero", sql.VarChar(40), numero).input("codigo", sql.VarChar(40), codigo);
  const vinculo = `FROM mov_Logistica_House Lhs
    JOIN mov_Projeto_Atividade Pa ON Pa.IdProjeto_Atividade=Lhs.IdProjeto_Atividade
    JOIN cad_Tarefa Tar ON Tar.IdProjeto_Tarefa=Pa.IdProjeto_Tarefa`;
  const filtro = `WHERE Lhs.Numero_Processo=@numero AND CAST(Tar.Codigo AS varchar(60))=@codigo`;
  const tarefa = await pedido().query(`SELECT Tar.IdTarefa, Tar.Descricao, Tar.Observacao, P.Nome AS Projeto,
      Lhs.IdStatus_Processo_Logistico, Sta.Descricao AS Status
    ${vinculo}
    JOIN cad_Projeto_Tarefa P ON P.IdProjeto_Tarefa=Tar.IdProjeto_Tarefa
    LEFT JOIN cad_Status_Processo_Logistico Sta ON Sta.IdStatus_Processo_Logistico=Lhs.IdStatus_Processo_Logistico
    ${filtro}`);
  if (tarefa.recordset.length !== 1 || !tarefa.recordset[0].IdTarefa) return { encontrada: false, condicoes: [], monitores: [], gatilhos: [] };
  const atual = tarefa.recordset[0];
  const condicoes = await pedido().query(`SELECT Rel.Situacao_Verificacao, C.Descricao, C.Observacao,
      CAST(C.Dados_Registro AS nvarchar(max)) AS Dados_Registro
    ${vinculo}
    JOIN cad_Tarefa_Condicao Rel ON Rel.IdTarefa=Tar.IdTarefa
    JOIN cad_Projeto_Tarefa_Condicao C ON C.IdProjeto_Tarefa_Condicao=Rel.IdProjeto_Tarefa_Condicao
    ${filtro} AND Rel.Situacao_Verificacao=4 ORDER BY C.Descricao`);
  const monitores = await pedido().query(`SELECT M.Descricao, M.Classe, M.Observacao,
      CAST(M.Dados_Registro AS nvarchar(max)) AS Dados_Registro
    ${vinculo}
    JOIN cad_Tarefa_Monitor Rel ON Rel.IdTarefa=Tar.IdTarefa
    JOIN cad_Projeto_Tarefa_Monitor M ON M.IdProjeto_Tarefa_Monitor=Rel.IdProjeto_Tarefa_Monitor
    ${filtro} AND M.Ativo=1 ORDER BY M.Descricao`);
  const analisados = monitores.recordset.map(analisarMonitorConclusao).filter(Boolean);
  let gatilhos = [];
  if (!analisados.length) {
    gatilhos = (await pedido().query(`SELECT Origem.Codigo AS Codigo_Origem, Origem.Descricao AS Atividade_Origem,
        G.Situacao_Atual, G.Gerar_Atividade, G.Observacao,
        Execucao.Total, Execucao.Concluidas
      ${vinculo}
      JOIN cad_Tarefa_Gatilho_Situacao G ON G.IdTarefa_Atualizar=Tar.IdTarefa
      JOIN cad_Tarefa Origem ON Origem.IdTarefa=G.IdTarefa AND Origem.IdProjeto_Tarefa=Tar.IdProjeto_Tarefa
      OUTER APPLY (SELECT COUNT(*) AS Total,
        COALESCE(SUM(CASE WHEN Ati.Situacao=4 THEN 1 ELSE 0 END),0) AS Concluidas
        FROM mov_Atividade Ati
        WHERE Ati.IdProjeto_Atividade=Lhs.IdProjeto_Atividade AND Ati.IdTarefa=Origem.IdTarefa) Execucao
      ${filtro} AND G.Situacao_Atualizar=4 AND Origem.IdTarefa<>Tar.IdTarefa
      ORDER BY Origem.Codigo,G.Situacao_Atual`)).recordset;
  }
  const grupos = [...new Set(analisados.filter((m) => m.tipo === "arquivo_grupo").map((m) => m.grupo))];
  let arquivos = [];
  if (grupos.length) {
    const req = pool.request().input("numero", sql.VarChar(40), numero);
    const parametros = grupos.map((g, i) => { req.input(`grupo${i}`, sql.Int, g); return `@grupo${i}`; });
    arquivos = (await req.query(`SELECT G.IdArquivo_Grupo, G.Nome AS Grupo, Qtd.Quantidade
      FROM mov_Logistica_House Lhs
      CROSS JOIN cad_Arquivo_Grupo G
      OUTER APPLY (SELECT COUNT(*) AS Quantidade FROM mov_Projeto_Atividade_Arquivo Par
        JOIN arq_Arquivo Arq ON Arq.IdArquivo=Par.IdArquivo
        WHERE Par.IdProjeto_Atividade=Lhs.IdProjeto_Atividade AND Arq.IdArquivo_Grupo=G.IdArquivo_Grupo) Qtd
      WHERE Lhs.Numero_Processo=@numero AND G.IdArquivo_Grupo IN (${parametros.join(",")})`)).recordset;
  }
  return {
    encontrada: true, projeto: atual.Projeto, observacao: atual.Observacao,
    modoConclusao: analisados.length ? "monitor" : gatilhos.length ? "outra_atividade" : "manual",
    gatilhos,
    condicoes: condicoes.recordset.map((c) => avaliarCondicaoConclusao(c, atual)),
    monitores: analisados.map((m) => {
      if (m.tipo !== "arquivo_grupo") return { ...m, estado: "nao_verificada" };
      const registro = arquivos.find((a) => Number(a.IdArquivo_Grupo) === m.grupo);
      return { ...m, grupoNome: registro?.Grupo || "", quantidade: registro ? Number(registro.Quantidade) : null,
        estado: !registro ? "nao_verificada" : Number(registro.Quantidade) > 0 ? "anexo_localizado" : "pendente" };
    }),
  };
}

export function textoConfiguracaoConclusao(config) {
  if (!config.encontrada) return "Não localizei de forma única a configuração desta atividade no projeto de tarefas.";
  const linhas = [`**O que faz esta atividade concluir — projeto de tarefas${config.projeto ? ` ${config.projeto}` : ""}:**`];
  for (const m of config.monitores) {
    if (m.tipo === "arquivo_grupo") {
      const grupo = m.grupoNome ? `${m.grupoNome} (grupo ${m.grupo})` : `grupo ${m.grupo}`;
      linhas.push(`- **Conclusão automática:** anexar um arquivo classificado em **${grupo}** aos arquivos do processo. O monitor atua na inclusão ou atualização do anexo.`);
      linhas.push(m.estado === "pendente" ? `  **Falta agora:** nenhum anexo desse grupo foi encontrado neste processo.` : m.estado === "anexo_localizado" ? `  Já existe ${m.quantidade} anexo(s) desse grupo. A atividade continua com o estado informado acima; a presença do arquivo, sozinha, não comprova que o evento de conclusão foi disparado.` : "  A regra de anexo foi identificada; não consegui confirmar o grupo nos dados atuais.");
    } else linhas.push(`- **Outro monitor de conclusão:** ${m.nome}.${m.observacao ? ` ${m.observacao}` : ""} A condição desse monitor ainda não foi avaliada nesta consulta.`);
  }
  if (!config.monitores.length) {
    const gatilhos = config.gatilhos || [];
    if (gatilhos.length) {
      const situacoes = { 1: "não iniciada", 2: "em andamento", 3: "em espera", 4: "concluída", 5: "não realizada", 6: "cancelada" };
      for (const g of gatilhos) {
        const origem = `${g.Codigo_Origem} · ${g.Atividade_Origem}`;
        linhas.push(Number(g.Situacao_Atual) === 4
          ? `- **Conclusão ao concluir outra atividade:** quando **${origem}** for concluída, o gatilho do projeto conclui esta atividade.`
          : `- **Conclusão por outra atividade:** quando **${origem}** ficar **${situacoes[Number(g.Situacao_Atual)] || `na situação ${g.Situacao_Atual}`}**, o gatilho do projeto conclui esta atividade.`);
        if (!Number(g.Total)) linhas.push(`  A atividade de origem ainda não foi localizada neste processo.`);
        else if (Number(g.Situacao_Atual) === 4) linhas.push(Number(g.Concluidas)
          ? `  Neste processo, ${g.Concluidas} de ${g.Total} ocorrência(s) da atividade de origem já está(ão) concluída(s). A conclusão desta atividade ainda depende de o gatilho ter sido disparado.`
          : `  **Falta agora:** concluir a atividade **${origem}**, que ainda não está concluída neste processo.`);
        if (g.Observacao) linhas.push(`  Observação do gatilho: ${String(g.Observacao).trim()}`);
      }
    } else linhas.push("- **Conclusão manual:** esta atividade é concluída pelo usuário na opção Concluir. Não há monitor de conclusão nem gatilho de outra atividade que a conclua no projeto consultado." + (config.condicoes.length ? " As condições cadastradas abaixo continuam sendo exigidas." : ""));
  }
  for (const c of config.condicoes) {
    linhas.push(`- **Condição para concluir: ${c.nome}.**${c.mensagem ? ` Mensagem do cadastro: “${c.mensagem}”` : ""}`);
    if (c.tipo === "status_preenchido") {
      linhas.push(`  A verificação cadastrada exige que o status do processo esteja preenchido. **${c.estado === "atendida" ? "Atendida" : "Pendente"}:** ${c.valor}.`);
      if (/atualizar status do processo:/i.test(c.mensagem)) linhas.push("  O status citado na mensagem não é comparado pela condição cadastrada; a verificação consulta apenas se existe um status preenchido.");
    }
    else linhas.push("  A condição está cadastrada para a conclusão; seu resultado atual ainda não foi verificado.");
  }
  if (config.observacao) linhas.push(`**Orientação cadastrada na tarefa:** ${String(config.observacao).trim()}`);
  return linhas.join("\n\n");
}
