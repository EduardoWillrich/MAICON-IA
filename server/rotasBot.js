import { painelExcecoes } from "./inteligenciaOperacional.js";
import { textoTarefa } from "./operacoesBot.js";
import { abrirAtividade } from "./abrirAtividade.js";

export function instalarRotasBot(app, { motor, acesso, conectar }) {
  app.use("/api/bot", (req, res, next) => {
    const permissao = acesso(req.conta.email);
    if (permissao.removida || permissao.papel !== "admin") return res.status(403).json({ erro: "Os comandos do bot são restritos ao administrador." });
    next();
  });
  const rota = (metodo, caminho, executar) => app[metodo](`/api/bot${caminho}`, async (req, res) => {
    try { res.json(await executar(req, req.conta.email)); }
    catch (erro) { res.status(400).json({ erro: erro.message || "Não foi possível concluir a operação." }); }
  });
  rota("get", "/tarefas", (_req, conta) => ({ tarefas: motor.listar(conta), desktopDisponivel: process.platform === "win32" }));
  rota("post", "/abrir-atividade", async (req, conta) => {
    const pool = await conectar();
    try { return await abrirAtividade(pool, req.body?.idAtividade, acesso(conta)); }
    finally { await pool.close().catch(() => {}); }
  });
  rota("get", "/tarefas/:id", (req, conta) => { const t = motor.obter(req.params.id, conta); return { ...t, texto: textoTarefa(t) }; });
  rota("post", "/tarefas", (req, conta) => motor.criar(conta, req.body));
  rota("post", "/tarefas/:id/controle", (req, conta) => motor.controlar(req.params.id, conta, req.body.acao, req.body));
  rota("get", "/rotinas", (_req, conta) => ({ rotinas: motor.rotinas(conta) }));
  rota("post", "/rotinas", (req, conta) => motor.salvarRotina(conta, req.body));
  rota("post", "/rotinas/previa", (req, conta) => motor.daRotina(conta, req.body));
  rota("get", "/regras", (_req, conta) => ({ regras: motor.regras(conta) }));
  rota("post", "/regras", (req, conta) => motor.salvarRegra(conta, req.body));
  rota("delete", "/regras/:id", (req, conta) => ({ removida: motor.removerRegra(conta, req.params.id) }));
  rota("get", "/excecoes", async (_req, conta) => painelExcecoes(await conectar(), motor, conta));
}
