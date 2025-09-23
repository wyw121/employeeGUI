import { AnalysisSession } from '../entities/AnalysisSession';

export interface ISessionRepository {
  get(id: string): Promise<AnalysisSession | null>;
  save(session: AnalysisSession): Promise<void>;
  findByHash(xmlHash: string): Promise<AnalysisSession | null>;
}
