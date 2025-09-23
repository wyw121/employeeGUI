// UI 层策略类型：新增 'custom'，仅用于前端展示与字段自定义状态标识
export type MatchStrategy = 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard' | 'custom';

export interface MatchCriteria {
  strategy: MatchStrategy;
  fields: string[]; // e.g. ['resource-id','text','content-desc','class','package','bounds','index']
  values: Record<string, string>; // 正向匹配值（从 UiNode.attrs 提取或用户编辑）
  excludes?: Record<string, string[]>; // 负向匹配：每字段一个字符串数组，含“不包含”的词
}

export interface MatchResultSummary {
  ok: boolean;
  message: string;
  matchedIndex?: number;
  total?: number;
  preview?: { text?: string; resource_id?: string; class_name?: string; xpath?: string; bounds?: string; package?: string };
}
