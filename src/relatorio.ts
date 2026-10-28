import { formatarDataHora } from "./datas";
import { formatarValorNovo, textoValor, VAZIO, VERBO_SITUACAO } from "./legendas";
import { nomeCanonico } from "./tiposFixos";
import type { CadastroAtual, EventoLog } from "./types";
import { rotuloTipo } from "./types";

const ROTULOS: Record<string, string> = {
  Situacao: "Situação",
  Prioridade: "Prioridade",
  Observacao: "Observação",
  Complemento: "Complemento",
  IdAtividade: "Atividade",
  IdResponsavel: "Responsável",
  IdResponsavel_Original: "Responsável original",
  IdTarefa: "Tarefa",
  IdModelo_Mensagem: "Modelo de mensagem",
  IdProjeto_Atividade: "Processo",
  IdLogistica_House: "Processo",
  Numero_Processo: "Número do processo",
  Mensagem_Automatica: "Mensagem automática",
  Acompanhamento_Automatico: "Acompanhamento automático",
  Data_Inicio: "Data de início",
  Data_Termino: "Data de término",
  Data_Alteracao: "Data da alteração",
  Previsao_Inicio: "Previsão de início",
  Previsao_Termino: "Previsão de término",
  IdRegistro_Recebimento: "Registro de recebimento",
  IdRegistro_Pagamento: "Registro de pagamento",
  Tipo_Pagamento: "Tipo de pagamento",
  Tipo_Recebimento: "Tipo de recebimento",
  Quantidade_Pagamento: "Quantidade pagamento",
  Quantidade_Recebimento: "Quantidade recebimento",
  Valor_Pagamento_Total: "Valor pagamento total",
  Valor_Recebimento_Total: "Valor recebimento total",
  IdCampo_Livre: "Campo livre",
  IdConfiguracao_Campo_Livre: "Configuração",
  Valor_Tipo_Fixo: "Tipo fixo",
  Valor_Boleano: "Sim ou não",
  Valor_Alfanumerico: "Texto",
  Valor_Texto: "Texto longo",
  Valor_Inteiro: "Número",
  Valor_Data: "Data",
  Valor_Real4: "Valor",
};

export function rotuloCampo(nome: string): string {
  const chave = nomeCanonico(String(nome ?? ""));
  return (
    ROTULOS[chave] ??
    ROTULOS[nome] ??
    chave.replace(/^Id(?=[A-Z])/, "").replaceAll("_", " ")
  );
}

const limpo = (v?: string | null) => (v == null ? "" : String(v).trim());

export function camposQueMudaram(evento: EventoLog) {
  const campos = evento.campos ?? [];
  if (evento.tipo === 1 || evento.tipo === 2) {
    return campos.filter((c) => limpo(c.valor) || limpo(c.valorAnterior));
  }
  return campos.filter((c) => limpo(c.valorAnterior) !== limpo(c.valor));
}

export type AcaoCampo = { nome: string; antes: string; depois: string };

export function acoesDoEvento(evento: EventoLog): AcaoCampo[] {
  return camposQueMudaram(evento).map((c) => {
    if (evento.tipo === 2) {
      const antes = limpo(c.valorAnterior) ? textoValor(c, "anterior") : textoValor(c, "atual");
      return { nome: c.nome, antes, depois: VAZIO };
    }
    if (evento.tipo === 1) {
      return { nome: c.nome, antes: VAZIO, depois: textoValor(c, "atual") };
    }
    return { nome: c.nome, antes: textoValor(c, "anterior"), depois: textoValor(c, "atual") };
  });
}

export function verboDoEvento(evento: EventoLog): string {
  if (evento.tipo === 1) return "incluiu o registro";
  if (evento.tipo === 2) return "excluiu o registro";
  return "alterou o registro";
}

export function quandoFoiFeito(evento: EventoLog): string {
  return formatarDataHora(
    evento.data || evento.dataInicioTransacao || evento.dataTerminoTransacao,
  );
}

const PRIMEIROS: Record<string, string> = {
  joao: "João",
  jose: "José",
  mario: "Mário",
  andre: "André",
  luis: "Luís",
  antonio: "Antônio",
  marcio: "Márcio",
  fabio: "Fábio",
  cesar: "César",
  sergio: "Sérgio",
  monica: "Mônica",
  lucia: "Lúcia",
};

const SOBRENOMES: Record<string, string> = {
  espindula: "Espíndula",
  araujo: "Araújo",
  goncalves: "Gonçalves",
  conceicao: "Conceição",
};

export function nomeProprio(usuario: string): string {
  const partes = String(usuario ?? "")
    .split(/[.\s_]+/)
    .map((parte) => parte.trim())
    .filter(Boolean);
  if (!partes.length) return "Usuário não identificado";
  return partes
    .map((parte, indice) => {
      const baixo = parte.toLowerCase();
      if (indice === 0 && PRIMEIROS[baixo]) return PRIMEIROS[baixo];
      if (SOBRENOMES[baixo]) return SOBRENOMES[baixo];
      return baixo.charAt(0).toUpperCase() + baixo.slice(1);
    })
    .join(" ");
}

export function nomeDaChave(eventos: EventoLog[], id: string): string {
  const alvo = id.trim();
  if (!alvo) return "";
  for (const evento of eventos) {
    for (const campo of evento.campos ?? []) {
      if (String(campo.valor ?? "").trim() === alvo && campo.valorExibicao && campo.valorExibicao !== alvo) {
        return campo.valorExibicao;
      }
      if (
        String(campo.valorAnterior ?? "").trim() === alvo &&
        campo.valorAnteriorExibicao &&
        campo.valorAnteriorExibicao !== alvo
      ) {
        return campo.valorAnteriorExibicao;
      }
    }
  }
  return alvo;
}

export function fraseQuem(evento: EventoLog): string {
  return nomeProprio(evento.usuario ?? "");
}

const ROTULO_CHAVE: Record<string, string> = {
  IdLogistica_Master: "Master",
  IdLogistica_House: "Processo",
  IdAtividade: "Atividade",
  IdProjeto_Atividade: "Processo",
};

export function paresBusca(chaves: { nome: string; valor: string }[]) {
  return chaves.flatMap((chave) => {
    const nome = chave.nome.trim();
    if (!nome) return [];
    return chave.valor
      .split(/[,;]+/)
      .map((valor) => valor.trim())
      .filter(Boolean)
      .map((valor) => ({ nome, valor }));
  });
}

export function identificacaoDoEvento(
  evento: EventoLog,
  chaves: { nome: string; valor: string }[],
): string {
  const pares = paresBusca(chaves);
  const achados = pares.filter((par) =>
    (evento.campos ?? []).some(
      (c) =>
        c.nome === par.nome &&
        (String(c.valor) === par.valor || String(c.valorAnterior ?? "") === par.valor),
    ),
  );
  const lista = achados.length ? achados : pares.slice(0, 1);
  return lista
    .map((par) => {
      const campo = (evento.campos ?? []).find((c) => c.nome === par.nome);
      const nome = ROTULO_CHAVE[par.nome] ?? rotuloCampo(par.nome);
      const numero =
        par.nome === "IdLogistica_Master" || par.nome === "IdLogistica_House"
          ? evento.numeroProcesso || campo?.valorExibicao
          : campo?.valorExibicao;
      const codigo = par.valor;
      const principal = numero && numero !== codigo ? numero : "";
      return principal ? `${nome} ${principal} · ${codigo}` : `${nome} ${codigo}`;
    })
    .join(" · ");
}

export function numerosProcesso(eventos: EventoLog[]): string[] {
  const lista: string[] = [];
  for (const evento of eventos) {
    const campo = evento.campos.find((c) => c.nome === "Numero_Processo" && c.valor?.trim());
    const house = evento.campos.find((c) => c.nome === "IdLogistica_House" && c.valorExibicao);
    const master = evento.campos.find((c) => c.nome === "IdLogistica_Master" && c.valorExibicao);
    const numero = evento.numeroProcesso?.trim() || campo?.valor?.trim() || house?.valorExibicao || master?.valorExibicao || "";
    if (numero && !lista.includes(numero)) lista.push(numero);
  }
  return lista;
}

export function numeroProcesso(eventos: EventoLog[]): string {
  return numerosProcesso(eventos)[0] ?? "";
}

export function fraseResumo(eventos: EventoLog[]): string {
  if (!eventos.length) return "";
  const comMudanca = [...eventos].reverse().find((e) => camposQueMudaram(e).length > 0);
  const evento = comMudanca ?? eventos[eventos.length - 1];
  const quando = quandoFoiFeito(evento);
  const quem = nomeProprio(evento.usuario ?? "");
  const processo = numeroProcesso(eventos);
  const atividade = evento.campos.find((c) => c.nome === "IdAtividade");
  const idAtividade = atividade?.valorExibicao || atividade?.valor;
  const alvo = processo
    ? `o processo ${processo}`
    : idAtividade
      ? `a atividade ${idAtividade}`
      : "o registro";
  const situacao = camposQueMudaram(evento).find((c) => c.nome === "Situacao");
  if (situacao) {
    const verbo = VERBO_SITUACAO[situacao.valor] ?? `alterou a situação de ${alvo}`;
    if (VERBO_SITUACAO[situacao.valor]) {
      return `Em ${quando}, ${quem} ${verbo} ${alvo}.`;
    }
    return `Em ${quando}, ${quem} alterou a situação de ${alvo} para ${textoValor(situacao, "atual")}.`;
  }
  if (evento.tipo === 1) return `Em ${quando}, ${quem} incluiu ${alvo}.`;
  if (evento.tipo === 2) return `Em ${quando}, ${quem} excluiu ${alvo}.`;
  const n = camposQueMudaram(evento).length;
  if (n === 1) {
    const c = camposQueMudaram(evento)[0];
    const prep = processo ? "no" : idAtividade ? "na atividade" : "no";
    const complemento = processo
      ? `processo ${processo}`
      : idAtividade
        ? idAtividade
        : "registro";
    return `Em ${quando}, ${quem} alterou ${rotuloCampo(c.nome).toLowerCase()} ${prep} ${complemento}.`;
  }
  if (n > 1) return `Em ${quando}, ${quem} atualizou ${alvo} (${n} campos).`;
  return `Em ${quando}, ${quem} registrou alteração em ${alvo}.`;
}

export function textoConferencia(cadastro: CadastroAtual | null): string {
  if (!cadastro) return "";
  const blocos = cadastro.registros?.length
    ? cadastro.registros
    : [
        {
          rotulo: cadastro.tabela,
          campos: cadastro.campos,
          divergencias: cadastro.divergencias,
        },
      ];
  const linhas: string[] = ["Cadastro atual × último log"];
  if (cadastro.aviso) linhas.push(cadastro.aviso);
  for (const bloco of blocos) {
    if (bloco.rotulo) linhas.push(bloco.rotulo);
    const campos = bloco.campos?.length ? bloco.campos : bloco.divergencias;
    if (!campos?.length) continue;
    for (const c of campos) {
      linhas.push(
        `   • ${rotuloCampo(c.nome)}: log ${formatarValorNovo(c.nome, c.valorLog, c.valorLogExibicao)} → cadastro ${formatarValorNovo(c.nome, c.valorAtual, c.valorAtualExibicao)}`,
      );
    }
  }
  return linhas.join("\n");
}

export function montarRelatorio(
  eventos: EventoLog[],
  titulo: string,
  cadastro?: CadastroAtual | null,
): string {
  const linhas = [
    titulo,
    fraseResumo(eventos),
    textoConferencia(cadastro ?? null),
    `Gerado em ${formatarDataHora(new Date().toISOString())}`,
    "",
  ].filter(Boolean);
  if (eventos.length === 0) {
    linhas.push("Nenhuma alteração encontrada.");
    return linhas.join("\n");
  }
  const visiveis = eventos.filter(
    (evento) => evento.tipo === 1 || evento.tipo === 2 || camposQueMudaram(evento).length > 0,
  );
  visiveis.forEach((evento, i) => {
    const acoes = acoesDoEvento(evento);
    linhas.push(`${i + 1}) ${rotuloTipo(evento.tipo)}`);
    linhas.push(`   Quando: ${quandoFoiFeito(evento)}`);
    linhas.push(`   Quem: ${fraseQuem(evento)}`);
    linhas.push(`   O que: ${verboDoEvento(evento)}.`);
    if (acoes.length === 0) {
      linhas.push("   Nenhum campo com valor diferente neste evento.");
    } else {
      linhas.push(`   Campos (${acoes.length}):`);
      acoes.forEach((a) => {
        linhas.push(`   • ${rotuloCampo(a.nome)}: antes ${a.antes} → agora ${a.depois}`);
      });
    }
    linhas.push("");
  });
  return linhas.join("\n");
}
