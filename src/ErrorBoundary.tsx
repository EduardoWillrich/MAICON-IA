import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { erro: string; geracao: number };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: "", geracao: 0 };

  static getDerivedStateFromError(erro: Error): Partial<State> {
    return { erro: erro.message || "Falha ao montar a tela." };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error(erro, info.componentStack);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="app">
          <h1>Não foi possível mostrar esse resultado</h1>
          <p className="erro">{this.state.erro}</p>
          <p className="dica">Os filtros continuam disponíveis. Volte e busque com um período menor.</p>
          <button
            type="button"
            className="btn-aplicar"
            onClick={() =>
              this.setState((s) => ({ erro: "", geracao: s.geracao + 1 }))
            }
          >
            Voltar aos filtros
          </button>
        </div>
      );
    }
    return <div key={this.state.geracao}>{this.props.children}</div>;
  }
}
