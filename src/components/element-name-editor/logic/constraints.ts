// 抽离匹配约束配置与辅助方法
// 与 UI 解耦，使 ElementNameEditor 主文件更精简

import type { MatchingConstraints } from '../../../modules/ElementNameMapper';

export interface ConstraintConfigItem {
  key: keyof MatchingConstraints;
  label: string;
  englishLabel: string;
  description: string;
  icon: string;
  weight: number;
  recommended?: boolean;
}

export const CONSTRAINT_CONFIG: ConstraintConfigItem[] = [
  { key: 'enableTextMatch', label: '文本匹配', englishLabel: 'text', description: '匹配元素的显示文本内容', icon: '📝', weight: 25 },
  { key: 'enableResourceIdMatch', label: '资源ID匹配', englishLabel: 'resource_id', description: '匹配元素的Android资源标识符', icon: '🆔', weight: 20 },
  { key: 'enableClickableMatch', label: '可点击属性匹配', englishLabel: 'clickable', description: '匹配元素是否可点击（重要：同类元素通常有相同可点击性）', icon: '👆', weight: 15, recommended: true },
  { key: 'enableContentDescMatch', label: '内容描述匹配', englishLabel: 'content_desc', description: '匹配元素的内容描述（accessibility）', icon: '📋', weight: 15 },
  { key: 'enableClassNameMatch', label: '类名匹配', englishLabel: 'class_name', description: '匹配元素的CSS类名', icon: '🎯', weight: 10 },
  { key: 'enableElementTypeMatch', label: '元素类型匹配', englishLabel: 'element_type', description: '匹配元素的UI类型（Button、TextView等）', icon: '🏷️', weight: 10 },
  { key: 'enableParentMatch', label: '父元素匹配', englishLabel: 'parent', description: '匹配元素的父级容器信息（层级树）', icon: '�', weight: 5 },
  { key: 'enableSiblingMatch', label: '兄弟元素匹配', englishLabel: 'siblings', description: '匹配同级相邻元素信息', icon: '�', weight: 3 },
  { key: 'enableBoundsMatch', label: '坐标范围匹配', englishLabel: 'bounds', description: '匹配元素的屏幕坐标范围（不推荐，坐标易变动）', icon: '�', weight: 2 }
];

export const calcEnabledConstraintCount = (c: MatchingConstraints): number => Object.values(c).filter(Boolean).length;

export const calcTotalConstraintWeight = (c: MatchingConstraints): number =>
  CONSTRAINT_CONFIG.filter(item => c[item.key]).reduce((sum, item) => sum + item.weight, 0);
