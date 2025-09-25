/**
 * UI 元素匹配仓储接口
 */

export type MatchStrategy = 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard';

export interface MatchCriteriaDTO {
  strategy: MatchStrategy;
  fields: string[];
  values: Record<string, string>;
  /** 负向匹配：每字段一个字符串数组，表示“不包含”的词列表 */
  excludes?: Record<string, string[]>;
  /** 正向额外包含：每字段一个字符串数组，表示“必须包含”的词列表 */
  includes?: Record<string, string[]>;
  /** 每字段匹配模式：equals | contains | regex（camelCase，前端内部使用） */
  matchMode?: Record<string, 'equals' | 'contains' | 'regex'>;
  /** 每字段“必须匹配”的正则（全部需满足，camelCase，前端内部使用） */
  regexIncludes?: Record<string, string[]>;
  /** 每字段“不可匹配”的正则（任一命中即失败，camelCase，前端内部使用） */
  regexExcludes?: Record<string, string[]>;
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
