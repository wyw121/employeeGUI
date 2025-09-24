import type { MatchCriteria } from './types';

/**
 * 根据匹配条件生成简短的步骤标题
 * 优先级：text > content-desc > resource-id(末段) > class(末段) > package(末段)
 * 前缀：默认使用“点击”语义，便于与常见交互一致；具体动作仍以步骤类型为准
 */
export function buildShortTitleFromCriteria(criteria: MatchCriteria): string {
  const v = criteria.values || {};
  const text = v['text']?.trim();
  const desc = v['content-desc']?.trim();
  const rid = v['resource-id']?.split('/').pop()?.trim();
  const cls = v['class']?.split('.').pop()?.trim();
  const pkg = v['package']?.split('.').pop()?.trim();
  const main = text || desc || rid || cls || pkg;
  if (!main) return '查找元素';
  // 对文字较长时截断，避免卡片过长
  const trimmed = main.length > 24 ? main.slice(0, 24) + '…' : main;
  return `点击：${trimmed}`;
}

/**
 * 生成较完整的描述（轻量版），用于在“修改参数”路径时补充步骤描述
 */
export function buildShortDescriptionFromCriteria(criteria: MatchCriteria): string {
  const v = criteria.values || {};
  const parts: string[] = [];
  if (v['text']) parts.push(`text="${v['text']}"`);
  if (v['resource-id']) parts.push(`id="${v['resource-id']}"`);
  if (v['content-desc']) parts.push(`desc="${v['content-desc']}"`);
  if (v['class']) parts.push(`class=${v['class'].split('.').pop()}`);
  if (v['package']) parts.push(`pkg=${v['package'].split('.').pop()}`);
  return `匹配策略：${criteria.strategy}；条件：${parts.join('，')}`;
}
