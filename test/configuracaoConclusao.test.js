import test from "node:test";
import assert from "node:assert/strict";
import { comandoDoCadastro, analisarMonitorConclusao, avaliarCondicaoConclusao, lerConfiguracaoConclusao, textoConfiguracaoConclusao } from "../server/configuracaoConclusao.js";
import { requisitosAtividade } from "../server/requisitosAtividade.js";
import { exigirSomenteLeitura } from "../server/seguranca.js";

const monitor = {
  Descricao: 'CONCLUIDO AO ANEXAR OHBL "ARQUIVO GRUPO 61 OHBL"', Classe: "TProjetoAtividadeArquivo",
  Dados_Registro: `<Dados_Registro><Monitoramento><CommandText>
    Declare @IdArquivo_Grupo IdCurto
    Set @IdArquivo_Grupo = 61 /*OHBL*/
    If ((@Evento in (1 /* inserir */, 3 /* atualizar */)) And Exists(Select 1))
    Begin Select @Situacao = Case When Arq.IdArquivo_Grupo = @IdArquivo_Grupo Then 4 /* concluido */ Else Null End
    From mov_Projeto_Atividade_Arquivo Par Left Join arq_Arquivo Arq On Arq.IdArquivo=Par.IdArquivo End
    </CommandText></Monitoramento></Dados_Registro>`,
};
const condicao = {
  Situacao_Verificacao: 4, Descricao: "PREENCHER STATUS DO PROCESSO",
  Dados_Registro: `<Dados_Registro><Mensagem>Teste</Mensagem><CommandText>
    Select @Mensagem = 'Para confirmar a atividade é necessário: ' + Char(13)+Char(10) + 'atualizar status do processo: AGUARDANDO DOCUMENTAÇÃO',
      @Condicao = Case When COALESCE(Lhs.IdStatus_Processo_Logistico, 0) = 0 Then 0 Else 1 End
    From mov_Logistica_House Lhs
  </CommandText></Dados_Registro>`,
};
function bancoFalso({ quantidade = 0, status = 1, nomeStatus = "CE LIBERADO", arquivos = true, listaMonitores = [monitor], gatilhos = [], listaCondicoes = [condicao] } = {}) {
  const consultas = [];
  return { consultas, request() { const parametros = {}; return {
    input(nome, _tipo, valor) { parametros[nome] = valor; return this; },
    async query(sql) {
      exigirSomenteLeitura(sql); consultas.push({ sql, parametros });
      const recordset = sql.includes("SELECT Tar.IdTarefa,") ? [{ IdTarefa: 994, Projeto: "IMPORTACAO MARITIMA", IdStatus_Processo_Logistico: status, Status: nomeStatus }]
        : sql.includes("JOIN cad_Tarefa_Condicao") ? listaCondicoes
        : sql.includes("JOIN cad_Tarefa_Monitor") ? listaMonitores
        : sql.includes("JOIN cad_Tarefa_Gatilho_Situacao") ? gatilhos
        : sql.includes("CROSS JOIN cad_Arquivo_Grupo") ? arquivos ? [{ IdArquivo_Grupo: 61, Grupo: "OHBL", Quantidade: quantidade }] : []
        : [];
      return { recordset };
    },
  }; } };
}

test("lê XML e identifica conclusão por anexo, ignorando monitor de cancelamento", () => {
  const m = analisarMonitorConclusao(monitor);
  assert.equal(m.tipo, "arquivo_grupo"); assert.equal(m.grupo, 61); assert.deepEqual(m.eventos, [1,3]);
  assert.equal(analisarMonitorConclusao({ ...monitor, Dados_Registro: monitor.Dados_Registro.replace("Then 4", "Then 6") }), null);
  assert.equal(comandoDoCadastro("<Dados_Registro><CommandText><![CDATA[Select 1 < 2]]></CommandText></Dados_Registro>"), "Select 1 < 2");
  assert.equal(comandoDoCadastro("<CommandText>Select 1 &lt; 2 &amp; 3</CommandText>"), "Select 1 < 2 & 3");
});

test("a mensagem do cadastro não substitui a condição realmente verificada", () => {
  const c = avaliarCondicaoConclusao(condicao, { IdStatus_Processo_Logistico: 1, Status: "CE LIBERADO" });
  assert.equal(c.estado, "atendida"); assert.equal(c.tipo, "status_preenchido");
  assert.match(c.mensagem, /AGUARDANDO DOCUMENTAÇÃO/); assert.equal(c.valor, "CE LIBERADO");
  assert.equal(avaliarCondicaoConclusao(condicao, { IdStatus_Processo_Logistico: null }).estado, "pendente");
});

test("condição não reconhecida é apresentada sem inventar que passou", () => {
  const c = avaliarCondicaoConclusao({ ...condicao, Dados_Registro: "<CommandText>Select @Condicao = Case When Peso_Bruto > 100 Then 1 Else 0 End</CommandText>" }, {});
  assert.equal(c.estado, "nao_verificada");
});

test("consulta a configuração da tarefa no projeto do processo e verifica o anexo", async () => {
  const pool = bancoFalso();
  const c = await lerConfiguracaoConclusao(pool, { numero: "IM2099-25 teste", codigo: "0024" });
  assert.equal(c.encontrada, true); assert.equal(c.monitores[0].estado, "pendente"); assert.equal(c.condicoes[0].estado, "atendida");
  const texto = textoConfiguracaoConclusao(c);
  assert.match(texto, /OHBL \(grupo 61\)/); assert.match(texto, /Falta agora.*nenhum anexo/);
  assert.match(texto, /Atendida.*CE LIBERADO/);
  assert.equal(pool.consultas.length, 4);
  for (const q of pool.consultas.slice(0,3)) {
    assert.equal(q.parametros.numero, "IM2099-25 teste"); assert.equal(q.parametros.codigo, "0024");
    assert.match(q.sql, /Tar.IdProjeto_Tarefa=Pa.IdProjeto_Tarefa/);
  }
  assert.match(pool.consultas[1].sql, /Rel.Situacao_Verificacao=4/);
  assert.match(pool.consultas[2].sql, /M.Ativo=1/);
  assert.equal(pool.consultas[3].parametros.grupo0, 61);
  assert.match(pool.consultas[3].sql, /COUNT\(\*\)/);
  assert.ok(pool.consultas.every((q) => !q.sql.includes("@Situacao = Case")), "Nunca executa o SQL armazenado no cadastro");
});

test("anexo já localizado não declara conclusão nem recomenda duplicá-lo", async () => {
  const c = await lerConfiguracaoConclusao(bancoFalso({ quantidade: 1 }), { numero: "IM2099-25 teste", codigo: "0024" });
  assert.equal(c.monitores[0].estado, "anexo_localizado");
  assert.match(textoConfiguracaoConclusao(c), /Já existe 1 anexo/);
  assert.doesNotMatch(textoConfiguracaoConclusao(c), /Falta agora|Concluí/);
});

test("grupo não localizado não equivale a ausência confirmada de documento", async () => {
  const c = await lerConfiguracaoConclusao(bancoFalso({ arquivos: false }), { numero: "IM2099-25 teste", codigo: "0024" });
  assert.equal(c.monitores[0].estado, "nao_verificada");
});

test("resposta completa usa o projeto mesmo sem aprendizado prévio", async () => {
  const texto = await requisitosAtividade(bancoFalso(), { numero: "IM2099-25 teste", atividade: { Codigo: "0024", Atividade: "ENVIAR OHBL AO CLIENTE", Situacao: 1 } });
  assert.match(texto, /Conclusão automática/); assert.match(texto, /OHBL \(grupo 61\)/);
  assert.doesNotMatch(texto, /Não há uma lista confirmada|Esta leitura não confirmou um campo/);
  assert.match(texto, /sem acionar Concluir/);
});

const gatilhoConclusao = { Codigo_Origem: "0023", Atividade_Origem: "CONFERIR DOCUMENTOS", Situacao_Atual: 4, Total: 1, Concluidas: 0 };
test("sem monitor procura gatilhos que chegam na tarefa e informa a atividade que precisa concluir", async () => {
  const pool = bancoFalso({ listaMonitores: [], gatilhos: [gatilhoConclusao] });
  const c = await lerConfiguracaoConclusao(pool, { numero: "IM2099-25 teste", codigo: "0024" });
  assert.equal(c.modoConclusao, "outra_atividade");
  const texto = textoConfiguracaoConclusao(c);
  assert.match(texto, /Conclusão ao concluir outra atividade/);
  assert.match(texto, /Falta agora.*0023 · CONFERIR DOCUMENTOS/);
  assert.doesNotMatch(texto, /Conclusão manual/);
  const q = pool.consultas.find((q) => q.sql.includes("JOIN cad_Tarefa_Gatilho_Situacao"));
  assert.match(q.sql, /G.IdTarefa_Atualizar=Tar.IdTarefa/);
  assert.match(q.sql, /G.Situacao_Atualizar=4/);
  assert.match(q.sql, /Origem.IdProjeto_Tarefa=Tar.IdProjeto_Tarefa/);
  assert.match(q.sql, /Ati.IdProjeto_Atividade=Lhs.IdProjeto_Atividade/);
  assert.equal(q.parametros.numero, "IM2099-25 teste");
});

test("gatilho de origem concluída não declara que o destino também concluiu", async () => {
  const c = await lerConfiguracaoConclusao(bancoFalso({ listaMonitores: [], gatilhos: [{ ...gatilhoConclusao, Concluidas: 1 }] }), { numero: "IM2099-25 teste", codigo: "0024" });
  const texto = textoConfiguracaoConclusao(c);
  assert.match(texto, /já está\(ão\) concluída/);
  assert.match(texto, /depende de o gatilho ter sido disparado/);
  assert.doesNotMatch(texto, /Falta agora|Concluí/);
});

test("sem monitor nem gatilho informa conclusão manual preservando as condições", async () => {
  const c = await lerConfiguracaoConclusao(bancoFalso({ listaMonitores: [] }), { numero: "IM2099-25 teste", codigo: "0024" });
  assert.equal(c.modoConclusao, "manual");
  const texto = textoConfiguracaoConclusao(c);
  assert.match(texto, /Conclusão manual/);
  assert.match(texto, /Condição para concluir: PREENCHER STATUS DO PROCESSO/);
});

test("monitor apenas de cancelamento não impede procurar conclusão por outra tarefa", async () => {
  const cancelamento = { ...monitor, Dados_Registro: monitor.Dados_Registro.replace("Then 4", "Then 6") };
  const c = await lerConfiguracaoConclusao(bancoFalso({ listaMonitores: [cancelamento], gatilhos: [gatilhoConclusao] }), { numero: "IM2099-25 teste", codigo: "0024" });
  assert.equal(c.monitores.length, 0); assert.equal(c.modoConclusao, "outra_atividade");
});

test("monitor de conclusão tem prioridade e não classifica a tarefa como manual", async () => {
  const pool = bancoFalso();
  const c = await lerConfiguracaoConclusao(pool, { numero: "IM2099-25 teste", codigo: "0024" });
  assert.equal(c.modoConclusao, "monitor");
  assert.ok(!pool.consultas.some((q) => q.sql.includes("JOIN cad_Tarefa_Gatilho_Situacao")));
  assert.doesNotMatch(textoConfiguracaoConclusao(c), /Conclusão manual/);
});

test("evento diferente de concluir é descrito com a situação cadastrada", async () => {
  const c = await lerConfiguracaoConclusao(bancoFalso({ listaMonitores: [], gatilhos: [{ ...gatilhoConclusao, Situacao_Atual: 6 }] }), { numero: "IM2099-25 teste", codigo: "0024" });
  assert.match(textoConfiguracaoConclusao(c), /ficar \*\*cancelada\*\*/);
  assert.doesNotMatch(textoConfiguracaoConclusao(c), /ao concluir outra atividade|Conclusão manual/);
});

test("cadastro não localizado não é classificado como manual", () => {
  assert.doesNotMatch(textoConfiguracaoConclusao({ encontrada: false }), /Conclusão manual/);
});
