const s = (description) => ({ type: "string", description });
const etapa = {
  type: "object", properties: {
    acao: { type: "string", enum: ["ler", "preencher", "concluir", "restaurar", "cancelar", "iniciar", "encerrar", "botao"] },
    botao: s("Rótulo do botão quando acao=botao. Somente o botão solicitado pelo usuário."),
    numero: s("Número completo. Alterações somente em processo com sufixo teste informado pelo usuário."),
    codigo: s("Código da atividade obtido no HeadCargo."), campo: s("Rótulo exato do campo e aba, se indicada."),
    valor: s("Valor informado pelo usuário. Vazio para solicitar durante a execução."), caminho: s("Caminho explicitamente escolhido pelo usuário."),
  }, required: ["acao", "numero"],
};
const valores = { type: "array", items: { type: "object", properties: { campo: s("Campo pendente"), valor: s("Valor informado pelo usuário") }, required: ["campo", "valor"] } };
const ferramenta = (name, description, properties, required = []) => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });

export const FERRAMENTAS_OPERACIONAIS = [
  ferramenta("tarefa_bot",
    "Cria e acompanha rotinas persistentes no HeadCargo. Para um objetivo, consulte andamento_atividade, monitores_campo e gatilhos_atividade, depois monte etapas explícitas: ler, preencher os dados fornecidos e a ação solicitada. Nunca invente campos, valores ou códigos. acao=criar cria prévia; executar=true somente quando o usuário pediu a execução dessas etapas. Para lote, apresente a prévia primeiro. acao=listar/status consulta resultados atuais. Para responder a pendência, use retomar com o id da tarefa, valores dos campos ou caminho escolhido. Não crie uma nova tarefa para responder a uma existente. Falha de persistência exige revisão: resolucao=confirmado só após o usuário conferir; resolucao=repetir só se pediu repetir. Pausar e cancelar interrompem entre ações. Tarefa na fila não significa concluída. Copie o ID e estado, sem prometer resultado.",
    { acao: { type: "string", enum: ["criar", "listar", "status", "executar", "retomar", "pausar", "cancelar"] }, id: s("ID da tarefa"), titulo: s("Objetivo da rotina"), etapas: { type: "array", items: etapa }, executar: { type: "boolean" }, valores, valor: s("Valor do campo pendente"), caminho: s("Opção escolhida"), codigo: s("Código escolhido"), resolucao: { type: "string", enum: ["confirmado", "repetir"] } }, ["acao"]),
  ferramenta("rotina_bot",
    "Rotinas reutilizáveis e versionadas pela conversa. listar mostra a versão atual; salvar cria uma nova versão com etapas já revisadas pelo usuário; prever aplica a versão exata a até 20 processos e cria uma prévia. Mostre as etapas no chat e, quando o usuário pedir para seguir, use tarefa_bot acao=executar com o id. Valores substituem os campos pelo rótulo. Não execute lote sem apresentar o escopo primeiro.",
    { acao: { type: "string", enum: ["listar", "salvar", "prever"] }, id: s("ID da rotina"), nome: s("Nome"), versao: { type: "integer" }, etapas: { type: "array", items: etapa }, processos: { type: "array", items: { type: "string" } }, valores }, ["acao"]),
  ferramenta("painel_excecoes",
    "Lista atividades atrasadas, sem previsão e tarefas do bot que exigem resposta ou revisão. Informa origem, motivo, responsável e próxima ação. nova indica diferença em relação à última consulta desta conta; não é previsão estatística. Somente leitura.", {}),
  ferramenta("regras_bot",
    "Requisitos operacionais revisados por uma pessoa. listar consulta; validar registra um campo obrigatório antes de concluir um código de atividade, com justificativa e processo opcional para limitar o escopo. Só valide se o usuário explicitamente pedir para tornar isso uma regra; uma mensagem isolada do HeadCargo não autoriza generalizar. remover exclui pelo id.",
    { acao: { type: "string", enum: ["listar", "validar", "remover"] }, id: s("ID da regra"), codigo: s("Código da atividade"), campo: s("Campo obrigatório"), processo: s("Número para limitar a regra a um processo; vazio só se usuário pediu regra geral"), justificativa: s("Motivo revisado pelo usuário") }, ["acao"]),
];
