import { ISessionRepository } from '../../domain/inspector/repositories/ISessionRepository';
import { AnalysisSession } from '../../domain/inspector/entities/AnalysisSession';

const SESS_KEY = 'inspector.sessions.v1';

function loadAll(): Record<string, AnalysisSession> {
  try {
    const raw = localStorage.getItem(SESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, AnalysisSession>) {
  try {
    localStorage.setItem(SESS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export class LocalSessionRepository implements ISessionRepository {
  async get(id: string): Promise<AnalysisSession | null> {
    const all = loadAll();
    return all[id] ?? null;
  }
  async save(session: AnalysisSession): Promise<void> {
    const all = loadAll();
    all[session.id] = session;
    saveAll(all);
  }
  async findByHash(xmlHash: string): Promise<AnalysisSession | null> {
    const all = loadAll();
    for (const k of Object.keys(all)) {
      if (all[k].xmlHash === xmlHash) return all[k];
    }
    return null;
  }
}
