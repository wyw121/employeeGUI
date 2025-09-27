export interface ExportOptions {
  includeAssignmentColumns?: boolean; // 是否包含行业与区间列
  useChineseHeaders?: boolean;        // 是否使用中文列名
  customHeaderMap?: Record<string, string>; // 自定义列头（优先级最高）
  visibleColumns?: string[];          // 可见列（未设置或空数组表示全部可见）
  columnOrder?: string[];             // 列顺序（按 key 排序，未包含的自动追加在末尾）
  filenameTemplate?: string;          // 文件名模板（可包含 {prefix} {view} {yyyyMMdd_HHmmss} 等占位）
}

export type AssignmentSnapshot = Record<string, { industry?: string; idStart?: number; idEnd?: number }> | undefined;
