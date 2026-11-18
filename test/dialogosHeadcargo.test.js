import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

test("OCR diferencia conexão, menu da janela e campos obrigatórios sem controlar o desktop", async () => {
  const casos = [
    { titulo: "Cuidado", linhas: ["Cuidado x", "A conexão servidor foi perdida anteriormente. com o", "Deseja tentar reconectar agora?", "Não, forçar fechamento do sistema"] },
    { titulo: "", linhas: ["Fecha Ctrl+F4 r Minimizar Maximizar Restaurar Restaurar tamanho Centralizar"] },
    { titulo: "Cuidado", linhas: ["Cuidado x", "É necessário preencher os campos abaixo:", "Tipo embalagem container", "Nome Marca", "Nome Contramarca", "OK"] },
    { titulo: "Cuidado", linhas: ["Necessário preencher os campos: Marca; Contramarca", "OK"] },
    { titulo: "Cuidado", linhas: ["O usuário não possui autorização para esta ação", "OK"] },
    { titulo: "Escolha de caminho", linhas: ["Escolha de caminho", "Previsão mantida", "Previsão alterada"] },
  ];
  const comando = `$ErrorActionPreference = 'Stop'
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
    . $env:HC_DIALOGOS_SCRIPT
    $resultados = @()
    $casosLidos = ConvertFrom-Json $env:HC_DIALOGOS_CASOS
    foreach ($caso in $casosLidos) {
      $linhas = @($caso.linhas | ForEach-Object { [pscustomobject]@{ Texto = $_ } })
      $resultados += [pscustomobject]@{ tipo = (Tipo-DialogoHc $caso.titulo $linhas); campos = @(Campos-PedidosHc $linhas); texto = @(Texto-UtilHc $linhas) }
    }
    ConvertTo-Json -InputObject $resultados -Depth 5 -Compress`;
  const { stdout } = await promisify(execFile)("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(comando, "utf16le").toString("base64")], { windowsHide: true, timeout: 30000, env: { ...process.env, HC_DIALOGOS_SCRIPT: fileURLToPath(new URL("../server/dialogosHeadcargo.ps1", import.meta.url)), HC_DIALOGOS_CASOS: JSON.stringify(casos) } });
  const r = JSON.parse(stdout.replace(/^\uFEFF/, "").trim());
  assert.ok(Array.isArray(r), stdout);
  assert.equal(r.length, 6, stdout);
  assert.equal(r[0].tipo, "conexao"); assert.deepEqual(r[0].campos, []);
  assert.equal(r[1].tipo, "menu"); assert.deepEqual(r[1].texto, []); assert.deepEqual(r[1].campos, []);
  assert.equal(r[2].tipo, "campos"); assert.deepEqual(r[2].campos, ["Tipo embalagem container", "Nome Marca", "Nome Contramarca"]);
  assert.deepEqual(r[3].campos, ["Marca", "Contramarca"]);
  assert.equal(r[4].tipo, ""); assert.deepEqual(r[4].campos, []);
  assert.equal(r[5].tipo, "caminho");
});
