# Operações do HeadCargo pela conversa

A interface continua sendo o chat. A Maicon recebe objetivos, faz perguntas sobre os dados que faltam e apresenta os resultados na conversa. O andamento usa o indicador de trabalho já existente. Não há central, formulários ou painel adicional.

## Exemplos

- “Prepare a atividade 0023.1 do IM2099-25 teste. Preencha Marca com ACME e conclua.”
- “Qual o andamento da tarefa anterior?”
- “Pause a rotina.” / “Cancele a execução.”
- “A marca é ACME.” A Maicon consulta a tarefa pendente e retoma o mesmo ID.
- “Salve essa sequência como rotina documental.”
- “Prepare essa rotina para estes processos…” A Maicon apresenta a prévia do lote antes de executar.
- “Quais exceções exigem atenção agora?”
- “Valide Marca como campo obrigatório antes da atividade 0023.1, somente neste processo, porque o fluxo documental exige.”

## Execução e evidência

`operacoes.sqlite` guarda tarefas, etapas, eventos, rotinas versionadas, requisitos revisados por conta. O histórico do chat preserva os identificadores das tarefas para retomada.

O motor admite até 100 etapas por tarefa, 20 processos por lote e 30 tarefas abertas por conta. As ações de escrita continuam limitadas aos processos com sufixo `teste`, informado explicitamente pelo usuário, e ao administrador. Consultas ao SQL Server permanecem somente de leitura.

A fila do motor evita intercalar tarefas. A trava do desktop serializa também os caminhos antigos de automação; a sessão é identificada pelo computador e usuário do Windows. O lease SQLite é renovado durante a ação. Execute uma instância da API por sessão Windows, com o HeadCargo disponível nessa sessão; a versão Linux/Docker não controla a tela do Windows remotamente.

Conclusão, restauração, início e cancelamento conhecidos exigem confirmação por consulta. Preenchimentos de referência do cliente, datas de embarque/desembarque, peso bruto e volumes também fazem comparação após gravar. Outros campos conservam o nível de evidência `tela`; o resultado não declara confirmação no banco. Botões com efeito desconhecido pedem revisão. Os padrões nativos UI Automation são usados nos controles compatíveis, com os caminhos existentes de OCR/Win32 disponíveis para os demais.

Pausa e cancelamento interrompem entre ações: a ação em curso termina primeiro. O cancelamento do acompanhamento no chat solicita o cancelamento da tarefa. Uma perda involuntária de conexão não recria nem repete a tarefa. Após reiniciar o serviço, execuções interrompidas pedem conferência antes da retomada. O usuário informa se a etapa já ocorreu ou se deve ser repetida.

## Requisitos e conclusão de atividades

Ao perguntar o que falta para concluir, a consulta lê a própria `cad_Tarefa` vinculada ao projeto do processo. As condições com `Situacao_Verificacao=4` vêm de `cad_Tarefa_Condicao` e `cad_Projeto_Tarefa_Condicao`; os monitores ativos associados à tarefa vêm de `cad_Tarefa_Monitor` e `cad_Projeto_Tarefa_Monitor`. O XML `Dados_Registro` é interpretado, sem executar o SQL nele armazenado. São avaliadas as regras reconhecidas de conclusão por grupo de arquivo e exigência de status preenchido. Outras condições são apresentadas com o nome e mensagem cadastrados e indicadas como ainda não avaliadas. A mensagem exibida pela regra não substitui o predicado que ela verifica.

Para monitores de anexo, o código do grupo é extraído da configuração e a consulta conta somente os arquivos desse grupo vinculados ao projeto do processo. Um arquivo existente não prova que o evento do monitor já foi disparado. A consulta não altera a atividade nem anexa documentos.

Na ausência de monitor de conclusão, a consulta busca os gatilhos de `cad_Tarefa_Gatilho_Situacao` cujo destino é a atividade consultada e cuja situação de destino é concluída (4). A resposta identifica a atividade de origem, o evento que dispara o gatilho e quantas ocorrências da origem estão concluídas no mesmo processo. A simples precedência no fluxo não é tratada como gatilho. Quando não há monitor nem gatilho de conclusão, a resposta informa conclusão manual, mantendo as condições que precisam ser atendidas.


As exceções usam regras explícitas: atividades abertas atrasadas ou sem previsão e tarefas do bot aguardando resposta/revisão. Cada item traz origem, motivo, responsável disponível e próxima ação. “Nova” compara com a última consulta da conta. Não existe previsão estatística de atraso nesta implementação.

Requisitos aprendidos só viram regras de execução após validação explícita. O escopo é a conta, código da atividade e, opcionalmente, um processo específico. Regras inserem os preenchimentos exigidos antes da conclusão, preservando o ponto de retomada.

## Validação

A lista de gatilhos do projeto é consultada sem limite de linhas e enviada em um bloco estruturado `gatilhos`. O chat exibe cada regra em uma linha numerada com atividade de origem, estado que dispara, destino e estado resultante. O total é calculado pela mesma coleção renderizada, sem paginação ou recorte. O histórico preserva o resultado integral. Respostas antigas em texto também recebem o novo desenho quando contêm os gatilhos completos.

A lista de atividades do projeto também é consultada integralmente, sem o antigo limite de 80. O bloco `tarefas` preserva cada IdTarefa, inclusive quando várias atividades usam o mesmo código. A interface exibe 20 atividades por vez; o botão “Ver mais” revela mais 20 registros já carregados, sem nova consulta. O rodapé informa quantos itens estão visíveis do total e o botão desaparece quando todos são exibidos. Cada linha separa a atividade de sua etapa anterior no fluxo. O histórico mantém a coleção completa.

Os testes de operações usam executores simulados e SQLite em memória. `rotasBot.test.js` verifica as rotas HTTP locais e permissões sem acessar o ERP. Os testes não operam processos reais. A compatibilidade de cada controle com UI Automation e a execução completa no HeadCargo devem ser verificadas em processo de teste na sessão Windows de destino.
