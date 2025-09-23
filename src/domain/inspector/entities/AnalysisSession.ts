export interface AnalysisSessionMeta {
  deviceId?: string;
  rotation?: number;
  note?: string;
}

export interface AnalysisSession {
  id: string;
  xmlHash: string;
  xmlText: string;
  createdAt: number;
  meta?: AnalysisSessionMeta;
}
