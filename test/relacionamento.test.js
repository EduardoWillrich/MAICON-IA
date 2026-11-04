import test from "node:test";
import assert from "node:assert/strict";
import { executarFuncao } from "../server/funcoes.js";
import { lerPagamento, montarEncarte, nivelDaClassificacao, niveisPedidos, relacionamentoPorNomes, textoEncarte } from "../server/relacionamento.js";

function poolFalso(responder) {
  const consultas = [];
  const pool = {
    consultas,
    request() {
      const inputs = {};
      const pedido = {
        input(nome, _tipo, valor) {
          inputs[nome] = valor;
          return pedido;
        },
        async query(comando) {
          const item = { comando, inputs: { ...inputs } };
          consultas.push(item);
          return { recordset: await responder(item, consultas.length) };
        },
      };
      return pedido;
    },
  };
  return pool;
}

function ctxDe(recorte) {
  return { email: "ana@conline.com", nome: "Ana", acesso: { papel: "usuario" }, recorte };
}

test("a classificação vira ouro, prata ou bronze", () => {
  assert.equal(nivelDaClassificacao("Cliente Ouro"), "ouro");
  assert.equal(nivelDaClassificacao("PRATA"), "prata");
  assert.equal(nivelDaClassificacao("bronze"), "bronze");
  assert.equal(nivelDaClassificacao("Louro"), "");
  assert.equal(nivelDaClassificacao("Sem faixa"), "");
});

test("pagamento em dia só quando não há atraso", () => {
  assert.equal(lerPagamento(0, 0, 4).pagamento, "em-dia");
  assert.equal(lerPagamento(2, 0, 4).pagamentoTexto, "2 faturas em atraso");
  assert.equal(lerPagamento(0, 1, 3).pagamentoTexto, "Pagou 1 fatura fora do prazo");
  assert.equal(lerPagamento(0, 0, 0).pagamento, "sem");
  const encarte = montarEncarte({ Nome: "Acme", Classificacao: "Ouro", AbertasAtraso: 0, PagasAtraso: 0, Faturas: 2 });
  assert.equal(encarte.nivel, "ouro");
  assert.match(textoEncarte(encarte), /"nivel":"ouro"/);
  assert.match(textoEncarte(encarte), /Paga em dia/);
});

test("sem nomes não consulta o banco", async () => {
  const pool = poolFalso(() => {
    throw new Error("não deveria consultar");
  });
  assert.deepEqual(await relacionamentoPorNomes(pool, ["  ", ""]), []);
  assert.equal(pool.consultas.length, 0);
});

test("a ficha traz o encarte ouro de quem paga em dia", async () => {
  const pool = poolFalso((item) => {
    if (/cad_Cliente_Classificacao/.test(item.comando)) {
      return [{ Nome: "Acme Ltda", Classificacao: "Ouro", Codigo: "OURO", AbertasAtraso: 0, PagasAtraso: 0, Faturas: 3, Aberto: 0 }];
    }
    if (/Valor_Comissao/.test(item.comando)) return [{ Comissao: 1500 }];
    if (/GROUP BY LTRIM\(RTRIM\(Ven/.test(item.comando)) return [{ Nome: "Ana", Qtd: 2 }];
    if (/TOP 1/.test(item.comando)) {
      return [{ Numero_Processo: "IM1000-26", Data_Abertura_Processo: new Date("2026-10-02T00:00:00Z"), Vendedor: "Ana" }];
    }
    if (/SemProposta/.test(item.comando)) return [{ Nome: "Acme Ltda", Abertos: 2, SemProposta: 1 }];
    return [{ Numero_Processo: "IM1000-26", Referencia_Cliente: "REF", Situacao: "Aberto" }];
  });
  const resultado = await executarFuncao(
    pool,
    "processos_abertos_cliente",
    { cliente: "Acme" },
    ctxDe({ visao: "tudo", semComercial: false, semComissao: false, semOperacional: false }),
  );
  assert.match(resultado.texto, /```encarte/);
  assert.match(resultado.texto, /"nivel":"ouro"/);
  assert.match(resultado.texto, /Paga em dia/);
  assert.match(resultado.texto, /Ficha de Acme Ltda/);
  assert.match(pool.consultas.at(-1).comando, /IdCliente <> Reg.IdPessoa/);
});

test("a ficha mostra no máximo 12 processos e separa os campos", async () => {
  const pool = poolFalso((item) => {
    if (/cad_Cliente_Classificacao/.test(item.comando)) {
      return [{ Nome: "Acme Ltda", Classificacao: "Prata", Codigo: "PRATA", AbertasAtraso: 0, PagasAtraso: 1, Faturas: 4, Aberto: 0 }];
    }
    if (/Valor_Comissao/.test(item.comando)) return [{ Comissao: 0 }];
    if (/GROUP BY LTRIM\(RTRIM\(Ven/.test(item.comando)) return [{ Nome: "Ana", Qtd: 20 }];
    if (/TOP 1/.test(item.comando)) {
      return [{ Numero_Processo: "IM1019-26", Data_Abertura_Processo: new Date("2026-11-01T00:00:00Z"), Vendedor: "Ana" }];
    }
    if (/SemProposta/.test(item.comando)) return [{ Nome: "Acme Ltda", Abertos: 20, SemProposta: 3 }];
    if (/Situacao/.test(item.comando)) {
      return Array.from({ length: 20 }, (_, indice) => ({
        Numero_Processo: `IM${1000 + indice}-26`,
        Referencia_Cliente: "REF",
        Situacao: "Aberto",
      }));
    }
    return [];
  });
  const resultado = await executarFuncao(
    pool,
    "processos_abertos_cliente",
    { cliente: "Acme" },
    ctxDe({ visao: "tudo", semComercial: false, semComissao: false, semOperacional: false }),
  );
  assert.match(resultado.texto, /```encarte/);
  assert.match(resultado.texto, /"nivel":"prata"/);
  assert.match(resultado.texto, /Pagou 1 fatura fora do prazo/);
  assert.match(resultado.texto, /\*\*Ficha de Acme Ltda\*\*\n\nRelacionamento:/);
  assert.match(resultado.texto, /Abertos: 20/);
  assert.match(resultado.texto, /IM1011-26/);
  assert.doesNotMatch(resultado.texto, /IM1012-26/);
  assert.match(resultado.texto, /E mais 8 processos abertos/);
  assert.equal(resultado.linhas.length, 12);
});

test("o relacionamento dos metais sai em encartes coloridos", async () => {
  const pool = poolFalso((item) => {
    if (/LIKE '%ouro%'/.test(item.comando)) {
      return [{ Nome: "Alfa", Classificacao: "Cliente Ouro", Codigo: "OURO", AbertasAtraso: 0, PagasAtraso: 0, Faturas: 2, Aberto: 0 }];
    }
    if (/LIKE '%prata%'/.test(item.comando)) {
      return [{ Nome: "Beta", Classificacao: "Prata", Codigo: "PRATA", AbertasAtraso: 1, PagasAtraso: 0, Faturas: 3, Aberto: 10 }];
    }
    if (/LIKE '%bronze%'/.test(item.comando)) return [];
    return [];
  });
  const resultado = await executarFuncao(
    pool,
    "relacionamento_clientes",
    { nivel: "ouro,prata" },
    ctxDe({ visao: "comercial" }),
  );
  assert.deepEqual(niveisPedidos("ouro, prata"), ["ouro", "prata"]);
  assert.match(resultado.texto, /Relacionamento dos clientes/);
  assert.match(resultado.texto, /\*\*Ouro\*\*/);
  assert.match(resultado.texto, /\*\*Prata\*\*/);
  assert.doesNotMatch(resultado.texto, /\*\*Bronze\*\*/);
  assert.match(resultado.texto, /"nivel":"ouro"/);
  assert.match(resultado.texto, /"nivel":"prata"/);
  assert.match(resultado.texto, /Paga em dia/);
  assert.match(resultado.texto, /1 fatura em atraso/);
});

test("o painel financeiro traz o encarte bronze em atraso", async () => {
  const pool = poolFalso((item) => {
    if (/cad_Cliente_Classificacao/.test(item.comando)) {
      return [{ Nome: "Beta", Classificacao: "Bronze", Codigo: "", AbertasAtraso: 2, PagasAtraso: 0, Faturas: 4, Aberto: 800 }];
    }
    if (/Qtd_Comissao/.test(item.comando)) return [{ Comissao: 10, Qtd_Comissao: 1 }];
    if (/COUNT\(\*\) AS Qtd/.test(item.comando)) return [{ Qtd: 3 }];
    return [];
  });
  const resultado = await executarFuncao(pool, "painel_financeiro", {}, ctxDe({ visao: "financeiro" }));
  assert.match(resultado.texto, /Relacionamento com o cliente/);
  assert.match(resultado.texto, /"nivel":"bronze"/);
  assert.match(resultado.texto, /2 faturas em atraso/);
});
