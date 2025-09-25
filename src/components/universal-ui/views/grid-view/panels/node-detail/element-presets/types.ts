import type { UiNode } from '../../../types';
import type { MatchCriteria } from '../types';

export type ElementPresetId = 'follow_button' | 'universal_social_button' | 'like_button' | 'comment_button';

export interface ElementPreset {
  id: ElementPresetId;
  label: string;           // UI 显示名称
  description?: string;    // 简短说明
  // 从节点与可选 XML 上下文构造匹配条件（不含 toBackendStrategy，保持前端策略）
  buildCriteria: (args: {
    node: UiNode | null;
    xmlContent?: string;
  }) => MatchCriteria | null;
  // 适用场景提示
  hints?: string[];
}
