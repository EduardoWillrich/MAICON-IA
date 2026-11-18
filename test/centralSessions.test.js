import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('revogação local impede reutilizar sessão assinada do MAICON IA',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'maicon-session-test-'));
  try {
    const code=`
      import assert from 'node:assert/strict';
      const {criarSessaoAssinada}=await import('./server/sessaoAssinada.js');
      const {contaDoToken}=await import('./server/identidade.js');
      const {appSessions}=await import('./server/centralSessions.js');
      const token=criarSessaoAssinada('usuario@test.invalid','Teste');
      assert.equal((await contaDoToken(token)).email,'usuario@test.invalid');
      appSessions.revoke(appSessions.reference(token));
      await assert.rejects(contaDoToken(token),/encerrada pela central/);
      const next=criarSessaoAssinada('usuario@test.invalid','Teste',Date.now()+10);
      assert.equal((await contaDoToken(next)).email,'usuario@test.invalid');
    `;
    const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,MAICON_DATA_DIR:dir,MAICON_SESSION_SECRET:'segredo-local-somente-para-teste-123'},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
  } finally {rmSync(dir,{recursive:true,force:true});}
});


test('token Google, emissão paralela e renovação contam como a mesma sessão',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'maicon-session-handoff-'));
  try {
    const code=`
      import assert from 'node:assert/strict';
      globalThis.fetch=async(url)=>Response.json(String(url).includes('people.googleapis.com')?{photos:[]}:{aud:'client-test',email:'pessoa@test.invalid',email_verified:true,name:'Pessoa'});
      const {contaDoToken}=await import('./server/identidade.js');
      const {appSessions}=await import('./server/centralSessions.js');
      const {criarSessaoAssinada,lerSessaoAssinada}=await import('./server/sessaoAssinada.js');
      const first=await contaDoToken('google-device-a');
      const again=await contaDoToken('google-device-a');
      assert.equal(first.entregarSessao,again.entregarSessao,'Reemissão da mesma autenticação é estável');
      await contaDoToken(first.entregarSessao);
      assert.equal(appSessions.snapshot().length,1);
      const other=await contaDoToken('google-device-b');
      assert.notEqual(other.entregarSessao,first.entregarSessao);
      assert.equal(appSessions.snapshot().length,2,'Logins independentes continuam separados');
      const old=criarSessaoAssinada('pessoa@test.invalid','Pessoa',Date.now()-24*86400000);
      const renewed=await contaDoToken(old);
      assert.ok(renewed.entregarSessao);
      assert.equal(lerSessaoAssinada(old).sid,lerSessaoAssinada(renewed.entregarSessao).sid);
      await contaDoToken(renewed.entregarSessao);
      assert.equal(appSessions.reference(old),appSessions.reference(renewed.entregarSessao));
      assert.equal(appSessions.snapshot().length,3);
      appSessions.revoke(appSessions.reference(first.entregarSessao));
      await assert.rejects(contaDoToken('google-device-a'),/encerrada/);
      await assert.rejects(contaDoToken(first.entregarSessao),/encerrada/);
      await contaDoToken(other.entregarSessao);
    `;
    const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,MAICON_DATA_DIR:dir,VITE_GOOGLE_CLIENT_ID:'client-test',MAICON_SESSION_SECRET:'segredo-local-somente-para-teste-123'},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
