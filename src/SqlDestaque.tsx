const PALAVRAS = new Set(
  "select from where join left right full inner outer cross on and or as order by group having insert update delete set values into top distinct case when then else end null not in is like between exists union all with asc desc over partition offset fetch next only rows apply pivot unpivot declare begin if while return create alter drop table index view primary key foreign references default constraint go nolock cast convert isnull coalesce nullif getdate dateadd datediff datefromparts year month day count sum avg min max".split(
    " ",
  ),
);

const RE =
  /(--[^\n]*|\/\*[\s\S]*?\*\/|N?'(?:''|[^'])*'|\[[^\]]*\]|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w]*|<>|!=|<=|>=|\n|.)/g;

function classe(token: string, proximo: string) {
  if (token.startsWith("--") || token.startsWith("/*")) return "sql-com";
  if (token.startsWith("'") || token.startsWith("N'")) return "sql-str";
  if (/^\d/.test(token)) return "sql-num";
  if (/^[A-Za-z_]/.test(token)) {
    if (PALAVRAS.has(token.toLowerCase())) return "sql-kw";
    if (proximo.trimStart().startsWith("(")) return "sql-fn";
    return "sql-id";
  }
  if (/^(?:<>|!=|<=|>=|=|<|>)$/.test(token)) return "sql-op";
  return "";
}

function tokensDe(sql: string) {
  return (sql.match(RE) ?? []).filter((token) => !/^\s+$/.test(token));
}

function clausula(tokens: string[], indice: number) {
  const igual = (posicao: number, palavra: string) => (tokens[indice + posicao] ?? "").toUpperCase() === palavra;
  const grupos = [
    ["SELECT"],
    ["FROM"],
    ["WHERE"],
    ["HAVING"],
    ["ORDER", "BY"],
    ["GROUP", "BY"],
    ["LEFT", "OUTER", "JOIN"],
    ["RIGHT", "OUTER", "JOIN"],
    ["FULL", "OUTER", "JOIN"],
    ["INNER", "JOIN"],
    ["LEFT", "JOIN"],
    ["RIGHT", "JOIN"],
    ["FULL", "JOIN"],
    ["CROSS", "APPLY"],
    ["OUTER", "APPLY"],
    ["CROSS", "JOIN"],
    ["JOIN"],
    ["UNION", "ALL"],
    ["UNION"],
    ["ON"],
  ];
  for (const grupo of grupos) {
    if (grupo.every((palavra, posicao) => igual(posicao, palavra))) {
      return { texto: tokens.slice(indice, indice + grupo.length).join(" "), pula: grupo.length };
    }
  }
  return null;
}

function formatarUma(sql: string) {
  const tokens = tokensDe(sql);
  const linhas: string[] = [];
  let atual = "";
  let depth = 0;
  let selectDepth = -1;
  let clausulaDepth = -1;
  let recuo = 0;
  const despejar = (extra = recuo) => {
    const texto = atual.replace(/\s+/g, " ").trim();
    if (texto) linhas.push(`${"  ".repeat(Math.max(0, depth + extra))}${texto}`);
    atual = "";
    recuo = 0;
  };
  const espaco = () => {
    if (atual && !/[\s(]$/.test(atual)) atual += " ";
  };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "(") {
      depth += 1;
      espaco();
      atual += "(";
      continue;
    }
    if (token === ")") {
      depth = Math.max(0, depth - 1);
      atual += ")";
      continue;
    }
    const inicio = clausula(tokens, i);
    if (inicio) {
      despejar();
      i += inicio.pula - 1;
      clausulaDepth = depth;
      if (inicio.texto.toUpperCase() === "SELECT") {
        let linha = "SELECT";
        let proximo = i + 1;
        if ((tokens[proximo] ?? "").toUpperCase() === "DISTINCT") {
          linha += " DISTINCT";
          proximo += 1;
        }
        if ((tokens[proximo] ?? "").toUpperCase() === "TOP") {
          linha += " TOP";
          proximo += 1;
          if (tokens[proximo] === "(") {
            let fim = proximo;
            let nivel = 0;
            while (fim < tokens.length) {
              if (tokens[fim] === "(") nivel += 1;
              if (tokens[fim] === ")") nivel -= 1;
              fim += 1;
              if (nivel === 0) break;
            }
            linha += ` ${tokens.slice(proximo, fim).join("")}`;
            proximo = fim;
          } else if (tokens[proximo]) {
            linha += ` ${tokens[proximo]}`;
            proximo += 1;
          }
        }
        linhas.push(`${"  ".repeat(depth)}${linha}`);
        i = proximo - 1;
        selectDepth = depth;
        continue;
      }
      selectDepth = -1;
      atual = inicio.texto;
      if (inicio.texto.toUpperCase() === "ON") recuo = 1;
      continue;
    }
    const palavra = token.toUpperCase();
    if ((palavra === "AND" || palavra === "OR") && depth === clausulaDepth && atual.trim()) {
      despejar();
      atual = token;
      recuo = 1;
      continue;
    }
    if (token === "," && selectDepth === depth) {
      atual += ",";
      despejar(1);
      continue;
    }
    const anterior = atual.slice(-1);
    const junto = token === "." || token === "," || token === ")" || anterior === "." || anterior === "(" || anterior === "@";
    if (!junto) espaco();
    atual += token;
  }
  despejar();
  return linhas.join("\n");
}

function formatarSql(sql: string) {
  return sql
    .split(/\n{2,}/)
    .map((parte) => formatarUma(parte))
    .join("\n\n");
}

export function SqlDestaque({ texto }: { texto: string }) {
  const tokens = formatarSql(texto).match(RE) ?? [texto];
  return (
    <pre className="chat-consulta">
      <code>
        {tokens.map((token, i) => {
          const tipo = classe(token, tokens.slice(i + 1, i + 4).join(""));
          return tipo ? (
            <span key={i} className={tipo}>
              {token}
            </span>
          ) : (
            token
          );
        })}
      </code>
    </pre>
  );
}
