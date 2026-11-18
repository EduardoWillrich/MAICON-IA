import sql from "mssql";
import { lerConfiguracaoConclusao, textoConfiguracaoConclusao } from "./configuracaoConclusao.js";

const normalizar = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const semNome = (v) => normalizar(v).replace(/^nome\s+/, "");
const preenchido = (v) => v != null && String(v).trim() !== "";
export function compararRequisitos(requisitos, campos) {
  return [...new Set(requisitos)].map((nome) => {
    let encontrados = campos.filter((c) => normalizar(c.Campo) === normalizar(nome));
    if (!encontrados.length) encontrados = campos.filter((c) => semNome(c.Campo) === semNome(nome));
    const unico = encontrados.length === 1 ? encontrados[0] : null;
    return { nome, estado: !unico ? "nao_verificado" : preenchido(unico.Valor) ? "preenchido" : "em_branco", valor: unico?.Valor };
  });
}

export async function requisitosAtividade(pool, { numero, atividade, requisitos = [] }) {
  const codigo = String(atividade.Codigo ?? "").trim();
  const configuracao = await lerConfiguracaoConclusao(pool, { numero, codigo });
  const campos = await pool.request().input("numero", sql.VarChar(40), numero).query(`
    SELECT Cfg.Descricao AS Campo,
      CASE
        WHEN Cfg.Tipo_Valor = 1 THEN NULLIF(LTRIM(RTRIM(Mcl.Valor_Alfanumerico)), '')
        WHEN Cfg.Tipo_Valor = 2 THEN NULLIF(LTRIM(RTRIM(CAST(Mcl.Valor_Texto AS nvarchar(400)))), '')
        WHEN Cfg.Tipo_Valor = 3 THEN CAST(Mcl.Valor_Boleano AS varchar(10))
        WHEN Cfg.Tipo_Valor = 4 THEN CAST(Mcl.Valor_Tipo_Fixo AS varchar(20))
        WHEN Cfg.Tipo_Valor = 5 THEN CAST(Mcl.Valor_Inteiro AS varchar(20))
        WHEN Cfg.Tipo_Valor = 6 THEN CONVERT(varchar(10), Mcl.Valor_Data, 103)
        WHEN Cfg.Tipo_Valor = 7 THEN CAST(Mcl.Valor_Real4 AS varchar(40))
        ELSE NULLIF(LTRIM(RTRIM(Mcl.Valor_Alfanumerico)), '') END AS Valor
    FROM mov_Logistica_House Lhs
    JOIN mov_Logistica_Campo_Livre Lcl ON Lcl.IdLogistica_House=Lhs.IdLogistica_House
    JOIN mov_Campo_Livre Mcl ON Mcl.IdCampo_Livre=Lcl.IdCampo_Livre
    JOIN cad_Configuracao_Campo_Livre Cfg ON Cfg.IdConfiguracao_Campo_Livre=Mcl.IdConfiguracao_Campo_Livre
    WHERE Lhs.Numero_Processo=@numero ORDER BY Cfg.Descricao`);
  const precedente = await pool.request().input("numero", sql.VarChar(40), numero).input("codigo", sql.VarChar(40), codigo).query(`
    SELECT Prec.Codigo, Prec.Descricao AS Atividade, Ant.Situacao, Ant.Data_Termino
    FROM mov_Logistica_House Lhs
    JOIN mov_Projeto_Atividade Pa ON Pa.IdProjeto_Atividade=Lhs.IdProjeto_Atividade
    JOIN cad_Tarefa Tar ON Tar.IdProjeto_Tarefa=Pa.IdProjeto_Tarefa
    JOIN cad_Tarefa Prec ON Prec.IdTarefa=Tar.IdTarefa_Precedente
    LEFT JOIN mov_Atividade Ant ON Ant.IdProjeto_Atividade=Lhs.IdProjeto_Atividade AND Ant.IdTarefa=Prec.IdTarefa
    WHERE Lhs.Numero_Processo=@numero AND CAST(Tar.Codigo AS varchar(60))=@codigo`);
  const avaliados = compararRequisitos(requisitos, campos.recordset);
  const faltam = avaliados.filter((v) => v.estado === "em_branco");
  const conferidos = avaliados.filter((v) => v.estado === "preenchido");
  const desconhecidos = avaliados.filter((v) => v.estado === "nao_verificado");
  const situacao = Number(atividade.Situacao) === 4 ? "Concluída" : Number(atividade.Situacao) === 2 ? "Em andamento" : Number(atividade.Situacao) === 3 ? "Em espera" : [5,6].includes(Number(atividade.Situacao)) ? "Inativa" : "Ainda não iniciada";
  const linhas = [
    `### O que falta para concluir`,
    `**${codigo} · ${String(atividade.Atividade ?? "").trim()}** — processo **${numero}**.`,
    `Situação: ${situacao}.${atividade.Responsavel ? ` Responsável: ${String(atividade.Responsavel).trim()}.` : ""}`,
    textoConfiguracaoConclusao(configuracao),
  ];
  if (faltam.length) linhas.push(`**Campos em branco entre os requisitos já registrados para esta atividade:**\n${faltam.map((v) => `- ${v.nome}`).join("\n")}`);
  if (conferidos.length) linhas.push(`**Requisitos preenchidos:**\n${conferidos.map((v) => `- ${v.nome}: ${v.valor}`).join("\n")}`);
  if (desconhecidos.length) linhas.push(`**Requisitos cujo valor ainda não foi verificado:**\n${desconhecidos.map((v) => `- ${v.nome}: o campo não foi identificado de forma única nos dados consultados.`).join("\n")}`);
  const temRegraCadastro = configuracao.encontrada;
  if (!avaliados.length && !temRegraCadastro) linhas.push("Não há uma lista confirmada de campos obrigatórios para esta atividade nas fontes consultadas. O estado ‘ainda não iniciada’ sozinho não informa o que falta.");
  const outros = campos.recordset.filter((c) => !preenchido(c.Valor) && !avaliados.some((v) => semNome(v.nome) === semNome(c.Campo)));
  if (outros.length && !temRegraCadastro) linhas.push(`**Outros campos livres em branco:**\n${outros.map((v) => `- ${v.Campo}`).join("\n")}\nEstar em branco não confirma que o campo seja obrigatório para esta atividade.`);
  if (precedente.recordset.length) linhas.push(`**Etapa anterior no fluxo:**\n${precedente.recordset.map((v) => `- ${v.Codigo} · ${v.Atividade}: ${Number(v.Situacao) === 4 || v.Data_Termino ? "concluída" : v.Situacao == null ? "sem execução localizada" : "ainda não concluída"}.`).join("\n")}\nA ordem do fluxo, por si só, não comprova bloqueio da conclusão.`);
  if (atividade.Observacao) linhas.push(`**Observação da atividade:** ${String(atividade.Observacao).trim()}`);
  if (!faltam.length && !temRegraCadastro) linhas.push("Esta leitura não confirmou um campo obrigatório faltante; isso também não garante que a conclusão esteja liberada.");
  linhas.push("Fonte: configuração da própria atividade no projeto de tarefas, dados atuais do HeadCargo e requisitos adicionais observados ou validados. Consulta realizada sem acionar Concluir.");
  return linhas.join("\n\n");
}
