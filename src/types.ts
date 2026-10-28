export type TipoLog = 0 | 1 | 2 | 3;

export type ChavePrimaria = {
  id: string;
  nome: string;
  valor: string;
};

export type FiltrosLog = {
  idUsuario: number;
  dataInicio: string;
  dataTermino: string;
  tabela: string;
  tipo: TipoLog;
  chaves: ChavePrimaria[];
  ancorar?: boolean;
  processo?: string;
};

export type CampoLog = {
  nome: string;
  valor: string;
  valorAnterior?: string;
  extras?: { nome: string; valor: string }[];
  valorExibicao?: string;
  valorAnteriorExibicao?: string;
};

export type CampoCadastro = {
  nome: string;
  valorLog: string;
  valorAtual: string;
  igual: boolean;
  rotulo?: string;
  valorLogExibicao?: string;
  valorAtualExibicao?: string;
};

export type RegistroCadastro = {
  rotulo: string;
  encontrado: boolean;
  excluido: boolean;
  campos: CampoCadastro[];
  divergencias: CampoCadastro[];
};

export type CadastroAtual = {
  encontrado: boolean;
  tabela: string;
  campos: CampoCadastro[];
  divergencias: CampoCadastro[];
  registros?: RegistroCadastro[];
  aviso?: string;
  excluido?: boolean;
};

export type EventoLog = {
  id: string;
  usuario: string;
  dataInicioTransacao: string;
  dataTerminoTransacao: string;
  tempoTransacao: number;
  usuarioWindows: string;
  computador: string;
  tabela: string;
  tipo: number;
  data: string;
  indice: number;
  campos: CampoLog[];
  xmlCampos?: string;
  numeroProcesso?: string;
};

export const TIPOS: { valor: TipoLog; rotulo: string }[] = [
  { valor: 0, rotulo: "Todos" },
  { valor: 1, rotulo: "Inclusão" },
  { valor: 2, rotulo: "Exclusão" },
  { valor: 3, rotulo: "Atualização" },
];

export function rotuloTipo(tipo: number): string {
  return TIPOS.find((t) => t.valor === tipo)?.rotulo ?? `Tipo ${tipo}`;
}

export function rotuloTipoCompleto(tipo: number): string {
  const nome = rotuloTipo(tipo);
  return tipo ? `${nome} (${tipo})` : nome;
}
