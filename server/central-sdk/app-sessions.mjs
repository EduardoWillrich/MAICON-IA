import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { MaiconAgent } from './maicon-agent.mjs';

const hash = value => createHash('sha256').update(String(value)).digest('hex');
export class AppSessionTracker {
  constructor(file) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file, { timeout: 2000 });
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=2000;
      CREATE TABLE IF NOT EXISTS tracked_sessions(session_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,started_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,expires_at TEXT NOT NULL,ended_at TEXT,revoked INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS session_aliases(credential_ref TEXT PRIMARY KEY,session_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tracker_meta(name TEXT PRIMARY KEY,value TEXT NOT NULL);`);
    if (!this.db.prepare('PRAGMA table_info(tracked_sessions)').all().some(c => c.name === 'retired')) this.db.exec('ALTER TABLE tracked_sessions ADD COLUMN retired INTEGER NOT NULL DEFAULT 0');
  }
  resolve(reference) { return this.db.prepare('SELECT session_id FROM session_aliases WHERE credential_ref=?').get(reference)?.session_id || reference; }
  reference(token) { return this.resolve(hash(token)); }
  isRevoked(token) { return !!this.db.prepare('SELECT revoked FROM tracked_sessions WHERE session_id=?').get(this.reference(token))?.revoked; }
  retireLegacyTracking() {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.db.prepare("SELECT 1 FROM tracker_meta WHERE name='credential-families-v1'").get()) {
        // Reconstrói apenas o inventário antigo. A autenticação existente e as revogações são preservadas.
        this.db.prepare('UPDATE tracked_sessions SET retired=1,ended_at=? WHERE ended_at IS NULL AND revoked=0').run(new Date().toISOString());
        this.db.prepare("INSERT INTO tracker_meta VALUES('credential-families-v1',?)").run(new Date().toISOString());
      }
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  touch(token, { email, name, expiresAt }) {
    if (!token || !email?.includes('@') || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
    const ref = this.reference(token), now = new Date().toISOString();
    const old = this.db.prepare('SELECT revoked,ended_at,last_seen_at,retired FROM tracked_sessions WHERE session_id=?').get(ref);
    if (old?.revoked || (old?.ended_at && !old.retired)) return false;
    if (old && !old.retired && Date.now() - Date.parse(old.last_seen_at) < 10000) return true;
    this.db.prepare('INSERT INTO tracked_sessions(session_id,user_id,name,email,started_at,last_seen_at,expires_at,ended_at,revoked) VALUES(?,?,?,?,?,?,?,NULL,0) ON CONFLICT(session_id) DO UPDATE SET name=excluded.name,last_seen_at=excluded.last_seen_at,expires_at=excluded.expires_at,ended_at=NULL,retired=0')
      .run(ref, hash(email.toLowerCase()), String(name || email).slice(0,120), email.toLowerCase().slice(0,200), now, now, new Date(expiresAt).toISOString());
    return true;
  }
  linkTokens(token, replacement, { expiresAt } = {}) {
    const source = this.reference(token), target = this.reference(replacement);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.db.prepare('SELECT * FROM tracked_sessions WHERE session_id=?').get(source);
      const previous = this.db.prepare('SELECT * FROM tracked_sessions WHERE session_id=?').get(target);
      if (!current || current.revoked || current.ended_at || previous?.revoked || (previous?.ended_at && !previous.retired) || (previous && previous.user_id !== current.user_id)) { this.db.exec('ROLLBACK'); return false; }
      if (source !== target) {
        this.db.prepare('UPDATE session_aliases SET session_id=? WHERE session_id=?').run(source,target);
        for (const ref of [target,hash(replacement)]) this.db.prepare('INSERT INTO session_aliases VALUES(?,?) ON CONFLICT(credential_ref) DO UPDATE SET session_id=excluded.session_id').run(ref,source);
        if (previous) this.db.prepare('UPDATE tracked_sessions SET ended_at=?,retired=0 WHERE session_id=?').run(new Date().toISOString(),target);
      }
      if (Number.isFinite(expiresAt) && expiresAt > Date.now()) this.db.prepare('UPDATE tracked_sessions SET expires_at=MAX(expires_at,?) WHERE session_id=?').run(new Date(expiresAt).toISOString(),source);
      this.db.exec('COMMIT'); return true;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  end(token) { this.db.prepare('UPDATE tracked_sessions SET ended_at=?,retired=0 WHERE session_id=?').run(new Date().toISOString(), this.reference(token)); }
  endAll() { this.db.prepare('UPDATE tracked_sessions SET ended_at=? WHERE ended_at IS NULL').run(new Date().toISOString()); }
  revoke(reference) {
    reference = this.resolve(reference);
    const old = this.db.prepare('SELECT revoked FROM tracked_sessions WHERE session_id=?').get(reference);
    if (!old) return 'not_found';
    this.db.prepare('UPDATE tracked_sessions SET revoked=1,ended_at=? WHERE session_id=?').run(new Date().toISOString(), reference);
    return 'applied';
  }
  snapshot() {
    const sessions = this.db.prepare('SELECT session_id,user_id,name,email,started_at,last_seen_at,expires_at FROM tracked_sessions WHERE ended_at IS NULL AND expires_at>? ORDER BY session_id LIMIT 101').all(new Date().toISOString());
    if (sessions.length > 100) throw new Error('Mais de 100 sessões: relatório completo excede o limite');
    return sessions;
  }
  close() { this.db.close(); }
}

export class AppSessionBridge {
  constructor({ tracker, url, token, outbox, transport, onError = () => {} }) {
    this.tracker = tracker; this.onError = onError; this.running = false; this.timer = null; this.lastHeartbeat = 0;
    this.sdk = new MaiconAgent({ url, token, outbox, transport });
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const config = await this.sdk.connect();
      if (config.scopes.includes('heartbeat:write') && Date.now() - this.lastHeartbeat >= 30000) { await this.sdk.heartbeat({ version: 'sessions-1.0.0' }); this.lastHeartbeat = Date.now(); }
      if (config.scopes.includes('sessions:control')) {
        const { commands } = await this.sdk.request(`/v1/agent/session-commands?instance_id=${encodeURIComponent(this.sdk.instanceId)}`);
        for (const command of commands) {
          // A revogação é persistida antes do ack: perda da conexão não reabre a sessão.
          const status = this.tracker.revoke(command.session_id);
          await this.sdk.request(`/v1/agent/session-commands/${command.id}/ack`, { instance_id: this.sdk.instanceId, status });
        }
      }
      if (config.scopes.includes('sessions:report')) await this.sdk.request('/v1/agent/sessions', { instance_id: this.sdk.instanceId, observed_at: new Date().toISOString(), sessions: this.tracker.snapshot() });
    } finally { this.running = false; }
  }
  start() {
    if (this.timer) return;
    const tick = () => { void this.tick().catch(this.onError); };
    this.timer = setInterval(tick, 15000); this.timer.unref(); tick();
  }
  async close() { clearInterval(this.timer); this.timer = null; while (this.running) await new Promise(resolve => setTimeout(resolve,25)); await this.sdk.close(); }
}
