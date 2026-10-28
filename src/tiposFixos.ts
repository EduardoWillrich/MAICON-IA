/** Tipos fixos do sistema (códigos gravados no log, sem tabela de cadastro). */
const TIPO_CALCULO_TAXA: Record<string, string> = {
  "0": "Nenhum",
  "1": "Valor",
  "2": "Percentual",
  "3": "Percentual sobre o frete",
  "4": "Peso bruto",
  "5": "Peso líquido",
  "6": "Peso cubado",
  "7": "Peso taxado",
  "8": "Metro cúbico",
  "9": "Quantidade",
  "10": "Container",
  "11": "TEU",
  "12": "FEU",
  "13": "Documento / BL",
  "14": "House",
  "15": "Master",
  "16": "Viagem",
  "17": "Mínimo",
  "18": "Máximo",
  "19": "W/M",
  "20": "Hora",
  "21": "Dia",
  "22": "Semana",
};

const PESSOA_TAXA: Record<string, string> = {
  "0": "Não informado",
  "1": "Cliente",
  "2": "Agente",
  "3": "Companhia",
  "4": "Co-loader",
  "5": "Despachante",
  "6": "Exportador",
  "7": "Importador",
  "8": "Agente de carga",
  "9": "Transportadora",
  "11": "Notify",
  "12": "Armador",
  "14": "Terminal",
  "15": "Seguradora",
};

const MODALIDADE: Record<string, string> = {
  "0": "Collect",
  "1": "Prepaid",
  "2": "Prepaid abroad",
  "3": "Collect abroad",
  "4": "Outro",
};

const NATUREZA: Record<string, string> = {
  "0": "Despesa",
  "1": "Receita",
};

const TIPO_CARGA: Record<string, string> = {
  "0": "Não informado",
  "1": "Aéreo",
  "2": "Break bulk",
  "3": "FCL",
  "4": "LCL",
  "5": "Ro-Ro",
  "6": "Terrestre",
};

const TIPO_SERVICO: Record<string, string> = {
  "0": "Não informado",
  "1": "Porta a porta",
  "2": "Porta a porto",
  "3": "Porto a porta",
  "4": "Porto a porto",
  "5": "Outro",
};

const TIPO_OPERACAO: Record<string, string> = {
  "1": "Exportação",
  "2": "Importação",
  "3": "Nacional",
};

const MODALIDADE_PROCESSO: Record<string, string> = {
  "1": "Aéreo",
  "2": "Marítimo",
  "3": "Terrestre",
};

const TIPO_ROTA: Record<string, string> = {
  "0": "Não informado",
  "1": "Direta",
  "2": "Com transbordo",
};

const CANAL: Record<string, string> = {
  "0": "Sem canal",
  "1": "Verde",
  "2": "Amarelo",
  "3": "Vermelho",
  "4": "Cinza",
};

const SITUACAO_FINANCEIRA: Record<string, string> = {
  "0": "Pendente",
  "1": "Em aberto",
  "2": "Parcial",
  "3": "Quitado",
  "5": "Cancelado",
  "6": "Sem movimento",
  "7": "Em análise",
};

const SITUACAO_AGENCIAMENTO: Record<string, string> = {
  "1": "Aberto",
  "2": "Em andamento",
  "3": "Finalizado",
  "4": "Cancelado",
  "5": "Suspenso",
  "6": "Aguardando",
  "7": "Pré-finalizado",
};

const SITUACAO_ACERTO: Record<string, string> = {
  "0": "Sem acerto",
  "1": "Aguardando",
  "2": "Parcial",
  "3": "Acertado",
};

const SITUACAO_EMBARQUE: Record<string, string> = {
  "0": "Pré-processo",
  "1": "Aguardando embarque",
  "2": "Embarcado",
  "3": "Desembarcado",
  "4": "Cancelado",
  "5": "Pendente",
  "6": "Autorizado",
  "7": "Coletado",
  "8": "Entregue",
  "9": "Aguardando prontidão da mercadoria",
  "10": "Aguardando booking",
  "11": "Finalizado",
  "12": "Aguardando coleta",
  "13": "Aguardando entrega",
};

const LOCAL_EMISSAO: Record<string, string> = {
  "1": "Origem",
  "2": "Destino",
  "3": "Outro",
  "4": "Exterior",
  "5": "Agente",
};

const MODALIDADE_COLETA: Record<string, string> = {
  "0": "Não se aplica",
  "1": "Coleta",
  "2": "Entrega",
  "3": "Coleta e entrega",
  "4": "Outro",
};

const ORIGEM_TAXA: Record<string, string> = {
  "0": "Manual",
  "1": "Oferta",
  "2": "Contrato",
  "3": "Processo",
};

const CATEGORIA_TAXA: Record<string, string> = {
  "0": "Não classificada",
  "1": "Frete",
  "2": "Taxa local",
};

export const TIPOS_FIXOS: Record<string, Record<string, string>> = {
  Tipo_Pagamento: TIPO_CALCULO_TAXA,
  Tipo_Recebimento: TIPO_CALCULO_TAXA,
  Tipo: TIPO_CALCULO_TAXA,
  Pagar_Para: PESSOA_TAXA,
  Receber_De: PESSOA_TAXA,
  Modalidade_Pagamento: MODALIDADE,
  Modalidade_Recebimento: MODALIDADE,
  Forma_Faturamento_Pagamento: MODALIDADE,
  Forma_Faturamento_Recebimento: MODALIDADE,
  Natureza: NATUREZA,
  Tipo_Carga: TIPO_CARGA,
  Tipo_Servico: TIPO_SERVICO,
  Tipo_Operacao: TIPO_OPERACAO,
  Modalidade_Processo: MODALIDADE_PROCESSO,
  Tipo_Rota: TIPO_ROTA,
  Canal_Liberacao: CANAL,
  Situacao_Pagamento: SITUACAO_FINANCEIRA,
  Situacao_Recebimento: SITUACAO_FINANCEIRA,
  Situacao_Pagamento_Frete: SITUACAO_FINANCEIRA,
  Situacao_Recebimento_Frete: SITUACAO_FINANCEIRA,
  Situacao_Agenciamento: SITUACAO_AGENCIAMENTO,
  Situacao_Acerto_Agente: SITUACAO_ACERTO,
  Situacao_Embarque: SITUACAO_EMBARQUE,
  Local_Emissao: LOCAL_EMISSAO,
  Local_Emissao_House: LOCAL_EMISSAO,
  Local_Emissao_Master: LOCAL_EMISSAO,
  Modalidade_Coleta: MODALIDADE_COLETA,
  Modalidade_Entrega: MODALIDADE_COLETA,
  Origem_Taxa: ORIGEM_TAXA,
  Categoria: CATEGORIA_TAXA,
};

export function nomeCanonico(nome: string): string {
  const bruto = String(nome ?? "").trim();
  if (!bruto || bruto.includes("_")) return bruto;
  const com = bruto.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  return com.replace(/^Id_/, "Id");
}
