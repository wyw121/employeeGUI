import { IStepRepository } from '../../domain/inspector/repositories/IStepRepository';
import { Step } from '../../domain/inspector/entities/Step';

const STEP_KEY = 'inspector.steps.v1';

function loadAll(): Record<string, Step> {
  try {
    const raw = localStorage.getItem(STEP_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, Step>) {
  try {
    localStorage.setItem(STEP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export class LocalStepRepository implements IStepRepository {
  async get(id: string): Promise<Step | null> {
    const all = loadAll();
    return all[id] ?? null;
  }
  async save(step: Step): Promise<void> {
    const all = loadAll();
    all[step.id] = step;
    saveAll(all);
  }
  async listBySession(sessionId: string): Promise<Step[]> {
    const all = loadAll();
    return Object.values(all).filter(s => s.sessionId === sessionId);
  }
}
