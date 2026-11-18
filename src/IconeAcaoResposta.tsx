export function IconeAcaoResposta({ nome }: { nome: "copiar" | "copiado" | "positivo" | "negativo" }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {nome === "copiar" ? <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></> : nome === "copiado" ? <path d="m5 12 4 4L19 6"/> : nome === "positivo" ? <><path d="M7 10 11 3a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2l-1 8a2 2 0 0 1-2 2H7Z"/><path d="M3 10h4v11H3z"/></> : <><path d="m7 14 4 7a2 2 0 0 0 2-2v-4h5a2 2 0 0 0 2-2l-1-8a2 2 0 0 0-2-2H7Z"/><path d="M3 3h4v11H3z"/></>}
  </svg>;
}
