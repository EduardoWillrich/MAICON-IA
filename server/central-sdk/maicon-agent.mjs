import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export class MaiconAgent {
  constructor({ url = process.env.MAICON_CENTRAL_URL, token = process.env.MAICON_AGENT_TOKEN, outbox = './data/maicon-outbox.sqlite', transport = fetch, onError = () => {} } = {}) {
    if (!url || !token) throw new Error('Configure MAICON_CENTRAL_URL e MAICON_AGENT_TOKEN');
    const parsed = new URL(url); if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)))) throw new Error('Use HTTPS ou HTTP exclusivamente em loopback');
    this.url = parsed.origin; this.token = token; this.transport = transport; this.onError = onError; this.timer = null; this.busy = false; this.closed = false; this.configuration = null;
    mkdirSync(path.dirname(path.resolve(outbox)), { recursive: true }); this.db = new DatabaseSync(outbox, { timeout: 2000 });
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS metadata(name TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,route TEXT NOT NULL,payload TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,retry_at INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',last_status INTEGER,created_at TEXT NOT NULL);`);
    this.db.prepare("INSERT OR IGNORE INTO metadata VALUES('instance',?)").run(randomUUID()); this.instanceId = this.db.prepare("SELECT value FROM metadata WHERE name='instance'").get().value;
  }
  async request(route, body, headers = {}) {
    const response = await this.transport(`${this.url}${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${this.token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const data = await response.json(); if (!response.ok) throw Object.assign(new Error(data.error?.message || `Central retornou HTTP ${response.status}`), { status: response.status }); return data;
  }
  async connect() {
    const config = await this.request('/v1/agent/config'); const identity = this.db.prepare("SELECT value FROM metadata WHERE name='agent'").get()?.value;
    if (identity && identity !== config.agent_id) throw new Error('Outbox pertence a outro agente. Use um arquivo separado.');
    this.db.prepare("INSERT OR IGNORE INTO metadata VALUES('agent',?)").run(config.agent_id); this.configuration = config; return config;
  }
  async heartbeat({ version = '1.0.0', health = 'healthy' } = {}) { return this.request('/v1/agent/heartbeat', { instance_id: this.instanceId, version, health }); }
  enqueue(route, event) {
    if (this.closed) throw new Error('SDK encerrado');
    const payload = JSON.stringify({ event_id: randomUUID(), occurred_at: new Date().toISOString(), ...event, instance_id: this.instanceId });
    if (Buffer.byteLength(payload) > 60000) throw new Error('Evento excede 60 KB');
    const size = this.db.prepare("SELECT COUNT(*) n,COALESCE(SUM(length(payload)),0) bytes FROM outbox").get();
    if (size.n >= 10000 || size.bytes + Buffer.byteLength(payload) > 10 * 1024 * 1024) throw new Error('Outbox cheia; nenhum evento foi descartado');
    const id = JSON.parse(payload).event_id; this.db.prepare('INSERT INTO outbox(id,route,payload,created_at) VALUES(?,?,?,?)').run(id, route, payload, new Date().toISOString()); return id;
  }
  usage(event) { return this.enqueue('/v1/agent/events/batch', { type: 'llm.usage', ...event }); }
  runFinished(event) { return this.enqueue('/v1/agent/events/batch', { type: 'run.finished', ...event }); }
  referenceGateway(id, runId) { return this.enqueue('/v1/agent/events/batch', { type: 'gateway.reference', gateway_request_id: id, ...(runId ? { run_id: runId } : {}) }); }
  conversation(event) { return this.enqueue('/v1/agent/conversations/events', { type: 'conversation.message', ...event }); }
  database(event) { return this.enqueue('/v1/agent/database-snapshots', { type: 'database.snapshot', ...event }); }
  reportSqlite(file, { databaseId, label = databaseId } = {}) {
    if (!databaseId) throw new Error('Informe databaseId estável para o arquivo de origem');
    const source = new DatabaseSync(file, { readOnly: true, timeout: 1000 });
    try {
      source.exec('PRAGMA query_only=ON; BEGIN');
      const names = source.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 101").all();
      if (names.length > 100) throw new Error('Banco excede 100 tabelas por relatório');
      const tables = names.filter((r) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(r.name)).map((r) => ({ name: r.name, rows: Number(source.prepare(`SELECT COUNT(*) n FROM "${r.name}"`).get().n) }));
      source.exec('COMMIT'); return this.database({ database_id: databaseId, label, size_bytes: statSync(file).size, health: 'healthy', tables });
    } finally { source.close(); }
  }
  async observeOpenAI(call, { attemptId = randomUUID(), runId } = {}) {
    const started = Date.now(); let data;
    try { data = await call(); }
    catch (error) { this.usage({ attempt_id: attemptId, ...(runId ? { run_id: runId } : {}), provider: 'openai', model: 'unavailable', usage_status: 'unavailable', status: 'failed', latency_ms: Date.now() - started, error_code: 'provider_error' }); throw error; }
    if (data?.estimated_cost_usd !== undefined && data?.usage?.input_tokens !== undefined) { this.referenceGateway(data.id, runId); return data; }
    const u = data?.usage; const measured = [u?.prompt_tokens, u?.completion_tokens, u?.total_tokens].every((n) => Number.isSafeInteger(n) && n >= 0);
    this.usage({ attempt_id: attemptId, ...(runId ? { run_id: runId } : {}), provider: 'openai', model: data?.model || 'unavailable', ...(data?.id ? { provider_request_id: data.id } : {}), usage_status: measured ? 'measured' : 'unavailable', ...(measured ? { usage: { input_tokens: u.prompt_tokens, output_tokens: u.completion_tokens, total_tokens: u.total_tokens, cached_input_tokens: u.prompt_tokens_details?.cached_tokens || 0, reasoning_tokens: u.completion_tokens_details?.reasoning_tokens || 0 } } : {}), status: 'succeeded', latency_ms: Date.now() - started });
    return data;
  }
  stats() { return this.db.prepare("SELECT COUNT(*) total,SUM(CASE WHEN state='pending' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN state='blocked' THEN 1 ELSE 0 END) blocked FROM outbox").get(); }
  retryBlocked() { this.db.exec("UPDATE outbox SET state='pending',retry_at=0 WHERE state='blocked'"); }
  async flush() {
    if (this.busy || this.closed) return { sent: 0 }; this.busy = true;
    try {
      await this.connect(); let sent = 0;
      for (let i = 0; i < 20 && !this.closed; i++) {
        const row = this.db.prepare("SELECT * FROM outbox WHERE state='pending' AND retry_at<=? ORDER BY created_at,id LIMIT 1").get(Date.now()); if (!row) break;
        try {
          const result = await this.request(row.route, { schema_version: 1, events: [JSON.parse(row.payload)] });
          if (!result.accepted?.includes(row.id)) throw new Error('Evento sem confirmação durável; mantido na outbox');
          this.db.prepare('DELETE FROM outbox WHERE id=?').run(row.id); sent++;
        } catch (error) {
          const delay = Math.min(60000, 1000 * 2 ** Math.min(row.attempts, 6)) + Math.floor(Math.random() * 1000);
          this.db.prepare('UPDATE outbox SET attempts=attempts+1,retry_at=?,last_status=?,state=? WHERE id=?').run(Date.now() + delay, error.status || null, [409, 422].includes(error.status) ? 'blocked' : 'pending', row.id); throw error;
        }
      }
      return { sent };
    } finally { this.busy = false; }
  }
  async ai(request, { idempotencyKey = randomUUID() } = {}) {
    // Não emite llm.usage: o gateway já registra o consumo e controla o orçamento.
    return this.request('/v1/ai/responses', request, { 'Idempotency-Key': idempotencyKey });
  }
  start({ version = '1.0.0', intervalMs = 10000 } = {}) {
    if (this.timer) return;
    let lastHeartbeat = 0;
    const tick = async () => { if (this.closed || this.busy) return; try { if (Date.now() - lastHeartbeat > 30000) { await this.heartbeat({ version }); lastHeartbeat = Date.now(); } await this.flush(); } catch (error) { this.onError(error); } };
    this.timer = setInterval(() => { void tick(); }, Math.max(1000, intervalMs)); this.timer.unref(); void tick();
  }
  async close() { clearInterval(this.timer); this.timer = null; this.closed = true; while (this.busy) await new Promise((resolve) => setTimeout(resolve, 25)); this.db.close(); }
}
