export type TabelaDicionario = {
  tabela: string;
  colunas: string[];
};

export const DICIONARIO: TabelaDicionario[] = [
  {
    "tabela": "arq_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdDados_Arquivo",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Dados_Arquivo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Local_Armazenamento",
      "Exibir_Portal_Cliente",
      "Solicitar_Verificacao",
      "Prazo_Verificacao"
    ]
  },
  {
    "tabela": "arq_Contrato_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdContrato"
    ]
  },
  {
    "tabela": "arq_Dados_Arquivo",
    "colunas": [
      "IdDados_Arquivo",
      "GUID",
      "uniqueidentifie",
      "Storage",
      "Dados",
      "Tamanho",
      "Hash",
      "Data_Criacao",
      "Content_Type"
    ]
  },
  {
    "tabela": "arq_Mensagem_Anexo",
    "colunas": [
      "IdMensagem_Anexo",
      "IdMensagem",
      "IdDados_Arquivo",
      "Nome",
      "Tamanho",
      "Dados_Arquivo"
    ]
  },
  {
    "tabela": "arq_Mensagem_Arquivo",
    "colunas": [
      "IdMensagem_Arquivo",
      "IdDados_Arquivo",
      "Hash",
      "Dados_Arquivo"
    ]
  },
  {
    "tabela": "arq_Pro_Forma_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdPro_Forma"
    ]
  },
  {
    "tabela": "aux_Atualizador_Faturas_Evento",
    "colunas": [
      "IdAtualizador_Faturas_Evento",
      "IdAtualizador_Faturas_Config",
      "Data_Inicio",
      "Data_Conclusao",
      "Situacao",
      "Erro"
    ]
  },
  {
    "tabela": "aux_Atualizador_Faturas_Item",
    "colunas": [
      "IdAtualizador_Faturas_Item",
      "IdAtualizador_Faturas_Evento",
      "IdLogistica_Fatura",
      "Situacao",
      "Mensagem_Erro"
    ]
  },
  {
    "tabela": "aux_BACEN_Pais_Link",
    "colunas": [
      "IdBACEN_Pais",
      "IdPais",
      "Observacao"
    ]
  },
  {
    "tabela": "aux_Fatura_Financeira_Boleto",
    "colunas": [
      "IdFatura_Financeira",
      "IdBoleto_Cobranca"
    ]
  },
  {
    "tabela": "aux_Grupo_Usuario_Item",
    "colunas": [
      "IdGrupo_Usuario",
      "IdUsuario"
    ]
  },
  {
    "tabela": "aux_IBGE_Municipio_Link",
    "colunas": [
      "IdIBGE_Municipio",
      "IdMunicipio",
      "Observacao"
    ]
  },
  {
    "tabela": "aux_IBGE_Unidade_Federativa_Link",
    "colunas": [
      "IdIBGE_Unidade_Federativa",
      "IdUnidade_Federativa",
      "Observacao"
    ]
  },
  {
    "tabela": "aux_Nota_Fiscal_Servico_Fatura",
    "colunas": [
      "IdNota_Fiscal_Servico",
      "IdRegistro_Financeiro"
    ]
  },
  {
    "tabela": "aux_Portal_Usuario_Token",
    "colunas": [
      "IdPortal_Usuario",
      "IdPortal_Token"
    ]
  },
  {
    "tabela": "aux_Siscoserv_Enquadramento_Link_Acao",
    "colunas": [
      "IdSiscoserv_Enquadramento",
      "IdSiscoserv_Acao"
    ]
  },
  {
    "tabela": "aux_Siscoserv_Fatura_Item_Link_Acao",
    "colunas": [
      "IdSiscoserv_Fatura_Item",
      "IdSiscoserv_Acao"
    ]
  },
  {
    "tabela": "aux_Siscoserv_Fatura_Link_Acao",
    "colunas": [
      "IdSiscoserv_Fatura",
      "IdSiscoserv_Acao"
    ]
  },
  {
    "tabela": "aux_Siscoserv_Link_Acao",
    "colunas": [
      "IdSiscoserv",
      "IdSiscoserv_Acao"
    ]
  },
  {
    "tabela": "aux_Siscoserv_Operacao_DI_Link_Acao",
    "colunas": [
      "IdSiscoserv_Operacao_DI",
      "IdSiscoserv_Acao"
    ]
  },
  {
    "tabela": "aux_Siscoserv_Operacao_Link_Acao",
    "colunas": [
      "IdSiscoserv_Operacao",
      "IdSiscoserv_Acao"
    ]
  },
  {
    "tabela": "aux_Siscoserv_Operacao_RE_Link_Acao",
    "colunas": [
      "IdSiscoserv_Operacao_RE",
      "IdSiscoserv_Acao"
    ]
  },
  {
    "tabela": "aux_TRK_Atualizacao_Evento",
    "colunas": [
      "IdTRK_Atualizacao_Evento",
      "Data_Inicio",
      "Data_Conclusao",
      "Situacao"
    ]
  },
  {
    "tabela": "aux_TRK_Atualizacao_Item",
    "colunas": [
      "IdTRK_Atualizacao_Item",
      "IdTRK_Atualizacao_Evento",
      "IdLogistica_House",
      "Conteudo_Atualizacao",
      "Situacao",
      "Mensagem_Erro"
    ]
  },
  {
    "tabela": "aux_Tracking_Carga_Viagem_Link",
    "colunas": [
      "IdTracking_Carga_Viagem",
      "IdLogistica_Viagem"
    ]
  },
  {
    "tabela": "aux_Tracking_Carrier",
    "colunas": [
      "IdCarrier",
      "IdCompanhia_Transporte",
      "Identifier",
      "Code",
      "Tipo_Modalidade",
      "IsTrackingEnabled",
      "Is_Tracking_Enabled"
    ]
  },
  {
    "tabela": "cad_Acao_Troca_Navio",
    "colunas": [
      "IdAcao_Troca_Navio",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Agencia_Maritima_Aerea",
    "colunas": [
      "IdPessoa",
      "Tipo_Agencia"
    ]
  },
  {
    "tabela": "cad_Agente_Carga",
    "colunas": [
      "IdPessoa",
      "IdMoeda_Comissao",
      "IdAssociacao_Internacional_Temp",
      "IdAssociacao_Internacional",
      "Tipo_Comissao",
      "Valor_Comissao_1",
      "Valor_Minimo_Comissao",
      "Base_Calculo_1",
      "Valor_Comissao_2",
      "Base_Calculo_2",
      "Validade_Carta_Apontamento",
      "Contrato_Agenciamento",
      "Validade_Contrato_Agenciamento",
      "Carta_Apontamento",
      "Consignee_Master",
      "Notify_Master",
      "Shipper_Master",
      "Remarks_Master",
      "Tipo_Valor_Minimo",
      "Acesso_Restrito",
      "Instrucoes",
      "Modalidade_Maritimo",
      "Modalidade_Aereo",
      "Modalidade_Terrestre",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional"
    ]
  },
  {
    "tabela": "cad_Agente_Carga_Comissao",
    "colunas": [
      "IdAgente_Carga_Comissao",
      "IdPessoa",
      "IdMoeda_Comissao",
      "IdTaxa_Logistica_Exibicao",
      "Indice",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo_Comissao",
      "Tipo_Valor_Minimo",
      "Base_Calculo_Comissao",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional",
      "Encaminhado_Empresa",
      "Encaminhado_Agente_Local",
      "Encaminhado_Agente_Exterior",
      "Observacao",
      "Acesso_Restrito",
      "Modalidade_Nao_Informado",
      "Modalidade_Collect",
      "Modalidade_Prepaid",
      "Modalidade_Prepaid_Abroad",
      "Valor_Maximo",
      "Valor_Comissao_Inland",
      "Tipo_Comissao_Inland",
      "Encaminhado_Associacao_Inter",
      "Encaminhado_Despachante",
      "Encaminhado_Comercial",
      "Tipo_Valor_Maximo",
      "Valor_Maximo_Container_20",
      "Valor_Maximo_Container_40",
      "Sobre_Todas_Taxas",
      "Encaminhado_Conta_Chave"
    ]
  },
  {
    "tabela": "cad_Agente_Carga_Dados_Master",
    "colunas": [
      "IdAgente_Carga",
      "IdAgente_Carga_Dados_Master",
      "Indice",
      "Consignee_Master",
      "Notify_Master",
      "Shipper_Master",
      "Remarks_Master",
      "Sobrepor_Consignee_Master",
      "Sobrepor_Notify_Master",
      "Sobrepor_Shipper_Master",
      "Sobrepor_Remarks_Master",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional"
    ]
  },
  {
    "tabela": "cad_Agente_Desconsolidador",
    "colunas": [
      "IdPessoa"
    ]
  },
  {
    "tabela": "cad_Agrupamento_Demonstrativo",
    "colunas": [
      "IdAgrupamento_Demonstrativo",
      "Codigo",
      "Descricao",
      "Indice",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Agrupamento_Equipamento_Mariti",
    "colunas": [
      "IdAgrup_Equipamento_Maritimo",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Agrupamento_Equipamento_Maritim",
    "colunas": [
      "IdAgrup_Equipamento_Maritimo",
      "IdEquipamento_Maritimo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Agrupamento_Porto_Item",
    "colunas": [
      "IdAgrupamento_Porto_Item",
      "IdAgrupamento_Porto_Tarifario",
      "IdOrigem_Destino",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Agrupamento_Porto_Tarifario",
    "colunas": [
      "IdAgrupamento_Porto_Tarifario",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Apresentacao",
    "colunas": [
      "IdApresentacao",
      "IdUnidade_Medida",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Descricao_Curta",
      "Quantidade",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Arquivo_Grupo",
    "colunas": [
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Exibir_Portal_Cliente",
      "Solicitar_Verificacao",
      "Compartilhar_Automaticamente",
      "Compartilhar_Cliente",
      "Compartilhar_Exportador",
      "Compartilhar_Importador",
      "Compartilhar_Notify",
      "Compartilhar_Despachante",
      "Compartilhar_Vendedor",
      "Compartilhar_Transp_Origem",
      "Compartilhar_Transp_Destino",
      "Compartilhar_Representante",
      "Compartilhar_Represent_Final",
      "Compartilhar_Indicacao",
      "Compartilhar_Agente_Origem",
      "Compartilhar_Agente_Destino",
      "Compartilhar_Empresa"
    ]
  },
  {
    "tabela": "cad_Associacao_Internacional",
    "colunas": [
      "IdPessoa",
      "IdMoeda_Comissao",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo_Comissao",
      "Base_Calculo_Comissao",
      "Acesso_Restrito"
    ]
  },
  {
    "tabela": "cad_Associacao_Internacional_Temp",
    "colunas": [
      "IdAssociacao_Internacional",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Atividade_Servico",
    "colunas": [
      "IdAtividade_Servico",
      "IdMunicipio",
      "Codigo",
      "Descricao",
      "Item_Lista_Servico",
      "Codigo_Tributacao_Municipio",
      "CNAE_Fiscal",
      "Observacao",
      "Natureza_Operacao_Normal",
      "Natureza_Operacao_Simples",
      "Endereco_Prestacao_Servico"
    ]
  },
  {
    "tabela": "cad_Atualizador_Faturas_Config",
    "colunas": [
      "IdAtualizador_Faturas_Config",
      "Nome",
      "Horario",
      "Atualizar_Fatores",
      "Atualizar_Vencimentos",
      "Atualizar_Vencimento_Vencidas",
      "Dias_Adicionais_Vencidas",
      "Faturas_Finalizadas",
      "Faturas_Nao_Finalizadas",
      "Faturas_Conferidas",
      "Faturas_Sem_Conferencia",
      "Tipo_Fatura_Pagamento",
      "Tipo_Fatura_Recebimento",
      "Tipo_Fatura_Agente",
      "Tipo_Fatura_Vendedor",
      "Tipo_Fatura_Representante",
      "Tipo_Fatura_Comissao",
      "Tipo_Fatura_Outras_Despesas",
      "Tipo_Fatura_Adiantamento",
      "Tipo_Fatura_Acerto_Saldo",
      "Tipo_Fatura_Caucao_Demurrage",
      "Tipo_Fatura_Acerto_Demurrage",
      "Tipo_Fatura_Associacao_Inter",
      "Tipo_Fatura_Seguradora",
      "Tipo_Fatura_Rcbto_Repasse",
      "Tipo_Fatura_Acerto_Profit",
      "Tipo_Fatura_Pgto_Despachante",
      "Tipo_Fatura_Rcbto_Despachante",
      "Situacao_Fatura_Em_Aberto",
      "Situacao_Fatura_Cobranca",
      "Situacao_Fatura_Cobranca_Judic",
      "Situacao_Fatura_Negativado",
      "Situacao_Fatura_Protestado",
      "Situacao_Fatura_Junk",
      "Tipo_Servico_Agenciamento",
      "Tipo_Servico_Demurrage",
      "Tipo_Servico_Desembaraco",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional",
      "Modalidade_Processo_Aereo",
      "Modalidade_Processo_Maritimo",
      "Modalidade_Processo_Terrestre",
      "Situacao_Processo_Aberto",
      "Situacao_Em_Andamento",
      "Situacao_Liberado_Faturamento",
      "Situacao_Faturado",
      "Situacao_Auditado",
      "Situacao_Finalizado",
      "Situacao_Pre_Processo",
      "Situacao_Aguardando_Embarque",
      "Situacao_Embarcado",
      "Situacao_Desembarcado",
      "Situacao_Pendente",
      "Situacao_Autorizado",
      "Situacao_Coletado",
      "Situacao_Entregue",
      "Situacao_Aguardando_Prontidao",
      "Situacao_Aguardando_Booking",
      "Situacao_Embarque_Finalizado",
      "Situacao_Aguardando_Coleta",
      "Situacao_Aguardando_Entrega",
      "Opcao_Filtro_Data",
      "Filtro_Data_Periodo",
      "Filtro_Data_Inicial",
      "Filtro_Data_Final",
      "Opcao_Filtro_Pessoa",
      "Filtro_Pessoas",
      "Opcao_Filtro_Tipo_Transacao",
      "Filtro_Tipos_Transacao",
      "Opcao_Filtro_Status_Processo",
      "Filtro_Status_Processo",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_BACEN_Pais",
    "colunas": [
      "IdBACEN_Pais",
      "Codigo",
      "Nome"
    ]
  },
  {
    "tabela": "cad_Banco",
    "colunas": [
      "IdBanco",
      "IdIntegracao_Cobranca_Banco",
      "Codigo",
      "Nome",
      "Numero",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Banco_Agencia",
    "colunas": [
      "IdPessoa",
      "IdBanco",
      "Numero_Agencia",
      "Digito_Verificador"
    ]
  },
  {
    "tabela": "cad_Bloqueio_Acoes_Financeiro",
    "colunas": [
      "IdBloqueio_Acoes_Financeiro",
      "IdPapel",
      "Conferir_Faturas",
      "Desfazer_Conferencia_Faturas",
      "Conciliar_Movimentacoes",
      "Desconciliar_Movimentacoes",
      "Baixar_Fatura",
      "Baixar_Titulo_Sem_Conferencia",
      "Data_Vencimento_Menor_Data",
      "Data_Baixa_Menor_Data",
      "Alterar_Baixa_Conciliada",
      "Excluir_Movimentacao_Conciliada",
      "Alterar_Movimentacao_Conciliada",
      "Excluir_Baixa_Conciliada",
      "Alterar_Nota_Recibo_Conferido",
      "Alterar_Dados_Faturamento"
    ]
  },
  {
    "tabela": "cad_Bloqueio_Condicional",
    "colunas": [
      "IdBloqueio_Condicional",
      "IdPapel",
      "Descricao",
      "Classe",
      "Ao_Inserir",
      "Ao_Editar",
      "Ao_Excluir",
      "Ao_Confirmar_Insercao",
      "Ao_Confirmar_Edicao",
      "Bloqueio_Ativo",
      "Dados_Registro",
      "xml",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Bloqueio_Condicional_Parametro",
    "colunas": [
      "IdBloqueio_Condicional_Parametro",
      "Codigo",
      "Classe",
      "Descricao",
      "Dados_Registro",
      "xml",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Bloqueio_Conta_Corrente",
    "colunas": [
      "IdBloqueio_Conta_Corrente",
      "IdConta_Corrente",
      "IdPapel"
    ]
  },
  {
    "tabela": "cad_Bloqueio_Logistica_Situacao",
    "colunas": [
      "IdBloqueio_Logistica_Situacao",
      "IdPapel",
      "Situacao_Agenciamento",
      "Bloqueio_Processo",
      "Bloqueio_Transbordos_Escalas",
      "Bloqueio_Conhecimentos",
      "Bloqueio_Equipamentos",
      "Bloqueio_Embalagens",
      "Bloqueio_Comissoes",
      "Bloqueio_Taxas",
      "Bloqueio_Faturas",
      "Libera_Pagar_Para",
      "Libera_Receber_De",
      "Libera_Pessoa_Pagamento",
      "Libera_Pessoa_Recebimento",
      "Libera_Pessoa_Conta_Pagamento",
      "Libera_Faturamento_Pagamento",
      "Libera_Faturamento_Recebimento",
      "Bloqueio_Arquivos",
      "Finalizar_Faturas"
    ]
  },
  {
    "tabela": "cad_Bloqueio_Tipo_Transacao",
    "colunas": [
      "IdBloqueio_Tipo_Transacao",
      "IdPapel",
      "IdTipo_Transacao"
    ]
  },
  {
    "tabela": "cad_Boleto_Cobranca_Modelo",
    "colunas": [
      "IdBoleto_Cobranca_Modelo",
      "Codigo",
      "Nome",
      "Especie_Documento",
      "Aceite",
      "Local_Pagamento",
      "Tipo_Desconto_1",
      "Valor_Desconto_1",
      "Tipo_Desconto_2",
      "Valor_Desconto_2",
      "Tipo_Desconto_3",
      "Valor_Desconto_3",
      "Tipo_Juros",
      "Valor_Juros",
      "Tipo_Multa",
      "Valor_Multa",
      "Tipo_Protesto",
      "Prazo_Protesto",
      "Tipo_Baixa_Devolucao",
      "Prazo_Baixa",
      "Tipo_Rateio",
      "Tipo_Valor_Rateio",
      "Responsavel_Impressao",
      "Tipo_Categoria",
      "Tipo_Postagem",
      "Tipo_Emissao_Bloqueto",
      "Tipo_Distribuicao_Bloqueto",
      "Informacoes_Adicionais",
      "Instrucoes",
      "Variacao_Carteira",
      "Codigo_Tipo_Cobranca",
      "Codigo_Instrucao_1",
      "Codigo_Instrucao_2",
      "Codigo_Instrucao_3",
      "Instrucao_Prazo_1",
      "Instrucao_Prazo_2",
      "Instrucao_Prazo_3",
      "Descontavel",
      "Cedente_Conta_Codigo_Empresa",
      "Agencia_Cobradora",
      "Classificacao",
      "Tipo_Documento",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Boleto_Cobranca_Modelo_Msg",
    "colunas": [
      "IdBoleto_Cobranca_Modelo",
      "IdBoleto_Cobranca_Modelo_Msg",
      "Mensagem",
      "Indice"
    ]
  },
  {
    "tabela": "cad_Caminho_Tarefa",
    "colunas": [
      "IdCaminho_Tarefa",
      "Codigo",
      "Descricao",
      "Cor_Rotulo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Cargo",
    "colunas": [
      "IdCargo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Carteira_Cobranca",
    "colunas": [
      "IdCarteira_Cobranca",
      "IdBanco",
      "Numero",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Categoria_Financeira",
    "colunas": [
      "IdCategoria_Financeira",
      "IdCategoria_Superior",
      "IdGrupo_Empresa",
      "IdAgrupamento_Demonstrativo",
      "Codigo",
      "Nome",
      "Codigo_Nivel",
      "Nivel",
      "Receita",
      "Despesa",
      "Tipo_Custo",
      "Observacao",
      "Codigo_Externo",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Categoria_Financeira_Custo",
    "colunas": [
      "IdCategoria_Financeira",
      "IdCentro_Custo",
      "Porcentagem",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Categoria_Processo_Logistico",
    "colunas": [
      "IdCategoria_Processo_Logistico",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Centro_Custo",
    "colunas": [
      "IdCentro_Custo",
      "IdCentro_Custo_Superior",
      "IdGrupo_Empresa",
      "Codigo",
      "Nome",
      "Nivel",
      "Codigo_Nivel",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Certificado_Digital",
    "colunas": [
      "IdCertificado_Digital",
      "IdEmpresa_Sistema",
      "Descricao",
      "Data_Inicio_Vigencia",
      "Data_Termino_Vigencia",
      "Dados_Arquivo",
      "Ambiente",
      "Observacao",
      "Numero_Serie",
      "Cnpj",
      "Md5"
    ]
  },
  {
    "tabela": "cad_Chave_Numeracao",
    "colunas": [
      "IdChave_Numeracao",
      "Chave_Numeracao"
    ]
  },
  {
    "tabela": "cad_Classificacao_Tributaria",
    "colunas": [
      "IdClassificacao_Tributaria",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Cliente",
    "colunas": [
      "IdPessoa",
      "IdFuncionario_Responsavel",
      "IdVendedor_Responsavel",
      "IdContrato_Pagamento",
      "IdEmpresa_Sistema",
      "IdIndicacao",
      "IdMoeda_Limite_Credito",
      "IdCliente_Classificacao",
      "Contribuinte_ICMS",
      "Cliente_Desde",
      "Tipo_Cliente",
      "Cliente",
      "Importador",
      "Exportador",
      "Aviso",
      "Encaminhado_Por",
      "NIF",
      "Termino_Incidencia_Detention",
      "Sobrepor_Instrucoes_Cliente",
      "Ultima_Alteracao_Vendedor",
      "Valor_Limite_Credito"
    ]
  },
  {
    "tabela": "cad_Cliente_Classificacao",
    "colunas": [
      "IdCliente_Classificacao",
      "Codigo",
      "Nome",
      "Cor",
      "Negrito",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Cobertura_Seguro",
    "colunas": [
      "IdCobertura_Seguro",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Comexpert_Grupo_Documento",
    "colunas": [
      "IdComexpert_Grupo_Documento",
      "IdArquivo_Grupo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Companhia_Transporte",
    "colunas": [
      "IdPessoa",
      "Codigo_IATA",
      "Prefixo",
      "Sigla",
      "Tipo_Aerea",
      "Tipo_Maritima",
      "Tipo_Terrestre",
      "Disponibilizar_Tarifario",
      "Instrucao_Operacional",
      "Termino_Incidencia_Detention",
      "Tipo_Courier"
    ]
  },
  {
    "tabela": "cad_Companhia_Transporte_Prestadora",
    "colunas": [
      "IdCia_Transporte_Prestadora",
      "IdCompanhia_Transporte",
      "IdOrigem_Destino",
      "IdAgencia_Maritima_Aerea"
    ]
  },
  {
    "tabela": "cad_Condicao_Oferta",
    "colunas": [
      "IdCondicao_Oferta",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Condicao_Oferta_Grupo",
    "colunas": [
      "IdCondicao_Oferta_Grupo",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Condicao_Pagamento",
    "colunas": [
      "IdCondicao_Pagamento",
      "Codigo",
      "Nome",
      "Indicador",
      "Dias_Tolerancia",
      "Dia_Vencimento",
      "Mes_Vencimento",
      "Parcelamento",
      "Quantidade_Parcelas",
      "Intervalo_Parcelamento",
      "Acrescimo",
      "Abatimento",
      "Desconto_Incondicional",
      "Desconto_Condicional",
      "Dias_Desconto_Condicional",
      "Multa",
      "Juros",
      "Periodo_Juros",
      "Tipo_Juros",
      "Tolerancia_Multa_Juros",
      "Exigir_Baixa",
      "Instrucao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Condicao_Pagamento_Parcela",
    "colunas": [
      "IdCondicao_Pagamento",
      "Numero",
      "Quantidade_Dias",
      "Porcentagem",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Config_Logistica_Comissao",
    "colunas": [
      "IdConfig_Logistica_Comissao",
      "IdTaxa_Vendedor",
      "IdTaxa_Empresa",
      "IdTaxa_Outros",
      "IdTaxa_Demurrage",
      "IdTaxa_Representante",
      "IdTaxa_Contato",
      "IdTaxa_Outro_Vendedor",
      "IdTaxa_Comissao_Associacao",
      "IdTaxa_Seguro",
      "IdTaxa_Representante_Final",
      "IdTaxa_Profit",
      "IdTaxa_Frete_Rodoviario",
      "IdTaxa_Agente_Origem_Base_1",
      "IdTaxa_Agente_Origem_Base_2",
      "IdTaxa_Agente_Destino_Base_1",
      "IdTaxa_Agente_Destino_Base_2"
    ]
  },
  {
    "tabela": "cad_Config_Logistica_Fatura",
    "colunas": [
      "IdConfig_Logistica_Fatura",
      "IdGrupo_Empresa",
      "IdEmpresa_Sistema",
      "IdTransacao_Pgto_Agenciamento",
      "IdTransacao_Rcbto_Agenciamento",
      "IdTransacao_Pagamento_Agente",
      "IdTransacao_Recebimento_Agente",
      "IdTransacao_Comissao_Vendedor",
      "IdTransacao_Pagamento_Comissao",
      "IdTransacao_Pgto_Demurrage",
      "IdTransacao_Rcbto_Demurrage",
      "IdTransacao_Pgto_Detention",
      "IdTransacao_Rcbto_Detention",
      "IdTransacao_Adiantamento",
      "IdTransacao_Pagamento_Despesas",
      "IdTransacao_Pagamento_Acerto",
      "IdTransacao_Recebimento_Acerto",
      "IdCategoria_Pgto_Agenciamento",
      "IdCategoria_Rcbto_Agenciamento",
      "IdCategoria_Pagamento_Agente",
      "IdCategoria_Recebimento_Agente",
      "IdCategoria_Comissao_Vendedor",
      "IdCategoria_Pagamento_Comissao",
      "IdCategoria_Pgto_Demurrage",
      "IdCategoria_Rcbto_Demurrage",
      "IdCategoria_Pgto_Detention",
      "IdCategoria_Rcbto_Detention",
      "IdCategoria_Adiantamento",
      "IdCategoria_Pagamento_Despesas",
      "IdCategoria_Pagamento_Acerto",
      "IdCategoria_Recebimento_Acerto",
      "IdCusto_Pgto_Agenciamento",
      "IdCusto_Rcbto_Agenciamento",
      "IdCusto_Pagamento_Agente",
      "IdCusto_Recebimento_Agente",
      "IdCusto_Comissao_Vendedor",
      "IdCusto_Pagamento_Comissao",
      "IdCusto_Pgto_Demurrage",
      "IdCusto_Rcbto_Demurrage",
      "IdCusto_Pgto_Detention",
      "IdCusto_Rcbto_Detention",
      "IdCusto_Adiantamento",
      "IdCusto_Pagamento_Despesas",
      "IdCusto_Pagamento_Acerto",
      "IdCusto_Recebimento_Acerto",
      "IdTransacao_Representante",
      "IdCategoria_Representante",
      "IdCusto_Representante",
      "IdTipo_Mov_Representante",
      "IdTipo_Mov_Adiantamento",
      "IdTransacao_Pgto_Seguradora",
      "IdCategoria_Pgto_Seguradora",
      "IdCusto_Pgto_Seguradora",
      "IdTransacao_Pgto_Associacao",
      "IdCategoria_Pgto_Associacao",
      "IdCusto_Pgto_Associacao",
      "IdTransacao_Rcbto_Repasse",
      "IdCategoria_Rcbto_Repasse",
      "IdCusto_Rcbto_Repasse",
      "IdTransacao_Profit",
      "IdCategoria_Profit",
      "IdCusto_Profit",
      "IdTipo_Mov_Profit",
      "IdTransacao_Pgto_Despachante",
      "IdCategoria_Pgto_Despachante",
      "IdCusto_Pgto_Despachante",
      "IdTransacao_Rcbto_Despachante",
      "IdCategoria_Rcbto_Despachante",
      "IdCusto_Rcbto_Despachante",
      "Tipo_Operacao",
      "Modalidade_Processo",
      "Tipo_Custo_Pgto_Agenciamento",
      "Tipo_Custo_Rcbto_Agenciamento",
      "Tipo_Custo_Pagamento_Agente",
      "Tipo_Custo_Recebimento_Agente",
      "Tipo_Custo_Comissao_Vendedor",
      "Tipo_Custo_Pagamento_Comissao",
      "Tipo_Custo_Pgto_Demurrage",
      "Tipo_Custo_Rcbto_Demurrage",
      "Tipo_Custo_Pgto_Detention",
      "Tipo_Custo_Rcbto_Detention",
      "Tipo_Custo_Adiantamento",
      "Tipo_Custo_Pagamento_Despesas",
      "Tipo_Custo_Pagamento_Acerto",
      "Tipo_Custo_Recebimento_Acerto",
      "Observacao",
      "Tipo_Custo_Representante",
      "IdTipo_Mov_Pgto_Agenciamento",
      "IdTipo_Mov_Rcbto_Agenciamento",
      "IdTipo_Mov_Pagamento_Agente",
      "IdTipo_Mov_Recebimento_Agente",
      "IdTipo_Mov_Comissao_Vendedor",
      "IdTipo_Mov_Pagamento_Comissao",
      "IdTipo_Mov_Pgto_Demurrage",
      "IdTipo_Mov_Rcbto_Demurrage",
      "IdTipo_Mov_Pgto_Detention",
      "IdTipo_Mov_Rcbto_Detention",
      "IdTipo_Mov_Pagamento_Despesas",
      "IdTipo_Mov_Pagamento_Acerto",
      "IdTipo_Mov_Recebimento_Acerto",
      "Tipo_Custo_Pgto_Seguradora",
      "IdTipo_Mov_Pgto_Seguradora",
      "Tipo_Custo_Pgto_Associacao",
      "IdTipo_Mov_Pgto_Associacao",
      "Tipo_Custo_Rcbto_Repasse",
      "IdTipo_Mov_Rcbto_Repasse",
      "Tipo_Custo_Profit",
      "IdTipo_Mov_Pgto_Despachante",
      "Tipo_Custo_Pgto_Despachante",
      "IdTipo_Mov_Rcbto_Despachante",
      "Tipo_Custo_Rcbto_Despachante"
    ]
  },
  {
    "tabela": "cad_Configuracao_Campo_Livre",
    "colunas": [
      "IdConfiguracao_Campo_Livre",
      "IdGrupo_Campo_Livre",
      "Identificador",
      "IdTarefa_Verificacao",
      "Descricao",
      "Tipo_Valor",
      "Formato_Apresentacao",
      "Mascara_Edicao",
      "Itens",
      "Divisao_Referencia",
      "Campo_Referencia",
      "Filtros",
      "xml",
      "Precedencia",
      "Observacao",
      "Exibicao_Padrao",
      "Exibir_Portal_Cliente",
      "Compartilhar_Cliente",
      "Compartilhar_Exportador",
      "Compartilhar_Importador",
      "Compartilhar_Notify",
      "Compartilhar_Despachante",
      "Compartilhar_Transp_Origem",
      "Compartilhar_Transp_Destino",
      "Compartilhar_Representante",
      "Compartilhar_Represent_Final",
      "Compartilhar_Indicacao",
      "Compartilhar_Agente_Origem",
      "Compartilhar_Agente_Destino"
    ]
  },
  {
    "tabela": "cad_Configuracao_Nota_Fiscal_Servico",
    "colunas": [
      "IdConfiguracao_NF_Servico",
      "IdEmpresa_Sistema",
      "Ambiente_Atual",
      "Tempo_Consulta_Lote",
      "Observacao",
      "Tipo_Integracao"
    ]
  },
  {
    "tabela": "cad_Configuracao_Nota_Fiscal_Servico_It",
    "colunas": [
      "IdConfiguracao_NF_Servico",
      "IdConfiguracao_NF_Servico_Item",
      "Ambiente",
      "Serie",
      "Ultimo_Numero_Nota",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Configuracao_Nota_Fiscal_Servico_Lo",
    "colunas": [
      "IdConfiguracao_NF_Servico",
      "IdConfiguracao_NF_Servico_Lote",
      "Ambiente",
      "Ultimo_Numero_Lote",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Consulta_Logistica",
    "colunas": [
      "IdConsulta_Logistica",
      "Descricao",
      "Origem_Dados",
      "Configuracao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Consulta_Logistica_Usuario",
    "colunas": [
      "IdConsulta_Logistica",
      "IdUsuario"
    ]
  },
  {
    "tabela": "cad_Conta_Corrente",
    "colunas": [
      "IdConta_Corrente",
      "IdPessoa",
      "IdBanco",
      "IdBanco_Agencia",
      "IdMoeda",
      "IdConta_Correspondente",
      "Codigo",
      "Nome",
      "Descricao",
      "Agencia",
      "Agencia_DV",
      "Conta",
      "Conta_DV",
      "Operacao",
      "Limite",
      "Nome_Titular",
      "Cpf_Cnpj_Titular",
      "Padrao",
      "Observacao",
      "Ativo",
      "Tipo",
      "Codigo_Banco_Correspondente",
      "Codigo_Empresa",
      "Validacao_Ativa",
      "Impressao_Atualizada",
      "Integracao_Cobranca_Ativa",
      "Codigo_Beneficiario",
      "Codigo_CIP",
      "Impressao_Atualizada_Alteracao"
    ]
  },
  {
    "tabela": "cad_Conta_Corrente_Convenio",
    "colunas": [
      "IdConta_Corrente_Convenio",
      "IdConta_Corrente",
      "IdIntegracao_Cobranca_Carteira",
      "Codigo",
      "Nome",
      "Numero",
      "Carteira_Numero",
      "Carteira_Codigo",
      "Carteira_Variacao",
      "Reiniciar_Diariamente",
      "Numero_Remessa",
      "Padrao_CNAB",
      "Densidade_Remessa",
      "Registro_Instantaneo",
      "API_ID",
      "API_Key",
      "API_Secret",
      "Estacao",
      "Nosso_Numero_Banco",
      "Tipo_Transmissao",
      "Tipo_Web_Service",
      "Numero_Contrato",
      "Integracao_Cobranca_Ativa",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Conta_Email",
    "colunas": [
      "IdConta_Email",
      "IdUsuario",
      "Nome",
      "EMail",
      "Endereco_Smtp",
      "Porta",
      "Login",
      "Senha",
      "Assinatura",
      "Observacao",
      "Tipo_TLS",
      "Metodo_Criptografia",
      "Copia_Carbono_Automatica",
      "Copia_Oculta_Automatica"
    ]
  },
  {
    "tabela": "cad_Contato_Atribuicao",
    "colunas": [
      "IdContato_Atribuicao",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Contato_Categoria",
    "colunas": [
      "IdContato_Categoria",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Contato_Grupo_Envio",
    "colunas": [
      "IdContato_Grupo_Envio",
      "IdPessoa_Contato",
      "IdGrupo_Envio_Mensagem"
    ]
  },
  {
    "tabela": "cad_Contrato_Cambio_Categoria",
    "colunas": [
      "IdContrato_Cambio_Categoria",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Contrato_Financeiro",
    "colunas": [
      "IdContrato_Financeiro",
      "Codigo",
      "Descricao",
      "Tipo",
      "Padrao",
      "Observacao",
      "Prazo_Suspenso",
      "Data_Validade",
      "Situacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Contrato_Logistica_Item",
    "colunas": [
      "IdContrato_Logistica_Item",
      "IdContrato_Financeiro",
      "IdCondicao_Pagamento",
      "IdConversao_Moeda",
      "IdForma_Cobranca",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Operacao_Importacao",
      "Operacao_Exportacao",
      "Operacao_Nacional",
      "Margem_Acrescimo_Cambio",
      "Opcao_Data_Referencia",
      "Dias_Tolerancia",
      "Instrucao_Financeira",
      "Observacao",
      "Indice",
      "Opcao_Data_Conversao",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Utilizar_Contrato",
      "Modalidade_Pgto_Collect",
      "Modalidade_Pgto_Prepaid",
      "Modalidade_Pgto_Prepaid_Abroad",
      "Modalidade_Pgto_Nao_Informada"
    ]
  },
  {
    "tabela": "cad_Conversao_Moeda",
    "colunas": [
      "IdConversao_Moeda",
      "IdPessoa",
      "Codigo",
      "Nome",
      "Observacao",
      "Padrao",
      "Boletim_Bacen",
      "Origem_Bacen",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Conversao_Moeda_Fator",
    "colunas": [
      "IdConversao_Moeda_Fator",
      "IdConversao_Moeda",
      "IdMoeda_Origem",
      "IdMoeda_Destino",
      "Fator",
      "Data_Atualizacao",
      "Observacao",
      "Data",
      "Data_Cotacao_Bacen"
    ]
  },
  {
    "tabela": "cad_Deadline_Cliente",
    "colunas": [
      "IdDeadline_Cliente",
      "IdPrazo_Armador",
      "IdPrazo_Cliente",
      "Codigo",
      "Nome",
      "Diferenca_Prazo_Horas",
      "Observacao",
      "Diferenca_Prazo_Dias",
      "Diferenca_Prazo_Minutos"
    ]
  },
  {
    "tabela": "cad_Despachante_Aduaneiro",
    "colunas": [
      "IdPessoa",
      "Numero_Matricula",
      "Webbl_User_Group_Id"
    ]
  },
  {
    "tabela": "cad_Despachante_Liberacao",
    "colunas": [
      "IdDespachante_Liberacao",
      "IdDespachante_Aduaneiro",
      "Requisitante",
      "Numero_Serie",
      "Chave_Acesso",
      "Liberado",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Despachante_Liberacao_Webbl",
    "colunas": [
      "IdDespachante_Aduaneiro",
      "User_Id"
    ]
  },
  {
    "tabela": "cad_Desvio_Categoria",
    "colunas": [
      "IdDesvio_Categoria",
      "Codigo",
      "Descricao",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Desvio_Origem",
    "colunas": [
      "IdDesvio_Origem",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Desvio_Responsavel",
    "colunas": [
      "IdDesvio_Responsavel",
      "Codigo",
      "Nome",
      "Origem",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Desvio_Subcategoria",
    "colunas": [
      "IdDesvio_Subcategoria",
      "IdDesvio_Categoria",
      "Codigo",
      "Descricao",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Documento_Logistica",
    "colunas": [
      "IdDocumento_Logistica",
      "Nome",
      "Precedencia",
      "Padrao",
      "Observacao",
      "Codigo"
    ]
  },
  {
    "tabela": "cad_EDI_Base_Type",
    "colunas": [
      "IdEDI_Base_Type",
      "IdEDI_Table",
      "IdField_Kind",
      "Id",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_Bind_Fields",
    "colunas": [
      "IdEDI_Bind_Fields",
      "IdBind_Tables",
      "IdHeadcargo_Table",
      "IdHeadcargo_Field",
      "IdLogenius_Table",
      "IdLogenius_Field",
      "IdLogenius_Field_Kind",
      "IdLogenius_Base_Type",
      "IdLogenius_Config_Table",
      "IdLogenius_Config_Field",
      "Codigo",
      "Precedencia",
      "Match_Check_Order",
      "Integrar",
      "Default_Value_Tipo",
      "Default_Value_Integer",
      "Default_Value_String",
      "Default_Value_Boolean",
      "Default_Value_Data",
      "Default_Value_Real",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_Bind_Tables",
    "colunas": [
      "IdEDI_Bind_Tables",
      "IdHeadCargo_Table",
      "IdLogenius_Table",
      "IdDefault_Provider_Importacao",
      "Codigo",
      "Precedencia",
      "Categoria",
      "Exportar_Somente_Base_De_Para",
      "Importar_Badge",
      "Selecionado",
      "Check_Match",
      "Parametros_Create",
      "Parametros_Post",
      "Custom_Filter",
      "Custom_Order_By",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_Data_Provider",
    "colunas": [
      "IdEDI_Data_Provider",
      "Codigo",
      "Nome",
      "Provider_Type",
      "Connection_URL",
      "Usuario",
      "Senha",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_Field",
    "colunas": [
      "IdEDI_Field",
      "IdEDI_Table",
      "IdField_Kind",
      "IdField_Master",
      "IdNo_Bind_Reason",
      "Id",
      "IdForeign_Table",
      "Precedencia",
      "Codigo",
      "Nome",
      "Descricao",
      "Tipo_Dados",
      "Match_Check_Order",
      "Not_Null",
      "Primary_Key",
      "Foreign_Key",
      "Result",
      "No_Bind",
      "Self_Parent",
      "Observacao",
      "Nome_Form"
    ]
  },
  {
    "tabela": "cad_EDI_Field_Kind",
    "colunas": [
      "IdEDI_Field_Kind",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_Interchange_History",
    "colunas": [
      "IdEDI_Interchange_History",
      "IdBind_Tables",
      "IdUsuario_Criacao",
      "Data_Criacao",
      "Sentido_Integracao",
      "Registros_Afetados",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_Module",
    "colunas": [
      "IdEDI_Module",
      "Id",
      "Contexto",
      "Sistema",
      "Codigo",
      "Nome",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_No_Bind_Reason",
    "colunas": [
      "IdEDI_No_Bind_Reason",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_EDI_Table",
    "colunas": [
      "IdEDI_Table",
      "IdModule",
      "IdProvider_Homologacao",
      "IdProvider_Producao",
      "IdNo_Bind_Reason",
      "Id",
      "Sistema",
      "Tipo_Tabela",
      "Codigo",
      "Nome",
      "Descricao",
      "Rota_Acesso",
      "Disponivel_Repositorio",
      "Tem_Project",
      "No_Bind",
      "Check_Match",
      "Copy_Badge",
      "Precedencia",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Embalagem",
    "colunas": [
      "IdEmbalagem",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Descricao",
      "Descricao_Internacional",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Empresa",
    "colunas": [
      "IdPessoa",
      "IdResponsavel_Legal",
      "IdEmpresa_Sistema",
      "Identificacao_Portal_Governo",
      "Numero_Registro",
      "Orgao_Registro",
      "Utiliza_IPI",
      "Sigla",
      "Matriz",
      "Marca",
      "CST_PIS",
      "Tipo_Aliquota_PIS",
      "Aliquota_PIS",
      "Tipo_Aliquota_PIS_ST",
      "Aliquota_PIS_ST",
      "CST_COFINS",
      "Tipo_Aliquota_COFINS",
      "Aliquota_COFINS",
      "Tipo_Aliquota_COFINS_ST",
      "Aliquota_COFINS_ST",
      "Inscricao_Estadual_ST",
      "Aliquota_CSLL",
      "Aliquota_INSS",
      "Aliquota_IR",
      "CNAE_Fiscal",
      "Regime_Tributario",
      "Regime_Especial_Tributacao",
      "Incentivador_Cultural",
      "Integracao_Cobranca_Ativa",
      "Integracao_Cobranca_Token",
      "Qualificador_Portal_Governo"
    ]
  },
  {
    "tabela": "cad_Enquadramento_Servico",
    "colunas": [
      "IdEnquadramento_Servico",
      "Codigo",
      "Descricao",
      "Indicador_RC",
      "Modulo_Venda",
      "Modulo_Aquisicao",
      "Modulo_RPC",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Equipamento_Container_Serpro",
    "colunas": [
      "IdEquipamento_Container_Serpro",
      "IdEquipamento_Maritimo",
      "IdArmador",
      "IdSerpro_Tipo_Conteiner",
      "Codigo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Equipamento_Maritimo",
    "colunas": [
      "IdEquipamento_Maritimo",
      "Codigo",
      "Descricao",
      "Tipo",
      "Largura_Interna",
      "Altura_Interna",
      "Comprimento_Interno",
      "Altura_Externa",
      "Largura_Externa",
      "Comprimento_Externo",
      "Cubagem",
      "Altura_Porta",
      "Largura_Porta",
      "Peso_Maximo",
      "Peso_Tara",
      "Peso_Carga",
      "Foto",
      "Caracateristicas",
      "Observacao",
      "Disponibilizar_Tarifario"
    ]
  },
  {
    "tabela": "cad_Equipe_Tarefa",
    "colunas": [
      "IdEquipe_Tarefa",
      "IdEquipe_Tarefa_Superior",
      "IdEmpresa_Sistema",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Equipe_Tarefa_Membro",
    "colunas": [
      "IdEquipe_Tarefa_Membro",
      "IdEquipe_Tarefa",
      "IdFuncionario",
      "IdEmpresa_Sistema",
      "Lider",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Etapa_Tarefa",
    "colunas": [
      "IdEtapa_Tarefa",
      "IdEtapa_Tarefa_Superior",
      "IdEtapa_Tarefa_Precedente",
      "IdProjeto_Tarefa",
      "Codigo",
      "Descricao",
      "Base_Calculo_Previsao_Inicio",
      "Dias_Inicio",
      "Horas_Inicio",
      "Minutos_Inicio",
      "Observacao",
      "Campo_Monitoramento_Inicio",
      "Base_Calculo_Previsao_Termino",
      "Campo_Monitoramento_Termino",
      "Dias_Termino",
      "Horas_Termino",
      "Minutos_Termino",
      "Antecipar_Vinculo_Inicio",
      "Atrasar_Vinculo_Inicio",
      "Antecipar_Vinculo_Termino",
      "Atrasar_Vinculo_Termino",
      "Hora_Fixa_Inicio",
      "Hora_Fixa_Termino",
      "Dia_Nao_Util_Inicio",
      "Dia_Nao_Util_Termino",
      "IdEtapa_Tarefa_Vinculo_Data"
    ]
  },
  {
    "tabela": "cad_Fabricante",
    "colunas": [
      "IdPessoa"
    ]
  },
  {
    "tabela": "cad_Faixa_Peso_Cobranca",
    "colunas": [
      "IdFaixa_Peso_Cobranca",
      "Codigo",
      "Nome",
      "Peso_Minimo",
      "Peso_Maximo",
      "Tipo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Feriado",
    "colunas": [
      "IdFeriado",
      "Nome",
      "Dia",
      "Mes",
      "Ano",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Feriado_Hora_Operacional",
    "colunas": [
      "IdFeriado_Hora_Operacional",
      "IdFeriado",
      "Hora_Inicio",
      "Hora_Termino"
    ]
  },
  {
    "tabela": "cad_Filtro_Logisitica_Categoria",
    "colunas": [
      "IdFiltro_Logisitica_Categoria",
      "IdRelatorio",
      "Codigo",
      "Categoria",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Fonte_Dados",
    "colunas": [
      "IdFonte_Dados",
      "Codigo",
      "Nome",
      "Dados",
      "xml",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Forma_Cobranca",
    "colunas": [
      "IdForma_Cobranca",
      "Codigo",
      "Nome",
      "Gerar_Boleto",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Forma_Pagamento",
    "colunas": [
      "IdForma_Pagamento",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Dias_Compensar",
      "Compensacao_Automatica",
      "Padrao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Fornecedor",
    "colunas": [
      "IdPessoa",
      "IdFornecedor_Pagamento",
      "Contribuinte_ICMS",
      "Regime_Tributario"
    ]
  },
  {
    "tabela": "cad_Frequencia_Viagem",
    "colunas": [
      "IdFrequencia_Viagem",
      "Codigo",
      "Descricao",
      "Descricao_Internacional",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Funcionario",
    "colunas": [
      "IdPessoa",
      "IdEmpresa",
      "IdUsuario_Correspondente",
      "IdCargo",
      "IdMoeda_Comissao",
      "Tipo_Comissao",
      "Comissao",
      "Data_Admissao",
      "Data_Vencimento_Ferias",
      "Data_Demissao",
      "Atividade_Complementar"
    ]
  },
  {
    "tabela": "cad_Grupo_Campo_Livre",
    "colunas": [
      "IdGrupo_Campo_Livre",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Contato",
    "colunas": [
      "IdGrupo_Contato",
      "IdPessoa",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Contato_Item",
    "colunas": [
      "IdGrupo_Contato_Item",
      "IdGrupo_Contato",
      "IdPessoa_Contato",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Empresa",
    "colunas": [
      "IdGrupo_Empresa",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Empresa_Membro",
    "colunas": [
      "IdGrupo_Empresa",
      "IdEmpresa_Sistema"
    ]
  },
  {
    "tabela": "cad_Grupo_Envio_Mensagem",
    "colunas": [
      "IdGrupo_Envio_Mensagem",
      "Codigo",
      "Nome",
      "Observacao",
      "Compartilhar_Automaticamente",
      "Compartilhar_Cliente",
      "Compartilhar_Exportador",
      "Compartilhar_Importador",
      "Compartilhar_Notify",
      "Compartilhar_Despachante",
      "Compartilhar_Vendedor",
      "Compartilhar_Transp_Origem",
      "Compartilhar_Transp_Destino",
      "Compartilhar_Representante",
      "Compartilhar_Represent_Final",
      "Compartilhar_Indicacao",
      "Compartilhar_Agente_Origem",
      "Compartilhar_Agente_Destino",
      "Compartilhar_Empresa"
    ]
  },
  {
    "tabela": "cad_Grupo_Financeiro",
    "colunas": [
      "IdGrupo_Financeiro",
      "IdEmpresa_Sistema",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Mensagem",
    "colunas": [
      "IdGrupo_Mensagem",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Mercadoria",
    "colunas": [
      "IdGrupo_Mercadoria",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Mercadoria_Seguro",
    "colunas": [
      "IdGrupo_Mercadoria_Seguro",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Tarefa",
    "colunas": [
      "IdGrupo_Tarefa",
      "IdGrupo_Tarefa_Superior",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Grupo_Usuario",
    "colunas": [
      "IdGrupo_Usuario",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Hora_Operacional",
    "colunas": [
      "IdHora_Operacional",
      "Dia_Semana",
      "Hora_Inicio",
      "Hora_Termino",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_IBGE_Municipio",
    "colunas": [
      "IdIBGE_Municipio",
      "Codigo_UF",
      "Codigo_Municipio",
      "Codigo_Distrito",
      "Municipio",
      "Distrito"
    ]
  },
  {
    "tabela": "cad_IBGE_Unidade_Federativa",
    "colunas": [
      "IdIBGE_Unidade_Federativa",
      "Codigo",
      "Nome",
      "Sigla"
    ]
  },
  {
    "tabela": "cad_Incoterm",
    "colunas": [
      "IdIncoterm",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Incoterm_Mod_Pgto_House",
    "colunas": [
      "IdIncoterm",
      "IdIncoterm_Mod_Pgto_House",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Modalidade_Pagamento_House",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Incoterm_Mod_Pgto_Master",
    "colunas": [
      "IdIncoterm",
      "IdIncoterm_Mod_Pgto_Master",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Modalidade_Pagamento_Master",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Incoterm_Tipo_Servico",
    "colunas": [
      "IdIncoterm_Tipo_Servico",
      "IdIncoterm",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Tipo_Servico",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Indicador_Logistica_Fatura",
    "colunas": [
      "IdIndicador_Logistica_Fatura",
      "Codigo",
      "Nome",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Integracao_Cobranca_Banco",
    "colunas": [
      "IdIntegracao_Cobranca_Banco",
      "Codigo",
      "Nome",
      "Especie_Titulo"
    ]
  },
  {
    "tabela": "cad_Integracao_Cobranca_Carteira",
    "colunas": [
      "IdIntegracao_Cobranca_Carteira",
      "IdIntegracao_Cobranca_Banco",
      "Codigo",
      "Nome"
    ]
  },
  {
    "tabela": "cad_Justificativa_Infracao",
    "colunas": [
      "IdJustificativa_Infracao",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Lembrete_Tarefa",
    "colunas": [
      "IdLembrete_Tarefa",
      "Codigo",
      "Descricao",
      "Cor_Rotulo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Linha_Comercial",
    "colunas": [
      "IdLinha_Comercial",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Local_Armazenamento",
    "colunas": [
      "IdLocal_Armazenamento",
      "IdEmpresa",
      "IdLocal_Requisicao",
      "IdCentro_Custo",
      "Codigo",
      "Nome",
      "Aceita_Requisicao",
      "Requisicao_Fracionada",
      "Tipo_Solicitacao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Logistica_Taxa_Situacao",
    "colunas": [
      "IdLogistica_Taxa_Situacao",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Marcador_Fatura_Financeira",
    "colunas": [
      "IdMarcador_Fatura_Financeira",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Mensagem_Automatica",
    "colunas": [
      "IdMensagem_Automatica",
      "IdFuncionario_Execucao",
      "Descricao",
      "Tipo_Recorrencia",
      "Intervalo_Recorrencia",
      "Hora_Recorrencia",
      "Dia_Recorrencia",
      "Mes_Recorrencia",
      "Quantidade_Recorrencias",
      "Inicio_Recorrencia",
      "Termino_Recorrencia",
      "Dados_Registro",
      "xml",
      "Data_Ultima_Recorrencia",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Mercadoria",
    "colunas": [
      "IdMercadoria",
      "IdGrupo_Mercadoria",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Observacao",
      "Carga_Perigosa",
      "Ativo",
      "Data_Criacao",
      "Data_Alteracao"
    ]
  },
  {
    "tabela": "cad_Mercante_Bloqueio_Taxa",
    "colunas": [
      "IdMercante_Bloqueio_Taxa",
      "IdSerpro_Componente_Frete",
      "Quantidade",
      "Valor_Minimo",
      "Valor_Maximo"
    ]
  },
  {
    "tabela": "cad_Modelo_Acompanhamento",
    "colunas": [
      "IdModelo_Acompanhamento",
      "IdGrupo_Envio_Mensagem",
      "Codigo",
      "Nome",
      "Dados",
      "Observacao",
      "Tipo",
      "Disponivel_Lancamento_Manual"
    ]
  },
  {
    "tabela": "cad_Modelo_Mensagem",
    "colunas": [
      "IdModelo_Mensagem",
      "IdGrupo_Mensagem",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdGrupo_Envio_Mensagem",
      "Codigo",
      "Nome",
      "Assunto",
      "Corpo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Modelo_Nota_Fiscal_Servico",
    "colunas": [
      "IdFonte_Dados",
      "IdModelo_Nota_Fiscal_Servico",
      "Codigo",
      "Descricao",
      "Dados",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Modelo_Relatorio",
    "colunas": [
      "IdModelo_Relatorio",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Moeda",
    "colunas": [
      "IdMoeda",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Sigla",
      "Moeda_Corrente",
      "Bacen",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Cotacao_Bacen",
      "Tipo_Moeda_Bacen"
    ]
  },
  {
    "tabela": "cad_Motivo_Cancelamento_Processo",
    "colunas": [
      "IdMotivo_Cancelamento_Processo",
      "Codigo",
      "Nome",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Motivo_Nao_Aprovacao_Proposta",
    "colunas": [
      "IdMotivo_Nao_Aprovacao_Proposta",
      "Codigo",
      "Descricao",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Motivo_Troca_Navio",
    "colunas": [
      "IdMotivo_Troca_Navio",
      "Codigo",
      "Descricao",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Municipio",
    "colunas": [
      "IdMunicipio",
      "IdUnidade_Federativa",
      "IdPais",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdRegiao_Estado",
      "Codigo",
      "Nome",
      "Sigla",
      "Cep",
      "Cep_Inicial",
      "Cep_Final",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_NBS",
    "colunas": [
      "IdNBS",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_NVOCC",
    "colunas": [
      "IdPessoa",
      "Codigo_Serpro"
    ]
  },
  {
    "tabela": "cad_Navio",
    "colunas": [
      "IdNavio",
      "IdCompanhia_Transporte",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Nivel_Servico_Aereo",
    "colunas": [
      "IdNivel_Servico_Aereo",
      "Codigo",
      "Descricao",
      "Observacao",
      "Tempo_Gerar_Embarque",
      "Tempo_Previsao_Embarque"
    ]
  },
  {
    "tabela": "cad_Origem_Destino",
    "colunas": [
      "IdOrigem_Destino",
      "IdOrigem_Destino_Grupo",
      "IdLinha_Comercial",
      "IdPais",
      "IdUnidade_Federativa",
      "Codigo",
      "Sigla",
      "Nome",
      "Tipo",
      "Observacao",
      "Disponibilizar_Tarifario",
      "Codigo_Serpro",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Origem_Destino_Equivalente",
    "colunas": [
      "IdOrigem_Destino_Equivalente",
      "IdOrigem_Destino",
      "Codigo",
      "Sigla",
      "Nome",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Origem_Destino_Grupo",
    "colunas": [
      "IdOrigem_Destino_Grupo",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Pais",
    "colunas": [
      "IdPais",
      "IdMoeda",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Bacen",
      "Nome",
      "Nome_Internacional",
      "Nacionalidade",
      "Sigla",
      "Bandeira",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Papel_Logistica_Responsavel",
    "colunas": [
      "IdPapel_Logistica_Responsavel",
      "IdResponsavel",
      "IdCliente",
      "IdPais",
      "IdPapel_Projeto",
      "Codigo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Papel_Projeto",
    "colunas": [
      "IdPapel_Projeto",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Papel_Usuario_Logistica",
    "colunas": [
      "IdPapel",
      "Visualizar_Processos",
      "Visualizar_Propostas",
      "Visualizar_Faturas",
      "Visualizar_Comissoes_Agente",
      "Visualizar_Comissoes_Represent",
      "Visualizar_Comissoes_Vendedor",
      "Visualizar_Comissoes_Outro",
      "Clonagem_Proposta",
      "Clonagem_Processo",
      "Visualizar_Clientes",
      "Visualizar_Comissoes_Contato",
      "Visualizar_Comissoes_Outro_Vend",
      "Exibir_Profit_Estimado",
      "Comissionados_Restritos",
      "Comissoes_Restritas",
      "Listar_Fretes_Nao_Encontrados",
      "Validar_Taxa_Previsao_Embarque",
      "Retroceder_Situacao",
      "Alteracao_Valor_Unitario_Menor",
      "Lancar_Processo_Manual",
      "Lancar_Processo_Oferta",
      "Acesso_Lancamento_Comissao",
      "Visualizar_Comissoes_Associac",
      "Alterar_Para_Processo_Aberto",
      "Alterar_Para_Em_Andamento",
      "Alterar_Para_Liberado_Faturamen",
      "Alterar_Para_Faturado",
      "Alterar_Para_Auditado",
      "Alterar_Para_Finalizado",
      "Alterar_Para_Cancelado",
      "Alterar_De_Processo_Aberto",
      "Alterar_De_Em_Andamento",
      "Alterar_De_Liberado_Faturamento",
      "Alterar_De_Faturado",
      "Alterar_De_Auditado",
      "Alterar_De_Finalizado",
      "Alterar_De_Cancelado",
      "Limite_Fatura_Operacional",
      "Bloqueio_Limite_Fatura",
      "Bloqueio_Profit_Negativo",
      "Finalizar_Faturas",
      "Bloqueio_Lancar_Taxa_Comissao",
      "Bloqueio_Nao_Clonar_Comissao",
      "Bloqueio_Desbloquear_Fatura",
      "Exibir_Profit_Comercial",
      "Totalizar_Registros_CRM",
      "Totalizar_Registros_Comercial",
      "Totalizar_Registros_Operacional",
      "Comparar_Processo_Tarifario",
      "Acesso_CRM_NVOCC",
      "Acesso_CRM_Terminal_Container",
      "Acesso_CRM_Agencia_Maritima",
      "Acesso_CRM_Despachante",
      "Acesso_CRM_Agente_Carga",
      "Acesso_CRM_Agente_Desconsol",
      "Acesso_CRM_Associacao_Inter",
      "Acesso_CRM_Representante",
      "Acesso_CRM_Banco_Agencia",
      "Acesso_CRM_Cia_Transporte",
      "Acesso_CRM_Fabricante",
      "Acesso_CRM_Fornecedor",
      "Acesso_CRM_Seguradora",
      "Acesso_CRM_Transportadora",
      "Acesso_CRM_Funcionario",
      "Acesso_CRM_Empresa",
      "Exportar_Registros_CRM",
      "Exportar_Registros_Comercial",
      "Exportar_Registros_Operacional",
      "Bloquear_Filtro_Rapido_Processo",
      "Bloqueio_Atualizar_Dados_Fatura",
      "Bloquear_Filtro_Rapido_CRM",
      "Gerar_Taxa_Clonagem_Processo",
      "Exportar_Consulta_Comercial",
      "Exportar_Consulta_Logistica",
      "Modal_Aereo",
      "Modal_Maritimo",
      "Modal_Terrestre",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Nacional",
      "Codigo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Papel_Usuario_Relatorio",
    "colunas": [
      "IdPapel",
      "IdRelatorio",
      "Imprimir",
      "Exportar",
      "Editar",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Paridade_Moedas",
    "colunas": [
      "IdParidade_Moedas",
      "IdMoeda_Origem",
      "IdMoeda_Destino"
    ]
  },
  {
    "tabela": "cad_Permissao_Frame",
    "colunas": [
      "IdPermissao_Frame",
      "IdPapel",
      "Classe_Frame"
    ]
  },
  {
    "tabela": "cad_Permissao_Grafico_Operacional",
    "colunas": [
      "IdUsuario",
      "IdEmpresa_Sistema",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Modalidade_Maritimo",
      "Modalidade_Aereo",
      "Modalidade_Terrestre",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional"
    ]
  },
  {
    "tabela": "cad_Pessoa",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdContrato_Financeiro",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo",
      "Tipo_Pessoa",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Imagem",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "VAT_Number",
      "EMail_Pessoal",
      "Correspondencia_EDI",
      "Motivo_Nao_Preenchimento_NIF",
      "Tipo_Vinculacao",
      "Endereco_Aplicacao"
    ]
  },
  {
    "tabela": "cad_Pessoa_Classificacao",
    "colunas": [
      "IdPessoa_Classificacao",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Pessoa_Classificacao_Item",
    "colunas": [
      "IdPessoa_Classificacao_Item",
      "IdPessoa_Classificacao",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Pessoa_Codigo_Externo",
    "colunas": [
      "IdPessoa_Codigo_Externo",
      "IdPessoa",
      "IdEmpresa_Sistema",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Pessoa_Comissao_Cliente",
    "colunas": [
      "IdPessoa_Comissao_Cliente",
      "IdAgente_Carga_Comissao",
      "IdPessoa"
    ]
  },
  {
    "tabela": "cad_Pessoa_Contato",
    "colunas": [
      "IdPessoa_Contato",
      "IdPessoa",
      "IdTipo_Numero",
      "IdSetor",
      "IdCargo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdContato_Categoria",
      "IdContato_Atribuicao",
      "Nome",
      "Fone",
      "Numero_Adicional",
      "EMail",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Data_Nascimento",
      "EMail_Pessoal"
    ]
  },
  {
    "tabela": "cad_Pessoa_Contrato_Logistica",
    "colunas": [
      "IdPessoa_Contrato_Logistica",
      "IdPessoa",
      "IdTabela_Preco_Logistica",
      "IdDespachante_Aduaneiro",
      "IdEmpresa_Sistema",
      "IdMercadoria",
      "IdProjeto_Atividade",
      "IdVendedor_Responsavel",
      "IdFuncionario_Responsavel",
      "IdMoeda_Comissao",
      "Data",
      "Descricao",
      "Contrato",
      "Observacao",
      "Encaminhado_Por",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo_Comissao",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Operacao_Exportacao",
      "Operacao_Importacao",
      "Operacao_Nacional",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Opcao_Recebimento",
      "Instrucao",
      "Instrucao_Financeira",
      "Instrucao_Operacional"
    ]
  },
  {
    "tabela": "cad_Pessoa_Contrato_Logistica_Campo_Li",
    "colunas": [
      "IdCampo_Livre",
      "IdPessoa_Contrato_Logistica"
    ]
  },
  {
    "tabela": "cad_Pessoa_Contrato_Logistica_Comissio",
    "colunas": [
      "IdPessoa_Contrato_Comissionado",
      "IdPessoa_Contrato_Logistica",
      "IdPessoa",
      "IdMoeda_Comissao",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo_Comissao",
      "Tipo_Comissionado",
      "Observacao",
      "Acesso_Restrito"
    ]
  },
  {
    "tabela": "cad_Pessoa_Foto",
    "colunas": [
      "IdArquivo",
      "IdPessoa"
    ]
  },
  {
    "tabela": "cad_Pessoa_Grupo",
    "colunas": [
      "IdPessoa_Grupo",
      "IdPessoa_Grupo_Pai",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Pessoa_Regiao_Atuacao",
    "colunas": [
      "IdPessoa_Regiao_Atuacao",
      "IdPessoa",
      "IdUnidade_Federativa",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Portal_Acesso",
    "colunas": [
      "IdPortal_Acesso",
      "IdPessoa",
      "IdPessoa_Contato",
      "IdPortal_Token_Convite",
      "Email",
      "Agente_Origem",
      "Agente_Destino",
      "Cliente",
      "Importador",
      "Exportador",
      "Notify",
      "Despachante_Aduaneiro",
      "Vendedor",
      "Transportadora_Origem",
      "Transportadora_Destino",
      "Representante",
      "Representante_Destino_Final",
      "Indicacao",
      "Empresa_Sistema",
      "Ativo",
      "Observacao",
      "Exibir_Dados_Desembaraco",
      "Exibir_Agente"
    ]
  },
  {
    "tabela": "cad_Portal_Acesso_Pessoa",
    "colunas": [
      "IdPortal_Acesso",
      "IdPessoa"
    ]
  },
  {
    "tabela": "cad_Portal_Usuario",
    "colunas": [
      "IdPortal_Usuario",
      "IdPortal_Acesso",
      "Nome",
      "Email",
      "Senha_Hash",
      "Senha_Salt",
      "Confirmado",
      "Data_Criacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Produto",
    "colunas": [
      "IdProduto",
      "IdApresentacao",
      "IdProduto_Grupo",
      "IdProduto_Categoria",
      "IdProduto_Estoque",
      "IdApresentacao_Fracionada",
      "IdApresentacao_Tributavel",
      "IdClassificacao_Tributaria",
      "IdFabricante",
      "IdApresentacao_Dimensao_X",
      "IdApresentacao_Dimensao_Y",
      "IdApresentacao_Dimensao_Z",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdProduto_Qualidade",
      "IdProduto_Tipo",
      "IdProduto_Especie",
      "IdLocal_Armazenamento",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "NCM",
      "Descricao",
      "Codigo_Barras",
      "Preco_Custo",
      "Margem_Lucro",
      "Preco_Venda",
      "Atualizar_Preco_Venda",
      "Base_ICMS_Dentro",
      "Base_ICMS_Fora",
      "Base_ICMS_Exterior",
      "Aliquota_ICMS_Dentro",
      "Aliquota_ICMS_Fora",
      "Aliquota_ICMS_Exterior",
      "Inciso_IPI",
      "Disponivel_Compra",
      "Disponivel_Venda",
      "Fator_Fracionamento",
      "Fator_Apresentacao_Tributavel",
      "Fracionamento",
      "Composicao",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Origem_Mercadoria",
      "CST_ICMS_Dentro",
      "CST_ICMS_Fora",
      "CST_ICMS_Exterior",
      "CSOSN_ICMS_Dentro",
      "CSOSN_ICMS_Fora",
      "CSOSN_ICMS_Exterior",
      "Modalidade_ICMS_Dentro",
      "Modalidade_ICMS_Fora",
      "Modalidade_ICMS_Exterior",
      "Modalidade_ICMS_ST_Dentro",
      "Modalidade_ICMS_ST_Fora",
      "Modalidade_ICMS_ST_Exterior",
      "Base_ICMS_ST_Dentro",
      "Base_ICMS_ST_Fora",
      "Base_ICMS_ST_Exterior",
      "Aliquota_ICMS_ST_Dentro",
      "Aliquota_ICMS_ST_Fora",
      "Aliquota_ICMS_ST_Exterior",
      "CST_IPI_Entrada",
      "CST_IPI_Saida",
      "Aliquota_IPI_Entrada",
      "Aliquota_IPI_Saida",
      "CST_PIS",
      "Tipo_Aliquota_PIS",
      "Aliquota_PIS",
      "Tipo_Aliquota_PIS_ST",
      "Aliquota_PIS_ST",
      "CST_COFINS",
      "Tipo_Aliquota_COFINS",
      "Aliquota_COFINS",
      "Tipo_Aliquota_COFINS_ST",
      "Aliquota_COFINS_ST",
      "Dimensao_X",
      "Dimensao_Y",
      "Dimensao_Z",
      "Legenda_Dimensao_X",
      "Legenda_Dimensao_Y",
      "Legenda_Dimensao_Z",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Descricao_Internacional",
      "CEST",
      "NVE",
      "EX_TIPI",
      "FCI"
    ]
  },
  {
    "tabela": "cad_Produto_Apresentacao",
    "colunas": [
      "IdProduto",
      "IdApresentacao"
    ]
  },
  {
    "tabela": "cad_Produto_Categoria",
    "colunas": [
      "IdProduto_Categoria",
      "IdUnidade_Medida",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Curto",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Categoria_Variacao",
    "colunas": [
      "IdProduto_Categoria_Variacao",
      "IdProduto_Categoria",
      "IdProduto_Variacao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Precedencia",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Codigo_Barras",
    "colunas": [
      "IdProduto_Codigo_Barras",
      "IdProduto",
      "IdApresentacao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo_Barras",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Produto_Composicao",
    "colunas": [
      "IdProduto_Composicao",
      "IdProduto",
      "IdProduto_Composicao_Variacao",
      "IdComponente",
      "IdApresentacao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Quantidade",
      "Calculos",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Composicao_Variacao",
    "colunas": [
      "IdProduto_Composicao_Variacao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Logica_Itens",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Dimensoes",
    "colunas": [
      "IdProduto_Dimensoes",
      "IdProduto_Tipo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Dimensoes_Embarque",
      "Dimensoes_Faturamento",
      "Comprimento",
      "Largura",
      "Espessura",
      "Numero_Camadas",
      "Chapas_Pallets",
      "Metragem",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Especie",
    "colunas": [
      "IdProduto_Especie",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Especificacao",
    "colunas": [
      "IdProduto_Especificacao",
      "IdProduto",
      "IdVariacao",
      "IdVariacao_Item",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Grupo",
    "colunas": [
      "IdProduto_Grupo",
      "IdProduto_Grupo_Superior",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Qualidade",
    "colunas": [
      "IdProduto_Qualidade",
      "IdProduto_Tipo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Descricao",
      "Descricao_Internacional",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Tipo",
    "colunas": [
      "IdProduto_Tipo",
      "IdUnidade_Medida",
      "IdModelo_Relatorio",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Tolerancia_Comprimento",
      "Tolerancia_Largura",
      "Tolerancia_Espessura",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Variacao",
    "colunas": [
      "IdProduto_Variacao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Produto_Variacao_Item",
    "colunas": [
      "IdProduto_Variacao_Item",
      "IdProduto_Variacao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Curto",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Projeto_Tarefa",
    "colunas": [
      "IdProjeto_Tarefa",
      "Codigo",
      "Nome",
      "Observacao",
      "Dados_Registro",
      "xml"
    ]
  },
  {
    "tabela": "cad_Projeto_Tarefa_Condicao",
    "colunas": [
      "IdProjeto_Tarefa_Condicao",
      "IdProjeto_Tarefa",
      "Descricao",
      "Observacao",
      "Dados_Registro",
      "xml"
    ]
  },
  {
    "tabela": "cad_Projeto_Tarefa_Logistica",
    "colunas": [
      "IdProjeto_Tarefa_Logistica",
      "IdProjeto_Tarefa",
      "IdCliente",
      "Origem_Projeto",
      "Observacao",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Operacao_Exportacao",
      "Operacao_Importacao",
      "Operacao_Nacional",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Projeto_Tarefa_Monitor",
    "colunas": [
      "IdProjeto_Tarefa_Monitor",
      "IdProjeto_Tarefa",
      "Descricao",
      "Classe",
      "Ao_Inserir",
      "Ao_Excluir",
      "Ao_Atualizar",
      "Geracao_Atividades",
      "Dados_Registro",
      "xml",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Projeto_Tarefa_Responsavel",
    "colunas": [
      "IdProjeto_Tarefa_Responsavel",
      "IdProjeto_Tarefa",
      "IdPapel_Projeto",
      "IdEquipe_Tarefa",
      "IdResponsavel",
      "Observacao",
      "Dados_Registro",
      "xml",
      "Exigir_Preenchimento"
    ]
  },
  {
    "tabela": "cad_Pronome_Tratamento",
    "colunas": [
      "IdPronome_Tratamento",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Sigla",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Recinto_Alfandegado",
    "colunas": [
      "IdRecinto_Alfandegado",
      "Codigo",
      "Nome",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Regiao_Cobranca_Terrestre",
    "colunas": [
      "IdRegiao_Cobranca_Terrestre",
      "IdOrigem_Destino",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Regiao_Estado",
    "colunas": [
      "IdRegiao_Estado",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Relatorio",
    "colunas": [
      "IdRelatorio",
      "Codigo",
      "Nome",
      "Fonte_Dados",
      "xml",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Representante_Colaborador",
    "colunas": [
      "IdPessoa",
      "IdMoeda_Comissao",
      "Porcentagem_Venda",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Validade_Procuracao"
    ]
  },
  {
    "tabela": "cad_Representante_Origem_Destino",
    "colunas": [
      "IdRepresentante_Origem_Destino",
      "IdRepresentante",
      "IdOrigem_Destino",
      "Operacao_Importacao",
      "Operacao_Exportacao",
      "Operacao_Nacional",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Revisao",
    "colunas": [
      "IdRevisao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Seguradora",
    "colunas": [
      "IdPessoa"
    ]
  },
  {
    "tabela": "cad_Serpro_Componente_Frete",
    "colunas": [
      "IdSerpro_Componente_Frete",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Serpro_NCM",
    "colunas": [
      "IdSerpro_NCM",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Serpro_Terminal",
    "colunas": [
      "IdSerpro_Terminal",
      "Codigo",
      "Regiao_Fiscal",
      "Porto",
      "Codigo_Recinto_Alfandegado",
      "Observacao",
      "Descricao"
    ]
  },
  {
    "tabela": "cad_Serpro_Tipo_Conteiner",
    "colunas": [
      "IdSerpro_Tipo_Conteiner",
      "Codigo",
      "Descricao",
      "Descricao_Detalhada",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Serpro_Tipo_Embalagem",
    "colunas": [
      "IdSerpro_Tipo_Embalagem",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Serpro_Tipo_Granel",
    "colunas": [
      "IdSerpro_Tipo_Granel",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Setor",
    "colunas": [
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Tipo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Setor_Grupo_Envio_Mensagem",
    "colunas": [
      "IdSetor",
      "IdGrupo_Envio_Mensagem",
      "IdSetor_Grupo_Envio_Mensagem",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Sistema_Integracao",
    "colunas": [
      "IdSistema_Integracao",
      "Codigo",
      "Nome",
      "Observacao",
      "Dados_Configuracao",
      "xml"
    ]
  },
  {
    "tabela": "cad_Situacao_Escala_Aerea",
    "colunas": [
      "IdSituacao_Escala_Aerea",
      "Codigo",
      "Descricao",
      "Observacao",
      "Situacao_Embarque"
    ]
  },
  {
    "tabela": "cad_Special_Handling_Information",
    "colunas": [
      "IdSpecial_Handling_Information",
      "Codigo",
      "Descricao",
      "Tipo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Status_Processo_Logistico",
    "colunas": [
      "IdStatus_Processo_Logistico",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_TRK_User_Monitor",
    "colunas": [
      "IdTRK_User_Monitor",
      "IdUsuario",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tabela_Integracao",
    "colunas": [
      "IdTabela_Integracao",
      "IdSistema_Integracao",
      "Codigo",
      "Nome_Tabela_Interna",
      "Nome_Tabela_Externa",
      "Observacao",
      "SQL_Preenchimento"
    ]
  },
  {
    "tabela": "cad_Tabela_Integracao_Registro",
    "colunas": [
      "IdTabela_Integracao_Registro",
      "IdTabela_Integracao",
      "Chave_Registro_Interna",
      "Chave_Externa_Integer",
      "Chave_Externa_Char",
      "Observacao",
      "Descricao"
    ]
  },
  {
    "tabela": "cad_Tabela_Preco_Logistica",
    "colunas": [
      "IdTabela_Preco_Logistica",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tarefa",
    "colunas": [
      "IdTarefa",
      "IdEtapa_Tarefa",
      "IdEquipe_Tarefa",
      "IdResponsavel",
      "IdTarefa_Superior",
      "IdTarefa_Precedente",
      "IdTarefa_Retorno",
      "IdGrupo_Tarefa",
      "IdModelo_Mensagem",
      "IdModelo_Acompanhamento",
      "IdProjeto_Tarefa",
      "IdPapel_Projeto",
      "IdTarefa_Vinculo_Data",
      "IdModelo_Notificacao",
      "Codigo",
      "Descricao",
      "Base_Calculo_Previsao_Inicio",
      "Dias_Inicio",
      "Horas_Inicio",
      "Minutos_Inicio",
      "Base_Calculo_Previsao_Termino",
      "Dias_Termino",
      "Horas_Termino",
      "Minutos_Termino",
      "Prioridade",
      "Mensagem_Automatica",
      "Acompanhamento_Automatico",
      "Observacao",
      "Dia_Nao_Util_Inicio",
      "Dia_Nao_Util_Termino",
      "Hora_Fixa_Inicio",
      "Hora_Fixa_Termino",
      "Antecipar_Vinculo_Inicio",
      "Atrasar_Vinculo_Inicio",
      "Antecipar_Vinculo_Termino",
      "Atrasar_Vinculo_Termino",
      "Hora_Operacional_Inicio",
      "Hora_Operacional_Termino",
      "Invisivel_Gerencial"
    ]
  },
  {
    "tabela": "cad_Tarefa_Caminho",
    "colunas": [
      "IdTarefa_Caminho",
      "IdTarefa",
      "IdCaminho_Tarefa",
      "IdTarefa_Escolha",
      "Precedencia",
      "Observacao",
      "Situacao",
      "Ignorar_Eventos"
    ]
  },
  {
    "tabela": "cad_Tarefa_Condicao",
    "colunas": [
      "IdTarefa",
      "IdProjeto_Tarefa_Condicao",
      "Situacao_Verificacao"
    ]
  },
  {
    "tabela": "cad_Tarefa_Evento_Procars",
    "colunas": [
      "IdTarefa_Evento_Procars",
      "IdTarefa",
      "Codigo",
      "Evento_Procars",
      "Condicao",
      "Observacao",
      "Dados_Registro",
      "xml",
      "Calculo_Dias",
      "Calculo_Horas"
    ]
  },
  {
    "tabela": "cad_Tarefa_Gatilho_Situacao",
    "colunas": [
      "IdTarefa_Gatilho_Situacao",
      "IdTarefa",
      "IdTarefa_Atualizar",
      "Situacao_Atual",
      "Situacao_Atualizar",
      "Observacao",
      "Gerar_Atividade",
      "Ignorar_Eventos"
    ]
  },
  {
    "tabela": "cad_Tarefa_Lembrete",
    "colunas": [
      "IdTarefa_Lembrete",
      "IdTarefa",
      "IdLembrete_Tarefa",
      "IdEquipe_Tarefa",
      "IdFuncionario",
      "Base_Calculo_Data",
      "Dias",
      "Horas",
      "Minutos",
      "Observacao",
      "Destino"
    ]
  },
  {
    "tabela": "cad_Tarefa_Monitor",
    "colunas": [
      "IdTarefa",
      "IdProjeto_Tarefa_Monitor",
      "Geracao_Atividade"
    ]
  },
  {
    "tabela": "cad_Taxa_Logistica",
    "colunas": [
      "IdTaxa_Logistica",
      "IdTaxa_Logistica_Classificacao",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "IdTaxa_Logistica_Pagamento",
      "IdTaxa_Logistica_Recebimento",
      "IdMoeda_Fatura_Pagamento",
      "IdMoeda_Fatura_Recebimento",
      "IdNBS",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Tipo",
      "Origem_Taxa_Importacao",
      "Origem_Taxa_Exportacao",
      "Origem_Taxa_Nacional",
      "Tipo_Carga_Aereo",
      "Tipo_Carga_Break_Bulk",
      "Tipo_Carga_FCL",
      "Tipo_Carga_LCL",
      "Tipo_Carga_RO_RO",
      "Tipo_Carga_Terrestre",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Valor_Pagamento_Zerado",
      "Valor_Recebimento_Zerado",
      "Verificar_Acrescimo",
      "Tipo_Acrescimo",
      "Acrescimo_Minimo",
      "Acrescimo_Maximo",
      "Participacao_Vendedor",
      "Participacao_Outro",
      "Tributavel",
      "Tipo_Imposto",
      "Aliquota_Retencao",
      "Tipo_Acumulo_Retencao",
      "Valor_Limite_Retencao",
      "Exibir_Conhecimento",
      "Categoria",
      "Observacao",
      "Indice",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Unitario",
      "Valor_Pagamento_Minimo",
      "Valor_Recebimento_Minimo",
      "Sigla",
      "Exibir_Cliente",
      "Exibir_Agente",
      "Participacao_Agente_Exterior",
      "Participacao_Agente_Local",
      "Participacao_Representante",
      "Tipo_Awb",
      "Opcao_Moeda_Pagamento",
      "Opcao_Moeda_Recebimento",
      "Opcao_Faturamento_Pagamento",
      "Opcao_Faturamento_Recebimento",
      "Ativo",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Nacional",
      "Opcao_Moeda_Fatura_Pagamento",
      "Opcao_Moeda_Fatura_Recebimento",
      "Composta_Taxas_Conhecimento",
      "Conta_Contabil"
    ]
  },
  {
    "tabela": "cad_Taxa_Logistica_Classificacao",
    "colunas": [
      "IdTaxa_Logistica_Classificacao",
      "Codigo",
      "Nome",
      "Precedencia",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Taxa_Logistica_Composicao",
    "colunas": [
      "IdTaxa_Logistica_Composicao",
      "IdTaxa_Logistica",
      "IdTaxa_Composicao",
      "Compor_Pagamento",
      "Compor_Recebimento",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Taxa_Logistica_Exibicao",
    "colunas": [
      "IdTaxa_Logistica_Exibicao",
      "IdTaxa_Logistica",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Padrao",
      "Observacao",
      "Sigla",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Taxa_Logistica_Pagamento",
    "colunas": [
      "IdTaxa_Logistica_Pagamento",
      "IdPessoa_Impo_Collect",
      "IdPessoa_Impo_Prepaid",
      "IdPessoa_Expo_Collect",
      "IdPessoa_Expo_Prepaid",
      "IdPessoa_Nac_Collect",
      "IdPessoa_Nac_Prepaid",
      "IdPessoa_Impo_Prepaid_Abroad",
      "IdPessoa_Expo_Prepaid_Abroad",
      "IdPessoa_Nac_Prepaid_Abroad",
      "Codigo",
      "Descricao",
      "Pagar_Para_Impo_Collect",
      "Pagar_Para_Impo_Prepaid",
      "Pagar_Para_Impo_Prepaid_Abroad",
      "Pagar_Para_Expo_Collect",
      "Pagar_Para_Expo_Prepaid",
      "Pagar_Para_Expo_Prepaid_Abroad",
      "Pagar_Para_Nac_Collect",
      "Pagar_Para_Nac_Prepaid",
      "Pagar_Para_Nac_Prepaid_Abroad",
      "Local_Impo_Collect",
      "Local_Impo_Prepaid",
      "Local_Impo_Prepaid_Abroad",
      "Local_Expo_Collect",
      "Local_Expo_Prepaid",
      "Local_Expo_Prepaid_Abroad",
      "Local_Nac_Collect",
      "Local_Nac_Prepaid",
      "Local_Nac_Prepaid_Abroad",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Taxa_Logistica_Recebimento",
    "colunas": [
      "IdTaxa_Logistica_Recebimento",
      "IdPessoa_Impo_Collect",
      "IdPessoa_Impo_Prepaid",
      "IdPessoa_Expo_Collect",
      "IdPessoa_Expo_Prepaid",
      "IdPessoa_Nac_Collect",
      "IdPessoa_Nac_Prepaid",
      "IdPessoa_Impo_Prepaid_Abroad",
      "IdPessoa_Expo_Prepaid_Abroad",
      "IdPessoa_Nac_Prepaid_Abroad",
      "Codigo",
      "Descricao",
      "Receber_De_Impo_Collect",
      "Receber_De_Impo_Prepaid",
      "Receber_De_Impo_Prepaid_Abroad",
      "Receber_De_Expo_Collect",
      "Receber_De_Expo_Prepaid",
      "Receber_De_Expo_Prepaid_Abroad",
      "Receber_De_Nac_Collect",
      "Receber_De_Nac_Prepaid",
      "Receber_De_Nac_Prepaid_Abroad",
      "Local_Impo_Collect",
      "Local_Impo_Prepaid",
      "Local_Impo_Prepaid_Abroad",
      "Local_Expo_Collect",
      "Local_Expo_Prepaid",
      "Local_Expo_Prepaid_Abroad",
      "Local_Nac_Collect",
      "Local_Nac_Prepaid",
      "Local_Nac_Prepaid_Abroad",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Taxa_Logistica_Serpro",
    "colunas": [
      "IdTaxa_Logistica_Serpro",
      "IdTaxa_Logistica",
      "IdSerpro_Componente_Frete",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Template_Integracao",
    "colunas": [
      "IdTemplate_Integracao",
      "Nome",
      "Dados_Modelo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Terminal_Container",
    "colunas": [
      "IdPessoa",
      "IdSerpro_Terminal"
    ]
  },
  {
    "tabela": "cad_Textos_Exportacao",
    "colunas": [
      "IdTextos_Exportacao",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Aviso_Embarque",
      "Assinatura",
      "Clausulas_Pro_Forma",
      "Clausulas_Contrato",
      "Texto_Comissao",
      "Texto_Outras_Comissoes",
      "Observacao_Instrucao_Embarque",
      "Marcas",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo"
    ]
  },
  {
    "tabela": "cad_Tipo_Averbacao_Seguro",
    "colunas": [
      "IdTipo_Averbacao_Seguro",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tipo_Embalagem",
    "colunas": [
      "IdTipo_Embalagem",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tipo_Embalagem_Container",
    "colunas": [
      "IdTipo_Embalagem_Container",
      "IdSerpro_Tipo_Embalagem",
      "IdTipo_Embalagem",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tipo_Movimentacao",
    "colunas": [
      "IdTipo_Movimentacao",
      "Codigo",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tipo_Movimentacao_Empresa",
    "colunas": [
      "IdTipo_Movimentacao_Empresa",
      "IdTipo_Movimentacao",
      "IdEmpresa_Sistema",
      "IdAtividade_Servico",
      "IdModelo_Mensagem",
      "IdModelo_Nota_Fiscal_Servico",
      "Serie",
      "Observacao",
      "Vinculo_Lote_Automatico",
      "Finalizar_Lote_Automatico",
      "Aliquota_IBPT",
      "Aliquota_ISS",
      "Tipo_Tributacao",
      "Exigibilidade",
      "Natureza_Tributacao",
      "Numero_Processo_Suspensao",
      "Local_Incidencia_ISS",
      "ISS_Retido",
      "Responsavel_Retencao",
      "Informacoes_Complementares"
    ]
  },
  {
    "tabela": "cad_Tipo_Numero",
    "colunas": [
      "IdTipo_Numero",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tipo_Processo",
    "colunas": [
      "IdTipo_Processo",
      "Codigo",
      "Nome",
      "Padrao",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tipo_Transacao",
    "colunas": [
      "IdTipo_Transacao",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdCondicao_Pagamento",
      "IdForma_Cobranca",
      "IdBanco",
      "IdCarteira_Cobranca",
      "IdForma_Pagamento",
      "IdConta_Corrente",
      "IdMoeda",
      "IdConversao_Moeda",
      "IdEmpresa_Sistema",
      "IdGrupo_Empresa",
      "Codigo",
      "Nome",
      "Receita",
      "Despesa",
      "Acrescimo",
      "Tipo_Acrescimo",
      "Abatimento",
      "Tipo_Abatimento",
      "Desconto_Incondicional",
      "Tipo_Desconto_Incondicional",
      "Desconto_Condicional",
      "Tipo_Desconto_Condicional",
      "Dias_Desconto_Condicional",
      "Multa",
      "Tipo_Multa",
      "Juros",
      "Periodo_Juros",
      "Tipo_Juros",
      "Tolerancia_Multa_Juros",
      "Historico",
      "Instrucao",
      "Observacao",
      "Historico_Resumo",
      "Ativo",
      "Conta_Contabil"
    ]
  },
  {
    "tabela": "cad_Tipo_Transacao_Categoria",
    "colunas": [
      "IdTipo_Transacao_Categoria",
      "IdTipo_Transacao",
      "IdCategoria_Financeira",
      "Porcentagem",
      "Tipo_Custo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tracking_Config",
    "colunas": [
      "IdTracking_Config",
      "IdCompanhia_Transporte",
      "IdTarefa",
      "IdModelo_Mensagem",
      "Codigo",
      "Status",
      "Data_Atualizar",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Trading",
    "colunas": [
      "IdPessoa"
    ]
  },
  {
    "tabela": "cad_Transportadora",
    "colunas": [
      "IdPessoa",
      "Contribuinte_ICMS",
      "Numero_Dependentes",
      "Numero_INSS",
      "Codigo_Externo",
      "Tipo_Basculante",
      "Tipo_Bi_Basculante",
      "Tipo_Graneleiro",
      "Tipo_Bi_Trem",
      "Tipo_Truck_Basculante",
      "Tipo_Truck_Graneleiro",
      "Tipo_Toco",
      "Gerar_Pagamento",
      "Gerar_Recebimento"
    ]
  },
  {
    "tabela": "cad_Transportadora_Placa",
    "colunas": [
      "IdTransportadora_Placa",
      "IdTransportadora",
      "IdUnidade_Federativa",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Placa",
      "Comprimento",
      "Ativo",
      "Observacao",
      "Data_Criacao",
      "Data_Alteracao"
    ]
  },
  {
    "tabela": "cad_Tributacao",
    "colunas": [
      "IdTributacao",
      "Codigo",
      "Descricao",
      "Aliquota_PIS",
      "Aliquota_COFINS",
      "Aliquota_CSLL",
      "Aliquota_INSS",
      "Aliquota_IR",
      "Regime_Especial_Tributacao",
      "Optante_Simples_Nacional",
      "Incentivador_Cultural",
      "Observacao",
      "Regime_Tributario",
      "Incentivo_Fiscal"
    ]
  },
  {
    "tabela": "cad_Tributacao_Atividade_Servico",
    "colunas": [
      "IdTributacao_Atividade_Servico",
      "IdAtividade_Servico",
      "IdTributacao",
      "Aliquota_ISS",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Tributacao_Empresa",
    "colunas": [
      "IdTributacao",
      "IdEmpresa_Sistema",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Unidade_Federativa",
    "colunas": [
      "IdUnidade_Federativa",
      "IdPais",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Sigla",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "cad_Unidade_Medida",
    "colunas": [
      "IdUnidade_Medida",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Internacional",
      "Sigla",
      "Casas_Decimais",
      "Tipo_Arredondamento",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "imp_Dicionario_Correspondencia",
    "colunas": [
      "IdDicionario_Correspondencia",
      "IdHeadcargo",
      "uniqueidentifie",
      "Descricao_Planilha",
      "Tipo"
    ]
  },
  {
    "tabela": "imp_ImportContract",
    "colunas": [
      "Id",
      "uniqueidentifie",
      "ImportProtocolId",
      "SystemCompanyId",
      "ContractNumber",
      "ContractPerson",
      "ImportContractType",
      "OperationType"
    ]
  },
  {
    "tabela": "imp_ImportCorrespondence",
    "colunas": [
      "Id",
      "uniqueidentifie",
      "ImportProtocolId",
      "HeadcargoId",
      "Description",
      "Type"
    ]
  },
  {
    "tabela": "imp_ImportLocalTariffExcel",
    "colunas": [
      "Id",
      "uniqueidentifie",
      "ImportProtocolId",
      "EffectiveDate",
      "ExpirationDate",
      "Carrier",
      "Contact",
      "Location",
      "ContactType",
      "OperationType",
      "TariffType",
      "LogisticsRate",
      "Equipment",
      "PaymentType",
      "PaymentCurrency",
      "PaymentAmount",
      "decimal",
      "MinimumPaymentAmount",
      "ReceiptType",
      "ReceiptCurrency",
      "ReceiptAmount",
      "MinimumReceiptAmount",
      "ReceiptAmountType"
    ]
  },
  {
    "tabela": "imp_ImportMaritimeTariffExcel",
    "colunas": [
      "Id",
      "uniqueidentifie",
      "ImportProtocolId",
      "ImportContractId",
      "ImportContractClientId",
      "EffectiveDate",
      "ExpirationDate",
      "OperationType",
      "CargoType",
      "Currency",
      "Carrier",
      "Agent",
      "Client",
      "ContractNumber",
      "ClientContractNumber",
      "Origin",
      "Destination",
      "TransitTime",
      "Equipment",
      "FreeTimeOrigin",
      "FreeTimeDestination",
      "LogisticsRate",
      "PaymentAmount",
      "decimal"
    ]
  },
  {
    "tabela": "imp_ImportMatch",
    "colunas": [
      "Id",
      "uniqueidentifie",
      "HeadcargoId",
      "Description",
      "Type"
    ]
  },
  {
    "tabela": "imp_ImportProtocol",
    "colunas": [
      "Id",
      "uniqueidentifie",
      "FileId",
      "CreationUserId",
      "SystemCompanyId",
      "Number",
      "FileName",
      "Status",
      "Type",
      "IsActive",
      "CreationDate"
    ]
  },
  {
    "tabela": "imp_Protocolo_Importacao",
    "colunas": [
      "IdProtocolo_Importacao",
      "uniqueidentifie",
      "Numero_Protocolo",
      "Data",
      "Nome_Planilha",
      "Situacao",
      "Motivo_Falha"
    ]
  },
  {
    "tabela": "imp_Tarifario_Excel",
    "colunas": [
      "IdTarifario_Excel",
      "IdProtocolo_Importacao",
      "IdPorto",
      "IdArmador",
      "IdPessoa",
      "uniqueidentifie",
      "Data_Inicio_Vigencia",
      "Data_Validade",
      "Porto",
      "Armador",
      "Pessoa",
      "Tipo_Pessoa",
      "Tipo_Operacao",
      "Tipo_Tarifario"
    ]
  },
  {
    "tabela": "imp_Taxa_Excel",
    "colunas": [
      "IdTaxa_Excel",
      "IdTarifario_Excel",
      "IdEquipamento",
      "IdTaxa_Logistica",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "Taxa",
      "Equipamento",
      "Moeda_Pagamento",
      "Moeda_Recebimento",
      "Valor_Pagamento_Minimo",
      "Valor_Pagamento",
      "Valor_Recebimento_Minimo",
      "Valor_Recebimento",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Tipo_Valor_Recebimento"
    ]
  },
  {
    "tabela": "mov_Acompanhamento",
    "colunas": [
      "IdAcompanhamento",
      "IdResponsavel",
      "IdGrupo_Tarefa",
      "IdEmpresa_Sistema",
      "IdGrupo_Envio_Mensagem",
      "IdProjeto_Atividade",
      "Descricao",
      "Data",
      "Observacao",
      "Tipo",
      "Titulo",
      "Data_Retorno",
      "Exibir_Portal_Cliente"
    ]
  },
  {
    "tabela": "mov_Acompanhamento_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdAcompanhamento"
    ]
  },
  {
    "tabela": "mov_Acompanhamento_Destinatario",
    "colunas": [
      "IdAcompanhamento_Destinatario",
      "IdAcompanhamento",
      "IdPessoa",
      "IdPessoa_Contato",
      "Observacao",
      "Em_Copia"
    ]
  },
  {
    "tabela": "mov_Agenda",
    "colunas": [
      "IdAgenda",
      "IdProjeto_Atividade",
      "IdResponsavel",
      "IdGrupo_Tarefa",
      "IdAcompanhamento",
      "Assunto",
      "Descricao",
      "Local",
      "Data_Inicio",
      "Data_Termino",
      "Mostrar_Como",
      "Cor_Rotulo",
      "Tipo_Evento",
      "Opcoes",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Air_Waybill",
    "colunas": [
      "IdConhecimento_Embarque",
      "IdAirport_Departure",
      "IdTo_Airport_1",
      "IdBy_First_Carrier",
      "IdTo_Airport_2",
      "IdBy_Carrier_2",
      "IdTo_Airport_3",
      "IdBy_Carrier_3",
      "IdAirport_Destination",
      "IdConsignatario",
      "IdAgente_Carga",
      "IdRecinto_Alfandegado_Destino",
      "IdAgente_Origem",
      "AWB_Master_Number",
      "Shipper_Name_Address",
      "Shipper_Account_Number",
      "Consignee_Name_Address",
      "Consignee_Account_Number",
      "Agent_Name_City",
      "Agent_IATA_Code",
      "Agent_Account_Number",
      "Accouting_Information",
      "Currency",
      "Payment_Terms_Charges",
      "Payment_Terms_Insurance",
      "Payment_Terms_Other",
      "Declared_Value_Carriage",
      "Declared_Value_Customs",
      "Flight_Number",
      "Flight_Date",
      "Flight_Number_2",
      "Flight_Date_2",
      "Amout_Insurance",
      "Handling_Information",
      "Number_Of_Pieces",
      "Gross_Weight",
      "Total",
      "Other_Charges",
      "Weight_Charge_Prepaid",
      "Weight_Charge_Collect",
      "Valuation_Charge_Prepaid",
      "Valuation_Charge_Collect",
      "Tax_Prepaid",
      "Tax_Collect",
      "Total_Other_Agent_Prepaid",
      "Total_Other_Agent_Collect",
      "Total_Other_Carrier_Prepaid",
      "Total_Other_Carrier_Collect",
      "Total_Prepaid",
      "Total_Collect",
      "Currency_Convertion",
      "Charges_Destination_Currency",
      "Currency_Convertion_Rates",
      "Charges_Destination",
      "Total_Collect_Charges",
      "Signature_Shipper_Agent",
      "Executed_On",
      "Executed_At",
      "Signature_Carrier_Agent",
      "EX_Rate",
      "Update_Contacts",
      "Update_Values_Goods",
      "Update_Nature_Quantity_Goods",
      "Possui_Madeira",
      "Description_Of_Goods",
      "Armazenagem_Master",
      "RUC",
      "Weight_Measurement_Unit",
      "Carrier_Declaration_Date",
      "Arrival_Date",
      "Total_Volume",
      "CctId",
      "uniqueidentifie"
    ]
  },
  {
    "tabela": "mov_Air_Waybill_Goods",
    "colunas": [
      "IdAir_Waybill_Goods",
      "IdAir_Waybill",
      "Number_Of_Pieces",
      "Gross_Weight",
      "Weight_Unit",
      "Rate_Class",
      "Commodity_Item_Number",
      "Chargeable_Weight",
      "Charge",
      "Total",
      "Nature_Quantity_Goods",
      "Precedencia",
      "Observacao",
      "Volume_Amount"
    ]
  },
  {
    "tabela": "mov_Arquivo_Procars",
    "colunas": [
      "IdArquivo_Procars",
      "IdResponsavel_Importacao",
      "Nome_Arquivo",
      "Data_Importacao",
      "Dados",
      "Observacao",
      "Data_Arquivo"
    ]
  },
  {
    "tabela": "mov_Arquivo_Verificacao",
    "colunas": [
      "IdArquivo_Verificacao",
      "IdArquivo",
      "IdPortal_Usuario",
      "Data_Solicitacao",
      "Data_Verificacao",
      "Situacao",
      "Apontamentos",
      "Observacao",
      "UserId",
      "uniqueidentifie"
    ]
  },
  {
    "tabela": "mov_Atividade",
    "colunas": [
      "IdAtividade",
      "IdTarefa",
      "IdEtapa_Atividade",
      "IdEquipe_Tarefa",
      "IdResponsavel",
      "IdResponsavel_Original",
      "IdAtividade_Superior",
      "IdAtividade_Precedente",
      "IdAtividade_Retorno",
      "IdModelo_Mensagem",
      "IdModelo_Acompanhamento",
      "IdProjeto_Atividade",
      "IdCaminho_Tarefa_Escolha",
      "Previsao_Inicio",
      "Previsao_Termino",
      "Complemento",
      "Situacao",
      "Prioridade",
      "Mensagem_Automatica",
      "Acompanhamento_Automatico",
      "Observacao",
      "Data_Inicio",
      "Data_Termino"
    ]
  },
  {
    "tabela": "mov_Atividade_Caminho",
    "colunas": [
      "IdAtividade_Caminho",
      "IdAtividade",
      "IdCaminho_Tarefa",
      "IdTarefa_Escolha",
      "IdAtividade_Escolha",
      "Precedencia",
      "Observacao",
      "Situacao"
    ]
  },
  {
    "tabela": "mov_Atividade_Historico",
    "colunas": [
      "IdAtividade_Historico",
      "IdAtividade",
      "IdFuncionario",
      "Data_Inicio",
      "Data_Termino",
      "Situacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Atividade_Lembrete",
    "colunas": [
      "IdAtividade_Lembrete",
      "IdAtividade",
      "IdLembrete_Tarefa",
      "IdEquipe_Tarefa",
      "IdFuncionario",
      "Data",
      "Situacao",
      "Observacao",
      "Destino"
    ]
  },
  {
    "tabela": "mov_Atividade_Monitoramento",
    "colunas": [
      "IdAtividade_Monitoramento",
      "IdAtividade",
      "IdUsuario",
      "Data",
      "Dados_Registro",
      "xml"
    ]
  },
  {
    "tabela": "mov_Autorizacao_Transito",
    "colunas": [
      "IdAutorizacao_Transito",
      "IdConhecimento_Embarque",
      "IdPorto_Origem",
      "IdArmador",
      "IdDespachante",
      "Numero_BL_House",
      "BL_Master",
      "Numero_BL_Master",
      "CNPJ_Cliente",
      "CNPJ_Adquirente",
      "Data_Emissao",
      "CNPJ_Despachante",
      "Modalidade_Importacao",
      "Tipo_Transporte",
      "Peso_Total",
      "Valor_CIF_USD",
      "Codigo_Porto_Origem",
      "Referencia_Cliente",
      "Codigo_Armador",
      "Numero_Fatura",
      "Licenca_Importacao",
      "LI_Substitutiva",
      "Fotos_Desunitizacao",
      "Acompanhamento_Desunitizacao",
      "CE_Mercante",
      "Viagem_Navio",
      "Registro_Despachante",
      "CNPJ_Enviar_Fatura",
      "Fone_Plantao",
      "EMail_Contato",
      "EMail_Representante_Legal",
      "Observacao_Enviar",
      "Quantidade_Volumes",
      "Data_Criacao",
      "Enviado",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL00_Administration",
    "colunas": [
      "IdBL00_Administration",
      "IdArquivo_Importacao",
      "IdLogistica_House",
      "IdLogistica_Master",
      "IdEmpresa_Sistema",
      "IdConhecimento_Embarque",
      "Rec_Qualifier",
      "Branch_ID",
      "BL_Message_ID",
      "House_BL_Runnig_Number",
      "House_BL_Message_Id",
      "ETD_Date",
      "ETD_Time",
      "Time_Zone",
      "ETA_Date",
      "ETA_Time",
      "CR_Date",
      "CR_Time",
      "Master_BL_Using_Code",
      "House_BL_Using_Code",
      "Nature_Of_Goods",
      "CIS_Reference_Number",
      "Final_Destination_Branch",
      "Status",
      "S_Project_ID",
      "Recipient_Circle",
      "Visualizado",
      "Processo_Atualizado",
      "Data_Importacao",
      "Data_Atualizacao_Processo",
      "Tipo_Operacao",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_BL10_Header",
    "colunas": [
      "IdBL10_Header",
      "IdBL00_Administration",
      "Rec_Qualifier",
      "BMG_Document_Code",
      "BGM_Message_ID",
      "BGM_Message_Function",
      "BGM_Loc_Document_Place",
      "BGM_DTM_Document_Date",
      "BGM_DTM_Document_Data_Format",
      "BGM_DOC_Number_Of_Originals",
      "BGM_RFF_BL_Number",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL20_Reference",
    "colunas": [
      "IdBL20_Reference",
      "IdBL00_Administration",
      "REC_QUALIFIER",
      "REF_REFERENCE_QUALIFIER",
      "REF_REFERENCE_NUMBER",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL30_Transport_Header",
    "colunas": [
      "IdBL30_Transport_Header",
      "IdBL00_Administration",
      "Rec_Qualifier",
      "Tdt_Transport_Stage_Qualifier",
      "Tdt_Conveyance_Reference",
      "Tdt_Mode_Of_Transport",
      "Tdt_Type_Of_Transport",
      "Tdt_Carrier_Id",
      "Tdt_Carrier_Name",
      "Tdt_Means_Of_Transport_Id",
      "Tdt_Means_Of_Transport_Code",
      "Tdt_Transport_Id_Agency_Code",
      "Tdt_Transport_Id",
      "Tdt_Sch_Contract",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL31_Transport_Dates",
    "colunas": [
      "IdBL31_Transport_Dates",
      "IdBL00_Administration",
      "REC_Qualifier",
      "Dtm_Transport_Qualifier",
      "Dtm_Transport_Date",
      "Dtm_Transport_Date_Format",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL32_Transport_Location",
    "colunas": [
      "IdBL32_Transport_Location",
      "IdBL00_Administration",
      "REC_Qualifier",
      "TDT_Loc_Place_Qualifier",
      "TDT_Loc_Place_Identification",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL40_Address_Unstructured",
    "colunas": [
      "IdBL40_Address_Unstructured",
      "IdBL00_Administration",
      "REC_QUALIFIER",
      "NAD_Address_Qualifier",
      "Nad_Address_Identifier",
      "Nad_Code_List",
      "Nad_Address_Structure",
      "Nad_Name_And_Address_Line_1",
      "Nad_Name_And_Address_Line_2",
      "Nad_Name_And_Address_Line_3",
      "Nad_Name_And_Address_Line_4",
      "Nad_Name_And_Address_Line_5",
      "FILLER",
      "Nad_Ref_Reference_Number",
      "Nad_Vat_Registration_Number",
      "Nad_AKKREDITIV_TXT",
      "Nad_CIS_Reference_Number",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL41_Address_Structured",
    "colunas": [
      "IdBL41_Address_Structured",
      "IdBL00_Administration",
      "Rec_Qualifier",
      "Nad_Address_Qualifier",
      "Nad_Address_Identifier",
      "Nad_Code_List",
      "Nad_Address_Structure",
      "Nad_Name_1",
      "Nad_Name_2",
      "Nad_Street_And_Number_1",
      "Nad_Street_And_Number_2",
      "Nad_City",
      "Nad_Sub_Country",
      "Nad_Postcode",
      "Nad_Country_Code",
      "Nad_Ref_Reference_Number",
      "Nad_Vat_Registration_Number",
      "Nad_AKKREDITIV_TXT",
      "Nad_CIS_Reference_Number",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL42_Comunication_Contact",
    "colunas": [
      "IdBL42_Comunication_Contact",
      "IdBL00_Administration",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL50_Goods_Description",
    "colunas": [
      "IdBL50_Goods_Description",
      "IdBL00_Administration",
      "Rec_Qualifier",
      "Item_Number",
      "Type_Of_Packages",
      "Goods_Description_Text",
      "Goods_Measure_Qualifier",
      "Goods_Measure_Unit",
      "Goods_Measure_Value",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL70_Package",
    "colunas": [
      "IdBL70_Package",
      "IdBL00_Administration",
      "Rec_Qualifier",
      "Total_Number_Packages",
      "Total_Gross_Weight",
      "Weight_Measure_Qualifier",
      "Total_Cube",
      "Cube_Measure_Qualifier",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL75_Unit_Of_Equipment",
    "colunas": [
      "IdBL00_Administration",
      "IdBL75_Unit_Of_Equipment",
      "Rec_Qualifier",
      "Equipment_Qualifier",
      "Equipment_ID_Number",
      "Equipment_Size_And_Type_ID",
      "Equipment_Size_And_Type_Text",
      "Equipment_Supplier",
      "Equipment_Full_Empty",
      "Equipment_Movement_Type_Coded",
      "Equipment_Movement_Type",
      "Equipment_Movement_Plan",
      "Equipment_Measure_Qualifier",
      "Equipment_Measure_Dimension_Cod",
      "Equipment_Measure_Unit",
      "Equipment_Measure_Value",
      "Equipment_Measure_Qualifier2",
      "Equipment_Measure_Dimension_Co2",
      "Equipment_Measure_Unit2",
      "Equipment_Measure_Value2",
      "Packages_Qualifier",
      "Packages_Dimension_Code",
      "Packages_Unit",
      "Packages_Value",
      "Equipment_Seal_Number",
      "Equipment_Seal_Issuer",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL80_Terms_Of_Delivery",
    "colunas": [
      "IdBL00_Administration",
      "IdBL80_Terms_Of_Delivery",
      "Rec_Qualifier",
      "Terms_Of_Delivery_Coded",
      "Terms_Of_Delivery_Code_List",
      "Terms_Of_Delivery_Text_1",
      "Terms_Of_Delivery_Text_2",
      "Terms_Of_Delivery_Place",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_BL85_Transport_Charges_Rate",
    "colunas": [
      "IdBL00_Administration",
      "IdBL85_Transport_Charges_Rate",
      "Rec_Qualifier",
      "Charge_Identifier",
      "Charge_Text",
      "Charge_Prepai_Col",
      "Charge_Monetary_Qualifier",
      "Charge_Monetary_Amount",
      "Charge_Monetary_Currency",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Bill_Lading",
    "colunas": [
      "IdConhecimento_Embarque",
      "IdDespachante_Aduaneiro",
      "Port_Of_Loading",
      "Port_Of_Discharge",
      "Ocean_Vessel",
      "Voyage_Number",
      "Booking_No",
      "Shipper_Exporter",
      "Originals",
      "Consignee",
      "Notify",
      "Pre_Carriage_By",
      "Place_Of_Receipt",
      "Place_Of_Delivery",
      "Marks_And_Numbers",
      "Description_Of_Packages",
      "Number_Of_Containers",
      "Measurement",
      "Gross_Weight",
      "Net_Weight",
      "Number_Copy_BL",
      "Number_Original_BL",
      "BL_Number_Master",
      "Place_Issue",
      "Purchase_Order",
      "As_Agent",
      "Also_Notify",
      "Data_Envio_Cliente",
      "Data_Recebimento_Empresa",
      "Bloqueado",
      "Impresso",
      "Number_Of_Pieces",
      "Wood_Package",
      "NCM_Description",
      "Originals_Other_Description",
      "Shipper_CNPJ",
      "Consignee_NIF_CNPJ",
      "DUE",
      "RUC",
      "Dados_Webbl"
    ]
  },
  {
    "tabela": "mov_Bill_Lading_NCM",
    "colunas": [
      "IdBill_Lading_NCM",
      "IdConhecimento_Embarque",
      "IdLogistica_Maritima_Container",
      "IdSerpro_NCM",
      "IdLogistica_House",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Boleto_Cobranca",
    "colunas": [
      "IdBoleto_Cobranca",
      "IdEmpresa_Sistema",
      "IdCedente",
      "IdSacado",
      "IdConta_Corrente",
      "IdConta_Corrente_Convenio",
      "IdSacador_Avalista",
      "IdBoleto_Cobranca_Modelo",
      "Numero",
      "Data_Emissao",
      "Nosso_Numero",
      "Valor",
      "Data_Vencimento",
      "Especie_Documento",
      "Numero_Documento",
      "Aceite",
      "Local_Pagamento",
      "Tipo_Desconto_1",
      "Data_Desconto_1",
      "Valor_Desconto_1",
      "Tipo_Desconto_2",
      "Data_Desconto_2",
      "Valor_Desconto_2",
      "Tipo_Desconto_3",
      "Data_Desconto_3",
      "Valor_Desconto_3",
      "Tipo_Juros",
      "Data_Juros",
      "Valor_Juros",
      "Tipo_Multa",
      "Data_Multa",
      "Valor_Multa",
      "Tipo_Protesto",
      "Prazo_Protesto",
      "Tipo_Baixa_Devolucao",
      "Prazo_Baixa",
      "Tipo_Rateio",
      "Tipo_Valor_Rateio",
      "Responsavel_Impressao",
      "Tipo_Categoria",
      "Tipo_Postagem",
      "Tipo_Emissao_Bloqueto",
      "Tipo_Distribuicao_Bloqueto",
      "Outros_Acrescimos",
      "Informacoes_Adicionais",
      "Instrucoes",
      "Parcelas",
      "Variacao_Carteira",
      "Referencia",
      "Codigo_Tipo_Cobranca",
      "Data_Limite",
      "Codigo_Sacador_Avalista",
      "Numero_NFe",
      "Valor_NFe",
      "Data_Emissao_NFe",
      "Chave_DANFE",
      "CIP",
      "Codigo_Instrucao_1",
      "Codigo_Instrucao_2",
      "Codigo_Instrucao_3",
      "Instrucao_Prazo_1",
      "Instrucao_Prazo_2",
      "Instrucao_Prazo_3",
      "Descontavel",
      "Cedente_Conta_Codigo_Empresa",
      "Agencia_Cobradora",
      "Classificacao",
      "Tipo_Documento",
      "Situacao",
      "Integracao_Cobranca_IdBoleto",
      "Mensagem_Processamento",
      "Observacao",
      "Ambiente"
    ]
  },
  {
    "tabela": "mov_Boleto_Cobranca_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdBoleto_Cobranca"
    ]
  },
  {
    "tabela": "mov_Boleto_Cobranca_Mensagem",
    "colunas": [
      "IdBoleto_Cobranca_Mensagem",
      "IdBoleto_Cobranca",
      "Mensagem",
      "Indice"
    ]
  },
  {
    "tabela": "mov_Boleto_Cobranca_Rateio",
    "colunas": [
      "IdBoleto_Cobranca_Rateio",
      "IdBoleto_Cobranca",
      "IdBeneficiario",
      "IdBeneficiario_Conta_Corrente",
      "Valor"
    ]
  },
  {
    "tabela": "mov_Booking",
    "colunas": [
      "IdBooking",
      "IdPro_Forma",
      "IdContrato",
      "IdPorto_Embarque",
      "IdPorto_Desembarque",
      "IdArmador",
      "IdNavio",
      "IdDespachante",
      "IdConsignee_Notify",
      "IdMoeda",
      "IdBanco",
      "IdCourrier",
      "IdLogistica_House",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Parcial",
      "Data",
      "Numero_Booking",
      "Instrucao_Embarque",
      "Quantidade_Containners",
      "Quantidade_Pallets",
      "Metragem",
      "Valor_Unitario",
      "FCL_Texto",
      "Contato_Reserva",
      "Notas_Fiscais",
      "Doc_Fatura",
      "Doc_Packing_List",
      "Doc_Certificado_Origem",
      "Doc_Form_A",
      "Doc_Fitos",
      "Doc_B_L",
      "Doc_Fumigacao",
      "Consignee",
      "Notify",
      "Numero_Fatura",
      "Valor_Fatura_Venda",
      "Numero_Courrier",
      "Data_Courrier",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Valor_Fatura_Compra",
      "Situacao",
      "Atualizar_Faturas",
      "Tipo_Operacao",
      "Modalidade_Processo"
    ]
  },
  {
    "tabela": "mov_CCT_Aereo_Tramite",
    "colunas": [
      "IdCCT_Aereo_Tramite",
      "IdResponsavel",
      "IdConhecimento_Embarque",
      "Numero",
      "Numero_Protocolo",
      "Data_Envio",
      "Data_Retorno",
      "Dados_Retorno",
      "Funcao_Envio",
      "Situacao_Tramite",
      "Observacao",
      "Ambiente"
    ]
  },
  {
    "tabela": "mov_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdConfiguracao_Campo_Livre",
      "Valor_Alfanumerico",
      "Valor_Texto",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "mov_Comexpert_Retorno_Documento",
    "colunas": [
      "IdComexpert_Retorno_Documento",
      "IdComexpert_Retorno_Mercante",
      "IdComexpert_Retorno_House",
      "Nome",
      "Arquivo"
    ]
  },
  {
    "tabela": "mov_Comexpert_Retorno_House",
    "colunas": [
      "IdComexpert_Retorno_House",
      "IdComexpert_Retorno_Mercante",
      "IdConhecimento_Embarque",
      "Numero_HBL",
      "Numero_CE_House",
      "Referencia_Processo",
      "Observacao",
      "Visualizado"
    ]
  },
  {
    "tabela": "mov_Comexpert_Retorno_Mercante",
    "colunas": [
      "IdRetorno_Integracao",
      "Codigo_Processo",
      "Referencia_Forwarder",
      "Numero_MBL",
      "Numero_CE_Master",
      "Data_Chegada",
      "Porto_Chegada",
      "Data_Desconsolidacao"
    ]
  },
  {
    "tabela": "mov_Conhecimento_Aereo_Nacional",
    "colunas": [
      "IdConhecimento_Embarque",
      "Quantidade_Volumes",
      "Peso_Real",
      "Peso_Taxado",
      "Expedidor_Nome",
      "Expedidor_CNPJ",
      "Expedidor_Inscricao_Estadual",
      "Expedidor_Endereco",
      "Expedidor_Bairro",
      "Expedidor_CEP",
      "Expedidor_Cidade",
      "Expedidor_UF",
      "Expedidor_Fone",
      "Expedidor_Fax",
      "Req_Transporte",
      "Inscricao_Estadual",
      "CNPJ",
      "Valor_Declarado_Transporte",
      "Valor_Declarado_Suframa",
      "Origem",
      "Via",
      "Cidade_Destino",
      "Sigla_Cidade_Destino",
      "Descricao_Embalagens",
      "Trecho",
      "Tarifa_CL",
      "Tarifa_Codigo",
      "Tarifa_Valor_Kilo",
      "Frete_Nacional",
      "Natureza_Mercadoria",
      "Valor_Exp_Frete_Nacional",
      "Valor_Des_Frete_Nacional",
      "Valor_Exp_Adicional",
      "Valor_Des_Adicional",
      "Valor_Adicional_Codigo",
      "Valor_Exp_Terrestre_Origem",
      "Valor_Des_Terrestre_Origem",
      "Valor_Exp_Terrestre_Destino",
      "Valor_Des_Terrestre_Destino",
      "Valor_Exp_Terrestre_Redespacho",
      "Valor_Des_Terrestre_Redespacho",
      "Valor_Exp_Agente",
      "Valor_Des_Agente",
      "Valor_Exp_Transportador",
      "Valor_Des_Transportador",
      "Valor_Exp_Total",
      "Valor_Des_Total",
      "Descricao_Taxa_Agente",
      "Descricao_Taxa_Transportador",
      "Retirada_Aeroporto",
      "Expedidor_Numero_Cobranca",
      "Destinatario_Numero_Cobranca",
      "Local_Retirada",
      "Horario_Atendimento",
      "Telefone",
      "Total_Servico",
      "Base_Calculo",
      "Aliquota_ICMS",
      "Agente_Emissor",
      "Codigo_Dac",
      "Destinatario_Nome",
      "Destinatario_CNPJ",
      "Destinatario_Inscricao_Estadual",
      "Destinatario_Endereco",
      "Destinatario_Bairro",
      "Destinatario_CEP",
      "Destinatario_Cidade",
      "Destinatario_UF",
      "Destinatario_Fone",
      "Destinatario_Fax",
      "Local_Emissao",
      "Data_Emissao",
      "Hora_Emissao",
      "Observacoes",
      "Observacao_Fiscal"
    ]
  },
  {
    "tabela": "mov_Conhecimento_Embarque",
    "colunas": [
      "IdConhecimento_Embarque",
      "IdLogistica_House",
      "IdImportador",
      "IdExportador",
      "IdNotify",
      "IdConhecimento_Master",
      "IdEmpresa_Sistema",
      "Numero",
      "Numero_Desconsolidacao",
      "Data",
      "Observacao",
      "Data_Desconsolidacao",
      "Tipo_Conhecimento",
      "Numero_Embarque",
      "Referencia_Externa",
      "Tipo_Operacao"
    ]
  },
  {
    "tabela": "mov_Contrato",
    "colunas": [
      "IdContrato",
      "IdPro_Forma",
      "IdImportador",
      "IdExportador",
      "IdTrading",
      "IdPorto_Embarque",
      "IdPorto_Desembarque",
      "IdTextos_Exportacao",
      "IdForma_Pagamento",
      "IdProduto_Tipo",
      "IdEquipamento_Maritimo",
      "IdMoeda",
      "IdEmbalagem",
      "IdEnvio_Docs_Originais",
      "IdUnidade_Medida",
      "IdIncoterm",
      "IdModelo_Relatorio",
      "IdRevisao",
      "IdProjeto_Atividade",
      "IdEmpresa_Sistema",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Ano",
      "Codigo",
      "Numero",
      "Data",
      "Previsao_Embarque",
      "Ultima_Data_Embarque",
      "Modalidade_Pagamento",
      "Embarque_Parcial",
      "Transbordo",
      "Total_Metragem",
      "Total_Containners",
      "Total_Pallets",
      "FCL_Texto",
      "Valor_FOB_Venda",
      "Valor_Frete",
      "Valor_Seguro",
      "Valor_Total_Venda",
      "Valor_FOB_Compra",
      "Valor_Total_Compra",
      "Frete",
      "Situacao",
      "Descricao_Total",
      "Reivindicacao",
      "Marcas",
      "Comissao_Texto",
      "Descricao_Embalagem",
      "Aviso_Embarque",
      "Envio_Docs_Originais_Texto",
      "Beneficiario",
      "Banco_Receptor",
      "Tolerancia_Dimensoes",
      "Tolerancia_Metragem",
      "Descricao_Preco",
      "Assinatura",
      "Atualizar_Tracking",
      "Valores_Exatos",
      "Metragem_Exata",
      "Comissao_Sobre_Valor",
      "Comissao_Sobre_Metragem",
      "Comissao_Bruta",
      "Comissao_Liquida",
      "Peso_Minimo",
      "Tolerancia_Espessura",
      "Tolerancia_Largura",
      "Tolerancia_Comprimento",
      "Data_Criacao",
      "Data_Alteracao",
      "Fixo",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Contrato_Cambio",
    "colunas": [
      "IdContrato_Cambio",
      "IdBanco",
      "IdContrato_Cambio_Categoria",
      "IdConversao_Moeda",
      "IdResponsavel",
      "Numero",
      "Data",
      "Margem_Acrescimo",
      "Observacao",
      "Fator"
    ]
  },
  {
    "tabela": "mov_Contrato_Comissao",
    "colunas": [
      "IdContrato_Comissao",
      "IdContrato",
      "IdAgente",
      "IdConta_Corrente",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Tipo_Base_Calculo",
      "Base_Calculo",
      "Valor_Comissao",
      "Total_Comissao",
      "Exibir",
      "Texto_Comissao",
      "Desconta_Empresa",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Contrato_Frete",
    "colunas": [
      "IdContrato_Frete",
      "IdPessoa_Contrato",
      "IdEmpresa_Sistema",
      "Numero_Contrato",
      "Tipo_Contrato",
      "Tipo_Operacao",
      "Data_Contrato",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Contrato_Item",
    "colunas": [
      "IdContrato_Item",
      "IdContrato",
      "IdProduto",
      "IdProduto_Dimensoes",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Produto",
      "Metragem",
      "Quantidade_Pecas",
      "Quantidade_Pallets",
      "Valor_Venda_Unitario",
      "Valor_Venda_Total",
      "Valor_Compra_Unitario",
      "Valor_Compra_Total",
      "Porcentagem",
      "Descricao_Produto",
      "Descricao_Qualidade",
      "Marcas",
      "Data_Criacao",
      "Data_Alteracao",
      "Fixo",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Contrato_Maritimo_Cliente",
    "colunas": [
      "IdContrato_Maritimo_Cliente",
      "IdCliente",
      "IdEmpresa_Sistema",
      "Identificacao",
      "Numero_Contrato",
      "Data_Contrato",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Demurrage_Fechamento",
    "colunas": [
      "IdDemurrage_Fechamento",
      "IdLogistica_Maritima_Container",
      "IdLogistica_Taxa",
      "Indice",
      "Data",
      "Tipo",
      "Quantidade_Pagamento",
      "Quantidade_Recebimento",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Demurrage_Incidencia",
    "colunas": [
      "IdDemurrage_Incidencia",
      "IdDemurrage_Fechamento",
      "Tipo_Incidencia",
      "Periodo",
      "Data_Inicio",
      "Data_Termino",
      "Quantidade_Dias",
      "Valor_Unitario",
      "Valor_Total",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Demurrage_Tarifa",
    "colunas": [
      "IdDemurrage_Tarifa",
      "IdLogistica_House",
      "IdEquipamento_Maritimo",
      "Tipo_Incidencia",
      "Periodo",
      "Quantidade_Dias",
      "Valor_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Desembaraco_Nota_Fiscal",
    "colunas": [
      "IdDesembaraco_Nota_Fiscal",
      "IdLogistica_House",
      "Modelo",
      "Serie",
      "Numero",
      "Chave",
      "Data_Emissao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Desembaraco_Nota_Fiscal_Item",
    "colunas": [
      "IdDesembaraco_Nota_Fiscal",
      "IdDesembaraco_Nota_Fiscal_Item",
      "Codigo_Produto",
      "Descricao",
      "Quantidade",
      "Valor_Unitario",
      "Valor_Total",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Desvio_Logistica",
    "colunas": [
      "IdDesvio_Logistica",
      "IdLogistica_House",
      "IdResponsavel_Operacional",
      "IdDesvio_Responsavel",
      "IdDesvio_Categoria",
      "IdMoeda",
      "IdEmpresa_Sistema",
      "IdDesvio_Origem",
      "IdProposta_Frete",
      "IdFatura_Financeira",
      "IdDesvio_Subcategoria",
      "Numero",
      "Descricao",
      "Custo_Origem",
      "Custo_Destino",
      "Data_Geracao",
      "Data_Solucao",
      "Observacao",
      "Envolve_Seguradora",
      "Tem_CAR_SAC",
      "Acao_Tomada",
      "Detalhes",
      "Comentarios",
      "Data_Emissao_CAR_SAC",
      "Numero_CAR_SAC",
      "Disponibilizar_Modelo",
      "Referencia",
      "Gerou_Nao_Conformidade"
    ]
  },
  {
    "tabela": "mov_Estorno_Financeiro",
    "colunas": [
      "IdEstorno_Financeiro",
      "IdMovimentacao_Financeira",
      "IdTransferencia_Financeira",
      "IdResponsavel",
      "IdMovimentacao_Credito",
      "IdMovimentacao_Debito",
      "IdEmpresa_Sistema",
      "Data",
      "Motivo",
      "Origem",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Etapa_Atividade",
    "colunas": [
      "IdEtapa_Atividade",
      "IdEtapa_Tarefa",
      "IdEtapa_Atividade_Precedente",
      "IdProjeto_Atividade",
      "Previsao_Inicio",
      "Previsao_Termino",
      "Observacao",
      "Data_Inicio",
      "Data_Termino"
    ]
  },
  {
    "tabela": "mov_Fatura_Financeira",
    "colunas": [
      "IdFatura_Financeira",
      "IdRegistro_Financeiro",
      "IdForma_Cobranca",
      "IdResponsavel_Titulo",
      "IdResponsavel_Conferencia",
      "IdRegistro_Unificador",
      "IdResponsavel_Unificacao",
      "IdResponsavel_Cancelamento",
      "IdResponsavel_Cobranca",
      "IdResponsavel_Renegociacao",
      "IdResponsavel_Cobranca_Judic",
      "IdResponsavel_Negativacao",
      "IdResponsavel_Protesto",
      "IdMarcador_Fatura_Financeira",
      "Numero",
      "Data",
      "Tipo",
      "Data_Vencimento",
      "Previsao_Pagamento",
      "Data_Pagamento",
      "Situacao",
      "Prioridade",
      "Natureza",
      "Valor",
      "Valor_Original",
      "Valor_Residual",
      "Total_Pago",
      "Total_Pago_Corrente",
      "Conferido",
      "Parcela",
      "Numero_Cobranca",
      "Em_Aberto",
      "Historico",
      "Fator_Unificacao",
      "Observacao",
      "Referencia_Externa",
      "Data_Envio",
      "Historico_Resumo",
      "Data_Conferencia",
      "Total_Multa",
      "Total_Juros",
      "Total_Acrescimo",
      "Total_Desconto",
      "Total_Abatimento",
      "Data_Unificacao",
      "Data_Cancelamento",
      "Data_Cobranca",
      "Data_Renegociacao",
      "Coligada",
      "Renegociada",
      "Numero_Nota_Fiscal",
      "Data_Nota_Fiscal",
      "Data_Cobranca_Judicial",
      "Data_Negativacao",
      "Data_Protesto",
      "Valor_Nota_Fiscal",
      "Ativo",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "mov_Fatura_Financeira_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdFatura_Financeira"
    ]
  },
  {
    "tabela": "mov_Fatura_Financeira_Baixa",
    "colunas": [
      "IdFatura_Financeira_Baixa",
      "IdFatura_Financeira",
      "IdMovimentacao_Financeira",
      "Valor_Total",
      "Valor_Multa",
      "Valor_Juros",
      "Valor_Desconto",
      "Valor_Abatimento",
      "Valor_Total_Corrente",
      "Fator_Conversao",
      "Gerar_Recibo",
      "Numero_Recibo",
      "Proveniencia",
      "Observacao",
      "Valor_Acrescimo",
      "Tipo_Baixa",
      "Valor_Convertido",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "mov_Fatura_Financeira_Categoria",
    "colunas": [
      "IdFatura_Financeira_Categoria",
      "IdFatura_Financeira",
      "IdCategoria_Financeira",
      "IdFatura_Categoria_Origem",
      "Tipo_Custo",
      "Valor",
      "Natureza",
      "Porcentagem",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Fatura_Financeira_Custo",
    "colunas": [
      "IdFatura_Financeira_Custo",
      "IdFatura_Financeira_Categoria",
      "IdCentro_Custo",
      "IdFatura_Custo_Origem",
      "Valor",
      "Natureza",
      "Porcentagem",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Historico_Liberacao_Booking",
    "colunas": [
      "IdHistorico_Liberacao_Booking",
      "IdLogistica_House",
      "IdResponsavel",
      "IdBill_Lading",
      "Data",
      "Data_Liberado",
      "Data_Cancelado",
      "Situacao",
      "Webbl_Booking_Id",
      "Dados_Registro",
      "xml",
      "Extensao_Deadline_Draft",
      "Extensao_Deadline_VGM",
      "Data_Deadlines_Estendidos",
      "Data_Informacoes_Atualizadas"
    ]
  },
  {
    "tabela": "mov_Historico_Oferta_Tarifario",
    "colunas": [
      "IdHistorico_Oferta_Tarifario",
      "IdOferta_Frete",
      "IdContrato_Frete",
      "IdUsuario",
      "Data",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Historico_Processo_Oferta",
    "colunas": [
      "IdHistorico_Processo_Oferta",
      "IdLogistica_House",
      "IdOferta_Frete",
      "IdUsuario",
      "Data",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Historico_Processo_Tarifario",
    "colunas": [
      "IdHistorico_Processo_Tarifario",
      "IdLogistica_House",
      "IdContrato_Frete",
      "IdUsuario",
      "Data",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Charge_Category",
    "colunas": [
      "IdINTSI_Charge_Category",
      "IdINTSI_Header",
      "IdINTSI_Instructions",
      "Prepaid_Collect_Indicator",
      "Charge_Type",
      "Payer",
      "Payable_Elsewhere",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Customs_Information",
    "colunas": [
      "IdINTSI_Customs_Information",
      "IdINTSI_Header",
      "Manifest_Filer_Status",
      "Manifest_Filing_Country_Code",
      "Manifest_Filing_Identification",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Equipment_Comments",
    "colunas": [
      "IdINTSI_Equipment_Comments",
      "IdINTSI_Equipment_Details",
      "Comment_Type",
      "Equipment_Comments",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Equipment_Details",
    "colunas": [
      "IdINTSI_Equipment_Details",
      "IdINTSI_Header",
      "IdLogistica_Maritima_Container",
      "Line_Number",
      "Equipment_Supplier",
      "Equipment_Identifier",
      "Equipment_Type_Code",
      "Equipment_Description",
      "Equipment_Gross_Weight",
      "Equipment_Tare_Weight",
      "Equipment_Gross_Volume",
      "Equipment_Temperature",
      "Equipment_Temperature_UOM",
      "Equipment_Air_Flow",
      "Carrier_Seal",
      "Customs_Seal",
      "Quarantine_Agency_Seal",
      "Shipper_Seal",
      "Terminal_Operator_Seal",
      "Equipment_Reference",
      "Equipment_Reference_2",
      "Equipment_Reference_3",
      "Eqiupment_Reference_4",
      "Equipment_Location_Code",
      "Equipment_Location_Name",
      "Equipment_Location_Country",
      "Non_Active_Reefer",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Export_License",
    "colunas": [
      "IdINTSI_Export_License",
      "IdINTSI_Header",
      "Export_Licence_Number",
      "Export_Licence_Issue",
      "Export_Licence_Expiry",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Goods_Customs_Info",
    "colunas": [
      "IdINTSI_Goods_Details",
      "IdINTSI_Goods_Customs_Info",
      "Observacao",
      "Manifest_Filer_Status",
      "Manifest_Filing_Country_Code",
      "Manifest_Filing_Identification"
    ]
  },
  {
    "tabela": "mov_INTSI_Goods_Details",
    "colunas": [
      "IdINTSI_Goods_Details",
      "IdINTSI_Header",
      "IdConhecimento_Embarque",
      "IdTipo_Embalagem",
      "Line_Number",
      "Package_Level",
      "Number_Of_Packages",
      "Package_Type_Code",
      "Package_Type_Description",
      "Package_Detail_Gross_Volume",
      "Package_Detail_Gross_Weight",
      "Original_Shipper_Name",
      "Original_Shipper_Address_1",
      "Original_Shipper_Address_2",
      "Original_Shipper_Address_3",
      "Original_Shipper_Address_4",
      "Ultimate_Consignee_Name",
      "Ultimate_Consignee_Address_1",
      "Ultimate_Consignee_Address_2",
      "Ultimate_Consignee_Address_3",
      "Ultimate_Consignee_Address_4",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Goods_Package_Detail",
    "colunas": [
      "IdINTSI_Goods_Details",
      "IdINTSI_Goods_Package_Detail",
      "Package_Detail_Comments",
      "Precedence",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Goods_Package_Marks",
    "colunas": [
      "IdINTSI_Goods_Details",
      "IdINTSI_Goods_Package_Marks",
      "Mark_Number",
      "Marks",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Goods_Product_Id",
    "colunas": [
      "IdINTSI_Goods_Details",
      "IdINTSI_Goods_Product_Id",
      "Product_Id",
      "Item_Type_Id_Code",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Goods_Reference",
    "colunas": [
      "IdINTSI_Goods_Reference",
      "IdINTSI_Goods_Details",
      "Reference_Information",
      "Reference_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Goods_Split",
    "colunas": [
      "IdINTSI_Goods_Split",
      "IdINTSI_Goods_Details",
      "Equipment_Identifier",
      "Split_Goods_Number_Of_Packages",
      "Split_Goods_Gross_Volume",
      "Split_Goods_Gross_Weight",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Hazardous_Goods",
    "colunas": [
      "IdINTSI_Hazardous_Goods",
      "IdINTSI_Goods_Details",
      "Packing_Group_Code",
      "IMO_Class_Code",
      "IMDG_Page_Number",
      "UNDG_Number",
      "Flash_Point_Temperature",
      "Flash_Point_Temperature_UOM",
      "EMS_Number",
      "Observacao",
      "Emergency_Response_Contact_1",
      "Emergency_Response_Phone_1",
      "Emergency_Response_Contact_2",
      "Emergency_Response_Phone_2"
    ]
  },
  {
    "tabela": "mov_INTSI_Hazardous_Goods_Comments",
    "colunas": [
      "IdINTSI_Hazardous_Comments",
      "IdINTSI_Hazardous_Goods",
      "Comments",
      "Comment_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Header",
    "colunas": [
      "IdINTSI_Header",
      "IdLogistica_House",
      "Meessage_Type",
      "Message_Version",
      "Document_Identifier",
      "File_Creation_Date",
      "File_Creation_Date_Type",
      "Sender_Identifier",
      "Sender_Identifier_Type",
      "Sender_Name",
      "Sender_Contact",
      "Sender_Telephone",
      "Sender_Fax",
      "Sender_EMail",
      "Recipient_Identifier",
      "Receipient_Identifier_Type",
      "Receipient_Name",
      "Receipient_Contact",
      "Receipient_Telephone",
      "Receipient_Fax",
      "Receipient_EMail",
      "Shipment_ID",
      "Message_Status",
      "Document_Version",
      "Transaction_Date",
      "Transaction_Date_Type",
      "Shipment_Declared_Value",
      "Shipment_Declared_Currency",
      "Letter_Of_Credit_Number",
      "Letter_Of_Credit_Issue",
      "Letter_Of_Credit_Expiry",
      "Freight_Payment_Location_Code",
      "Freight_Payment_Location_Name",
      "Freight_Payment_Country",
      "BL_Release_Location_Code",
      "BL_Release_Location_Name",
      "BL_Release_Country",
      "BL_Release_Date",
      "Number_Of_Equipment",
      "Number_Of_Packages",
      "Gross_Weight",
      "Gross_Wight_UOM",
      "Gross_Volume",
      "Gross_Volume_UOM",
      "Movement_Type",
      "Service_Type",
      "Conveyance_Name",
      "Voyage_Trip_Number",
      "Carrier_SCAC",
      "Transport_Identification",
      "Single_Message",
      "Observacao",
      "Status"
    ]
  },
  {
    "tabela": "mov_INTSI_Instructions",
    "colunas": [
      "IdINTSI_Instructions",
      "IdINTSI_Header",
      "Shipment_Comments",
      "Comment_Type",
      "Clause_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Location",
    "colunas": [
      "IdINTSI_Location",
      "IdINTSI_Header",
      "Location_Type",
      "Location_Code",
      "Location_Agency",
      "Location_Name",
      "Location_Country",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Party",
    "colunas": [
      "IdINTSI_Party",
      "IdINTSI_Header",
      "IdProjeto_Atividade_Responsavel",
      "Partner_Role",
      "Party_Identifier",
      "Party_Identifier_Agency",
      "Party_Name",
      "Party_Name_2",
      "Party_Reference_Information",
      "Address_Line_1",
      "Address_Line_2",
      "Address_Line_3",
      "Address_Line_4",
      "City",
      "State_Province",
      "Postal_Code",
      "Country_Code",
      "Street",
      "Street_2",
      "Government_Reference",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Party_Contact",
    "colunas": [
      "IdINTSI_Party_Contact",
      "IdINTSI_Party",
      "IdProjeto_Atividade_Responsavel",
      "Contact_Name",
      "Contact_Type",
      "BL_Doc_Type",
      "Communication_Value",
      "Communication_Value_2",
      "Communication_Value_3",
      "Communication_Value_4",
      "Communication_Type",
      "Communication_Type_2",
      "Communication_Type_3",
      "Communication_Type_4",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Party_Documentation",
    "colunas": [
      "IdINTSI_Party_Documentation",
      "IdINTSI_Party",
      "Document",
      "Document_Type",
      "Freighted",
      "Parent",
      "Quantity",
      "Gov_Reference_Number",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Reference",
    "colunas": [
      "IdINTSI_Reference",
      "IdINTSI_Header",
      "Reference_Number",
      "Reference_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTSI_Tramite",
    "colunas": [
      "IdINTSI_Tramite",
      "IdINTSI_Header",
      "IdResponsavel",
      "Data",
      "Tipo",
      "Data_Envio",
      "Dados_Envio",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Confirmation",
    "colunas": [
      "IdINTTRA_Confirmation",
      "IdINTTRA_Header",
      "IdINTTRA_Tramite",
      "Confirmed_With_Name",
      "Confirmed_With_Phone",
      "Confirmed_With_EMail",
      "Shipment_Instruction_Due_Date",
      "Transaction_Date",
      "Movement_Type",
      "Carrier_Reason_For_Amending",
      "Carrier_Terms_And_Conditions",
      "General_Carrier_Comments",
      "Vessel_Rate_Of_Exchange_Info",
      "Place_Of_Acceptance_Name",
      "Place_Of_Acceptance_Code",
      "Port_Of_Entry_Name",
      "Port_Of_Entry_Code",
      "First_US_Port_Name",
      "First_US_Port_Code",
      "Last_Non_US_Port_Name",
      "Last_Non_US_Port_Code",
      "Place_Of_Acceptance_ETA",
      "Port_Of_Entry_ETA",
      "Last_Non_US_Port_ETA",
      "First_US_Port_ETA",
      "Port_Of_Entry_AMS_Due_Date",
      "Bill_Of_Lading_Number",
      "Booking_Number",
      "Contract_Number",
      "Freight_Forwarder_Ref_Number",
      "Environmental_Pollutant",
      "Hazardous",
      "Non_Containerized",
      "Temperature_Controlled",
      "Conveyance_Type",
      "Lloyds_Code",
      "Vessel_Name",
      "Voyage_Number",
      "Port_Of_Load_Name",
      "Port_Of_Load_Code",
      "Port_Of_Load_Country_Name",
      "Port_Of_Load_Country_Code",
      "Earliest_Departure",
      "Latest_Delivery",
      "Port_Of_Discharge_Name",
      "Port_Of_Discharge_Code",
      "Port_Of_Discharge_Country_Name",
      "Port_Of_Discharge_Country_Code",
      "Estimated_Arrival",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Equipment_Contact",
    "colunas": [
      "IdINTTRA_Equipment_Contact",
      "IdINTTRA_Equipment_Party",
      "Name",
      "Phone_1",
      "Fax_1",
      "Email_1",
      "Phone_2",
      "Fax_2",
      "Email_2",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Equipment_Details",
    "colunas": [
      "IdINTTRA_Equipment_Details",
      "IdINTTRA_Header",
      "IdLogistica_Maritima_Equipament",
      "Equipment_Supplier",
      "Full_Empty_Indicator",
      "Equipment_Identifier",
      "Equipment_Identifier_Type",
      "Equipment_Type_Code",
      "Equipment_Description",
      "Number_Of_Equipment",
      "Cargo_Movement_Type",
      "Haulage_Arrangements",
      "Equipment_Gross_Weight",
      "Equipment_Gross_Weight_UOM",
      "Equipament_Gross_Volume",
      "Equipament_Gross_Volume_UOM",
      "Equipment_Humidity",
      "Equipment_Air_Flow",
      "Equipment_Air_Flow_UOM",
      "Equipment_Gas_Level_1",
      "Equipment_Gas_Type_1",
      "Equipment_Gas_Level_2",
      "Equipment_Gas_Type_2",
      "Equipment_Gas_Level_3",
      "Equipment_Gas_Type_3",
      "Dimensions_UOM",
      "Length",
      "Width",
      "Height",
      "Non_Active_Reefer",
      "Equipment_Temperature",
      "Equipament_Temperature_UOM",
      "Equipment_Controlled_Atmosphere",
      "Super_Freezer_Service",
      "Genset_Required",
      "Humidty",
      "In_Transit_Cold_Sterilization",
      "Number_Of_Temperature_Probes",
      "Number_Of_USD_Probes",
      "TemperatureVariance",
      "Vent_Setting",
      "Equipment_Comments_Category_1",
      "Equipment_Comments_Text_1",
      "Equipment_Comments_Category_2",
      "Equipment_Comments_Text_2",
      "Customs_Declaration_CCN",
      "Customs_Declaration_UCR",
      "Stowage_Instructions",
      "Equipment_Clean_Requested",
      "Food_Grade_Equipment_Request",
      "Equipment_Sweep_Requested",
      "Fumigation_Required",
      "Garment_On_Hanger",
      "Heavy_Weight_Equipment",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Equipment_Party",
    "colunas": [
      "IdINTTRA_Equipment_Party",
      "IdINTTRA_Equipment_Details",
      "Identifier",
      "Identifier_Type",
      "Role",
      "Name",
      "Street_Address",
      "City_Name",
      "Subdivision",
      "Postal_Code",
      "Country_Code",
      "Country_Name",
      "Date_1",
      "Date_Type_1",
      "Date_2",
      "Date_Type_2",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Equipment_Reference",
    "colunas": [
      "IdINTTRA_Equipment_Reference",
      "IdINTTRA_Equipment_Details",
      "Reference_Type",
      "Value",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Goods_Details",
    "colunas": [
      "IdINTTRA_Goods_Details",
      "IdINTTRA_Header",
      "IdLogistica_Embalagem",
      "Line_Number",
      "Number_Of_Packages",
      "Package_Type_Code_1",
      "Package_Type_Code_2",
      "Package_Type_Description",
      "Gross_Volume",
      "Gross_Volume_UOM",
      "Gross_Weight",
      "Gross_Weight_UOM",
      "Observacao",
      "Commodity_Classification_USHTS",
      "Commodity_Classification_ShedB",
      "Good_Descrition",
      "Customs_Declaration_CCN",
      "Customs_Declaration_UCR",
      "Out_Of_Gauge_Dimensions_UOM",
      "Length",
      "Width",
      "Height",
      "Export_License",
      "Export_License_Expiry_Date",
      "Export_License_Issue_Date"
    ]
  },
  {
    "tabela": "mov_INTTRA_Goods_Hazardous",
    "colunas": [
      "IdINTTRA_Goods_Hazardous",
      "IdINTTRA_Goods_Details",
      "IMO_Class_Code_1",
      "IMO_Class_Code_2",
      "IMO_Class_Code_3",
      "IMDG_Page_Number",
      "Hazard_Code_Version_Number",
      "Packing_Group_Code",
      "UNDG_Number",
      "Flash_Point_Temperature",
      "Flash_Point_Temperature_UOM",
      "EMS_Number",
      "Trem_Card_Number",
      "Proper_Shipping_Name",
      "Transport_In_Limited_Quantities",
      "Technical_Name",
      "Empty_Uncleaned_Receptacle",
      "Marine_Pollutant_Status",
      "Inhalant_Hazard",
      "Aggregation_State",
      "Comments_Category_1",
      "Comments_1",
      "Intermed_Bulk_Container_Code_1",
      "Comments_Category_2",
      "Comments_2",
      "Intermed_Bulk_Container_Code_2",
      "Commnets_Category_3",
      "Comments_3",
      "Intermed_Bulk_Container_Code_3",
      "Comments_Category_4",
      "Comments_4",
      "Intermed_Bulk_Container_Code_4",
      "Emergency_Response_Contact",
      "Emergency_Contact_Phone",
      "Hazardous_Goods_Weight",
      "Hazardous_Goods_Weight_UOM",
      "Hazardous_Goods_Volume",
      "Hazardous_Goods_Volume_UOM",
      "Hazardous_Goods_Radioactivity",
      "Hazardous_Goods_Acid_Concentrtn",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Goods_Hazardous_Split",
    "colunas": [
      "IdINTTRA_Goods_Hazardous",
      "IdINTTRA_Goods_Hazardous_Split",
      "Observacao",
      "Equipment_Identifier",
      "Number_Of_Packages",
      "Gross_Volume",
      "Gross_Volume_UOM",
      "Gross_Weight",
      "Gross_Weight_UOM"
    ]
  },
  {
    "tabela": "mov_INTTRA_Goods_Inner_Pack",
    "colunas": [
      "IdINTTRA_Goods_Details",
      "IdINTTRA_Goods_Inner_Pack",
      "Number_Of_Packages",
      "Package_Type_Code",
      "Package_Type_Description",
      "Good_Gross_Volume",
      "Good_Gross_Volume_UOM",
      "Good_Gross_Weight",
      "Good_Gross_Weight_OEM",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Goods_Reference",
    "colunas": [
      "IdINTTRA_Goods_Reference",
      "IdINTTRA_Goods_Details",
      "Reference_Type",
      "Value",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Goods_Split_Details",
    "colunas": [
      "IdINTTRA_Goods_Details",
      "IdINTTRA_Goods_Split_Details",
      "Equipment_Identifier",
      "Number_Of_Packages",
      "Gross_Volume",
      "Gross_Volume_UOM",
      "Gross_Weight",
      "Gross_Weight_UOM",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Header",
    "colunas": [
      "IdINTTRA_Header",
      "IdLogistica_House",
      "Sender_Id",
      "Receiver_Id",
      "Request_Date_Time_Stamp",
      "Request_Message_Version",
      "Transaction_Type",
      "Transaction_Version",
      "Document_Identifier",
      "Transaction_Status",
      "Transaction_Split_Indicator",
      "Shipment_ID",
      "Contact_Name",
      "Contact_Phone",
      "Contact_Fax",
      "Contact_EMail",
      "Date_Time",
      "Date_Time_Type",
      "Movement_Type",
      "Per_Container_Number",
      "General_Information",
      "Amendment_Justification",
      "Customer_AMS_Filling",
      "Filer_Id",
      "Canadian_Control_Number",
      "Unique_Consignment_Reference",
      "Environmental_Pollutant",
      "Hazardous",
      "Non_Containerized",
      "Temperature_Controlled",
      "Export_License_Number",
      "Expiry_Date",
      "Issue_Date",
      "Status",
      "INTTRA_Reference",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Historico_Processo",
    "colunas": [
      "IdINTTRA_Historico_Processo",
      "IdINTTRA_Header",
      "IdLogistica_House",
      "Data",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Location",
    "colunas": [
      "IdINTTRA_Location",
      "IdINTTRA_Header",
      "Location_Type",
      "Location_Identifier",
      "Location_Name",
      "Location_City",
      "Subdivision",
      "Country_Name",
      "Country_Code",
      "Date_Time",
      "Date_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Party",
    "colunas": [
      "IdINTTRA_Party",
      "IdINTTRA_Header",
      "IdProjeto_Atividade_Responsavel",
      "Party_Role",
      "Party_Name",
      "Party_Identifier",
      "Party_Identifier_Type",
      "Street_Address",
      "City_Name",
      "Subdivision",
      "Postal_Code",
      "Country_Code",
      "Country_Name",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Party_Charge_Category",
    "colunas": [
      "IdINTTRA_Party",
      "IdINTTRA_Party_Charge_Category",
      "Charge_Type",
      "Prepaid_Collector",
      "Location_Type",
      "Location_Name",
      "Location_Identifier",
      "Location_Country_Name",
      "Location_Country_Code",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Party_Contact",
    "colunas": [
      "IdINTTRA_Party_Contact",
      "IdINTTRA_Party",
      "IdProjeto_Atividade_Responsavel",
      "Contact_Type",
      "Contact_Name",
      "Phone_1",
      "Fax_1",
      "EMail_1",
      "Phone_2",
      "Fax_2",
      "EMail_2",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Reference",
    "colunas": [
      "IdINTTRA_Reference",
      "IdINTTRA_Header",
      "Reference_Type",
      "Reference_Value",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Tramite",
    "colunas": [
      "IdINTTRA_Tramite",
      "IdINTTRA_Header",
      "IdResponsavel",
      "Data",
      "Tipo",
      "Data_Envio",
      "Data_Retorno",
      "Dados_Envio",
      "Dados_Retorno",
      "Transaction_Status",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRA_Transportation",
    "colunas": [
      "IdINTTRA_Transportation",
      "IdINTTRA_Header",
      "Port_Of_Load_Identifier",
      "Port_Of_Load_Name",
      "Port_Of_Load_Country_Code",
      "Port_Of_Load_Country_Name",
      "Port_Of_Load_Departure",
      "Port_Of_Discharge_Identifier",
      "Port_Of_Discharge_Name",
      "Port_Of_Discharge_Country_Code",
      "Port_Of_Discharge_Country_Name",
      "Port_Of_Discharge_Arrival",
      "Transport_Mode",
      "Transport_Stage",
      "Conveyance_Type",
      "Conveyance_Identifier",
      "Conveyance_Identifier_Type",
      "Voyage_Number",
      "Vessel_Name",
      "Lloyds_Code",
      "Registration_Country_Code",
      "Operator_Identifier",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRK_Header",
    "colunas": [
      "IdINTTRK_Header",
      "IdEmpresa_Sistema",
      "Message_Type",
      "Document_Identifier",
      "File_Creation_Date",
      "Sender_Name",
      "Sender_Identifier",
      "Sender_Contact_Name",
      "Sender_Contact_Phone",
      "Sender_Contact_Fax",
      "Sender_Contact_EMail",
      "Recipient_Name",
      "Recipient_Identifier",
      "Recipient_Contact_Name",
      "Recipient_Contact_Phone",
      "Recipient_Contact_Fax",
      "Recipient_Contact_EMail",
      "Carrier_SCAC_Code",
      "Carrier_Identifier",
      "Carrier_Name",
      "Carrier_Contact_Name",
      "Carrier_Contac_Phone",
      "Carrier_Contact_Fax",
      "Carrier_Contact_EMail",
      "Carrier_Address",
      "Event_Code",
      "Event_Location_Code",
      "Event_Location_Name",
      "Event_Location_Country",
      "Event_Status_Change_Date",
      "Shipment_Comments",
      "Conveyance_Name",
      "Voyage_Number",
      "Transport_Identification",
      "Transport_Identificariton_Type",
      "Equipment_Number",
      "Equipment_Load_Type",
      "Equipment_Type_Code",
      "Equipment_Line_Number",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRK_Location",
    "colunas": [
      "IdINTTRK_Location",
      "IdINTTRK_Header",
      "LocationType",
      "Location_Code",
      "Location_Name",
      "Location_Country",
      "DateTime",
      "DateType",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_INTTRK_Reference",
    "colunas": [
      "IdINTTRK_Reference",
      "IdINTTRK_Header",
      "Reference_Type",
      "Reference_Number",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Included_Custom_Notes",
    "colunas": [
      "IdIncluded_Custom_Notes",
      "IdConhecimento_Embarque",
      "Content_Code",
      "Content",
      "Subject_Code",
      "CountryID",
      "Code_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Infracao_Siscarga",
    "colunas": [
      "IdInfracao_Siscarga",
      "IdMercante_Conhecimento",
      "IdJustificativa_Infracao",
      "IdConsignee",
      "IdCriado_Por",
      "IdModificado_Por",
      "IdEmpresa_Sistema",
      "IdResponsavel",
      "IdResponsavel_Operacional",
      "Data_Lancamento",
      "Auto_Recebido_HBL",
      "Numero_Auto_Infracao_HBL",
      "Shipment",
      "BL_Master",
      "CE_Mercante",
      "BL_House",
      "Consigee_Texto",
      "Responsavel",
      "Justificativa_Texto",
      "LOI",
      "Data_LOI",
      "Correcao",
      "Data_Emissao_BL",
      "Motivo_Multa",
      "Data_Peticao",
      "Criado_Por_Texto",
      "Modificado_Por_Texto",
      "Data_RFB_Protocolo",
      "Data_Armador_Entrada",
      "Follow_Up",
      "Complemento_Justificativa",
      "Observacao",
      "Auto_Recebido_MBL",
      "Numero_Auto_Infracao_MBL",
      "CE_Master",
      "Alteracao_Master",
      "Desbloqueio_Via_Siscarga",
      "Numero_Protocolo",
      "Data_Alteracao_House",
      "Retificacao_Automatica"
    ]
  },
  {
    "tabela": "mov_Integracao_Registro",
    "colunas": [
      "Id",
      "IdHeadcargo",
      "IdIntegracao",
      "uniqueidentifie",
      "Ambiente"
    ]
  },
  {
    "tabela": "mov_Log_Nota_Fiscal_Servico",
    "colunas": [
      "IdEmpresa_Sistema",
      "IdUsuario",
      "IdLog_Nota_Fiscal_Servico",
      "Data",
      "Tipo",
      "Origem",
      "Numero",
      "Referencia",
      "XML_Envio",
      "XML_Retorno",
      "Ativo",
      "Formato_Log"
    ]
  },
  {
    "tabela": "mov_Logistica_Aerea_Escala",
    "colunas": [
      "IdLogistica_Aerea_Escala",
      "IdLogistica_Master",
      "IdCompanhia_Aerea",
      "IdAeroporto_Origem",
      "IdAeroporto_Destino",
      "IdSituacao_Escala_Aerea",
      "Numero_Voo",
      "Detalhes",
      "Data",
      "Observacao",
      "Data_Chegada",
      "Modalidade",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque"
    ]
  },
  {
    "tabela": "mov_Logistica_Aerea_House",
    "colunas": [
      "IdLogistica_House",
      "IdNivel_Servico_Aereo",
      "IdResponsavel_Validacao_Mantra",
      "Tipo_Servico_Aereo",
      "Peso_Taxado",
      "Canal_Liberacao",
      "Data_Liberacao",
      "Mantra_Validado",
      "Data_Validacao_Mantra",
      "Situacao_CCT"
    ]
  },
  {
    "tabela": "mov_Logistica_Aerea_Master",
    "colunas": [
      "IdLogistica_Master",
      "Numero_Voo",
      "Peso_Taxado"
    ]
  },
  {
    "tabela": "mov_Logistica_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdLogistica_Master",
      "IdLogistica_House"
    ]
  },
  {
    "tabela": "mov_Logistica_Comissao",
    "colunas": [
      "IdLogistica_Comissao",
      "IdLogistica_House",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdTaxa_Logistica_Exibicao",
      "IdMoeda",
      "IdTaxa_Referente",
      "IdPessoa_Pagamento",
      "IdConta_Pagamento",
      "IdIndicador_Logistica_Fatura",
      "Tipo_Comissionado",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo",
      "Percentual_Base_Calculo",
      "Tipo_Base_Calculo",
      "Observacao",
      "Pagar_Para",
      "Local_Pagamento",
      "Acesso_Restrito",
      "Tipo_Valor_Minimo",
      "Valor_Maximo",
      "Tipo_Comissao_Inland",
      "Valor_Comissao_Inland",
      "Alterado_Manualmente",
      "Tipo_Valor_Maximo",
      "Valor_Maximo_Container_20",
      "Valor_Maximo_Container_40",
      "Sobre_Todas_Taxas"
    ]
  },
  {
    "tabela": "mov_Logistica_Embalagem",
    "colunas": [
      "IdLogistica_Embalagem",
      "IdLogistica_House",
      "IdTipo_Embalagem",
      "IdLogistica_Maritima_Container",
      "Quantidade",
      "Altura",
      "Largura",
      "Comprimento",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Coeficiente_Conversao_Peso",
      "Observacao",
      "Peso_Bruto_Unitario",
      "Peso_Liquido_Unitario"
    ]
  },
  {
    "tabela": "mov_Logistica_Evento",
    "colunas": [
      "IdLogistica_Evento",
      "IdLogistica_House",
      "IdAtividade",
      "IdTarefa_Evento_Procars",
      "Evento",
      "Numero_Conhecimento",
      "Local",
      "Data_Evento",
      "Data_Geracao_Arquivo",
      "Origem_Ultima_Atualizacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Logistica_Fatura",
    "colunas": [
      "IdRegistro_Financeiro",
      "IdLogistica_Master",
      "IdLogistica_House",
      "IdConversao_Taxas",
      "IdIndicador_Logistica_Fatura",
      "IdResponsavel_Faturamento",
      "Tipo_Fatura",
      "Local_Cobranca",
      "Opcao_Data_Referencia",
      "Dias_Tolerancia",
      "Margem_Acrescimo_Cambio",
      "Tipo_Servico",
      "Opcao_Data_Conversao",
      "Data_Conversao",
      "Fatura_Especifica",
      "Conferido_Operacional",
      "Data_Primeira_Finalizacao",
      "Utilizar_Contrato",
      "Modalidade_Pagamento",
      "Data_Faturamento"
    ]
  },
  {
    "tabela": "mov_Logistica_Fatura_Conversao",
    "colunas": [
      "IdLogistica_Fatura_Conversao",
      "IdLogistica_Fatura",
      "IdMoeda_Origem",
      "IdMoeda_Destino",
      "Fator_Conversao",
      "Data",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Logistica_Historico_Embarque",
    "colunas": [
      "IdLogistica_Historico_Embarque",
      "IdLogistica_Master",
      "IdArmador",
      "IdNavio",
      "IdLogistica_Maritima_Transbordo",
      "IdResponsavel",
      "IdMotivo_Troca_Navio",
      "IdAcao_Troca_Navio",
      "IdViagem_Navio",
      "IdLogistica_Viagem",
      "IdOrigem",
      "IdDestino",
      "Numero_Reserva",
      "Viagem",
      "Data_Previsao_Embarque",
      "Observacao",
      "Motivo",
      "Acao",
      "Data_Atualizacao",
      "Numero_Conhecimento",
      "Data_Previsao_Desembarque",
      "Tipo_Alteracao",
      "Alterado_Via_Tracking",
      "Origem_Alteracao",
      "Data_Alteracao"
    ]
  },
  {
    "tabela": "mov_Logistica_House",
    "colunas": [
      "IdLogistica_House",
      "IdLogistica_Master",
      "IdCliente",
      "IdImportador",
      "IdExportador",
      "IdNotify",
      "IdDespachante_Aduaneiro",
      "IdVendedor",
      "IdIncoterm",
      "IdMercadoria",
      "IdOferta_Frete",
      "IdTransportadora_Origem",
      "IdProcesso_Origem",
      "IdProcesso_Primeiro_Trecho",
      "IdEmpresa_Sistema",
      "IdTransportadora_Destino",
      "IdStatus_Processo_Logistico",
      "IdContrato_Frete",
      "IdProjeto_Atividade",
      "IdRepresentante",
      "IdMoeda_Mercadoria",
      "IdTipo_Processo",
      "IdMoeda_Pagamento_Demurrage",
      "IdMoeda_Recebimento_Demurrage",
      "IdIndicacao",
      "IdPais_Origem_Mercadoria",
      "IdPais_Destino_Mercadoria",
      "IdSeguradora",
      "IdOferta_Frete_Original",
      "IdProcesso_Origem_Clonagem",
      "IdRepresentante_Destino_Final",
      "IdNVOCC",
      "IdUltimo_Registro_Baixa",
      "IdLogistica_Seguro",
      "IdMotivo_Cancelamento_Processo",
      "Numero_Processo",
      "Referencia_Interna",
      "Referencia_Externa",
      "Referencia_Cliente",
      "Consolidado_House",
      "Encaminhado_Por",
      "Modalidade_Pagamento",
      "Situacao_Agenciamento",
      "Situacao_Acerto_Agente",
      "Numero_Conhecimentos",
      "Local_Coleta",
      "Local_Entrega",
      "Tipo_Servico",
      "Tipo_Coleta_Entrega",
      "Tipo_Carga",
      "Tipo_Projeto",
      "Canal_Liberacao",
      "Trecho",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Quantidade_Invoices",
      "Total_Conhecimentos",
      "Data_Coleta",
      "Data_Entrega",
      "Data_Abertura_Processo",
      "Data_Fechamento_Processo",
      "Data_Recebimento_Local",
      "Data_Pagamento_Local",
      "Data_Fechamento_Cambio",
      "Numero_DI_RE",
      "Numero_RE",
      "Numero_LI_DDE",
      "Local_Emissao",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Ordem_Compra",
      "NCM_Descricao",
      "Instrucoes_Agente",
      "Instrucoes_Operacional",
      "Parecer_Auditoria",
      "Instrucoes_Cliente",
      "Observacao",
      "Situacao_Pagamento",
      "Situacao_Recebimento",
      "Situacao_Demurrage",
      "Data_Liberado_Faturamento",
      "Data_Faturado",
      "Data_Auditado",
      "Valor_Mercadoria",
      "Importancia_Segurada",
      "Percentual_Seguro",
      "Seguro",
      "Carga_Perigosa",
      "Data_Validade_Taxas",
      "Senha_Fatura",
      "Local_Emissao_Outro",
      "Instrucoes_Financeiro",
      "Data_Prontidao_Carga",
      "Data_Previsao_Prontidao_Carga",
      "Data_Previsao_Coleta",
      "Data_Previsao_Entrega",
      "Shipper_Exporter",
      "Consignee",
      "Notify",
      "Numero_Invoices",
      "Conhecimentos",
      "Numero_Courrier",
      "Data_Acerto_Agente",
      "Situacao_Pre_Finalizado",
      "Numeros_Embarque",
      "Tipo_Declaracao",
      "Data_LI_DDE",
      "Data_DI_RE",
      "Natureza_Exportacao",
      "Data_Averbacao",
      "Tipo_Conhecimento_Embarque",
      "Numeros_RVS_RAS",
      "Numeros_RF_RP",
      "Quantidade_UN_Nacoes_Unidas",
      "Data_Previsao_Coleta_Destino",
      "Data_Coleta_Destino",
      "Data_Previsao_Entrega_Origem",
      "Data_Entrega_Origem",
      "Tipo_Coleta_Entrega_Destino",
      "Local_Coleta_Destino",
      "Local_Entrega_Origem",
      "Faturas_Em_Aberto",
      "Tipo_Frete",
      "Instrucoes_Operacional_Cliente",
      "Comissao_Coleta",
      "Comissao_Entrega",
      "Modalidade_Coleta",
      "Modalidade_Entrega",
      "Tipo_Rota",
      "Rota",
      "Sobrepor_Instrucoes_Cliente",
      "Data_Ultima_Baixa",
      "Data_Cancelamento",
      "Detalhes_Cancelamento",
      "Situacao_Siscoserv",
      "Comentario_Siscoserv",
      "Remarks",
      "Remarks_Terrestre",
      "Remarks_Free_Time",
      "Situacao_Tracking",
      "Data_Atualizacao_Tracking",
      "Situacao_Pagamento_Frete",
      "Data_Pagamento_Frete",
      "Situacao_Recebimento_Frete",
      "Data_Recebimento_Frete"
    ]
  },
  {
    "tabela": "mov_Logistica_Maritima_Container",
    "colunas": [
      "IdLogistica_Maritima_Container",
      "IdConhecimento_Embarque",
      "IdLogistica_House",
      "IdEquipamento_Maritimo",
      "IdSerpro_Tipo_Granel",
      "IdTipo_Embalagem_Container",
      "Number",
      "Tare",
      "Seal",
      "Bar_Seal",
      "Quantity",
      "Type_Packages",
      "Measurement",
      "Gross_Weight",
      "Net_Weight",
      "Consolidacao",
      "Embarcado",
      "Free_Time_Master",
      "Free_Time_House",
      "Data_Descarga_Retirada",
      "Data_Devolucao",
      "Situacao_Devolucao",
      "Observacao",
      "Data_Incidencia_Pagamento",
      "Data_Incidencia_Recebimento",
      "Data_Limite_Devolucao",
      "Equipment",
      "Tipo_Item_Carga",
      "Indicador_Parcial_Container",
      "Tipo_Embalagem_Carga_Solta",
      "Texto_Descricao_Granel",
      "Numero_Chassi_Veiculo",
      "Nome_Marca",
      "Nome_Contramarca",
      "Codigo_Mercadoria_Perigosa",
      "Classe_Mercadoria_Perigosa",
      "Data_Gate_In",
      "Termino_Incidencia_Pagamento",
      "Termino_Incidencia_Recebimento",
      "Data_Limite_Devolucao_Pagamento",
      "Data_Gate_Out",
      "Ordem_Compra"
    ]
  },
  {
    "tabela": "mov_Logistica_Maritima_Equipamento",
    "colunas": [
      "IdLogistica_Maritima_Equipament",
      "IdLogistica_House",
      "IdEquipamento_Maritimo",
      "Quantidade",
      "Free_Time_Master_Origem",
      "Free_Time_House_Origem",
      "Free_Time_Master_Destino",
      "Free_Time_House_Destino",
      "Data_Limite_Devolucao_Master",
      "Data_Limite_Devolucao_House",
      "Observacao",
      "Free_Time_Armazenagem_Origem",
      "Free_Time_Armazenagem_Destino"
    ]
  },
  {
    "tabela": "mov_Logistica_Maritima_House",
    "colunas": [
      "IdLogistica_House",
      "Total_Container_20",
      "Total_Container_40",
      "Total_TEUS",
      "Numero_CE",
      "Containers",
      "Equipamentos"
    ]
  },
  {
    "tabela": "mov_Logistica_Maritima_Master",
    "colunas": [
      "IdLogistica_Master",
      "IdNavio",
      "IdViagem_Navio",
      "IdTerminal_Atracacao",
      "IdTerminal_Retirada_Redestinar",
      "Consolidacao",
      "Total_Container_20",
      "Total_Container_40",
      "Total_TEUS",
      "Numero_CE",
      "Data_Previsao_Chegada_Navio",
      "Data_Chegada_Navio",
      "Viagem_Navio",
      "Data_CE",
      "Situacao_Mercante",
      "Data_Desconsolidacao_Mercante",
      "Forma_Controle_Rota",
      "Situacao_SI_INTTRA",
      "Situacao_Booking_INTTRA",
      "Situacao_Mercante_Master"
    ]
  },
  {
    "tabela": "mov_Logistica_Maritima_Transbordo",
    "colunas": [
      "IdLogistica_Maritima_Transbordo",
      "IdLogistica_Master",
      "IdPorto_Transbordo",
      "IdNavio",
      "IdPorto_Desembarque",
      "Viagem",
      "Data_Chegada",
      "Data_Embarque",
      "Observacao",
      "Data_Previsao_Chegada",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Desembarque",
      "Numero_BL",
      "Data_Emissao_BL",
      "Tipo"
    ]
  },
  {
    "tabela": "mov_Logistica_Master",
    "colunas": [
      "IdLogistica_Master",
      "IdCompanhia_Transporte",
      "IdAgencia_Maritima_Aerea",
      "IdAgente_Origem",
      "IdAgente_Destino",
      "IdLocal_Recebimento",
      "IdDestino_Final",
      "IdOrigem",
      "IdDestino",
      "IdMoeda_Processo",
      "IdEmpresa_Sistema",
      "IdAssociacao_Internacional",
      "IdAgente_Master",
      "Numero_Processo",
      "Numero_Conhecimento",
      "Numero_Reserva",
      "Modalidade_Pagamento",
      "Modalidade_Processo",
      "Tipo_Operacao",
      "Situacao_Embarque",
      "Data_Processo",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Embarque",
      "Data_Desembarque",
      "Data_Pagamento_Local",
      "Transit_Time",
      "Transit_Time_Maximo",
      "Total_Conhecimentos",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Instrucoes_Origem",
      "Instrucoes_Destino",
      "Master_Direto",
      "Local_Emissao",
      "Observacao",
      "Bloqueio_Transacao",
      "Consignee_Master",
      "Notify_Master",
      "Shipper_Master",
      "Remarks_Master",
      "Detalhes_Tracking_Viagem",
      "Situacao_Tracking_Viagens",
      "Atualizacao_Tracking_Viagens",
      "Validar_Alteracao_Viagens",
      "Validar_Ajuste_Viagens",
      "Hash_Tracking"
    ]
  },
  {
    "tabela": "mov_Logistica_Master_Container",
    "colunas": [
      "IdLogistica_Master_Container",
      "IdLogistica_Master",
      "Numero",
      "Data_Gate_In",
      "Data_Gate_Out",
      "Data_Retirada_Vazio",
      "Data_Retorno_Vazio",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Logistica_Moeda",
    "colunas": [
      "IdLogistica_Moeda",
      "IdLogistica_House",
      "IdMoeda",
      "Total_Pagamento",
      "Total_Recebimento",
      "Total_Pago",
      "Total_Recebido",
      "Total_Pagamento_Local",
      "Total_Pagamento_Exterior",
      "Total_Recebimento_Local",
      "Total_Recebimento_Exterior",
      "Total_Pago_Local",
      "Total_Pago_Exterior",
      "Total_Recebido_Local",
      "Total_Recebido_Exterior",
      "Lucro_Estimado",
      "Lucro_Efetivo",
      "Comissao_Agente_Orig_Estimada",
      "Comissao_Agente_Dest_Estimada",
      "Comissao_Vendedor_Estimada",
      "Comissao_Empresa_Estimada",
      "Comissao_Outros_Estimada",
      "Comissao_Agente_Orig_Efetiva",
      "Comissao_Agente_Dest_Efetiva",
      "Comissao_Vendedor_Efetiva",
      "Comissao_Empresa_Efetiva",
      "Comissao_Outros_Efetiva",
      "Observacao",
      "Lucro_Abertura",
      "Comissao_Representante_Estimada",
      "Comissao_Representante_Efetiva",
      "Comissao_Associacao_Estimada",
      "Comissao_Associacao_Efetiva",
      "Lucro_Momento",
      "Lucro_Estimado_Faturado",
      "Lucro_Abertura_Frete",
      "Lucro_Abertura_Origem",
      "Lucro_Abertura_Destino"
    ]
  },
  {
    "tabela": "mov_Logistica_Prazo",
    "colunas": [
      "IdCampo_Livre",
      "IdLogistica_Master",
      "IdLogistica_House"
    ]
  },
  {
    "tabela": "mov_Logistica_Seguro",
    "colunas": [
      "IdLogistica_Seguro",
      "IdProcesso_Origem",
      "IdCobertura_Seguro",
      "IdSeguradora",
      "IdPessoa",
      "IdIncoterm",
      "IdOrigem_Carga",
      "IdOrigem",
      "IdDestino",
      "IdDestino_Final",
      "IdGrupo_Mercadoria_Seguro",
      "IdEmbalagem",
      "IdResponsavel_Abertura",
      "IdResponsavel_Seguro",
      "IdResponsavel_Analise",
      "IdResponsavel_Venda_Negociada",
      "IdMoeda_Frete",
      "IdMoeda_Mercadoria",
      "IdMoeda_Totalizacao",
      "IdEmpresa_Sistema",
      "Identificacao_Transporte",
      "Numero_Apolice",
      "Produto",
      "Data_Saida",
      "Data_Chegada",
      "Volume",
      "Peso",
      "Tipo_Averbacao",
      "Averbacao",
      "Invoice",
      "Franquia",
      "Data_Solicitacao_Provisoria",
      "Data_Solicitacao_Definitiva",
      "Descricao_Mercadoria",
      "Data_Analise",
      "Certificado",
      "Tipo_Mercadoria",
      "Data_Abertura",
      "Analise",
      "Clausula_Beneficiaria",
      "Comentario",
      "Valor_Mercadoria",
      "Paridade_Mercadoria",
      "Total_Mercadoria",
      "Valor_Segurado",
      "Premio",
      "Valor_Frete",
      "Paridade_Frete",
      "Total_Frete",
      "Percentual_Despesas",
      "Total_Despesas",
      "Percentual_Lucro",
      "Total_Lucro",
      "Percentual_Impostos",
      "Total_Impostos",
      "Outras_Taxas",
      "Percentual_Outras_Taxas",
      "Total_Outras_Taxas",
      "Percentual_Compra",
      "Minimo_Compra",
      "Percentual_Venda",
      "Minimo_Venda",
      "Lucro",
      "Percentual_Comissao",
      "Valor_Comissao",
      "Nao_Incluir_Frete",
      "Taxa_Compra_Negociada",
      "Taxa_Venda_Negociada",
      "Data_Venda_Negociada",
      "Avaria",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Logistica_Seguro_NCM",
    "colunas": [
      "IdLogistica_Seguro_NCM",
      "IdLogistica_Seguro",
      "IdNCM",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Logistica_Taxa",
    "colunas": [
      "IdLogistica_Taxa",
      "IdLogistica_Master",
      "IdLogistica_House",
      "IdOferta_Frete_Taxa",
      "IdTaxa_Logistica_Exibicao",
      "IdTaxa_Master",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "IdPessoa_Recebimento",
      "IdPessoa_Pagamento",
      "IdEquipamento_Maritimo",
      "IdConta_Pagamento",
      "IdRegistro_Pagamento",
      "IdRegistro_Recebimento",
      "IdConhecimento_Embarque",
      "IdConhecimento_Embarque_Master",
      "IdTaxa_Logistica_Classificacao",
      "IdTabela_Preco_Logistica",
      "IdLogistica_Taxa_Situacao",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Pagar_Para",
      "Receber_De",
      "Quantidade_Pagamento",
      "Quantidade_Recebimento",
      "Valor_Pagamento_Unitario",
      "Valor_Pagamento_Minimo",
      "Valor_Pagamento_Total",
      "Valor_Recebimento_Unitario",
      "Valor_Recebimento_Minimo",
      "Valor_Recebimento_Total",
      "Origem_Taxa",
      "Categoria",
      "Complemento",
      "Data_Validade",
      "Alterada",
      "Exibir_Conhecimento",
      "Justificativa",
      "Observacao",
      "Exibir_Cliente",
      "Exibir_Agente",
      "Tipo_Awb",
      "Tipo_Servico",
      "Forma_Faturamento_Pagamento",
      "Forma_Faturamento_Recebimento",
      "Bloquear_Recebimento",
      "Pagamento_Rateado",
      "Recebimento_Rateado",
      "Modalidade_Pagamento",
      "Modalidade_Recebimento",
      "Valor_Pagamento_Maximo"
    ]
  },
  {
    "tabela": "mov_Logistica_Taxa_Composicao",
    "colunas": [
      "IdLogistica_Taxa_Composicao",
      "IdLogistica_Taxa",
      "IdTaxa_Composicao",
      "Base_Calculo_Porcentagem",
      "Base_Calculo",
      "Percentual_Comissao",
      "Valor_Comissao",
      "Valor_Fixo",
      "Compor_Pagamento",
      "Compor_Recebimento",
      "Percentual_Pagamento",
      "Percentual_Recebimento",
      "Valor_Pagamento",
      "Valor_Recebimento",
      "Tipo_Composicao",
      "Observacao",
      "Valor_Pagamento_Taxa",
      "Valor_Recebimento_Taxa",
      "Fator_Pagamento",
      "Fator_Recebimento",
      "Valor_Acerto",
      "Origem_Acerto"
    ]
  },
  {
    "tabela": "mov_Logistica_Taxa_Faixa_Peso",
    "colunas": [
      "IdLogistica_Taxa",
      "IdFaixa_Peso_Cobranca",
      "IdLogistica_Taxa_Faixa_Peso",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Logistica_Terrestre_House",
    "colunas": [
      "IdLogistica_House",
      "Numero_Coleta",
      "Numero_CTRC",
      "Total_Carretas"
    ]
  },
  {
    "tabela": "mov_Logistica_Terrestre_Master",
    "colunas": [
      "IdLogistica_Master",
      "Tipo",
      "Data_Entrega_Fronteira",
      "Data_Liberacao_Fronteira"
    ]
  },
  {
    "tabela": "mov_Logistica_Viagem",
    "colunas": [
      "IdLogistica_Viagem",
      "IdLogistica_House",
      "IdOrigem",
      "IdDestino",
      "IdCompanhia_Transporte",
      "IdNavio",
      "IdViagem_Navio",
      "IdLogistica_Aerea_Escala",
      "IdLogistica_Maritima_Transbordo",
      "Data_Previsao_Embarque",
      "Data_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Desembarque",
      "Tipo_Viagem",
      "Tipo_Servico",
      "Modalidade_Transporte",
      "Situacao_Embarque",
      "Viagem_Voo",
      "Numero_Controle",
      "Numero_Conhecimento",
      "Tempo_Estimado",
      "Tempo_Efetivo",
      "Programado",
      "Local_Coleta",
      "Local_Entrega",
      "Observacao",
      "Ignorar_Viagem",
      "Ignorar_Tracking",
      "Previsao_Carregamento",
      "Data_Carregamento",
      "Previsao_Descarregamento",
      "Data_Descarregamento",
      "Data_Entrega_Fronteira",
      "Data_Liberacao_Fronteira",
      "Sequencia",
      "Precedencia"
    ]
  },
  {
    "tabela": "mov_Logistica_Viagem_Historico",
    "colunas": [
      "IdLogistica_Viagem_Historico",
      "IdLogistica_Viagem",
      "IdOrigem",
      "IdDestino",
      "IdCompanhia_Transporte",
      "IdNavio",
      "IdViagem_Navio",
      "IdUsuario_Alteracao",
      "IdDesvio_Logistica",
      "IdLogistica_House",
      "Viagem_Voo",
      "Numero_Conhecimento",
      "Numero_Reserva",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Atualizacao",
      "Tipo_Alteracao",
      "Origem_Alteracao",
      "Alterado_Via_Tracking",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Lote_Cobranca",
    "colunas": [
      "IdLote_Cobranca",
      "IdCedente",
      "IdConta_Corrente",
      "IdConta_Corrente_Convenio",
      "IdResponsavel",
      "IdEmpresa_Sistema",
      "Numero",
      "Data",
      "Tipo",
      "Situacao",
      "Transmissao_Automatica",
      "Nome_Arquivo",
      "Protocolo",
      "Integracao_Cobranca_IdLote",
      "Arquivo_Remessa",
      "Mensagem_Processamento",
      "Observacao",
      "Ambiente"
    ]
  },
  {
    "tabela": "mov_Lote_Cobranca_Boleto",
    "colunas": [
      "IdLote_Cobranca_Boleto",
      "IdLote_Cobranca",
      "IdBoleto_Cobranca",
      "Situacao",
      "Mensagem_Processamento"
    ]
  },
  {
    "tabela": "mov_Lote_Nota_Fiscal_Servico",
    "colunas": [
      "IdEmpresa_Sistema",
      "IdLote_Nota_Fiscal_Servico",
      "Numero",
      "Data",
      "Tentativa_Envio",
      "Data_Recebimento",
      "Protocolo_Recebimento",
      "Mensagem_Retorno",
      "xml",
      "Situacao",
      "Observacao",
      "Ambiente",
      "Tipo_Integracao"
    ]
  },
  {
    "tabela": "mov_Master_Processo",
    "colunas": [
      "IdMaster_Processo",
      "IdCompanhia_Transporte",
      "IdOrigem",
      "IdDestino",
      "IdEmpresa_Sistema",
      "Numero_Booking",
      "Numero_Processo",
      "Numero_Conhecimento",
      "Modalidade",
      "Situacao_Embarque",
      "Situacao_Processo",
      "Data_Criacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Mensagem",
    "colunas": [
      "IdMensagem",
      "IdRemetente",
      "IdGrupo_Mensagem",
      "Assunto",
      "Corpo_Mensagem",
      "Prioridade",
      "Data_Envio",
      "Atalho",
      "Dados_Atalho",
      "Dados_Arquivo",
      "Excluida",
      "Ativo",
      "Destinatarios_Email",
      "Email_Utilizar_Servico",
      "Email_Enviado",
      "Email_Data_Enviado",
      "Destinatarios_Email_Cc",
      "Destinatarios_Email_Cco",
      "Remetente_Email"
    ]
  },
  {
    "tabela": "mov_Mensagem_Usuario",
    "colunas": [
      "IdMensagem",
      "IdDestinatario",
      "Lida",
      "Data_Lida",
      "Data_Aviso",
      "Oculto",
      "Excluida",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Mercante_Componente_Frete",
    "colunas": [
      "IdMercante_Componente_Frete",
      "IdMercante_Conhecimento",
      "IdLogistica_Taxa",
      "IdTaxa_Componente_Frete",
      "IdMoeda",
      "Codigo_Componente_Frete",
      "Codigo_Moeda_Frete",
      "Valor_Taxa_Frete",
      "Codigo_Recolhimento_Frete",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Mercante_Conhecimento",
    "colunas": [
      "IdMercante_Conhecimento",
      "IdMercante_Manifesto_Carga",
      "IdConhecimento_Embarque",
      "IdPais_Destino_Exterior",
      "IdConsignatario_Estrangeiro",
      "IdConsignatario",
      "IdEmbarcador",
      "IdPorto_Origem",
      "IdPorto_Destino",
      "IdParte_Notificada",
      "IdNavio_Primeiro_Transporte",
      "IdMoeda_Frete",
      "IdUF_Destino_Carga",
      "IdTerminal_Descarregamento",
      "IdPais_Procedencia_Carga",
      "Identificacao_Consignatario",
      "Identificador_Embarcador",
      "Identificacao_Parte_Notificada",
      "Quantidade_Itens",
      "Numero_CE_House",
      "Indicador_BL_Ordem",
      "Indicador_Entrega_Exterior",
      "Codigo_Pais_Destino_Exterior",
      "Indicador_Consign_Estrangeiro",
      "Numero_Passaporte_Estrangeiro",
      "Nome_Consignatario_Estrangeiro",
      "CNPJ_CPF_Consignatario",
      "Data_Emissao_Conhecimento",
      "Descricao_Mercadoria",
      "Observacoes",
      "Cubagem_M3",
      "Porto_Origem",
      "Porto_Destino",
      "CNPJ_CPF_Parte_Notificada",
      "Numero_BL_Primeiro_Transporte",
      "Nome_Navio_Primeiro_Transporte",
      "Data_Emissao_BL_1o_Transporte",
      "Valor_Frete_Basico",
      "Codigo_Moeda_Frete",
      "Codigo_Recolhimento_Frete",
      "Modalidade_Frete",
      "Categoria_Carga",
      "UF_Destino_Carga",
      "Codigo_Terminal_Portuario",
      "Codigo_Pais_Procedencia",
      "Indicador_BL_Servico",
      "Numero_CE_Mercante_Original",
      "Indicador_Ships_Convenience",
      "Observacao",
      "Tipo_Consignatario",
      "Quantidade_Containers"
    ]
  },
  {
    "tabela": "mov_Mercante_Item_Carga",
    "colunas": [
      "IdMercante_Item_Carga",
      "IdMercante_Conhecimento",
      "IdLogistica_Maritima_Container",
      "IdTipo_Conteiner",
      "IdTipo_Embalagem",
      "IdTipo_Granel",
      "Tipo_Item_Carga",
      "Numero_Item",
      "Peso_Bruto_KG",
      "Tipo_Container",
      "Numero_Container",
      "Peso_Tara_Container",
      "Indicador_Parcial_Container",
      "Tipo_Embalagem_Carga_Solta",
      "Quantidade_Item_Carga_Solta",
      "Codigo_Tipo_Granel",
      "Texto_Descricao_Granel",
      "Numero_Chassi_Veiculo",
      "Nome_Marca",
      "Nome_Contramarca",
      "Codigo_Mercadoria_Perigosa",
      "Classe_Mercadoria_Perigosa",
      "Valor_Cubagem_M3",
      "Numero_Lacre_Container",
      "Codigo_Mercadoria",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Mercante_Item_Carga_NCM",
    "colunas": [
      "IdMercante_Item_Carga",
      "IdBill_Lading_NCM",
      "IdSerpro_NCM",
      "IdMercante_Item_Carga_NCM"
    ]
  },
  {
    "tabela": "mov_Mercante_Manifesto_Carga",
    "colunas": [
      "IdMercante_Manifesto_Carga",
      "IdAgente_Desconsolidador",
      "IdEmpresa_Sistema",
      "IdLogistica_Master",
      "IdNVOCC",
      "Quantidade_Conhecimentos",
      "Agente_Desconsolidador",
      "Numero_CE_Master",
      "Codigo_NVOCC",
      "Data",
      "Observacao",
      "Numero_BL_Master",
      "Conhecimentos_House"
    ]
  },
  {
    "tabela": "mov_Mercante_Manifesto_Tramite",
    "colunas": [
      "IdMercante_Manifesto_Tramite",
      "IdMercante_Manifesto_Carga",
      "Numero",
      "Data",
      "Protocolo_Remessa",
      "Situacao",
      "Observacao",
      "Dados_Arquivo_Remessa",
      "Dados_Arquivo_Retorno",
      "Data_Importacao_Retorno"
    ]
  },
  {
    "tabela": "mov_Mercante_Master",
    "colunas": [
      "IdMercante_Master",
      "Data",
      "Numero_CE",
      "Numero_BL",
      "Tipo",
      "Numero_Manifesto",
      "Data_Operacao",
      "Embarcacao",
      "Porto_Carregamento",
      "Porto_Descarregamento",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Mercante_Ships_Convenience",
    "colunas": [
      "IdMercante_Ships_Convenience",
      "IdMercante_Conhecimento",
      "IdTipo_Conteiner",
      "Numero_Container",
      "Tipo_Container",
      "Numero_Lacre_Container",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Mercante_Transbordo_Exterior",
    "colunas": [
      "IdMercante_Transbordo_Exterior",
      "IdMercante_Conhecimento",
      "IdLogistica_Maritima_Transbordo",
      "IdPorto_Transbordo",
      "IdEmbarcacao_Transbordo",
      "Porto_Transbordo",
      "Nome_Embarcacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Modelo_Registro_Financeiro",
    "colunas": [
      "IdModelo_Registro_Financeiro",
      "Descricao",
      "Situacao",
      "Tipo_Recorrencia",
      "Intervalo_Recorrencia",
      "Dia_Recorrencia",
      "Mes_Recorrencia",
      "Quantidade_Recorrencias",
      "Inicio_Recorrencia",
      "Termino_Recorrencia",
      "Dias_Aviso_Recorrencia",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Movimentacao_Financeira",
    "colunas": [
      "IdMovimentacao_Financeira",
      "IdTipo_Transacao",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdForma_Pagamento",
      "IdConta_Corrente",
      "IdMoeda",
      "IdResponsavel_Conciliacao",
      "IdEmpresa_Sistema",
      "IdContrato_Cambio",
      "IdGrupo_Financeiro",
      "IdSetor",
      "Identificacao_Extrato",
      "Numero",
      "Referencia",
      "Data",
      "Valor",
      "Natureza",
      "Previsao_Compensacao",
      "Data_Compensacao",
      "Numero_Pagamento",
      "Valor_Original",
      "Fator_Corrente",
      "Valor_Corrente",
      "Compensada",
      "Conciliada",
      "Estornada",
      "Utilizar_Saldo_Pessoa",
      "Historico",
      "Atalho",
      "Observacao",
      "Data_Conciliacao",
      "Historico_Resumo",
      "Origem_Lancamento",
      "Referencia_Externa",
      "Data_Lancamento",
      "Variacao_Cambial",
      "Nota_Recibo_Conferido",
      "Ativo",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "mov_Movimentacao_Financeira_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdMovimentacao_Financeira"
    ]
  },
  {
    "tabela": "mov_Movimentacao_Financeira_Categori",
    "colunas": [
      "IdMovimentacao_Categoria",
      "IdMovimentacao_Financeira",
      "IdCategoria_Financeira",
      "IdFatura_Financeira_Categoria",
      "IdFatura_Financeira_Baixa",
      "Tipo_Custo",
      "Valor",
      "Natureza",
      "Valor_Convertido",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Movimentacao_Financeira_Custo",
    "colunas": [
      "IdMovimentacao_Financeira_Custo",
      "IdMovimentacao_Categoria",
      "IdCentro_Custo",
      "IdFatura_Financeira_Custo",
      "IdFatura_Financeira_Baixa",
      "Valor",
      "Natureza",
      "Valor_Convertido",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Nota_Fiscal_Servico",
    "colunas": [
      "IdNota_Fiscal_Servico",
      "IdTipo_Movimentacao",
      "IdAtividade_Servico",
      "IdTomador",
      "IdTomador_Contato",
      "IdEndereco_Prestacao_Servico",
      "IdIntermediario_Servico",
      "IdEmpresa_Sistema",
      "IdLote_Nota_Fiscal_Servico",
      "Numero",
      "Data_Emissao",
      "Serie",
      "Descricao_Servicos",
      "Situacao",
      "Natureza_Operacao",
      "Valor_Servicos",
      "Valor_Deducoes",
      "Base_Calculo_PIS",
      "Aliquota_PIS",
      "Valor_PIS",
      "Base_Calculo_COFINS",
      "Aliquota_COFINS",
      "Valor_COFINS",
      "Base_Calculo_CSLL",
      "Aliquota_CSLL",
      "Valor_CSLL",
      "Base_Calculo_INSS",
      "Aliquota_INSS",
      "Valor_INSS",
      "Base_Calculo_IR",
      "Aliquota_IR",
      "Valor_IR",
      "Outras_Retencoes",
      "Total_Retencoes",
      "Total_Desconto_Condicionado",
      "Total_Desconto_Incondicionado",
      "Base_Calculo_ISS",
      "Aliquota_ISS",
      "Valor_ISS",
      "ISS_Retido",
      "Valor_ISS_Retido",
      "Valor_Liquido",
      "Regime_Especial_Tributacao",
      "Optante_Simples_Nacional",
      "Incentivador_Cultural",
      "Item_Lista_Servico",
      "Codigo_Tributacao_Municipio",
      "CNAE_Fiscal",
      "Email_Contato",
      "NFSe_Numero_Rps",
      "NFSe_Codigo_Verificacao",
      "NFSe_Data_Autorizacao",
      "NFSe_Data_Cancelamento",
      "NFSe_Posicao_Rps",
      "NFSe_Mensagem_Retorno",
      "xml",
      "Observacao",
      "NFSe_Motivo_Cancelamento",
      "NFSe_Ambiente",
      "NFSe_Serie_Rps",
      "NFSe_XML",
      "NFSe_PDF",
      "IdDados_Arquivo_NFSe_PDF",
      "Regime_Tributario",
      "Incentivo_Fiscal",
      "Aliquota_IBPT",
      "Tipo_Tributacao",
      "Exigibilidade",
      "Natureza_Tributacao",
      "Numero_Processo_Suspensao",
      "Local_Incidencia_ISS",
      "Responsavel_Retencao",
      "Informacoes_Complementares",
      "Tipo_Intermediario",
      "NFSe_IdIntegracao",
      "uniqueidentifie",
      "NFSe_IdInterno",
      "NFSe_Protocolo_Prefeitura",
      "NFSe_Protocolo_Cancelamento",
      "NFSe_Tipo_Integracao",
      "Referencia"
    ]
  },
  {
    "tabela": "mov_Nota_Fiscal_Servico_Item",
    "colunas": [
      "IdNota_Fiscal_Servico",
      "IdNota_Fiscal_Servico_Item",
      "Descricao",
      "Quantidade",
      "Valor_Unitario",
      "Subtotal",
      "Tipo_Desconto_Condicionado",
      "Valor_Desconto_Condicionado",
      "Total_Desconto_Condicionado",
      "Tipo_Desconto_Incondicionado",
      "Valor_Desconto_Incondicionado",
      "Total_Desconto_Incondicionado",
      "Valor_Total",
      "Precedencia",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Numeracao_AWB_Item",
    "colunas": [
      "IdNumeracao_AWB_Item",
      "IdNumeracao_AWB_Lote",
      "IdConhecimento_Embarque",
      "Indice",
      "Numero",
      "Situacao"
    ]
  },
  {
    "tabela": "mov_Numeracao_AWB_Lote",
    "colunas": [
      "IdNumeracao_AWB_Lote",
      "IdCompanhia_Transporte",
      "IdResponsavel",
      "IdEmpresa_Sistema",
      "Data",
      "Referencia",
      "Intervalo_Inicio",
      "Intervalo_Termino",
      "Quantidade_Minima_Aviso",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete",
    "colunas": [
      "IdOferta_Frete",
      "IdProposta_Frete",
      "IdCompanhia_Transporte",
      "IdOrigem",
      "IdDestino",
      "IdAgencia_Maritima_Aerea",
      "IdAgente_Origem",
      "IdAgente_Destino",
      "IdExportador",
      "IdImportador",
      "IdDespachante_Aduaneiro",
      "IdIncoterm",
      "IdFrequencia_Viagem",
      "IdFator_Conversao_Pagamento",
      "IdFator_Conversao_Recebimento",
      "IdRegiao_Cobranca_Origem",
      "IdRegiao_Cobranca_Destino",
      "IdMoeda",
      "IdProposta_Frete_Carga",
      "IdLocal_Recebimento",
      "IdDestino_Final",
      "IdRepresentante",
      "IdContrato_Frete",
      "IdNivel_Servico_Aereo",
      "IdNotify",
      "IdMoeda_Pagamento_Demurrage",
      "IdMoeda_Recebimento_Demurrage",
      "IdTipo_Processo",
      "IdTerminal_Atracacao",
      "IdTerminal_Retirada_Redestinar",
      "IdAssociacao_Internacional",
      "IdSeguradora",
      "IdRepresentante_Destino_Final",
      "Indice",
      "Numero_Oferta",
      "Numero_Versao",
      "Modalidade_Processo",
      "Tipo_Operacao",
      "Tipo_Servico",
      "Modalidade_Pagamento_Master",
      "Modalidade_Pagamento_House",
      "Situacao",
      "Margem_Cambio_Pagamento",
      "Margem_Cambio_Recebimento",
      "Rota",
      "Local_Coleta",
      "Local_Entrega",
      "Transit_Time",
      "Transit_Time_Maximo",
      "Validade_Dias",
      "Data_Validade",
      "Instrucoes_Operacional",
      "Detalhes",
      "Observacao",
      "Referencia_Cliente",
      "Instrucoes_Financeiro",
      "Instrucoes_Agente",
      "Instrucoes_Cliente",
      "Local_Emissao_Master",
      "Local_Emissao_House",
      "Local_Emissao_Outros",
      "Total_Conhecimentos",
      "Master_Direto",
      "Local_Emissao_Outro",
      "Tipo_Servico_Aereo",
      "Referencia_Externa",
      "Quantidade_Invoices",
      "Tipo_Frete",
      "Instrucoes_Operacional_Cliente",
      "Comissao_Entrega",
      "Comissao_Coleta",
      "Remarks",
      "Tipo_Rota",
      "Dias_Voo_Domingo",
      "Dias_Voo_Segunda",
      "Dias_Voo_Terca",
      "Dias_Voo_Quarta",
      "Dias_Voo_Quinta",
      "Dias_Voo_Sexta",
      "Dias_Voo_Sabado",
      "Remarks_Terrestre",
      "Remarks_Free_Time"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdOferta_Frete"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Comissao",
    "colunas": [
      "IdOferta_Frete_Comissao",
      "IdOferta_Frete",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdTaxa_Logistica_Exibicao",
      "IdMoeda",
      "IdTaxa_Referente",
      "IdPessoa_Pagamento",
      "IdConta_Pagamento",
      "Tipo_Comissionado",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo",
      "Percentual_Base_Calculo",
      "Tipo_Base_Calculo",
      "Observacao",
      "Pagar_Para",
      "Local_Pagamento",
      "Acesso_Restrito",
      "Trecho",
      "Tipo_Valor_Minimo",
      "Valor_Maximo",
      "Valor_Comissao_Inland",
      "Tipo_Comissao_Inland",
      "Alterado_Manualmente",
      "Tipo_Valor_Maximo",
      "Valor_Maximo_Container_20",
      "Valor_Maximo_Container_40",
      "Sobre_Todas_Taxas"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Condicao",
    "colunas": [
      "IdOferta_Frete_Condicao",
      "IdOferta_Frete",
      "IdCondicao_Oferta_Grupo",
      "IdCondicao_Oferta",
      "Detalhamento",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Demurrage_Tarifa",
    "colunas": [
      "IdOferta_Frete",
      "IdEquipamento_Maritimo",
      "IdOferta_Frete_Demurrage_Tarifa",
      "Tipo_Incidencia",
      "Periodo",
      "Quantidade_Dias",
      "Valor_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Escala_Transbordo",
    "colunas": [
      "IdOferta_Frete",
      "IdCompanhia_Transporte",
      "IdPorto_Aeroporto",
      "IdNavio",
      "IdOferta_Frete_Escala_Transb",
      "Numero_Viagem_Voo",
      "Precedencia",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Fechamento",
    "colunas": [
      "IdOferta_Frete_Fechamento",
      "IdOferta_Frete",
      "IdMoeda",
      "Lucro_Estimado",
      "Total_Pagamento",
      "Total_Recebimento",
      "Total_Pagamento_Local",
      "Total_Pagamento_Exterior",
      "Total_Recebimento_Local",
      "Total_Recebimento_Exterior",
      "Comissao_Agente_Origem",
      "Comissao_Agente_Destino",
      "Comissao_Vendedor",
      "Comissao_Representante",
      "Comissao_Outros",
      "Observacao",
      "Comissao_Associacao",
      "Lucro_Estimado_Frete",
      "Lucro_Estimado_Origem",
      "Lucro_Estimado_Destino"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Fechamento_Fator",
    "colunas": [
      "IdOferta_Frete_Fechamento",
      "IdMoeda_Origem",
      "IdMoeda_Destino",
      "IdOferta_Frete_Fechamento_Fator",
      "Origem",
      "Fator",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Free_Time",
    "colunas": [
      "IdOferta_Frete",
      "IdEquipamento_Maritimo",
      "IdOferta_Frete_Free_Time",
      "Master_Origem",
      "House_Origem",
      "Master_Destino",
      "House_Destino",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Servico_Maritimo",
    "colunas": [
      "IdOferta_Frete",
      "IdServico_Maritimo",
      "IdOferta_Frete_Servico_Maritimo",
      "Transit_Time",
      "Selecionado",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Taxa",
    "colunas": [
      "IdOferta_Frete_Taxa",
      "IdProposta_Frete",
      "IdOferta_Frete",
      "IdTaxa_Logistica_Exibicao",
      "IdEquipamento_Maritimo",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "IdConta_Pagamento",
      "IdPessoa_Pagamento",
      "IdPessoa_Recebimento",
      "IdCompanhia_Transporte",
      "IdOrigem_Destino",
      "IdProposta_Frete_Carga",
      "IdTaxa_Logistica_Classificacao",
      "Quantidade_Pagamento",
      "Quantidade_Recebimento",
      "Valor_Pagamento_Unitario",
      "Valor_Pagamento_Minimo",
      "Valor_Pagamento_Total",
      "Valor_Recebimento_Unitario",
      "Valor_Recebimento_Minimo",
      "Valor_Recebimento_Total",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Pagar_Para",
      "Receber_De",
      "Modalidade_Processo",
      "Tipo_Operacao",
      "Origem_Taxa",
      "Categoria",
      "Data_Validade",
      "Trecho",
      "Complemento",
      "Observacao",
      "Escalonar",
      "Numero_Versao",
      "Exibir_Cliente",
      "Exibir_Agente",
      "Local_Pagamento",
      "Local_Recebimento",
      "Bloquear_Recebimento",
      "Modalidade_Pagamento",
      "Modalidade_Recebimento",
      "Valor_Pagamento_Maximo"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Taxa_Composicao",
    "colunas": [
      "IdOferta_Frete_Taxa",
      "IdTaxa_Composicao",
      "IdOferta_Frete_Taxa_Composicao",
      "Base_Calculo_Porcentagem",
      "Base_Calculo",
      "Percentual_Comissao",
      "Valor_Comissao",
      "Valor_Fixo",
      "Compor_Pagamento",
      "Compor_Recebimento",
      "Percentual_Pagamento",
      "Percentual_Recebimento",
      "Valor_Pagamento",
      "Valor_Recebimento",
      "Fator_Pagamento",
      "Fator_Recebimento",
      "Tipo_Composicao",
      "Observacao",
      "Valor_Pagamento_Taxa",
      "Valor_Recebimento_Taxa"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Taxa_Faixa_Peso",
    "colunas": [
      "IdOferta_Frete_Taxa",
      "IdFaixa_Peso_Cobranca",
      "IdOferta_Frete_Taxa_Faixa_Peso",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Oferta_Frete_Viagem",
    "colunas": [
      "IdOferta_Frete_Viagem",
      "IdOferta_Frete",
      "IdOrigem",
      "IdDestino",
      "IdCompanhia_Transporte",
      "IdNavio",
      "IdViagem_Navio",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque",
      "Tipo_Viagem",
      "Tipo_Servico",
      "Modalidade_Transporte",
      "Viagem_Voo",
      "Numero_Controle",
      "Tempo_Estimado",
      "Local_Coleta",
      "Local_Entrega",
      "Observacao",
      "Sequencia",
      "Precedencia"
    ]
  },
  {
    "tabela": "mov_Orcamento_Financeiro",
    "colunas": [
      "IdOrcamento_Financeiro",
      "IdMoeda",
      "IdEmpresa_Sistema",
      "Ano",
      "Tipo_Orcamento",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Orcamento_Financeiro_Item",
    "colunas": [
      "IdOrcamento_Financeiro_Item",
      "IdOrcamento_Financeiro",
      "IdTipo_Transacao",
      "IdCategoria_Financeira",
      "Valor_Total",
      "Valor_Janeiro",
      "Valor_Fevereiro",
      "Valor_Marco",
      "Valor_Abril",
      "Valor_Maio",
      "Valor_Junho",
      "Valor_Julho",
      "Valor_Agosto",
      "Valor_Setembro",
      "Valor_Outubro",
      "Valor_Novembro",
      "Valor_Dezembro"
    ]
  },
  {
    "tabela": "mov_Ordem_Embarque",
    "colunas": [
      "IdOrdem_Embarque",
      "IdProjeto_Atividade",
      "IdImportador",
      "IdExportador",
      "IdLocal_Coleta",
      "IdOrigem",
      "IdDestino",
      "IdLocal_Consolidacao",
      "IdIncoterm",
      "IdMercadoria",
      "IdStatus_Processo_Logistico",
      "IdEmpresa_Sistema",
      "IdNivel_Servico_Aereo",
      "IdCoordenador",
      "IdLogistica_House",
      "IdCliente",
      "IdAgente_Origem",
      "Numero",
      "Numero_Invoices",
      "Referencia_Ciente",
      "Situacao",
      "Modalidade",
      "Tipo_Operacao",
      "Peso_Bruto",
      "Metros_Cubicos",
      "Quantidade_Volumes",
      "Data_Abertura",
      "Data_Previsao_Prontidao",
      "Data_Prontidao",
      "Data_Previsao_Coleta",
      "Data_Coleta",
      "Data_Previsao_Consolidacao",
      "Data_Consolidacao",
      "Data_Previsao_Desembarque",
      "Data_Previsao_Embarque",
      "Observacao",
      "Data_Enviado_Processamento",
      "Data_Gerado_Embarque",
      "Data_Recebimento_Carga"
    ]
  },
  {
    "tabela": "mov_Pessoa_Acompanhamento",
    "colunas": [
      "IdAcompanhamento",
      "IdPessoa"
    ]
  },
  {
    "tabela": "mov_Pessoa_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdPessoa"
    ]
  },
  {
    "tabela": "mov_Pessoa_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdPessoa"
    ]
  },
  {
    "tabela": "mov_Portal_Token",
    "colunas": [
      "IdPortal_Token",
      "Token",
      "nvarchar",
      "Tipo",
      "Data_Criacao",
      "Data_Expiracao",
      "Utilizado"
    ]
  },
  {
    "tabela": "mov_Pro_Forma",
    "colunas": [
      "IdPro_Forma",
      "IdTrading",
      "IdExportador",
      "IdImportador",
      "IdPorto_Desembarque",
      "IdForma_Pagamento",
      "IdProduto_Tipo",
      "IdEquipamento_Maritimo",
      "IdMoeda",
      "IdEmbalagem",
      "IdPorto_Embarque",
      "IdTextos_Exportacao",
      "IdUnidade_Medida",
      "IdRevisao",
      "IdModelo_Relatorio",
      "IdProjeto_Atividade",
      "IdEmpresa_Sistema",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdPro_Forma_Original",
      "Codigo",
      "Ano",
      "Numero",
      "Data",
      "Previsao_Embarque",
      "Ultima_Data_Embarque",
      "Modalidade_Pagamento",
      "Embarque_Parcial",
      "Transbordo",
      "Valor_FOB_Compra",
      "Valor_Total_Compra",
      "Valor_FOB_Venda",
      "Valor_Frete",
      "Valor_Seguro",
      "Valor_Total_Venda",
      "Valores_Exatos",
      "Frete",
      "Total_Metragem",
      "Total_Containners",
      "Total_Pallets",
      "FCL_Texto",
      "Situacao",
      "Descricao_Total",
      "Reivindicacao",
      "Descricao_embalagem",
      "Marcas",
      "Tolerancia_Dimensoes",
      "Tolerancia_Metragem",
      "Descricao_Preco",
      "Enviado",
      "Data_Envio",
      "Metragem_Exata",
      "Recebido",
      "Peso_Minimo",
      "Tolerancia_Espessura",
      "Tolerancia_Largura",
      "Tolerancia_Comprimento",
      "Data_Recebimento",
      "Data_Criacao",
      "Data_Alteracao",
      "Fixo",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Pro_Forma_Item",
    "colunas": [
      "IdPro_Forma_Item",
      "IdPro_Forma",
      "IdProduto",
      "IdProduto_Dimensoes",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Produto",
      "Quantidade_Pecas",
      "Quantidade_Pallets",
      "Metragem",
      "Valor_Venda_Unitario",
      "Valor_Venda_Total",
      "Valor_Compra_Unitario",
      "Valor_Compra_Total",
      "Porcentagem",
      "Marcas",
      "Descricao_Produto",
      "Descricao_Qualidade",
      "Data_Criacao",
      "Data_Alteracao",
      "Fixo",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Produto_Etiqueta",
    "colunas": [
      "IdProduto_Etiqueta",
      "IdProduto",
      "IdApresentacao",
      "IdFornecedor",
      "Numero",
      "Lote",
      "Quantidade",
      "Data_Validade",
      "Ativo",
      "Tipo"
    ]
  },
  {
    "tabela": "mov_Projeto_Atividade",
    "colunas": [
      "IdProjeto_Atividade",
      "IdProjeto_Tarefa",
      "IdEmpresa_Sistema",
      "Dados_Registro",
      "xml",
      "Referencia"
    ]
  },
  {
    "tabela": "mov_Projeto_Atividade_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdProjeto_Atividade"
    ]
  },
  {
    "tabela": "mov_Projeto_Atividade_Contato",
    "colunas": [
      "IdProjeto_Atividade_Contato",
      "IdProjeto_Atividade",
      "IdPessoa_Contato",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Projeto_Atividade_Grupo_Envio",
    "colunas": [
      "IdProjeto_Atividade_Responsavel",
      "IdProjeto_Atividade_Contato",
      "IdGrupo_Envio_Mensagem",
      "IdProjeto_Atividade_Grupo_Envio",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Projeto_Atividade_Mensagem",
    "colunas": [
      "IdMensagem",
      "IdProjeto_Atividade",
      "Importado",
      "Selecionado_Resposta"
    ]
  },
  {
    "tabela": "mov_Projeto_Atividade_Responsavel",
    "colunas": [
      "IdProjeto_Atividade_Responsavel",
      "IdProjeto_Atividade",
      "IdPapel_Projeto",
      "IdResponsavel",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Proposta_Frete",
    "colunas": [
      "IdProposta_Frete",
      "IdEmpresa_Sistema",
      "IdCliente",
      "IdCliente_Contato",
      "IdVendedor",
      "IdResponsavel",
      "IdProposta_Original",
      "IdProjeto_Atividade",
      "IdIndicacao",
      "IdMotivo_Nao_Aprovacao_Proposta",
      "Numero_Proposta",
      "Numero_Versao",
      "Data_Proposta",
      "Data_Versao",
      "Data_Aprovacao",
      "Encaminhado_Por",
      "Tipo_Proposta",
      "Situacao",
      "Detalhes_Nao_Aprovacao",
      "Observacao",
      "Data_Solicitacao_Cliente"
    ]
  },
  {
    "tabela": "mov_Proposta_Frete_Carga",
    "colunas": [
      "IdProposta_Frete_Carga",
      "IdProposta_Frete",
      "IdMercadoria",
      "IdMoeda_Mercadoria",
      "Indice",
      "Descricao",
      "Tipo_Carga",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Peso_Taxado",
      "Quantidade_Volumes",
      "Total_Container_20",
      "Total_Container_40",
      "Observacao",
      "Valor_Mercadoria",
      "Importancia_Segurada",
      "Percentual_Seguro",
      "Carga_Perigosa",
      "Seguro",
      "NCM_Descricao",
      "Equipamentos",
      "Total_Carretas",
      "Quantidade_UN_Nacoes_Unidas"
    ]
  },
  {
    "tabela": "mov_Proposta_Frete_Embalagem",
    "colunas": [
      "IdProposta_Frete_Embalagem",
      "IdProposta_Frete_Carga",
      "IdTipo_Embalagem",
      "Quantidade",
      "Altura",
      "Largura",
      "Comprimento",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Coeficiente_Conversao_Peso",
      "Observacao",
      "Peso_Bruto_Unitario",
      "Peso_Liquido_Unitario"
    ]
  },
  {
    "tabela": "mov_Proposta_Frete_Equipamento",
    "colunas": [
      "IdProposta_Frete_Equipamento",
      "IdProposta_Frete_Carga",
      "IdEquipamento_Maritimo",
      "Quantidade",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Recibo_Financeiro",
    "colunas": [
      "IdRecibo_Financeiro",
      "IdMovimentacao_Financeira",
      "IdPessoa",
      "IdMoeda",
      "Numero",
      "Data",
      "Valor",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Registro_Financeiro",
    "colunas": [
      "IdRegistro_Financeiro",
      "IdTipo_Transacao",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdCondicao_Pagamento",
      "IdForma_Cobranca",
      "IdForma_Pagamento",
      "IdConta_Corrente",
      "IdMoeda",
      "IdConversao_Moeda",
      "IdEmpresa_Sistema",
      "IdModelo_Registro_Financeiro",
      "IdAtraves_De",
      "IdChave_Externa",
      "IdPessoa_Referencia",
      "IdGrupo_Financeiro",
      "IdSetor",
      "Data",
      "Data_Referencia",
      "Numero",
      "Referencia",
      "Natureza",
      "Subtotal",
      "Valor_Total",
      "Situacao",
      "Acrescimo",
      "Tipo_Acrescimo",
      "Abatimento",
      "Tipo_Abatimento",
      "Desconto_Incondicional",
      "Tipo_Desconto_Incondicional",
      "Desconto_Condicional",
      "Tipo_Desconto_Condicional",
      "Dias_Desconto_Condicional",
      "Multa",
      "Tipo_Multa",
      "Juros",
      "Periodo_Juros",
      "Tipo_Juros",
      "Tolerancia_Multa_Juros",
      "Valor_Original",
      "Historico",
      "Instrucao",
      "Registro_Unificador",
      "Atalho",
      "Observacao",
      "Dados_Registro",
      "xml",
      "Origem_Lancamento",
      "Referencia_Externa",
      "Historico_Resumo",
      "Codigo_Barras",
      "Ativo",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "mov_Registro_Financeiro_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdRegistro_Financeiro"
    ]
  },
  {
    "tabela": "mov_Retorno_Cobranca",
    "colunas": [
      "IdRetorno_Cobranca",
      "IdEmpresa_Sistema",
      "IdResponsavel",
      "Data",
      "Nome_Arquivo",
      "Protocolo",
      "Situacao",
      "Mensagem_Processamento",
      "Arquivo_Retorno",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Retorno_Cobranca_Boleto",
    "colunas": [
      "IdRetorno_Cobranca",
      "IdBoleto_Cobranca"
    ]
  },
  {
    "tabela": "mov_Retorno_Integracao",
    "colunas": [
      "IdRetorno_Integracao",
      "IdUsuario_Processamento",
      "Data",
      "Data_Processamento",
      "Tipo",
      "Situacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_SISPAG_Arquivo",
    "colunas": [
      "IdSISPAG_Arquivo",
      "IdConta_Corrente",
      "IdEmpresa",
      "IdEmpresa_Sistema",
      "Codigo_Banco",
      "Codigo_Lote",
      "Layout_Arquivo",
      "Tipo_Inscricao",
      "Numero_Inscricao",
      "Numero_Agencia",
      "Numero_Conta",
      "DAC_Agencia_Conta",
      "Nome_Empresa",
      "Nome_Banco",
      "Codigo_Arquivo",
      "Data_Geracao",
      "Unidade_Densidade",
      "Quantidade_Lotes",
      "Quantidade_Registros",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_SISPAG_Detalhe",
    "colunas": [
      "IdSISPAG_Detalhe",
      "IdSISPAG_Lote",
      "IdFatura_Financeira",
      "IdConta_Favorecida",
      "IdFavorecido",
      "IdMoeda",
      "IdSacador",
      "Numero_Registro",
      "Segmento",
      "Tipo_Movimento",
      "Codigo_Banco_Favorecido",
      "Numero_Agencia_Favorecida",
      "Numero_Conta_Favorecida",
      "DV_Conta_Favorecida",
      "Nome_Favorecido",
      "Seu_Numero",
      "Data_Prevista_Pagamento",
      "Tipo_Moeda",
      "Valor_Previsto_Pagamento",
      "Nosso_Numero",
      "Data_Efetiva_Pagamento",
      "Valor_Efetivo_Pagamento",
      "Finalidade_Detalhe",
      "Numero_Documento",
      "Numero_Inscricao_Favorecido",
      "Finalidade_DOC_Status_Func",
      "Finalidade_TED",
      "Aviso",
      "Ocorrencias",
      "Numero_Nota_Fiscal_CNPJ",
      "Tipo_Identificacao",
      "Codigo_Barras",
      "Moeda_Codigo_Barras",
      "DV_Codigo_Barras",
      "Fator_Vencimento_Codigo_Barras",
      "Valor_Codigo_Barras",
      "Campo_Livre_Codigo_Barras",
      "Descontos",
      "Acrescimos",
      "Quantidade_Moeda",
      "Dados_Tributo",
      "Observacao",
      "Data_Vencimento",
      "Valor_Titulo",
      "Tipo_Inscricao_Favorecido",
      "Tipo_Inscricao_Sacador",
      "Numero_Inscricao_Sacador",
      "Nome_Sacador"
    ]
  },
  {
    "tabela": "mov_SISPAG_Lote",
    "colunas": [
      "IdSISPAG_Lote",
      "IdSISPAG_Arquivo",
      "IdConta_Corrente",
      "IdEmpresa",
      "Identificacao_Lancamento",
      "Tipo_Lote",
      "Codigo_Banco",
      "Codigo_Lote",
      "Tipo_Operacao",
      "Tipo_Pagamento",
      "Forma_Pagamento",
      "Layout_Lote",
      "Tipo_Inscricao",
      "Numero_Inscricao",
      "Numero_Agencia",
      "Numero_Conta",
      "DAC_Agencia_Conta",
      "Nome_Empresa",
      "Finalidade_Lote",
      "Historico_Conta_Corrente",
      "Endereco_Empresa",
      "Endereco_Empresa_Numero",
      "Endereco_Empresa_Complemento",
      "Cidade_Empresa",
      "CEP_Empresa",
      "Estado_Empresa",
      "Ocorrencias_Header",
      "Quantidade_Registros",
      "Valor_Total_Pagamentos",
      "Valor_Total_Moedas",
      "Valor_Total_Principal",
      "Valor_Total_Outras_Entidades",
      "Valor_Total_Acrescimos",
      "Ocorrencias_Trailer",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Servico_Maritimo",
    "colunas": [
      "IdServico_Maritimo",
      "IdLinha_Comercial_Origem",
      "IdLinha_Comercial_Destino",
      "IdArmador",
      "IdFrequencia_Viagem",
      "Nome",
      "Tipo_Operacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Servico_Maritimo_Porto",
    "colunas": [
      "IdServico_Maritimo_Porto",
      "IdServico_Maritimo",
      "IdPorto",
      "Tipo",
      "Precedencia",
      "Transit_Time",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Siscoserv",
    "colunas": [
      "IdSiscoserv",
      "IdLogistica_House",
      "IdPessoa",
      "IdPais",
      "IdResponsavel_Operacional",
      "IdEmpresa_Sistema",
      "IdMoeda",
      "Numero",
      "Data",
      "Localizador",
      "Tipo_Lancamento",
      "NIF",
      "Motivo_Nao_Preenchimento_NIF",
      "Endereco_Pessoa",
      "Tipo_Vinculacao",
      "Conhecimento_Master",
      "Conhecimentos",
      "Numero_RVS_RAS",
      "Data_RVS_RAS",
      "Arquivado",
      "Verificar",
      "Informacoes_Complementares"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Acao",
    "colunas": [
      "IdSiscoserv_Acao",
      "IdSiscoserv",
      "Acao",
      "Data",
      "Observacao",
      "Processada",
      "Data_Processamento"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Enquadramento",
    "colunas": [
      "IdSiscoserv_Enquadramento",
      "IdSiscoserv_Operacao",
      "IdEnquadramento_Servico",
      "Numero_RC",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Fatura",
    "colunas": [
      "IdSiscoserv_Fatura",
      "IdSiscoserv",
      "Localizador_Fatura",
      "Numero_Nota_Fiscal",
      "Data_Nota_Fiscal",
      "Observacao",
      "Ativo",
      "Numero_RF_RP",
      "Data_RF_RP"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Fatura_Item",
    "colunas": [
      "IdSiscoserv_Fatura_Item",
      "IdSiscoserv_Fatura",
      "IdSiscoserv_Operacao",
      "IdNBS",
      "Localizador_Fatura",
      "Valor_Faturado_Pago",
      "Valor_Mantido_Exterior",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Lote",
    "colunas": [
      "IdSiscoserv_Lote",
      "IdPessoa",
      "IdMoeda",
      "IdEmpresa_Sistema",
      "IdResponsavel",
      "Data",
      "Tipo_Lancamento",
      "Tipo_Lote",
      "Numero",
      "Protocolo",
      "Situacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Lote_Item",
    "colunas": [
      "IdSiscoserv_Lote_Item",
      "IdSiscoserv_Lote",
      "IdSiscoserv_Resumo",
      "IdSiscoserv_Acao",
      "Informacoes_Complementares",
      "Arquivo_Envio"
    ]
  },
  {
    "tabela": "mov_Siscoserv_NBS",
    "colunas": [
      "IdSiscoserv_NBS",
      "IdSiscoserv_Resumo",
      "IdNBS",
      "Valor",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Operacao",
    "colunas": [
      "IdSiscoserv_Operacao",
      "IdSiscoserv",
      "IdNBS",
      "IdPais",
      "Modo_Prestacao",
      "Data_Inicio",
      "Data_Conclusao",
      "Valor"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Operacao_DI",
    "colunas": [
      "IdSiscoserv_Operacao_DI",
      "IdSiscoserv_Operacao",
      "Numero_DI",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Operacao_RE",
    "colunas": [
      "IdSiscoserv_Operacao_RE",
      "IdSiscoserv_Operacao",
      "Numero_RE",
      "Observacao",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Siscoserv_Resumo",
    "colunas": [
      "IdSiscoserv_Resumo",
      "IdLogistica_House",
      "IdEmpresa_Sistema",
      "IdMoeda",
      "IdPessoa",
      "IdLogistica_Fatura",
      "IdResponsavel_Operacional",
      "Data",
      "VAT_Number",
      "Data_Inicio",
      "Data_Conclusao",
      "Valor",
      "Numero_RVS",
      "Numero_Nota_Fiscal",
      "Conhecimentos",
      "Dados_Pessoa",
      "Observacao",
      "Data_Nota_Fiscal",
      "Numero_RF",
      "Data_RVS",
      "Data_RF",
      "Tipo_Lancamento",
      "Referencia_Externa",
      "Conhecimento_Master",
      "Finalidade",
      "Arquivado",
      "Localizador",
      "Motivo_Nao_Preenchimento_NIF"
    ]
  },
  {
    "tabela": "mov_Special_Handling",
    "colunas": [
      "IdSpecial_Handling",
      "IdConhecimento_Embarque",
      "IdSpecial_Handling_Information",
      "Code",
      "Description",
      "Code_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_House",
    "colunas": [
      "IdTRK_House",
      "IdTRK_Master",
      "IdLogistica_House",
      "Data_Criacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_House_Atualizacao",
    "colunas": [
      "IdTRK_House_Atualizacao",
      "IdLogistica_House",
      "IdLogistica_Viagem",
      "IdLogistica_Maritima_Container",
      "Data_Atualizacao",
      "Status_Embarque",
      "Conteudo_Atualizacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_House_Container",
    "colunas": [
      "IdTRK_House_Container",
      "IdTRK_House",
      "IdTRK_Master_Container",
      "IdLogistica_Maritima_Container",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_House_Voyage",
    "colunas": [
      "IdTRK_House_Voyage",
      "IdTRK_Master_Voyage",
      "IdTRK_House",
      "IdLogistica_Viagem",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_Master",
    "colunas": [
      "IdTRK_Master",
      "IdUsuario_Criacao",
      "IdCompanhia_Transporte",
      "Booking",
      "Master_BL",
      "Shipment_ID",
      "Carrier_Identifier",
      "Data_Criacao",
      "Data_Atualizacao",
      "Modalidade",
      "Status_Embarque",
      "Status_Processamento",
      "Controlar_Container",
      "Voyage_Sequence_Atual",
      "Mensagem_Erro",
      "Observacao",
      "Data_Proxima_Consulta"
    ]
  },
  {
    "tabela": "mov_TRK_Master_Container",
    "colunas": [
      "IdTRK_Master_Container",
      "IdTRK_Master",
      "Numero_Container",
      "Data_Descarga",
      "Data_Retirada",
      "Data_Devolucao",
      "Data_Gate_In",
      "Data_Gate_Out",
      "Data_Criacao",
      "Data_Atualizacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_Master_Event",
    "colunas": [
      "IdTRK_Master_Event",
      "IdTRK_Master",
      "Categoria",
      "Tipo_Evento",
      "Data_Evento",
      "Detalhamento",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_Master_Log",
    "colunas": [
      "IdTRK_Master_Log",
      "IdTRK_Master",
      "Descricao",
      "Tipo",
      "Data",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_TRK_Master_Voyage",
    "colunas": [
      "IdTRK_Master_Voyage",
      "IdTRK_Master",
      "IdOrigem",
      "IdDestino",
      "Origem_Sigla",
      "Destino_Sigla",
      "Navio",
      "Viagem",
      "Data_Previsao_Carregamento",
      "Data_Carregamento",
      "Data_Previsao_Embarque",
      "Data_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Desembarque",
      "Data_Previsao_Descarregamento",
      "Data_Descarregamento",
      "Status_Embarque",
      "Hash",
      "Sequence_Konfere",
      "Observacao",
      "Tipo_Busca_Origem",
      "Tipo_Busca_Destino"
    ]
  },
  {
    "tabela": "mov_Tarifario_Aereo",
    "colunas": [
      "IdTarifario_Aereo",
      "IdCompanhia_Aerea",
      "IdAgente_Carga",
      "IdOrigem_Inicial",
      "IdAeroporto_Origem",
      "IdAeroporto_Destino",
      "IdDestino_Final",
      "IdFrequencia_Viagem",
      "IdNivel_Servico_Aereo",
      "IdContrato_Frete",
      "IdContrato_Maritimo_Cliente",
      "Tipo",
      "Transit_Time",
      "Observacao",
      "Tipo_Servico",
      "Escala",
      "Transit_Time_Maximo",
      "Data_Inicio_Vigencia",
      "Data_Validade",
      "Status",
      "Rota",
      "Dia_Voo_Domingo",
      "Dia_Voo_Segunda",
      "Dia_Voo_Terca",
      "Dia_Voo_Quarta",
      "Dia_Voo_Quinta",
      "Dia_Voo_Sexta",
      "Dia_Voo_Sabado",
      "Remarks",
      "Gerou_Oferta_Frete",
      "Tarifario_Clonado"
    ]
  },
  {
    "tabela": "mov_Tarifario_Aereo_Faixa_Peso",
    "colunas": [
      "IdTarifario_Aereo_Taxa",
      "IdFaixa_Peso_Cobranca",
      "IdTarifario_Aereo_Faixa_Peso",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Aereo_Taxa",
    "colunas": [
      "IdTarifario_Aereo_Taxa",
      "IdTarifario_Aereo",
      "IdTaxa_Logistica",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Valor_Pagamento_Minimo",
      "Valor_Recebimento_Minimo",
      "Observacao",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Unitario"
    ]
  },
  {
    "tabela": "mov_Tarifario_Agrupamento_Item",
    "colunas": [
      "IdTarifario_Agrupamento_Item",
      "IdTarifario_Agrupamento_Porto",
      "IdOrigem_Destino",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Agrupamento_Porto",
    "colunas": [
      "IdTarifario_Agrupamento_Porto",
      "IdTarifario_Maritimo",
      "Descricao",
      "Tipo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdTarifario_Frete",
      "IdTarifario_Origem_Destino",
      "IdTarifario_Aereo",
      "IdTarifario_Maritimo",
      "IdTarifario_Demurrage",
      "IdTarifario_Arquivo"
    ]
  },
  {
    "tabela": "mov_Tarifario_Coleta_Entrega",
    "colunas": [
      "IdTarifario_Coleta_Entrega",
      "IdTarifario_Origem_Destino",
      "IdTaxa_Logistica",
      "IdFaixa_Peso_Cobranca",
      "IdRegiao_Cobranca",
      "IdEquipamento_Maritimo",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "Tipo_Operacao",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Valor_Pagamento_Minimo",
      "Valor_Recebimento_Minimo",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Demurrage",
    "colunas": [
      "IdTarifario_Demurrage",
      "IdArmador",
      "IdCliente",
      "IdPorto",
      "IdMoeda",
      "IdTabela_Preco_Logistica",
      "IdContrato_Frete",
      "Numero",
      "Tipo_Tarifario",
      "Data_Inicio_Vigencia",
      "Data_Termino_Vigencia",
      "Observacao",
      "Tipo_Porto"
    ]
  },
  {
    "tabela": "mov_Tarifario_Demurrage_Agrupamento",
    "colunas": [
      "IdTarifario_Demurrage_Agrup",
      "IdTarifario_Demurrage",
      "IdPorto",
      "Descricao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Demurrage_Taxa",
    "colunas": [
      "IdTarifario_Demurrage_Taxa",
      "IdTarifario_Demurrage",
      "IdEquipamento_Maritimo",
      "IdTarifario_Demurrage_Agrup",
      "Periodo",
      "Quantidade_Dias",
      "Valor_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo",
    "colunas": [
      "IdTarifario_Maritimo",
      "IdArmador",
      "IdContrato_Frete",
      "IdServico_Maritimo",
      "IdMoeda",
      "IdContrato_Maritimo_Cliente",
      "IdEmpresa_Sistema",
      "Numero",
      "Data_Inicio_Vigencia",
      "Data_Validade",
      "Observacao",
      "Tipo_Operacao",
      "Status",
      "Tipo_Frete",
      "Remarks",
      "Gerou_Oferta_Frete",
      "Tarifario_Clonado",
      "Visivel",
      "Ativo"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo_Agrupamento",
    "colunas": [
      "IdTarifario_Maritimo_Agrupament",
      "IdTarifario_Maritimo",
      "IdAgrupamento_Origem",
      "IdAgrupamento_Destino",
      "Indice",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo_Equipamento",
    "colunas": [
      "IdTarifario_Maritimo_Equipament",
      "IdTarifario_Maritimo",
      "IdEquipamento_Maritimo",
      "Free_Time_Master",
      "Free_Time_House",
      "Observacao",
      "Free_Time_Master_Exterior",
      "Free_Time_House_Exterior",
      "Remarks"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo_Feeder",
    "colunas": [
      "IdTarifario_Maritimo_Feeder",
      "IdTarifario_Agrupamento_Item",
      "IdOrigem_Destino",
      "Transit_Time_Feeder",
      "Observacao",
      "Valor_Pagamento",
      "Valor_Recebimento"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo_Mercadoria",
    "colunas": [
      "IdMercadoria",
      "IdTarifario_Maritimo",
      "IdTarifario_Maritimo_Mercadoria",
      "IdGrupo_Mercadoria",
      "Regra",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo_Rota",
    "colunas": [
      "IdTarifario_Maritimo_Rota",
      "IdTarifario_Maritimo",
      "IdPorto_Origem",
      "IdPorto_Destino",
      "Transit_Time",
      "Observacao",
      "Transit_Time_Maximo",
      "Data_Inicio_Vigencia",
      "Data_Validade"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo_Servico",
    "colunas": [
      "IdTarifario_Maritimo_Servico",
      "IdTarifario_Maritimo",
      "IdServico_Maritimo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Maritimo_Taxa",
    "colunas": [
      "IdTarifario_Maritimo_Taxa",
      "IdTarifario_Maritimo_Rota",
      "IdTarifario_Maritimo_Agrupament",
      "IdTaxa_Logistica",
      "IdEquipamento_Maritimo",
      "IdTarifario_Maritimo_Feeder",
      "IdAgrup_Equipamento_Maritimo",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "Tipo_Carga",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Valor_Pagamento_Minimo",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Minimo",
      "Valor_Recebimento_Unitario",
      "Observacao",
      "Opcao_Valor"
    ]
  },
  {
    "tabela": "mov_Tarifario_Origem_Destino",
    "colunas": [
      "IdTarifario_Origem_Destino",
      "IdOrigem_Destino",
      "IdCompanhia_Transporte",
      "IdPessoa",
      "IdTabela_Preco_Logistica",
      "Numero",
      "Modalidade",
      "Tipo_Operacao",
      "Tipo_Tarifario",
      "Tipo_Pessoa",
      "Data_Validade",
      "Observacao",
      "Tarifario_Nivel",
      "Data_Inicio_Vigencia"
    ]
  },
  {
    "tabela": "mov_Tarifario_Taxa",
    "colunas": [
      "IdTarifario_Taxa",
      "IdTarifario_Origem_Destino",
      "IdTaxa_Logistica",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "IdEquipamento_Maritimo",
      "IdFaixa_Peso_Cobranca",
      "IdTaxa_Logistica_Pagamento",
      "IdAgrup_Equipamento_Maritimo",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Valor_Pagamento_Minimo",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Minimo",
      "Valor_Recebimento_Unitario",
      "Observacao",
      "Tipo_Carga",
      "Bloquear_Recebimento",
      "Tipo_Valor_Recebimento"
    ]
  },
  {
    "tabela": "mov_Tarifario_Terrestre",
    "colunas": [
      "IdTarifario_Terrestre",
      "IdTransportadora",
      "IdOrigem",
      "IdDestino",
      "Data_Inicio_Vigencia",
      "Data_Termino_Vigencia",
      "Observacao",
      "Transportadora_Frete_Principal",
      "Remarks",
      "Transit_Time"
    ]
  },
  {
    "tabela": "mov_Tarifario_Terrestre_Faixa_Peso",
    "colunas": [
      "IdTarifario_Terrestre_Taxa",
      "IdFaixa_Peso_Cobranca",
      "IdTarifario_Terrestr_Faixa_Peso",
      "Valor_Pagamento_Unitario",
      "Valor_Recebimento_Unitario",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tarifario_Terrestre_Taxa",
    "colunas": [
      "IdTarifario_Terrestre_Taxa",
      "IdTarifario_Terrestre",
      "IdTaxa_Logistica",
      "IdMoeda_Pagamento",
      "IdMoeda_Recebimento",
      "IdEquipamento_Maritimo",
      "IdAgrup_Equipamento_Maritimo",
      "Tipo_Pagamento",
      "Tipo_Recebimento",
      "Valor_Pagamento_Unitario",
      "Valor_Pagamento_Minimo",
      "Valor_Recebimento_Unitario",
      "Valor_Recebimento_Minimo",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tracking_Carga",
    "colunas": [
      "IdTracking_Carga",
      "IdLogistica_Master",
      "IdUsuario_Ativacao",
      "Tracking_ID",
      "Modalidade",
      "Referencia_Tipo",
      "Referencia",
      "Companhia_Transporte_Sigla",
      "Numero_Container_Master",
      "Situacao",
      "Data_Criacao",
      "Data_Ultima_Alteracao",
      "Hash",
      "Json",
      "Observacao",
      "Corrente",
      "Ambiente",
      "Ultimo_Processamento_Data",
      "Ultimo_Processamento_Situacao",
      "Ultimo_Processamento_Detalhes",
      "Atualizacao_Automatica",
      "Detalhes"
    ]
  },
  {
    "tabela": "mov_Tracking_Carga_Container",
    "colunas": [
      "IdTracking_Carga_Container",
      "IdTracking_Carga",
      "Numero",
      "Data_Gate_In",
      "Data_Gate_Out",
      "Data_Retirada_Vazio",
      "Data_Devolucao_Vazio",
      "Observacao",
      "Previsao_Gate_In",
      "Previsao_Gate_Out",
      "Previsao_Retirada_Vazio",
      "Previsao_Devolucao_Vazio"
    ]
  },
  {
    "tabela": "mov_Tracking_Carga_Evento",
    "colunas": [
      "IdTracking_Carga_Evento",
      "IdTracking_Carga",
      "IdOrigem_Destino",
      "Evento_Descricao",
      "Tipo_Evento",
      "Data_Efetiva",
      "Data_Prevista_Original",
      "Data_Prevista",
      "Local_Identificador",
      "Local_Nome",
      "Local_Latitude",
      "Local_Longitude",
      "Veiculo_Identificador",
      "Veiculo_Nome",
      "Veiculo_Tipo",
      "Viagem_Numero",
      "Sequencia",
      "Corrente",
      "Evento_Ocorreu",
      "Atrasado",
      "Observacao",
      "Numero_Container"
    ]
  },
  {
    "tabela": "mov_Tracking_Carga_Historico",
    "colunas": [
      "IdTracking_Carga_Historico",
      "IdTracking_Carga",
      "IdTracking_Carga_Evento",
      "IdOrigem_Destino",
      "Data",
      "Acao",
      "Evento_Descricao",
      "Tipo_Evento",
      "Data_Efetiva",
      "Data_Prevista_Original",
      "Data_Prevista",
      "Local_Identificador",
      "Local_Nome",
      "Local_Latitude",
      "Local_Longitude",
      "Veiculo_Identificador",
      "Veiculo_Nome",
      "Veiculo_Tipo",
      "Viagem_Numero",
      "Sequencia",
      "Observacao",
      "Numero_Container"
    ]
  },
  {
    "tabela": "mov_Tracking_Carga_Viagem",
    "colunas": [
      "IdTracking_Carga_Viagem",
      "IdTracking_Carga",
      "IdOrigem",
      "IdDestino",
      "IdLogistica_Viagem",
      "Origem_Locode",
      "Destino_Locode",
      "Embarque_Previsto_Original",
      "Embarque_Data_Prevista",
      "Embarque_Data_Efetiva",
      "Embarque_Atrasado",
      "Desembarque_Previsto_Original",
      "Desembarque_Data_Prevista",
      "Desembarque_Data_Efetiva",
      "Desembarque_Atrasado",
      "Veiculo_Identificador",
      "Veiculo_Nome",
      "Veiculo_Tipo",
      "Viagem_Numero",
      "Sequencia",
      "Transbordo",
      "Viagem_Ocorreu",
      "Observacao",
      "Ignorar_Atualizacao_Processo",
      "Origem_Descricao",
      "Destino_Descricao"
    ]
  },
  {
    "tabela": "mov_Tracking_Error_Message",
    "colunas": [
      "IdTracking_Error_Message",
      "IdTracking_Header",
      "Number",
      "Message",
      "Message_Type",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tracking_Header",
    "colunas": [
      "IdTracking_Header",
      "Response",
      "Reference",
      "Status",
      "Total",
      "Pending",
      "Processed",
      "Fail",
      "Date_Creation",
      "Date_Update",
      "Main_Message",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Tracking_Process_Container",
    "colunas": [
      "IdTracking_Process_Container",
      "IdTracking_Header",
      "IdLogistica_House",
      "IdLogistica_Maritima_Container",
      "IdLogistica_Maritima_Transbordo",
      "IdLogistica_Aerea_Escala",
      "IdCompanhia_Transporte",
      "IdMensagem_Enviada",
      "IdAtividade_Concluida",
      "Numero_Processo",
      "Numero_Container",
      "Cod_Transp",
      "TRKNG",
      "Local",
      "Status_Container",
      "Status_Processamento",
      "Data_Criacao",
      "Data_Tracking",
      "Data_Processamento",
      "Data_Atualizada",
      "Erro_Processamento",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Transferencia_Financeira",
    "colunas": [
      "IdTransferencia_Financeira",
      "IdResponsavel",
      "IdConta_Origem",
      "IdConta_Destino",
      "IdTipo_Transacao",
      "IdMovimentacao_Debito",
      "IdMovimentacao_Credito",
      "IdEmpresa_Sistema",
      "IdPessoa",
      "IdMoeda_Origem",
      "IdMoeda_Destino",
      "Numero",
      "Data",
      "Valor_Origem",
      "Fator_Conversao",
      "Valor_Destino",
      "Estornada",
      "Observacao",
      "Historico_Resumo",
      "Historico",
      "Referencia"
    ]
  },
  {
    "tabela": "mov_Transferencia_Financeira_Categoria",
    "colunas": [
      "IdTransferencia_Categoria",
      "IdTransferencia_Financeira",
      "IdCategoria_Financeira",
      "IdCategoria_Debito",
      "IdCategoria_Credito",
      "Tipo_Custo",
      "Valor_Origem",
      "Valor_Destino",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Transferencia_Financeira_Custo",
    "colunas": [
      "IdTransferencia_Custo",
      "IdTransferencia_Categoria",
      "IdCentro_Custo",
      "IdCentro_Custo_Debito",
      "IdCentro_Custo_Credito",
      "Valor_Origem",
      "Valor_Destino",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_VGM",
    "colunas": [
      "IdVGM",
      "Numero",
      "Responsavel",
      "Tipo_Documento",
      "Numero_Documento",
      "Data_Envio",
      "Data_Recebimento",
      "Observacao",
      "Dados_Webbl"
    ]
  },
  {
    "tabela": "mov_VGM_Container",
    "colunas": [
      "IdVGM_Container",
      "IdVGM",
      "IdLogistica_Maritima_Container",
      "Metodo",
      "Peso_Carga",
      "Peso_Total",
      "Unidade_Medida",
      "Data_Verificacao",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Viagem_Navio",
    "colunas": [
      "IdViagem_Navio",
      "IdNavio",
      "IdPorto",
      "IdArmador_Principal",
      "Numero",
      "Observacao",
      "Data_Previsao_Chegada",
      "Data_Previsao_Embarque",
      "Data_Embarque",
      "Situacao",
      "Data_Chegada",
      "Espaco_Alocado",
      "Espaco_Utilizado"
    ]
  },
  {
    "tabela": "mov_Viagem_Navio_Parada",
    "colunas": [
      "IdViagem_Navio_Parada",
      "IdPorto",
      "Data_Chegada",
      "Data_Partida",
      "Observacao"
    ]
  },
  {
    "tabela": "mov_Viagem_Navio_Prazo",
    "colunas": [
      "IdViagem_Navio_Prazo",
      "IdViagem_Navio",
      "IdArmador",
      "Prazo_1",
      "Prazo_2",
      "Prazo_3",
      "Prazo_4",
      "Prazo_5",
      "Prazo_6",
      "Prazo_7",
      "Prazo_8",
      "Prazo_9",
      "Prazo_10",
      "Prazo_11",
      "Prazo_12",
      "Observacao"
    ]
  },
  {
    "tabela": "sys_Arquivo",
    "colunas": [
      "IdArquivo",
      "Nome",
      "Dados",
      "Hash"
    ]
  },
  {
    "tabela": "sys_Campo_Incremento",
    "colunas": [
      "IdCampo_Incremento",
      "Divisao",
      "Codigo"
    ]
  },
  {
    "tabela": "sys_Chave_Modulo",
    "colunas": [
      "IdChave_Servidor",
      "IdModulo",
      "Dados"
    ]
  },
  {
    "tabela": "sys_Chave_Servidor",
    "colunas": [
      "IdChave_Servidor",
      "Nome",
      "Dados"
    ]
  },
  {
    "tabela": "sys_Consulta",
    "colunas": [
      "IdConsulta",
      "Descricao",
      "Caminho",
      "Dados"
    ]
  },
  {
    "tabela": "sys_Consulta_Usuario",
    "colunas": [
      "IdConsulta",
      "IdUsuario",
      "Permissao_Imprimir",
      "Permissao_Exportar"
    ]
  },
  {
    "tabela": "sys_Empresa_Sistema",
    "colunas": [
      "IdEmpresa_Sistema",
      "Nome",
      "Timbrado_Retrato",
      "Timbrado_Paisagem",
      "Ativo"
    ]
  },
  {
    "tabela": "sys_Log",
    "colunas": [
      "IdUsuario",
      "Data",
      "Descricao",
      "Referencia",
      "Motivo",
      "Ativo"
    ]
  },
  {
    "tabela": "sys_Log_Tabela",
    "colunas": [
      "IdUsuario",
      "Data_Inicio",
      "Data_Termino",
      "Dados_Log",
      "xml"
    ]
  },
  {
    "tabela": "sys_Modulo",
    "colunas": [
      "IdModulo",
      "Identificacao",
      "Nome",
      "Descricao",
      "Modulo",
      "Versao",
      "Data_Instalacao",
      "Instalado"
    ]
  },
  {
    "tabela": "sys_Modulo_Arquivo",
    "colunas": [
      "IdModulo",
      "IdArquivo"
    ]
  },
  {
    "tabela": "sys_Modulo_Usuario",
    "colunas": [
      "IdModulo",
      "IdUsuario"
    ]
  },
  {
    "tabela": "sys_Numeracao",
    "colunas": [
      "IdNumeracao",
      "IdEmpresa_Sistema",
      "Chave",
      "Campo",
      "Opcao_Zeramento",
      "Mascara",
      "Quantidade_Digitos"
    ]
  },
  {
    "tabela": "sys_Numeracao_Item",
    "colunas": [
      "IdNumeracao_Item",
      "IdNumeracao",
      "Numero",
      "Dia",
      "Mes",
      "Ano"
    ]
  },
  {
    "tabela": "sys_Papel",
    "colunas": [
      "IdPapel",
      "Nome"
    ]
  },
  {
    "tabela": "sys_Papel_Membro",
    "colunas": [
      "IdPapel_Membro",
      "IdPapel_Superior",
      "IdUsuario",
      "IdPapel"
    ]
  },
  {
    "tabela": "sys_Parametro",
    "colunas": [
      "IdParametro",
      "IdSistema",
      "Dados"
    ]
  },
  {
    "tabela": "sys_Permissao_Campo",
    "colunas": [
      "IdPapel",
      "Divisao",
      "Campo",
      "Permissao",
      "Filtro",
      "xml"
    ]
  },
  {
    "tabela": "sys_Permissao_Tabela",
    "colunas": [
      "IdTabela",
      "IdPapel",
      "Ao_Visualizar",
      "Ao_Inserir",
      "Ao_Excluir",
      "Ao_Atualizar",
      "Ao_Imprimir",
      "Ao_Exportar",
      "Ao_Arquivar"
    ]
  },
  {
    "tabela": "sys_Persistencia",
    "colunas": [
      "IdPersistencia",
      "IdUsuario",
      "Dados"
    ]
  },
  {
    "tabela": "sys_Relatorio",
    "colunas": [
      "IdRelatorio",
      "Nome",
      "Relacao",
      "Descricao",
      "Montagem",
      "Dados",
      "Padrao",
      "Bloqueado"
    ]
  },
  {
    "tabela": "sys_Senha_Controle",
    "colunas": [
      "IdSenha_Controle",
      "Nome",
      "Senha",
      "Tipo"
    ]
  },
  {
    "tabela": "sys_Tabela",
    "colunas": [
      "IdTabela",
      "Nome",
      "Descricao"
    ]
  },
  {
    "tabela": "sys_Usuario",
    "colunas": [
      "IdUsuario",
      "Nome",
      "Senha",
      "Data_Criacao",
      "Ativo"
    ]
  },
  {
    "tabela": "vis_Acompanhamento_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdAcompanhamento",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Texto",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Agencia_Maritima_Aerea",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Tipo_Agencia",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Agente_Carga",
    "colunas": [
      "IdPessoa",
      "IdMoeda_Comissao",
      "IdAssociacao_Internacional",
      "IdAssociacao_Internacional_Temp",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Tipo_Comissao",
      "Valor_Comissao_1",
      "Valor_Minimo_Comissao",
      "Tipo_Valor_Minimo",
      "Base_Calculo_1",
      "Acesso_Restrito",
      "Valor_Comissao_2",
      "Base_Calculo_2",
      "Carta_Apontamento",
      "Validade_Carta_Apontamento",
      "Contrato_Agenciamento",
      "Validade_Contrato_Agenciamento",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Tipo_Operacao_Exportacao",
      "Tipo_Operacao_Importacao",
      "Tipo_Operacao_Nacional",
      "Consignee_Master",
      "Notify_Master",
      "Shipper_Master",
      "Remarks_Master",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Correspondencia_EDI",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "VAT_Number",
      "Motivo_Nao_Preenchimento_NIF",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Instrucoes"
    ]
  },
  {
    "tabela": "vis_Agente_Desconsolidador",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Air_Waybill",
    "colunas": [
      "IdConhecimento_Embarque",
      "IdLogistica_House",
      "IdConhecimento_Master",
      "IdEmpresa_Sistema",
      "IdAirport_Departure",
      "IdTo_Airport_1",
      "IdBy_First_Carrier",
      "IdTo_Airport_2",
      "IdBy_Carrier_2",
      "IdTo_Airport_3",
      "IdBy_Carrier_3",
      "IdAirport_Destination",
      "IdRecinto_Alfandegado_Destino",
      "IdImportador",
      "IdExportador",
      "IdNotify",
      "IdConsignatario",
      "IdAgente_Carga",
      "IdAgente_Origem",
      "Numero",
      "AWB_Master_Number",
      "Shipper_Name_Address",
      "Shipper_Account_Number",
      "Consignee_Name_Address",
      "Consignee_Account_Number",
      "Agent_Name_City",
      "Agent_IATA_Code",
      "Agent_Account_Number",
      "Accouting_Information",
      "Currency",
      "Payment_Terms_Charges",
      "Payment_Terms_Insurance",
      "Payment_Terms_Other",
      "Declared_Value_Carriage",
      "Declared_Value_Customs",
      "Flight_Number",
      "Flight_Date",
      "Flight_Number_2",
      "Flight_Date_2",
      "Amout_Insurance",
      "Handling_Information",
      "Number_Of_Pieces",
      "Gross_Weight",
      "Total",
      "Other_Charges",
      "Weight_Charge_Prepaid",
      "Weight_Charge_Collect",
      "Valuation_Charge_Prepaid",
      "Valuation_Charge_Collect",
      "Tax_Prepaid",
      "Tax_Collect",
      "Total_Other_Agent_Prepaid",
      "Total_Other_Agent_Collect",
      "Total_Other_Carrier_Prepaid",
      "Total_Other_Carrier_Collect",
      "Total_Prepaid",
      "Total_Collect",
      "Currency_Convertion",
      "Charges_Destination_Currency",
      "EX_Rate",
      "Currency_Convertion_Rates",
      "Charges_Destination",
      "Total_Collect_Charges",
      "Signature_Shipper_Agent",
      "Executed_On",
      "Executed_At",
      "Signature_Carrier_Agent",
      "Data",
      "Numero_Embarque",
      "Numero_Desconsolidacao",
      "Data_Desconsolidacao",
      "Tipo_Conhecimento",
      "Tipo_Operacao",
      "Observacao",
      "Update_Contacts",
      "Update_Values_Goods",
      "Update_Nature_Quantity_Goods",
      "Possui_Madeira",
      "Description_Of_Goods",
      "Armazenagem_Master",
      "RUC",
      "Weight_Measurement_Unit",
      "Arrival_Date",
      "Total_Volume",
      "CctId",
      "uniqueidentifie"
    ]
  },
  {
    "tabela": "vis_Associacao_Internacional",
    "colunas": [
      "IdPessoa",
      "IdMoeda_Comissao",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo_Comissao",
      "Base_Calculo_Comissao",
      "Acesso_Restrito",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "VAT_Number",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Banco_Agencia",
    "colunas": [
      "IdPessoa",
      "IdBanco",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Numero_Agencia",
      "Digito_Verificador",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Bill_Lading",
    "colunas": [
      "IdConhecimento_Embarque",
      "IdLogistica_House",
      "IdConhecimento_Master",
      "IdEmpresa_Sistema",
      "IdImportador",
      "IdExportador",
      "IdNotify",
      "IdDespachante_Aduaneiro",
      "Port_Of_Loading",
      "Port_Of_Discharge",
      "Ocean_Vessel",
      "Voyage_Number",
      "Booking_No",
      "Shipper_Exporter",
      "Originals",
      "Originals_Other_Description",
      "Consignee",
      "Notify",
      "Pre_Carriage_By",
      "Place_Of_Receipt",
      "Place_Of_Delivery",
      "Marks_And_Numbers",
      "Description_Of_Packages",
      "Number_Of_Containers",
      "Number_Of_Pieces",
      "Measurement",
      "Gross_Weight",
      "Net_Weight",
      "Number_Copy_BL",
      "Number_Original_BL",
      "Numero_Desconsolidacao",
      "Numero_Embarque",
      "Referencia_Externa",
      "Numero",
      "BL_Number_Master",
      "Place_Issue",
      "Purchase_Order",
      "As_Agent",
      "Also_Notify",
      "Bloqueado",
      "Impresso",
      "Data",
      "Data_Desconsolidacao",
      "Data_Envio_Cliente",
      "Data_Recebimento_Empresa",
      "Tipo_Conhecimento",
      "Shipper_CNPJ",
      "Observacao",
      "Wood_Package",
      "NCM_Description",
      "Consignee_NIF_CNPJ",
      "DUE",
      "RUC",
      "Dados_Webbl",
      "Tipo_Operacao"
    ]
  },
  {
    "tabela": "vis_Cliente",
    "colunas": [
      "IdPessoa",
      "IdFuncionario_Responsavel",
      "IdVendedor_Responsavel",
      "IdContrato_Pagamento",
      "IdIndicacao",
      "IdCliente_Classificacao",
      "IdEmpresa_Sistema",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdMoeda_Limite_Credito",
      "NIF",
      "Contribuinte_ICMS",
      "Cliente_Desde",
      "Cliente",
      "Importador",
      "Exportador",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Correspondencia_EDI",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "VAT_Number",
      "Motivo_Nao_Preenchimento_NIF",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Tipo_Cliente",
      "Encaminhado_Por",
      "Termino_Incidencia_Detention",
      "Aviso",
      "Sobrepor_Instrucoes_Cliente",
      "Ultima_Alteracao_Vendedor",
      "Valor_Limite_Credito"
    ]
  },
  {
    "tabela": "vis_Comexpert_Retorno_Mercante",
    "colunas": [
      "IdRetorno_Integracao",
      "IdUsuario_Processamento",
      "Codigo_Processo",
      "Referencia_Forwarder",
      "Numero_MBL",
      "Numero_CE_Master",
      "Porto_Chegada",
      "Data_Chegada",
      "Data_Desconsolidacao",
      "Data",
      "Data_Processamento",
      "Tipo",
      "Situacao",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Companhia_Transporte",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo_IATA",
      "Prefixo",
      "Sigla",
      "Tipo_Aerea",
      "Tipo_Maritima",
      "Tipo_Terrestre",
      "Tipo_Courier",
      "Disponibilizar_Tarifario",
      "Instrucao_Operacional",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "VAT_Number",
      "Motivo_Nao_Preenchimento_NIF",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Termino_Incidencia_Detention"
    ]
  },
  {
    "tabela": "vis_Conhecimento_Aereo_Nacional",
    "colunas": [
      "IdConhecimento_Embarque",
      "IdLogistica_House",
      "Numero",
      "Quantidade_Volumes",
      "Peso_Real",
      "Peso_Taxado",
      "Expedidor_Nome",
      "Expedidor_CNPJ",
      "Expedidor_Inscricao_Estadual",
      "Expedidor_Endereco",
      "Expedidor_Bairro",
      "Expedidor_CEP",
      "Expedidor_Cidade",
      "Expedidor_UF",
      "Expedidor_Fone",
      "Expedidor_Fax",
      "Req_Transporte",
      "Inscricao_Estadual",
      "CNPJ",
      "Valor_Declarado_Transporte",
      "Valor_Declarado_Suframa",
      "Origem",
      "Via",
      "Cidade_Destino",
      "Sigla_Cidade_Destino",
      "Descricao_Embalagens",
      "Trecho",
      "Tarifa_CL",
      "Tarifa_Codigo",
      "Tarifa_Valor_Kilo",
      "Frete_Nacional",
      "Natureza_Mercadoria",
      "Valor_Exp_Frete_Nacional",
      "Valor_Des_Frete_Nacional",
      "Valor_Exp_Adicional",
      "Valor_Des_Adicional",
      "Valor_Adicional_Codigo",
      "Valor_Exp_Terrestre_Origem",
      "Valor_Des_Terrestre_Origem",
      "Valor_Exp_Terrestre_Destino",
      "Valor_Des_Terrestre_Destino",
      "Valor_Exp_Terrestre_Redespacho",
      "Valor_Des_Terrestre_Redespacho",
      "Valor_Exp_Agente",
      "Valor_Des_Agente",
      "Valor_Exp_Transportador",
      "Valor_Des_Transportador",
      "Valor_Exp_Total",
      "Valor_Des_Total",
      "Descricao_Taxa_Agente",
      "Descricao_Taxa_Transportador",
      "Retirada_Aeroporto",
      "Expedidor_Numero_Cobranca",
      "Destinatario_Numero_Cobranca",
      "Local_Retirada",
      "Horario_Atendimento",
      "Telefone",
      "Total_Servico",
      "Base_Calculo",
      "Aliquota_ICMS",
      "Agente_Emissor",
      "Codigo_Dac",
      "Destinatario_Nome",
      "Destinatario_CNPJ",
      "Destinatario_Inscricao_Estadual",
      "Destinatario_Endereco",
      "Destinatario_Bairro",
      "Destinatario_CEP",
      "Destinatario_Cidade",
      "Destinatario_UF",
      "Destinatario_Fone",
      "Destinatario_Fax",
      "Local_Emissao",
      "Data_Emissao",
      "Hora_Emissao",
      "Data",
      "Observacoes",
      "Observacao_Fiscal",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Demurrage_Incidencia",
    "colunas": [
      "IdDemurrage_Incidencia",
      "IdDemurrage_Fechamento",
      "Tipo_Incidencia",
      "Periodo",
      "Data_Inicio",
      "Data_Termino",
      "Quantidade_Dias",
      "Valor_Unitario",
      "Valor_Total",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Despachante_Aduaneiro",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Numero_Matricula",
      "Webbl_User_Group_Id",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Empresa",
    "colunas": [
      "IdPessoa",
      "IdResponsavel_Legal",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "IdEmpresa_Sistema",
      "Identificacao_Portal_Governo",
      "Numero_Registro",
      "Orgao_Registro",
      "Utiliza_IPI",
      "Sigla",
      "Matriz",
      "Marca",
      "CST_PIS",
      "Tipo_Aliquota_PIS",
      "Aliquota_PIS",
      "Tipo_Aliquota_PIS_ST",
      "Aliquota_PIS_ST",
      "CST_COFINS",
      "Tipo_Aliquota_COFINS",
      "Aliquota_COFINS",
      "Tipo_Aliquota_COFINS_ST",
      "Aliquota_COFINS_ST",
      "Aliquota_CSLL",
      "Aliquota_INSS",
      "Aliquota_IR",
      "Inscricao_Estadual_ST",
      "CNAE_Fiscal",
      "Regime_Tributario",
      "Regime_Especial_Tributacao",
      "Incentivador_Cultural",
      "Nome",
      "Codigo",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Correspondencia_EDI",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Integracao_Cobranca_Ativa",
      "Integracao_Cobranca_Token",
      "Qualificador_Portal_Governo"
    ]
  },
  {
    "tabela": "vis_Exporta_EDIs",
    "colunas": [
      "Command"
    ]
  },
  {
    "tabela": "vis_Fabricante",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Fatura_Financeira_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdFatura_Financeira",
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Fatura_Financeira_CSS",
    "colunas": [
      "IdFatura_Financeira",
      "IdRegistro_Financeiro",
      "IdForma_Cobranca",
      "IdResponsavel_Titulo",
      "IdResponsavel_Conferencia",
      "IdResponsavel_Unificacao",
      "IdResponsavel_Cancelamento",
      "IdResponsavel_Cobranca",
      "IdResponsavel_Cobranca_Judic",
      "IdResponsavel_Negativacao",
      "IdResponsavel_Protesto",
      "IdResponsavel_Renegociacao",
      "IdRegistro_Unificador",
      "IdMarcador_Fatura_Financeira",
      "IdTipo_Transacao",
      "Numero",
      "Referencia_Externa",
      "Data",
      "Tipo",
      "Data_Vencimento",
      "Previsao_Pagamento",
      "Data_Pagamento",
      "Data_Conferencia",
      "Situacao",
      "Prioridade",
      "Natureza",
      "Valor",
      "Valor_Original",
      "Valor_Residual",
      "Total_Pago",
      "Total_Pago_Corrente",
      "Total_Multa",
      "Total_Juros",
      "Total_Acrescimo",
      "Total_Desconto",
      "Total_Abatimento",
      "Conferido",
      "Parcela",
      "Numero_Cobranca",
      "Em_Aberto",
      "Historico_Resumo",
      "Historico",
      "Fator_Unificacao",
      "Coligada",
      "Renegociada",
      "Data_Envio",
      "Data_Unificacao",
      "Data_Cancelamento",
      "Data_Cobranca",
      "Data_Cobranca_Judicial",
      "Data_Negativacao",
      "Data_Protesto",
      "Data_Renegociacao",
      "Numero_Nota_Fiscal",
      "Data_Nota_Fiscal",
      "Valor_Nota_Fiscal",
      "Observacao",
      "Ativo",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "vis_Fornecedor",
    "colunas": [
      "IdPessoa",
      "IdFornecedor_Pagamento",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Contribuinte_ICMS",
      "Regime_Tributario",
      "Nome",
      "Codigo",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Funcionario",
    "colunas": [
      "IdPessoa",
      "IdEmpresa",
      "IdUsuario_Correspondente",
      "IdCargo",
      "IdMoeda_Comissao",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Tipo_Comissao",
      "Comissao",
      "Data_Admissao",
      "Data_Vencimento_Ferias",
      "Data_Demissao",
      "Atividade_Complementar",
      "Nome",
      "Codigo",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "EMail_Pessoal",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Grupo_Envio_Mensagem_Logistica",
    "colunas": [
      "IdGrupo_Envio_Mensagem",
      "Modalidade_Aereo",
      "Modalidade_Maritimo",
      "Modalidade_Terrestre",
      "Tipo_Exportacao",
      "Tipo_Importacao",
      "Tipo_Nacional",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Codigo",
      "Nome",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Logistica_Aerea_House",
    "colunas": [
      "IdLogistica_House",
      "IdResponsavel_Validacao_Mantra",
      "IdLogistica_Master",
      "IdCliente",
      "IdImportador",
      "IdExportador",
      "IdNotify",
      "IdDespachante_Aduaneiro",
      "IdRepresentante",
      "IdRepresentante_Destino_Final",
      "IdVendedor",
      "IdIncoterm",
      "IdMercadoria",
      "IdMoeda_Mercadoria",
      "IdTransportadora_Origem",
      "IdTransportadora_Destino",
      "IdStatus_Processo_Logistico",
      "IdNivel_Servico_Aereo",
      "IdContrato_Frete",
      "IdOferta_Frete",
      "IdProcesso_Origem",
      "IdProcesso_Primeiro_Trecho",
      "IdProjeto_Atividade",
      "IdEmpresa_Sistema",
      "IdTipo_Processo",
      "IdIndicacao",
      "IdPais_Origem_Mercadoria",
      "IdPais_Destino_Mercadoria",
      "IdMotivo_Cancelamento_Processo",
      "IdLogistica_Seguro",
      "Peso_Taxado",
      "Mantra_Validado",
      "Data_Validacao_Mantra",
      "Situacao_CCT",
      "Numero_Processo",
      "Referencia_Interna",
      "Referencia_Externa",
      "Referencia_Cliente",
      "Senha_Fatura",
      "Encaminhado_Por",
      "Modalidade_Pagamento",
      "Local_Coleta",
      "Local_Coleta_Destino",
      "Local_Entrega_Origem",
      "Local_Entrega",
      "Local_Emissao_Outro",
      "Total_Conhecimentos",
      "Metros_Cubicos",
      "Tipo_Servico",
      "Tipo_Carga",
      "Modalidade_Coleta",
      "Modalidade_Entrega",
      "Tipo_Coleta_Entrega",
      "Tipo_Coleta_Entrega_Destino",
      "Tipo_Servico_Aereo",
      "Tipo_Projeto",
      "Canal_Liberacao",
      "Local_Emissao",
      "Trecho",
      "Comissao_Coleta",
      "Comissao_Entrega",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Quantidade_Invoices",
      "Valor_Mercadoria",
      "Importancia_Segurada",
      "Percentual_Seguro",
      "Numero_Invoices",
      "Numero_DI_RE",
      "Numero_LI_DDE",
      "Numero_Courrier",
      "Data_Abertura_Processo",
      "Data_Previsao_Prontidao_Carga",
      "Data_Prontidao_Carga",
      "Data_Previsao_Coleta",
      "Data_Previsao_Coleta_Destino",
      "Data_Coleta",
      "Data_Coleta_Destino",
      "Data_Previsao_Entrega_Origem",
      "Data_Previsao_Entrega",
      "Data_Entrega_Origem",
      "Data_Entrega",
      "Data_Recebimento_Local",
      "Data_Pagamento_Local",
      "Data_Acerto_Agente",
      "Data_Fechamento_Cambio",
      "Data_Auditado",
      "Data_Fechamento_Processo",
      "Data_Faturado",
      "Data_Liberado_Faturamento",
      "Data_Validade_Taxas",
      "Situacao_Agenciamento",
      "Situacao_Pagamento",
      "Situacao_Recebimento",
      "Situacao_Acerto_Agente",
      "Situacao_Demurrage",
      "Situacao_Pre_Finalizado",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Consolidado_House",
      "Seguro",
      "Carga_Perigosa",
      "Instrucoes_Operacional",
      "Instrucoes_Financeiro",
      "Instrucoes_Cliente",
      "Instrucoes_Agente",
      "Instrucoes_Operacional_Cliente",
      "NCM_Descricao",
      "Ordem_Compra",
      "Parecer_Auditoria",
      "Shipper_Exporter",
      "Consignee",
      "Notify",
      "Conhecimentos",
      "Numeros_Embarque",
      "Observacao",
      "Tipo_Declaracao",
      "Tipo_Rota",
      "Rota",
      "Data_LI_DDE",
      "Data_DI_RE",
      "Natureza_Exportacao",
      "Data_Averbacao",
      "Tipo_Conhecimento_Embarque",
      "Numeros_RVS_RAS",
      "Numeros_RF_RP",
      "Quantidade_UN_Nacoes_Unidas",
      "Faturas_Em_Aberto",
      "Data_Cancelamento",
      "Detalhes_Cancelamento",
      "Remarks",
      "Remarks_Terrestre",
      "Remarks_Free_Time"
    ]
  },
  {
    "tabela": "vis_Logistica_Aerea_Master",
    "colunas": [
      "IdLogistica_Master",
      "IdCompanhia_Transporte",
      "IdAgencia_Maritima_Aerea",
      "IdAgente_Origem",
      "IdAgente_Destino",
      "IdAgente_Master",
      "IdLocal_Recebimento",
      "IdOrigem",
      "IdDestino",
      "IdDestino_Final",
      "IdMoeda_Processo",
      "IdEmpresa_Sistema",
      "Numero_Voo",
      "Peso_Taxado",
      "Numero_Processo",
      "Numero_Conhecimento",
      "Numero_Reserva",
      "Modalidade_Pagamento",
      "Modalidade_Processo",
      "Tipo_Operacao",
      "Situacao_Embarque",
      "Data_Processo",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Embarque",
      "Data_Desembarque",
      "Data_Pagamento_Local",
      "Transit_Time",
      "Transit_Time_Maximo",
      "Total_Conhecimentos",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Instrucoes_Origem",
      "Instrucoes_Destino",
      "Master_Direto",
      "Local_Emissao",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Logistica_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdLogistica_House",
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Data_Criacao",
      "Data_Alteracao",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Logistica_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdLogistica_Master",
      "IdLogistica_House",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Texto",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Logistica_Campo_Livre_Consulta",
    "colunas": [
      "IdCampo_Livre",
      "IdLogistica_House",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Logistica_Comissao",
    "colunas": [
      "IdLogistica_Comissao",
      "IdLogistica_House",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdTaxa_Logistica_Exibicao",
      "IdMoeda",
      "IdTaxa_Referente",
      "Tipo_Comissionado",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Valor_Minimo",
      "Percentual_Base_Calculo",
      "Tipo_Base_Calculo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Logistica_Contato",
    "colunas": [
      "IdLogistica_Contato",
      "IdLogistica_Master",
      "IdLogistica_House",
      "IdPessoa_Contato",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Logistica_Fatura",
    "colunas": [
      "IdRegistro_Financeiro",
      "IdLogistica_Master",
      "IdLogistica_House",
      "IdConversao_Taxas",
      "IdIndicador_Logistica_Fatura",
      "IdResponsavel_Faturamento",
      "IdTipo_Transacao",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdCondicao_Pagamento",
      "IdForma_Cobranca",
      "IdForma_Pagamento",
      "IdConta_Corrente",
      "IdMoeda",
      "IdConversao_Moeda",
      "IdAtraves_De",
      "IdModelo_Registro_Financeiro",
      "IdEmpresa_Sistema",
      "IdPessoa_Referencia",
      "IdGrupo_Financeiro",
      "IdChave_Externa",
      "IdSetor",
      "Tipo_Servico",
      "Tipo_Fatura",
      "Local_Cobranca",
      "Opcao_Data_Referencia",
      "Dias_Tolerancia",
      "Margem_Acrescimo_Cambio",
      "Opcao_Data_Conversao",
      "Data_Conversao",
      "Data_Faturamento",
      "Data_Primeira_Finalizacao",
      "Fatura_Especifica",
      "Conferido_Operacional",
      "Modalidade_Pagamento",
      "Utilizar_Contrato",
      "Data",
      "Data_Referencia",
      "Numero",
      "Referencia",
      "Referencia_Externa",
      "Natureza",
      "Subtotal",
      "Acrescimo",
      "Tipo_Acrescimo",
      "Abatimento",
      "Tipo_Abatimento",
      "Desconto_Incondicional",
      "Tipo_Desconto_Incondicional",
      "Desconto_Condicional",
      "Tipo_Desconto_Condicional",
      "Dias_Desconto_Condicional",
      "Multa",
      "Tipo_Multa",
      "Juros",
      "Periodo_Juros",
      "Tipo_Juros",
      "Tolerancia_Multa_Juros",
      "Valor_Total",
      "Situacao",
      "Valor_Original",
      "Registro_Unificador",
      "Origem_Lancamento",
      "Historico_Resumo",
      "Historico",
      "Instrucao",
      "Atalho",
      "Dados_Registro",
      "xml",
      "Observacao",
      "Ativo",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "vis_Logistica_Fatura_Totais",
    "colunas": [
      "IdRegistro_Financeiro",
      "IdLogistica_Master",
      "IdLogistica_House",
      "IdConversao_Taxas",
      "IdResponsavel_Faturamento",
      "IdTipo_Transacao",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdCondicao_Pagamento",
      "IdForma_Cobranca",
      "IdForma_Pagamento",
      "IdConta_Corrente",
      "IdMoeda",
      "IdConversao_Moeda",
      "IdEmpresa_Sistema",
      "IdMoeda_Processo",
      "IdMoeda_Corrente",
      "Tipo_Fatura",
      "Local_Cobranca",
      "Opcao_Data_Referencia",
      "Dias_Tolerancia",
      "Opcao_Data_Conversao",
      "Data_Conversao",
      "Data_Faturamento",
      "Data_Primeira_Finalizacao",
      "Margem_Acrescimo_Cambio",
      "Conferido_Operacional",
      "Modalidade_Pagamento",
      "Data",
      "Data_Referencia",
      "Numero",
      "Referencia",
      "Referencia_Externa",
      "Natureza",
      "Subtotal",
      "Acrescimo",
      "Tipo_Acrescimo",
      "Abatimento",
      "Tipo_Abatimento",
      "Desconto_Incondicional",
      "Tipo_Desconto_Incondicional",
      "Desconto_Condicional",
      "Tipo_Desconto_Condicional",
      "Dias_Desconto_Condicional",
      "Multa",
      "Tipo_Multa",
      "Juros",
      "Periodo_Juros",
      "Tipo_Juros",
      "Tolerancia_Multa_Juros",
      "Valor_Total",
      "Situacao",
      "Valor_Original",
      "Historico",
      "Instrucao",
      "Atalho",
      "Observacao",
      "Valor_Estimado_Fatura",
      "numeric",
      "Valor_Efetivo_Fatura",
      "Valor_Residual_Fatura",
      "Moeda_Processo",
      "Valor_Estimado_Processo",
      "Valor_Efetivo_Processo",
      "Valor_Residual_Processo",
      "Valor_Momento_Processo",
      "Moeda_Corrente",
      "Valor_Estimado_Corrente",
      "Valor_Efetivo_Corrente",
      "Valor_Residual_Corrente",
      "Valor_Momento_Corrente",
      "Data_Pagamento",
      "Fator_Estimado_Processo",
      "Fator_Estimado_Corrente"
    ]
  },
  {
    "tabela": "vis_Logistica_Maritima_House",
    "colunas": [
      "IdLogistica_House",
      "IdLogistica_Master",
      "IdCliente",
      "IdImportador",
      "IdExportador",
      "IdNotify",
      "IdDespachante_Aduaneiro",
      "IdRepresentante",
      "IdRepresentante_Destino_Final",
      "IdVendedor",
      "IdIncoterm",
      "IdMercadoria",
      "IdMoeda_Mercadoria",
      "IdStatus_Processo_Logistico",
      "IdContrato_Frete",
      "IdOferta_Frete",
      "IdProcesso_Origem",
      "IdProcesso_Primeiro_Trecho",
      "IdTransportadora_Origem",
      "IdTransportadora_Destino",
      "IdProjeto_Atividade",
      "IdEmpresa_Sistema",
      "IdTipo_Processo",
      "IdIndicacao",
      "IdPais_Origem_Mercadoria",
      "IdPais_Destino_Mercadoria",
      "Total_Container_20",
      "Total_Container_40",
      "Containers",
      "Equipamentos",
      "Total_TEUS",
      "Numero_Processo",
      "Referencia_Interna",
      "Referencia_Externa",
      "Referencia_Cliente",
      "Senha_Fatura",
      "Encaminhado_Por",
      "Modalidade_Pagamento",
      "Local_Coleta",
      "Local_Coleta_Destino",
      "Local_Entrega_Origem",
      "Local_Entrega",
      "Local_Emissao_Outro",
      "Total_Conhecimentos",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Data_Abertura_Processo",
      "Data_Previsao_Prontidao_Carga",
      "Data_Prontidao_Carga",
      "Data_Previsao_Coleta",
      "Data_Previsao_Coleta_Destino",
      "Data_Coleta",
      "Data_Coleta_Destino",
      "Data_Previsao_Entrega_Origem",
      "Data_Previsao_Entrega",
      "Data_Entrega_Origem",
      "Data_Entrega",
      "Data_Recebimento_Local",
      "Data_Pagamento_Local",
      "Data_Acerto_Agente",
      "Data_Fechamento_Cambio",
      "Data_Auditado",
      "Data_Faturado",
      "Data_Liberado_Faturamento",
      "Data_Fechamento_Processo",
      "Data_Validade_Taxas",
      "Quantidade_Invoices",
      "Tipo_Servico",
      "Tipo_Coleta_Entrega",
      "Tipo_Coleta_Entrega_Destino",
      "Tipo_Carga",
      "Tipo_Projeto",
      "Local_Emissao",
      "Canal_Liberacao",
      "Trecho",
      "Numero_Invoices",
      "Numero_DI_RE",
      "Numero_LI_DDE",
      "Numero_Courrier",
      "Valor_Mercadoria",
      "Importancia_Segurada",
      "Percentual_Seguro",
      "Situacao_Agenciamento",
      "Situacao_Pagamento",
      "Situacao_Recebimento",
      "Situacao_Acerto_Agente",
      "Situacao_Demurrage",
      "Situacao_Pre_Finalizado",
      "Consolidado_House",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Seguro",
      "Carga_Perigosa",
      "Instrucoes_Operacional",
      "Instrucoes_Financeiro",
      "Instrucoes_Cliente",
      "Instrucoes_Agente",
      "NCM_Descricao",
      "Ordem_Compra",
      "Parecer_Auditoria",
      "Conhecimentos",
      "Numeros_Embarque",
      "Observacao",
      "Shipper_Exporter",
      "Consignee",
      "Notify",
      "Tipo_Declaracao",
      "Data_LI_DDE",
      "Data_DI_RE",
      "Natureza_Exportacao",
      "Data_Averbacao",
      "Tipo_Conhecimento_Embarque",
      "Quantidade_UN_Nacoes_Unidas",
      "Faturas_Em_Aberto"
    ]
  },
  {
    "tabela": "vis_Logistica_Maritima_Master",
    "colunas": [
      "IdLogistica_Master",
      "IdNavio",
      "IdViagem_Navio",
      "IdTerminal_Atracacao",
      "IdTerminal_Retirada_Redestinar",
      "IdEmpresa_Sistema",
      "IdCompanhia_Transporte",
      "IdAgencia_Maritima_Aerea",
      "IdAgente_Origem",
      "IdAgente_Destino",
      "IdAgente_Master",
      "IdLocal_Recebimento",
      "IdOrigem",
      "IdDestino",
      "IdDestino_Final",
      "IdMoeda_Processo",
      "Consolidacao",
      "Total_Container_20",
      "Total_Container_40",
      "Total_TEUS",
      "Numero_CE",
      "Data_CE",
      "Data_Previsao_Chegada_Navio",
      "Data_Chegada_Navio",
      "Situacao_Mercante",
      "Data_Desconsolidacao_Mercante",
      "Forma_Controle_Rota",
      "Numero_Processo",
      "Numero_Conhecimento",
      "Numero_Reserva",
      "Modalidade_Pagamento",
      "Modalidade_Processo",
      "Tipo_Operacao",
      "Situacao_Embarque",
      "Data_Processo",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Embarque",
      "Data_Desembarque",
      "Data_Pagamento_Local",
      "Transit_Time",
      "Transit_Time_Maximo",
      "Total_Conhecimentos",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Instrucoes_Origem",
      "Instrucoes_Destino",
      "Master_Direto",
      "Local_Emissao",
      "Observacao",
      "Situacao_Mercante_Master",
      "Situacao_Booking_INTTRA",
      "Situacao_SI_INTTRA"
    ]
  },
  {
    "tabela": "vis_Logistica_Prazo",
    "colunas": [
      "IdCampo_Livre",
      "IdLogistica_Master",
      "IdLogistica_House",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Texto",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Logistica_Terrestre_House",
    "colunas": [
      "IdLogistica_House",
      "IdLogistica_Master",
      "IdCliente",
      "IdImportador",
      "IdExportador",
      "IdNotify",
      "IdDespachante_Aduaneiro",
      "IdRepresentante",
      "IdVendedor",
      "IdIncoterm",
      "IdMercadoria",
      "IdMoeda_Mercadoria",
      "IdTransportadora_Origem",
      "IdTransportadora_Destino",
      "IdStatus_Processo_Logistico",
      "IdContrato_Frete",
      "IdOferta_Frete",
      "IdProcesso_Origem",
      "IdProcesso_Primeiro_Trecho",
      "IdProjeto_Atividade",
      "IdEmpresa_Sistema",
      "IdTipo_Processo",
      "IdIndicacao",
      "IdPais_Origem_Mercadoria",
      "IdPais_Destino_Mercadoria",
      "Numero_Coleta",
      "Numero_CTRC",
      "Total_Carretas",
      "Numero_Processo",
      "Numero_DI_RE",
      "Numero_LI_DDE",
      "Numero_Courrier",
      "Numero_Invoices",
      "Referencia_Interna",
      "Referencia_Externa",
      "Referencia_Cliente",
      "Senha_Fatura",
      "Consolidado_House",
      "Encaminhado_Por",
      "Modalidade_Pagamento",
      "Local_Coleta",
      "Local_Coleta_Destino",
      "Local_Entrega_Origem",
      "Local_Entrega",
      "Local_Emissao_Outro",
      "Total_Conhecimentos",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Valor_Mercadoria",
      "Importancia_Segurada",
      "Percentual_Seguro",
      "Data_Abertura_Processo",
      "Data_Previsao_Prontidao_Carga",
      "Data_Prontidao_Carga",
      "Data_Liberado_Faturamento",
      "Data_Faturado",
      "Data_Recebimento_Local",
      "Data_Pagamento_Local",
      "Data_Acerto_Agente",
      "Data_Fechamento_Cambio",
      "Data_Auditado",
      "Data_Fechamento_Processo",
      "Data_Previsao_Coleta",
      "Data_Previsao_Coleta_Destino",
      "Data_Coleta",
      "Data_Coleta_Destino",
      "Data_Previsao_Entrega_Origem",
      "Data_Previsao_Entrega",
      "Data_Entrega_Origem",
      "Data_Entrega",
      "Data_Validade_Taxas",
      "Quantidade_Invoices",
      "Tipo_Servico",
      "Tipo_Carga",
      "Tipo_Coleta_Entrega",
      "Tipo_Coleta_Entrega_Destino",
      "Tipo_Projeto",
      "Canal_Liberacao",
      "Trecho",
      "Local_Emissao",
      "Situacao_Agenciamento",
      "Situacao_Pagamento",
      "Situacao_Recebimento",
      "Situacao_Acerto_Agente",
      "Situacao_Demurrage",
      "Situacao_Pre_Finalizado",
      "Agenciamento_Carga",
      "Desembaraco_Aduaneiro",
      "Demurrage_Detention",
      "Seguro",
      "Carga_Perigosa",
      "NCM_Descricao",
      "Ordem_Compra",
      "Instrucoes_Operacional",
      "Instrucoes_Financeiro",
      "Instrucoes_Cliente",
      "Instrucoes_Agente",
      "Parecer_Auditoria",
      "Shipper_Exporter",
      "Consignee",
      "Notify",
      "Conhecimentos",
      "Numeros_Embarque",
      "Observacao",
      "Tipo_Declaracao",
      "Data_LI_DDE",
      "Data_DI_RE",
      "Natureza_Exportacao",
      "Data_Averbacao",
      "Tipo_Conhecimento_Embarque",
      "Quantidade_UN_Nacoes_Unidas",
      "Faturas_Em_Aberto"
    ]
  },
  {
    "tabela": "vis_Logistica_Terrestre_Master",
    "colunas": [
      "IdLogistica_Master",
      "IdCompanhia_Transporte",
      "IdAgencia_Maritima_Aerea",
      "IdAgente_Origem",
      "IdAgente_Destino",
      "IdAgente_Master",
      "IdLocal_Recebimento",
      "IdOrigem",
      "IdDestino",
      "IdDestino_Final",
      "IdMoeda_Processo",
      "IdEmpresa_Sistema",
      "Tipo",
      "Data_Entrega_Fronteira",
      "Data_Liberacao_Fronteira",
      "Numero_Processo",
      "Numero_Conhecimento",
      "Numero_Reserva",
      "Modalidade_Pagamento",
      "Modalidade_Processo",
      "Tipo_Operacao",
      "Situacao_Embarque",
      "Data_Processo",
      "Data_Previsao_Embarque",
      "Data_Previsao_Desembarque",
      "Data_Embarque",
      "Data_Desembarque",
      "Data_Pagamento_Local",
      "Transit_Time",
      "Transit_Time_Maximo",
      "Total_Conhecimentos",
      "Metros_Cubicos",
      "Peso_Liquido",
      "Peso_Bruto",
      "Peso_Cubado",
      "Peso_Considerado",
      "Quantidade_Volumes",
      "Instrucoes_Origem",
      "Instrucoes_Destino",
      "Master_Direto",
      "Local_Emissao",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Mensagem_Usuario",
    "colunas": [
      "IdMensagem",
      "IdRemetente",
      "IdDestinatario",
      "IdGrupo_Mensagem",
      "Lida",
      "Assunto",
      "Prioridade",
      "Data_Envio",
      "Atalho",
      "Data_Lida",
      "Data_Aviso",
      "Excluida"
    ]
  },
  {
    "tabela": "vis_Movimentacao_Financeira_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdMovimentacao_Financeira",
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Movimentacao_Financeira_CSS",
    "colunas": [
      "IdMovimentacao_Financeira",
      "IdTipo_Transacao",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdForma_Pagamento",
      "IdConta_Corrente",
      "IdMoeda",
      "IdResponsavel_Conciliacao",
      "IdContrato_Cambio",
      "IdGrupo_Financeiro",
      "IdSetor",
      "IdEmpresa_Sistema",
      "Identificacao_Extrato",
      "Numero",
      "Referencia",
      "Referencia_Externa",
      "Data",
      "Valor",
      "Natureza",
      "Previsao_Compensacao",
      "Data_Compensacao",
      "Data_Conciliacao",
      "Numero_Pagamento",
      "Valor_Original",
      "Fator_Corrente",
      "Valor_Corrente",
      "Compensada",
      "Conciliada",
      "Estornada",
      "Utilizar_Saldo_Pessoa",
      "Origem_Lancamento",
      "Historico_Resumo",
      "Data_Lancamento",
      "Nota_Recibo_Conferido",
      "Variacao_Cambial",
      "Historico",
      "Atalho",
      "Observacao",
      "Ativo",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "vis_NVOCC",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo_Serpro",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "VAT_Number",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Oferta_Frete_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdOferta_Frete",
      "IdConfiguracao_Campo_Livre",
      "Valor_Alfanumerico",
      "Valor_Texto",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Oferta_Frete_Campo_Livre_Consulta",
    "colunas": [
      "IdCampo_Livre",
      "IdOferta_Frete",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Papel_Usuario",
    "colunas": [
      "IdUsuario",
      "IdPapel"
    ]
  },
  {
    "tabela": "vis_Pessoa_Acompanhamento",
    "colunas": [
      "IdAcompanhamento",
      "IdPessoa",
      "IdResponsavel",
      "IdGrupo_Envio_Mensagem",
      "IdGrupo_Tarefa",
      "IdEmpresa_Sistema",
      "Data",
      "Descricao",
      "Tipo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Pessoa_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdPessoa",
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Pessoa_Campo_Livre",
    "colunas": [
      "IdCampo_Livre",
      "IdPessoa",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Texto",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Pessoa_Campo_Livre_Consulta",
    "colunas": [
      "IdPessoa",
      "IdCampo_Livre",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Pessoa_Contrato_Logistica_Campo_Li",
    "colunas": [
      "IdCampo_Livre",
      "IdPessoa_Contrato_Logistica",
      "IdConfiguracao_Campo_Livre",
      "Identificador",
      "Valor_Alfanumerico",
      "Valor_Texto",
      "Valor_Boleano",
      "Valor_Tipo_Fixo",
      "Valor_Inteiro",
      "Valor_Data",
      "Valor_Real4"
    ]
  },
  {
    "tabela": "vis_Projeto_Atividade_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdProjeto_Atividade",
      "IdArquivo_Grupo",
      "IdDados_Arquivo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Local_Armazenamento",
      "Exibir_Portal_Cliente",
      "Solicitar_Verificacao",
      "Prazo_Verificacao",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Registro_Financeiro_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdRegistro_Financeiro",
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Registro_Financeiro_CSS",
    "colunas": [
      "IdRegistro_Financeiro",
      "IdTipo_Transacao",
      "IdPessoa",
      "IdConta_Pessoa",
      "IdCondicao_Pagamento",
      "IdForma_Cobranca",
      "IdForma_Pagamento",
      "IdConta_Corrente",
      "IdMoeda",
      "IdConversao_Moeda",
      "IdAtraves_De",
      "IdModelo_Registro_Financeiro",
      "IdGrupo_Financeiro",
      "IdEmpresa_Sistema",
      "IdPessoa_Referencia",
      "IdSetor",
      "IdChave_Externa",
      "Data",
      "Data_Referencia",
      "Numero",
      "Referencia",
      "Referencia_Externa",
      "Natureza",
      "Subtotal",
      "Valor_Total",
      "Situacao",
      "Acrescimo",
      "Tipo_Acrescimo",
      "Abatimento",
      "Tipo_Abatimento",
      "Desconto_Incondicional",
      "Tipo_Desconto_Incondicional",
      "Desconto_Condicional",
      "Tipo_Desconto_Condicional",
      "Dias_Desconto_Condicional",
      "Multa",
      "Tipo_Multa",
      "Juros",
      "Periodo_Juros",
      "Tipo_Juros",
      "Tolerancia_Multa_Juros",
      "Valor_Original",
      "Historico_Resumo",
      "Codigo_Barras",
      "Historico",
      "Instrucao",
      "Registro_Unificador",
      "Origem_Lancamento",
      "Atalho",
      "Observacao",
      "Dados_Registro",
      "xml",
      "Ativo",
      "Hash",
      "Data_Ultima_Alteracao"
    ]
  },
  {
    "tabela": "vis_Representante",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Porcentagem_Venda",
      "Nome",
      "Codigo",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Tipo_Comissao",
      "Valor_Comissao"
    ]
  },
  {
    "tabela": "vis_Representante_Colaborador",
    "colunas": [
      "IdPessoa",
      "IdMoeda_Comissao",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Porcentagem_Venda",
      "Tipo_Comissao",
      "Valor_Comissao",
      "Validade_Procuracao",
      "Nome",
      "Codigo",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Seguradora",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdContrato_Financeiro",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "VAT_Number",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Tarifario_Arquivo",
    "colunas": [
      "IdArquivo",
      "IdTarifario_Frete",
      "IdTarifario_Origem_Destino",
      "IdArquivo_Grupo",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Descricao",
      "Nome",
      "Data_Arquivo",
      "Modelo",
      "Data_Criacao",
      "Data_Alteracao",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Terminal_Container",
    "colunas": [
      "IdPessoa",
      "IdSerpro_Terminal",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Campo_Livre1",
      "Campo_Livre2",
      "Campo_Livre3",
      "Campo_Livre4",
      "Campo_Livre5",
      "Campo_Livre6",
      "Campo_Livre7",
      "Campo_Livre8",
      "Campo_Livre9",
      "Campo_Livre10",
      "Campo_Livre11",
      "Campo_Livre12",
      "Campo_Livre13",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Trading",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Codigo",
      "Nome",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao"
    ]
  },
  {
    "tabela": "vis_Transportadora",
    "colunas": [
      "IdPessoa",
      "IdPessoa_Vinculo",
      "IdPessoa_Grupo",
      "IdPais",
      "IdUnidade_Federativa",
      "IdMunicipio",
      "IdTipo_Numero_Adicional",
      "IdPronome_Tratamento",
      "IdSetor",
      "IdUsuario_Criacao",
      "IdUsuario_Alteracao",
      "Contribuinte_ICMS",
      "Numero_Dependentes",
      "Numero_INSS",
      "Codigo_Externo",
      "Nome",
      "Codigo",
      "Nome_Fantasia",
      "Tipo_Pessoa",
      "Tipo",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cep",
      "Caixa_Postal",
      "Correspondencia",
      "Fone",
      "Fax_Celular",
      "Numero_Adicional",
      "EMail",
      "Home_Page",
      "Cpf_Cnpj",
      "Rg_Inscricao_Estadual",
      "Inscricao_Municipal",
      "Data_Nascimento_Constituicao",
      "Sexo",
      "Estado_Civil",
      "Detalhes",
      "Data_Criacao",
      "Data_Alteracao",
      "Ativo",
      "Observacao",
      "Tipo_Basculante",
      "Tipo_Bi_Basculante",
      "Tipo_Graneleiro",
      "Tipo_Bi_Trem",
      "Tipo_Truck_Basculante",
      "Tipo_Truck_Graneleiro",
      "Tipo_Toco",
      "Gerar_Pagamento",
      "Gerar_Recebimento"
    ]
  }
];

export const NOMES_TABELAS = DICIONARIO.map((t) => t.tabela);

export function colunasDaTabela(nome: string): string[] {
  return DICIONARIO.find((t) => t.tabela.toLowerCase() === nome.toLowerCase())?.colunas ?? [];
}
