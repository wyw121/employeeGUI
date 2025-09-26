// 抽离显示名称匹配评分逻辑
// 便于单元测试与潜在策略扩展

import type { UIElement, ElementNameMapping } from '../../../modules/ElementNameMapper';

export const calculateDisplayMatchScore = (element: UIElement, mapping: ElementNameMapping): number => {
  let matchCount = 0;
  let totalFields = 0;

  if (element.text && mapping.fingerprint.text) {
    totalFields++;
    if (element.text === mapping.fingerprint.text) matchCount++;
  }
  if (element.resource_id && mapping.fingerprint.resource_id) {
    totalFields++;
    if (element.resource_id === mapping.fingerprint.resource_id) matchCount++;
  }
  return totalFields > 0 ? matchCount / totalFields : 0;
};
