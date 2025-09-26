import type { SmartActionType } from '../../../../types/smartComponents';

type StepLike = {
  step_type: string;
  name?: string;
  description?: string;
  parameters?: Record<string, any>;
};

/**
 * 根据 step_type 返回操作文案，默认回退为 step_type 本身
 */
export function getOperationLabelFromType(stepType: string, fallbackName?: string): string {
  // 映射常见操作；优先用已有 name 作为回退
  const map: Record<string, string> = {
    tap: '轻点',
    swipe: '滑动',
    input: '输入',
    wait: '等待',
    smart_find_element: '元素查找',
    batch_match: '批量匹配',
    smart_navigation: '智能导航',
    launch_app: '打开应用',
  };
  return map[stepType] || fallbackName || stepType;
}

/**
 * 从参数中提取元素名：优先 elementLocator/elementSummary/text/resource_id/content_desc
 * 再回退到 xpath 的最后可读段，最后返回 "元素"。
 */
export function getElementNameFromParameters(params: Record<string, any> | undefined): string {
  if (!params) return '元素';
  // elementLocator 结构尝试
  const locator = (params as any).elementLocator || {};
  const selectedText = locator.selectedText || locator.text || locator.label;
  if (selectedText && String(selectedText).trim()) return String(selectedText).trim();

  const elementSummary = (params as any).elementSummary;
  if (elementSummary && String(elementSummary).trim()) return String(elementSummary).trim();

  const byPriority = [
    (params as any).element_text,
    (params as any).text,
    (params as any).resource_id,
    (params as any).content_desc,
    (params as any).class_name,
  ];
  for (const v of byPriority) {
    if (v && String(v).trim()) return String(v).trim();
  }

  const xpath: string | undefined = (params as any).xpath;
  if (xpath && typeof xpath === 'string') {
    const seg = xpath.split('/').filter(Boolean).pop();
    if (seg) {
      // 去除下标，如 Button[2] -> Button
      const name = seg.replace(/\[[0-9]+\]$/, '');
      if (name) return name;
    }
  }
  return '元素';
}

/**
 * 构建自动名称：操作 + 元素名
 */
export function buildAutoName(step: StepLike): string {
  const op = getOperationLabelFromType(step.step_type, step.name);
  const el = getElementNameFromParameters(step.parameters);
  return `${op} - ${el}`;
}
