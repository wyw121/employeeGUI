/**
 * 构建网格检查器可用的匹配配置（前端态）
 * 输入为可视化/通用 UI 元素（包含常见字段），输出 { strategy, fields, values }
 * - 策略默认使用 standard
 * - 字段优先级：resource-id > text > content-desc > class > bounds
 */
export interface ElementLike {
  resource_id?: string;
  text?: string;
  content_desc?: string;
  class_name?: string;
  bounds?: string;
}

export interface BuiltMatching {
  strategy: string;
  fields: string[];
  values: Record<string, string>;
}

export function buildDefaultMatchingFromElement(el: ElementLike): BuiltMatching {
  const values: Record<string, string> = {};
  const fields: string[] = [];

  const push = (field: string, val?: string) => {
    if (!val) return;
    if (String(val).trim() === '') return;
    fields.push(field);
    values[field] = String(val);
  };

  // 资源 id 优先
  push('resource-id', el.resource_id);
  // 文本
  push('text', el.text);
  // content-desc
  push('content-desc', el.content_desc);
  // 类名
  push('class', el.class_name);
  // bounds（在需要时可用于兜底）
  push('bounds', el.bounds);

  // 至少要有一个字段
  if (fields.length === 0) {
    // 仍无字段，则给一个标记位，避免空结构（不会用于后端）
    return { strategy: 'standard', fields: [], values: {} };
  }

  // 默认使用 standard 策略（NodeDetail 会根据字段集推断/切换为 custom）
  return { strategy: 'standard', fields, values };
}
