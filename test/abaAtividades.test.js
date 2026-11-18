import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';

test('localiza a aba abaixo de 340 pixels e acima da área do frame, sem clicar em homônimos',async()=>{
 const comando=`$ErrorActionPreference='Stop'
 . $env:HC_ABA_SCRIPT
 function Normalizar([string]$v){return $v.ToUpperInvariant()}
 $origem=[pscustomobject]@{L=100;T=50}
 $quadro=[pscustomobject]@{L=100;R=1000;T=580}
 $p=[pscustomobject]@{T='Atividades';X=250;Y=500;W=80;H=20}
 $resultados=@()
 $resultados+=Ponto-AbaAtividades @($p) $origem $quadro
 $resultados+=Ponto-AbaAtividades @($p,$p) $origem $quadro
 $resultados+=Ponto-AbaAtividades @([pscustomobject]@{T='Atividades';X=250;Y=200;W=80;H=20}) $origem $quadro
 ConvertTo-Json -InputObject $resultados -Compress`;
 const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from(comando,'utf16le').toString('base64')],{windowsHide:true,env:{...process.env,HC_ABA_SCRIPT:fileURLToPath(new URL('../server/abaAtividades.ps1',import.meta.url))}});
 const r=JSON.parse(stdout.replace(/^\uFEFF/,''));assert.deepEqual(r[0],{X:390,Y:560});assert.equal(r[1],null);assert.equal(r[2],null);
});
test('a busca da linha só acontece depois da confirmação de abertura da aba',async()=>{
 const fonte=await readFile(new URL('../server/concluirAtividade.ps1',import.meta.url),'utf8');
 assert.match(fonte,/if \(-not \(Abrir-Atividades\)\)/);
 assert.ok(fonte.indexOf('if (-not (Abrir-Atividades))')<fonte.indexOf('$foto = Join-Path $env:TEMP "hc-concluir.png"'));
 assert.doesNotMatch(fonte,/\[void\]\(Abrir-Atividades\)/);
 assert.match(fonte,/Fundo\(\$script:janela, \$ponto.X, \$ponto.Y\)/);
 const chat=await readFile(new URL('../src/ChatIa.tsx',import.meta.url),'utf8');
 assert.match(chat,/"comando_bot",\s*"tarefa_bot"/);
});
