import type { NodeLocator } from '../../../../domain/inspector/entities/NodeLocator';

/**
 * 轻量属性匹配：根据定位器给出的属性在候选节点中打分，返回最佳节点。
 * 评分规则（与旧逻辑保持一致）：
 *  resource-id 精确 = +3
 *  className 精确 = +2
 *  text 包含 = +1
 *  content-desc 包含 = +1
 *  packageName 精确 = +1
 *  bounds 精确 = +4 (优先精准定位)
 */
export function pickByAttributes(nodes: any[], locator: NodeLocator): any | null {
  if (!nodes || nodes.length === 0) return null;
  const L: any = (locator as any).attributes || (locator as any).attributes === undefined ? (locator as any).attributes : (locator as any).attributes;
  const wantBounds: string | undefined = (locator as any).bounds;
  let best: any = null;
  let bestScore = -1;
  for (const n of nodes) {
    const a = n?.attrs || {};
    let s = 0;
    if (L?.resourceId && a['resource-id'] === L.resourceId) s += 3;
    if (L?.className && a['class'] === L.className) s += 2;
    if (L?.text && (a['text'] || '').includes(L.text)) s += 1;
    if (L?.contentDesc && (a['content-desc'] || '').includes(L.contentDesc)) s += 1;
    if (L?.packageName && a['package'] === L.packageName) s += 1;
    if (wantBounds && a['bounds'] === wantBounds) s += 4;
    if (s > bestScore) { bestScore = s; best = n; }
  }
  return best;
}
