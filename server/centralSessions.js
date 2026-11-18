import './env.js';
import path from 'node:path';
import { AppSessionTracker, AppSessionBridge } from './central-sdk/app-sessions.mjs';

const data = path.resolve(process.env.MAICON_DATA_DIR || path.join(process.cwd(),'data'));
export const appSessions = new AppSessionTracker(path.join(data,'central-sessions','sessions.sqlite'));
appSessions.retireLegacyTracking();
export function startAppSessionBridge() {
  if (!process.env.MAICON_CENTRAL_URL || !process.env.MAICON_AGENT_TOKEN) return null;
  try {
    const bridge = new AppSessionBridge({ tracker: appSessions, url: process.env.MAICON_CENTRAL_URL, token: process.env.MAICON_AGENT_TOKEN, outbox: path.join(data,'central-sessions','bridge.sqlite'), onError: error => console.error(`Sessões da central: ${error.status ? 'HTTP '+error.status : 'envio pendente; nova tentativa automática'}`) });
    bridge.start(); return bridge;
  } catch { console.error('Sessões da central: confira configuração e acesso ao armazenamento.'); return null; }
}
