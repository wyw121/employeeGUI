import { Step } from '../entities/Step';

export interface IStepRepository {
  get(id: string): Promise<Step | null>;
  save(step: Step): Promise<void>;
  listBySession(sessionId: string): Promise<Step[]>;
}
