from pathlib import Path
import json
import re
from pypdf import PdfReader

PDF = Path(r"c:\Users\Conline47\Desktop\DICIONARIO 2024.pdf")
OUT = Path(r"C:\Users\Conline47\consulta-log-tabela\src\dicionario.ts")

SKIP = {
    "DICIONARIO",
    "2024",
    "TABELA",
    "TIPO",
    "CAMPO",
    "DOMÍNIO",
    "DOMINIO",
    "TABELA DESTINO",
    "PAGE",
    "OF",
}

reader = PdfReader(str(PDF))
pages = []
for page in reader.pages:
    pages.append(page.extract_text() or "")
text = "\n".join(pages)
lines = [ln.strip() for ln in text.splitlines()]

tabelas: dict[str, list[str]] = {}
atual = None
aguardando_nome = False
pulou_tipo = False

header_re = re.compile(r"^Campo\s+Domínio", re.I)
page_re = re.compile(r"Page\s+\d+\s+of\s+\d+", re.I)
clock_re = re.compile(r"^\d{2}/\d{2}/\d{4}")
of_re = re.compile(r"^--\s*\d+\s+of\s+\d+")
table_name_re = re.compile(r"^[a-z]{2,5}_[A-Za-z0-9_]+$")
col_re = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

i = 0
while i < len(lines):
    ln = lines[i]
    i += 1
    if not ln:
        continue
    if ln == "TABELA":
        atual = None
        aguardando_nome = True
        pulou_tipo = False
        continue
    if aguardando_nome:
        if table_name_re.match(ln):
            atual = ln
            tabelas.setdefault(atual, [])
            aguardando_nome = False
        continue
    if atual is None:
        continue
    if ln == "Tipo":
        pulou_tipo = True
        continue
    if pulou_tipo:
        pulou_tipo = False
        continue
    if header_re.match(ln) or ln.startswith("TABELA DESTINO") or ln.startswith("Tabela em que"):
        continue
    if page_re.search(ln) or clock_re.match(ln) or of_re.match(ln) or ln.startswith("joao."):
        continue
    if ln.upper().startswith("DICIONARIO"):
        continue
    token = ln.split()[0]
    if token in {"int", "varchar", "tinyint", "smallint", "bigint", "bit", "text", "image", "datetime", "varbinary"}:
        continue
    if col_re.match(token) and not table_name_re.match(token):
        if token not in tabelas[atual]:
            tabelas[atual].append(token)

# Prefer PK-like columns first for UI
def ordenar(cols: list[str]) -> list[str]:
    pks = [c for c in cols if c.startswith("Id") and c.count("_") <= 2]
    resto = [c for c in cols if c not in pks]
    return pks + resto

items = [{"tabela": t, "colunas": ordenar(cs)} for t, cs in sorted(tabelas.items()) if cs]

OUT.write_text(
    "export type TabelaDicionario = {\n  tabela: string;\n  colunas: string[];\n};\n\n"
    "export const DICIONARIO: TabelaDicionario[] = "
    + json.dumps(items, ensure_ascii=False, indent=2)
    + ";\n\nexport const NOMES_TABELAS = DICIONARIO.map((t) => t.tabela);\n\n"
    "export function colunasDaTabela(nome: string): string[] {\n"
    "  return DICIONARIO.find((t) => t.tabela.toLowerCase() === nome.toLowerCase())?.colunas ?? [];\n"
    "}\n",
    encoding="utf-8",
)

print(f"tabelas={len(items)} colunas={sum(len(x['colunas']) for x in items)}")
print("primeiras", [x["tabela"] for x in items[:8]])
print("mov_Atividade", next((x["colunas"][:12] for x in items if x["tabela"]=="mov_Atividade"), None))
