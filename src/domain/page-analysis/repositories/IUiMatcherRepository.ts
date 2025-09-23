/**
 * UI 元素匹配仓储接口
 */

export type MatchStrategy = 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard';

export interface MatchCriteriaDTO {
  strategy: MatchStrategy;
  fields: string[];
  values: Record<string, string>;
}

export interface MatchPreview {
  text?: string;
  resource_id?: string;
  class_name?: string;
  package?: string;
  bounds?: string;
  xpath?: string;
}

export interface MatchResultDTO {
  ok: boolean;
  message: string;
  total?: number;
  matchedIndex?: number;
  preview?: MatchPreview;
}

export interface IUiMatcherRepository {
  matchByCriteria(deviceId: string, criteria: MatchCriteriaDTO): Promise<MatchResultDTO>;
}
