import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const script = join(dirname(fileURLToPath(import.meta.url)), "..", "server", "preencherCampo.ps1");

function palavra(t, x, y, w, h) {
  return { t, x, y, w, h };
}

const casos = [
  {
    id: "data",
    pedido: "DATA EMBARQUE",
    valor: "20/01/2027",
    palavras: [
      palavra("Data", 200, 200, 120, 16),
      palavra("Embarque", 200, 200, 120, 16),
      palavra("Situação", 400, 200, 140, 16),
      palavra("Embarque", 400, 200, 140, 16),
    ],
  },
  {
    id: "so-embarque",
    pedido: "EMBARQUE",
    valor: "20/01/2027",
    palavras: [
      palavra("Data", 200, 200, 120, 16),
      palavra("Embarque", 200, 200, 120, 16),
      palavra("Situação", 400, 200, 140, 16),
      palavra("Embarque", 400, 200, 140, 16),
    ],
  },
  {
    id: "situacao",
    pedido: "SITUACAO EMBARQUE",
    valor: "Embarcado",
    palavras: [
      palavra("Data", 200, 200, 120, 16),
      palavra("Embarque", 200, 200, 120, 16),
      palavra("Situação", 400, 200, 140, 16),
      palavra("Embarque", 400, 200, 140, 16),
    ],
  },
  {
    id: "carga",
    pedido: "TIPO DE CARGA",
    valor: "FCL",
    palavras: [
      palavra("Tipo", 30, 80, 28, 14),
      palavra("de", 62, 80, 16, 14),
      palavra("Carga", 82, 80, 40, 14),
      palavra("Situação", 220, 80, 70, 14),
      palavra("Embarque", 294, 80, 60, 14),
    ],
  },
];

test("data de embarque não escolhe situação embarque", async () => {
  const { stdout } = await exec(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
    {
      env: { ...process.env, HC_TESTE_ROTULO: "1", HC_CASOS: JSON.stringify(casos) },
      timeout: 60000,
      windowsHide: true,
    },
  );
  const linhas = Object.fromEntries(
    stdout
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter((linha) => linha.startsWith("CASO|"))
      .map((linha) => {
        const [, id, texto] = linha.split("|");
        return [id, texto || ""];
      }),
  );
  assert.equal(linhas.data, "DATA EMBARQUE");
  assert.equal(linhas["so-embarque"], "DATA EMBARQUE");
  assert.equal(linhas.situacao, "SITUACAO EMBARQUE");
  assert.equal(linhas.carga, "TIPO DE CARGA");
  assert.equal(linhas["aba-sem"], "");
  assert.equal(linhas["aba-com"], "DATA DE EMBARQUE");
});
