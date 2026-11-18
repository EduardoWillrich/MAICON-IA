import test from "node:test";
import assert from "node:assert/strict";
import { apresentarNoFollow, datasetsDoModelo, datasetsNoTexto, ehModeloFollow, limparNomeAtividade, montarEmailDoModelo, notaDoModelo, partesDoNomeAtividade, sqlDoDataset } from "../server/modeloAtividade.js";

const modelo = `[Acompanhamento.Header]
<DataSet Name="Processo" Sql="Select Lhs.Numero_Processo From mov_Atividade Atv Where Atv.IdAtividade=:IdAtividade">
[Acompanhamento.Detail]
Confirmamos a chegada no dia <Print DataSet="Processo" FieldName="Data_Desembarque"> no navio <Print DataSet="Processo" FieldName="Navio">.`;

test("reconhece o modelo antigo de follow e deixa a averbação de fora", () => {
  const follow = `<b>EXPORTADOR:</b> A<br><b>IMPORTADOR:</b> B<br><b>NAVIO/VIAGEM:</b> C<br><b>REF. CLIENTE:</b> D<br><b>PREV. DE EMBARQUE:</b> E`;
  assert.equal(ehModeloFollow("PROJETO 2019 - IM - FOLLOW UP", ""), true);
  assert.equal(ehModeloFollow("HBL PARA APROVAÇÃO", follow), true);
  assert.equal(ehModeloFollow("AVERBAR SEGURO IM", "<td>BENEFICIÁRIO:</td><td>CNPJ:</td>"), false);
});

test("separa o código da atividade mesmo sem ponto", () => {
  assert.equal(
    limparNomeAtividade("0013 ENVIAR DRAFT DE HBL AO CLIENTE PARA APROVAÇÃO do IM6273-26"),
    "0013 ENVIAR DRAFT DE HBL AO CLIENTE PARA APROVAÇÃO",
  );
  assert.equal(limparNomeAtividade("0006.7 AVERBAÇÃO DE SEGURO processo IM3896-26"), "0006.7 AVERBAÇÃO DE SEGURO");
  assert.deepEqual(partesDoNomeAtividade("0013 ENVIAR DRAFT DE HBL"), { codigo: "0013", descricao: "ENVIAR DRAFT DE HBL" });
  assert.deepEqual(partesDoNomeAtividade("0006.7 AVERBAÇÃO DE SEGURO"), { codigo: "0006.7", descricao: "AVERBAÇÃO DE SEGURO" });
});

test("lê o dataset mesmo quando o atributo tem espaço antes das aspas", () => {
  const [dataset] = datasetsNoTexto(`<dataset name= "contatosSeg" sql="Select 1 AS Email">`);
  assert.equal(dataset.nome, "contatosSeg");
  assert.match(dataset.sql, /Select 1/);
});

test("extrai o select do modelo e troca o parâmetro da atividade", () => {
  const [dataset] = datasetsDoModelo(modelo);
  assert.equal(dataset.nome, "Processo");
  assert.match(sqlDoDataset(dataset.sql), /^Select Lhs\.Numero_Processo/);
  assert.match(sqlDoDataset(dataset.sql), /@IdAtividade/);
  assert.equal(sqlDoDataset("update mov_Atividade set Situacao = 4"), "");
  assert.match(sqlDoDataset("Declare @x int; Select 'a;b' AS Email From T Where Id = :IdAtividade"), /@IdAtividade/);
  assert.equal(sqlDoDataset("Select 1; Delete From T"), "");
});

test("monta a nota com os campos do processo", () => {
  const nota = notaDoModelo(modelo, {
    Processo: [{ Data_Desembarque: new Date("2026-03-02T00:00:00.000Z"), Navio: "MSC TESTE" }],
  });
  assert.equal(nota, "Confirmamos a chegada no dia 02/03/2026 no navio MSC TESTE.");
  const comRelatorio = `${modelo}\n<SubReport NameSource="Processo" NameField="TipoProcesso">Texto interno`;
  assert.equal(notaDoModelo(comRelatorio, { Processo: [{ Data_Desembarque: new Date("2026-03-02T00:00:00.000Z"), Navio: "MSC TESTE" }] }).includes("<SubReport"), false);
});

test("monta o e-mail com o assunto, a nota da atividade e a repetição do subreport", () => {
  const corpo = `[Report.Header]
<DataSet Name="Processo" Sql="Select 1">
[Subject.Header]
<print dataset="Processo" fieldname="Assunto_Follow">
[Subject.Footer]
<html><body>
[Report.Detail]
<p><print dataset="Processo" fieldname="Numero_Processo"></print></p>
<subreport name="Follow_Destaque" dataset="Acompanhamento" recordcount="1"></subreport>
[Follow_Destaque.Detail]
<li><print dataset="Acompanhamento" fieldname="Descricao"></print></li>
[Report.Footer]
</body></html>`;
  const email = montarEmailDoModelo(corpo, {
    Processo: [{ Numero_Processo: "IM1-26", Assunto_Follow: "FOLLOW UP - IM1-26" }],
    Acompanhamento: [{ Descricao: "Carga pronta para embarque." }, { Descricao: "Nota antiga" }],
  });
  assert.equal(email.assunto, "FOLLOW UP - IM1-26");
  assert.match(email.html, /IM1-26/);
  assert.match(email.html, /Carga pronta para embarque/);
  assert.equal(email.html.includes("Nota antiga"), false);
});

test("formata valor do modelo antigo e reapresenta no visual do follow", () => {
  const corpo = `[Report.Detail]
<html><body>
<table><tr><td><span>AVERBAÇÃO DE SEGURO - IMPORTAÇÃO MARÍTIMA</span></td></tr></table>
<table>
<tr><td>BENEFICIÁRIO:</td><td>PROX TRADING</td></tr>
<tr><td>DATA:</td><td><print dataset="Processo" fieldname="Data_Atual" displayformat="dd/mm/yyyy"></print></td></tr>
<tr><td>REFERÊNCIA:</td><td>IM3896-26</td></tr>
</table>
<table><tr><td>PROCEDIMENTO</td></tr></table>
<table><tr><td>
<b>MAWB/MBL:</b> KA0020300<br>
<b>ORIGEM:</b> TIANJIN<br>
<b>DESTINO:</b> ITAJAI<br>
<b>MOEDA + VALOR MERCADORIA:</b> USD <print dataset="Processo" fieldname="Valor_Mercadoria" displayformat="#,##0.00"></print><br>
</td></tr></table>
<table><tr><td>Aviso confidencial de teste para o rodapé do e-mail enviado ao cliente.</td></tr></table>
</body></html>`;
  const email = montarEmailDoModelo(corpo, {
    Processo: [{ Data_Atual: new Date("2026-11-09T13:00:00.000Z"), Valor_Mercadoria: 22848 }],
  });
  assert.match(email.html, /09\/11\/2026/);
  assert.match(email.html, /22\.848,00/);
  const visual = apresentarNoFollow(email.html, { processo: "IM3896-26", atividade: "AVERBAÇÃO DE SEGURO" });
  assert.match(visual, /border-bottom:6px solid #e8302d/);
  assert.match(visual, /AVERBAÇÃO DE SEGURO - IMPORTAÇÃO MARÍTIMA/);
  assert.match(visual, /PROX TRADING/);
  assert.match(visual, /TIANJIN/);
  assert.match(visual, /ITAJAI/);
  assert.match(visual, /PROCEDIMENTO/);
  assert.match(visual, /KA0020300/);
  assert.match(visual, /22\.848,00/);
  assert.match(visual, /Aviso confidencial de teste/);
});
