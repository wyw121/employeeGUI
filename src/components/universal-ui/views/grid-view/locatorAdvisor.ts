import type { UiNode } from './types';
import { buildXPath } from './utils';

export interface LocatorSuggestion {
  label: string;
  xpath: string;
  score: number; // 0-100
  reasons: string[];
}

// 简单评分规则：
// - resource-id 等值：基础 90；包含 80；前缀 78
// - text 等值：70；包含 60（易变）
// - content-desc：等值 75；包含 68
// - class+id：88；class+text：72
// - 绝对路径（buildXPath）：50（易碎）
// - 可点击祖先 + 条件：在原有基础上 +8（便于点击操作）
export function adviseLocators(node: UiNode | null): LocatorSuggestion[] {
  if (!node) return [];
  const list: LocatorSuggestion[] = [];
  const rid = node.attrs['resource-id'];
  const txt = node.attrs['text'];
  const desc = node.attrs['content-desc'];
  const cls = node.attrs['class'];

  if (rid) list.push({ label: 'id 等值', xpath: `//*[@resource-id='${rid}']`, score: 90, reasons: ['resource-id 通常稳定'] });
  if (rid) {
    const tail = rid.split('/').pop();
    if (tail) list.push({ label: 'id 包含', xpath: `//*[contains(@resource-id,'${tail}')]`, score: 80, reasons: ['适应不同构建变体'] });
    const slash = rid.indexOf('/');
    if (slash > 0) {
      const prefix = rid.slice(0, slash + 1);
      list.push({ label: 'id 前缀 starts-with', xpath: `//*[starts-with(@resource-id,'${prefix}')]`, score: 78, reasons: ['前缀稳定，尾部变动'] });
    }
  }

  if (txt) list.push({ label: 'text 等值', xpath: `//*[text()='${txt}']`, score: 70, reasons: ['文本可能随语言/内容变化'] });
  if (txt) list.push({ label: 'text 包含', xpath: `//*[contains(text(),'${txt}')]`, score: 60, reasons: ['包含匹配更宽松，易误中'] });

  if (desc) list.push({ label: 'content-desc 等值', xpath: `//*[@content-desc='${desc}']`, score: 75, reasons: ['无障碍描述相对稳定'] });
  if (desc) list.push({ label: 'content-desc 包含', xpath: `//*[contains(@content-desc,'${desc}')]`, score: 68, reasons: ['包含匹配更宽松'] });

  if (cls && rid) list.push({ label: 'class + id', xpath: `//${cls}[@resource-id='${rid}']`, score: 88, reasons: ['类名 + id 更精确'] });
  if (cls && txt) list.push({ label: 'class + text', xpath: `//${cls}[text()='${txt}']`, score: 72, reasons: ['文本易变'] });

  // 绝对路径（备选）
  const abs = buildXPath(node);
  if (abs) list.push({ label: '绝对路径（备选）', xpath: abs, score: 50, reasons: ['层级变动会失效'] });

  // 可点击祖先加权
  function hasClickableAncestor(n: UiNode | null): boolean {
    let cur = n?.parent ?? null;
    while (cur) {
      if (String(cur.attrs['clickable']).toLowerCase() === 'true') return true;
      cur = cur.parent ?? null;
    }
    return false;
  }
  if (hasClickableAncestor(node)) {
    for (const s of list) s.score = Math.min(100, s.score + 8), s.reasons.push('存在可点击父级');
  }

  // 排序：高分在前
  list.sort((a, b) => b.score - a.score);
  return list;
}
