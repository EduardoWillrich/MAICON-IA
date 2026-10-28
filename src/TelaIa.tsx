import { useEffect, useState } from "react";
import { ChatIa } from "./ChatIa";
import { capturarLogIa, executarFerramentaIa } from "./ferramentasIa";
import { eventosDoPdf, OPCOES_PDF_PADRAO, PdfHistorico, type LogPdf, type OpcoesPdf } from "./PdfHistorico";
import { OpcoesPdfModal } from "./OpcoesPdfModal";
import { camposDoResultado, usuariosDoResultado } from "./filtrosResultado";
import type { UsuarioGoogle } from "./sessao";

type Acesso = {
  admin: boolean;
  log: boolean;
  memoria: boolean;
  pendencias: boolean;
  consulta: boolean;
  sql: boolean;
  relatorio: boolean;
  excel: boolean;
  setor: string;
  modalidade: string;
  cargo: string;
  encontrado: boolean;
  semComissao: boolean;
};

const ACESSO_INICIAL: Acesso = {
  admin: false,
  log: false,
  memoria: false,
  pendencias: true,
  consulta: false,
  sql: false,
  relatorio: true,
  excel: false,
  setor: "geral",
  modalidade: "",
  cargo: "",
  encontrado: false,
  semComissao: false,
};

function chaveAcesso(email: string) {
  return `maicon-acesso:${email.trim().toLowerCase()}`;
}

function lerAcesso(email: string): Acesso | null {
  try {
    const dados = JSON.parse(sessionStorage.getItem(chaveAcesso(email)) || "");
    if (!dados || typeof dados.admin !== "boolean" || typeof dados.setor !== "string") return null;
    return { ...ACESSO_INICIAL, ...dados };
  } catch {
    return null;
  }
}

export function TelaIa({ usuario, onSair }: { usuario: UsuarioGoogle; onSair: () => void }) {
  const acessoSalvo = lerAcesso(usuario.email);
  const [permissoes, setPermissoes] = useState<Acesso>(acessoSalvo ?? ACESSO_INICIAL);
  const [acessoConfirmado, setAcessoConfirmado] = useState(Boolean(acessoSalvo));
  const [visao, setVisao] = useState(() => (acessoSalvo && !acessoSalvo.admin && acessoSalvo.setor ? acessoSalvo.setor : "ti"));
  const [removido, setRemovido] = useState(false);

  useEffect(() => {
    let ativo = true;
    let pedidoAtual = 0;
    async function carregar() {
      const pedido = ++pedidoAtual;
      try {
        const resp = await fetch(`/api/acesso?email=${encodeURIComponent(usuario.email)}&nome=${encodeURIComponent(usuario.nome)}`);
        if (!ativo || pedido !== pedidoAtual) return;
        if (resp.status === 403) {
          const dados = await resp.json().catch(() => null);
          if (dados?.removida) {
            sessionStorage.removeItem(chaveAcesso(usuario.email));
            setRemovido(true);
          }
          return;
        }
        if (!resp.ok) return;
        const dados = await resp.json();
        if (!ativo || pedido !== pedidoAtual) return;
        if (dados?.removida) {
          sessionStorage.removeItem(chaveAcesso(usuario.email));
          setRemovido(true);
          return;
        }
        if (dados?.papel !== "admin" && dados?.papel !== "usuario") return;
        const admin = dados.papel === "admin";
        const setor = typeof dados.setor === "string" && dados.setor ? dados.setor : "geral";
        const proximas: Acesso = {
          admin,
          log: Boolean(dados.verLog && dados.fazerLog),
          memoria: Boolean(dados.verMemoria && dados.fazerMemoria),
          pendencias: dados.verPendencias !== false,
          consulta: Boolean(dados.verConsulta),
          sql: Boolean(dados.fazerSql),
          relatorio: dados.fazerRelatorio !== false,
          excel: Boolean(dados.fazerExcel),
          setor,
          modalidade: typeof dados.modalidade === "string" ? dados.modalidade : "",
          cargo: typeof dados.cargo === "string" ? dados.cargo : "",
          encontrado: Boolean(dados.encontrado),
          semComissao: Boolean(dados.semComissao),
        };
        setPermissoes(proximas);
        setAcessoConfirmado(true);
        sessionStorage.setItem(chaveAcesso(usuario.email), JSON.stringify(proximas));
        if (!admin) setVisao(setor);
      } catch {
        /* falha de rede não tira o papel já confirmado */
      }
    }
    void carregar();
    const timer = window.setInterval(() => void carregar(), 15000);
    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, [usuario.email, usuario.nome]);
  const [log, setLog] = useState<LogPdf | null>(null);
  const [opcoesAbertas, setOpcoesAbertas] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesPdf>(OPCOES_PDF_PADRAO);
  const [imprimindo, setImprimindo] = useState(false);

  function gerar(proximas: OpcoesPdf) {
    setOpcoes(proximas);
    setOpcoesAbertas(false);
    setImprimindo(true);
    window.setTimeout(() => {
      const tituloOriginal = document.title;
      document.title = `Relatório ${log?.titulo ?? ""}`;
      window.print();
      document.title = tituloOriginal;
      setImprimindo(false);
    }, 150);
  }

  if (removido) {
    return (
      <div className="chat-acesso-removido">
        <strong>Seu acesso à IA foi removido.</strong>
        <p>Peça a um administrador se precisar entrar de novo.</p>
        <button type="button" onClick={onSair}>Sair</button>
      </div>
    );
  }

  return (
    <>
      <ChatIa
        api=""
        aberto
        fixo
        email={usuario.email}
        nome={usuario.nome}
        foto={usuario.foto}
        admin={permissoes.admin}
        setor={permissoes.setor}
        modalidade={permissoes.modalidade}
        encontrado={permissoes.encontrado}
        visao={visao}
        onVisao={setVisao}
        onAcessoRemovido={() => setRemovido(true)}
        permissoes={permissoes}
        acessoConfirmado={acessoConfirmado}
        onSair={() => {
          sessionStorage.removeItem(chaveAcesso(usuario.email));
          onSair();
        }}
        onAbrir={() => {}}
        onFechar={() => {}}
        onTelaCheia={() => {}}
        executar={(nome, args, sinal) => {
          if (
            (nome === "executar_sql" && !permissoes.sql) ||
            ((nome === "consultar_log" || nome === "resultado_atual" || nome === "explicar_itens_carga" || nome === "explicar_campo_livre") && !permissoes.log)
          ) {
            return Promise.resolve("Erro: seu acesso não permite essa ação.");
          }
          return executarFerramentaIa(nome, args, sinal, {
            email: usuario.email,
            nome: usuario.nome,
            visao: permissoes.admin ? visao : permissoes.setor,
          });
        }}
        capturarLog={capturarLogIa}
        onImprimirLog={(item) => {
          setLog(item);
          setOpcoesAbertas(true);
        }}
      />
      <OpcoesPdfModal
        aberto={opcoesAbertas}
        usuarios={usuariosDoResultado(log?.eventos ?? [])}
        campos={camposDoResultado(log?.eventos ?? [])}
        onFechar={() => setOpcoesAbertas(false)}
        onGerar={gerar}
      />
      {imprimindo && log ? (
        <PdfHistorico
          eventos={eventosDoPdf(log.eventos, opcoes)}
          opcoes={opcoes}
          titulo={log.titulo}
          periodo={log.periodo}
        />
      ) : null}
    </>
  );
}
