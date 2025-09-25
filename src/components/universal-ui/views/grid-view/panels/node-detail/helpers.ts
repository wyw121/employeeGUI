import type { UiNode } from "../../types";
import type { MatchCriteria, MatchStrategy } from "./types";

// 🆕 导入增强字段选择器模块
import { getRecommendedGroupsForStrategy, ALL_FIELD_GROUPS } from './enhanced-field-selector';

// 统一维护各策略对应的字段集合，避免重复定义
// 🆕 扩展支持增强字段的预设策略
export const PRESET_FIELDS: Record<Exclude<MatchStrategy, 'custom'> | 'custom', string[]> = {
  absolute: [
    "resource-id",
    "text",
    "content-desc",
    "class",
    "package",
    "bounds",
    "index",
    // 🆕 绝对定位策略增加交互状态字段
    "clickable",
    "enabled"
  ],
  strict: [
    "resource-id", 
    "text", 
    "content-desc", 
    "class", 
    "package",
    // 🆕 严格匹配策略增加父节点字段
    "parent_resource_id",
    "parent_class"
  ],
  relaxed: [
    "resource-id", 
    "text", 
    "content-desc", 
    "class",
    // 🆕 宽松匹配策略增加父节点和子节点字段
    "parent_class",
    "first_child_text"
  ],
  // 与 strict 字段相同，但后端按策略忽略位置相关字段
  positionless: [
    "resource-id", 
    "text", 
    "content-desc", 
    "class", 
    "package",
    // 🆕 无位置策略增加父节点字段，提高跨设备兼容性
    "parent_resource_id",
    "parent_class",
    "parent_text"
  ],
  // 🆕 标准匹配：跨设备稳定，重点支持子节点增强
  standard: [
    "resource-id", 
    "text", 
    "content-desc", 
    "class", 
    "package",
    // 子节点增强字段：解决按钮文字在子元素的问题
    "first_child_text",
    "first_child_content_desc",
    "first_child_resource_id",
    // 父节点增强字段：提供上下文信息
    "parent_class"
  ],
  // 自定义：不预置任何字段，由用户勾选
  custom: [],
};

/**
 * 从 UiNode 构建匹配条件
 * - 默认按指定策略选择字段；也可通过 fieldsOverride 指定自定义字段集
 */
export function buildCriteriaFromNode(
  node: UiNode,
  strategy: MatchStrategy,
  fieldsOverride?: string[]
): MatchCriteria {
  const preset = (PRESET_FIELDS as Record<string, string[]>)[strategy] || [];
  const fields = fieldsOverride && fieldsOverride.length > 0 ? fieldsOverride : preset;
  const values: Record<string, string> = {};
  for (const f of fields) {
    const v = node.attrs[f];
    if (v != null) values[f] = String(v);
  }
  return { strategy, fields, values };
}

/**
 * 判断两个字段集合是否与某个预设完全一致（忽略顺序）
 */
export function isSameFieldsAsPreset(fields: string[], preset: string[]): boolean {
  if (!Array.isArray(fields) || !Array.isArray(preset)) return false;
  if (fields.length !== preset.length) return false;
  const a = [...fields].sort();
  const b = [...preset].sort();
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 根据当前字段集合推断策略：
 * - 若与任一预设完全一致，返回该预设的策略（优先顺序：absolute > strict > relaxed > positionless > standard）
 * - 否则返回 'custom'
 */
export function inferStrategyFromFields(fields: string[]): MatchStrategy {
  const order: Array<Exclude<MatchStrategy, 'custom'>> = ['absolute', 'strict', 'relaxed', 'positionless', 'standard'];
  for (const key of order) {
    if (isSameFieldsAsPreset(fields, PRESET_FIELDS[key])) return key;
  }
  return 'custom';
}

/**
 * 判断是否包含“有效的位置约束”
 * - 当字段包含 bounds/index 且对应值非空时，认定为存在位置约束
 */
export function hasPositionConstraint(fields: string[], values?: Record<string,string>): boolean {
  const has = (f: string) => fields.includes(f) && !!(values?.[f]?.toString().trim());
  return has('bounds') || has('index');
}

/**
 * 根据节点与字段集合构建默认 values（用于初始化可编辑表单）
 */
export function buildDefaultValues(node: UiNode | null, fields: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  if (!node) return values;
  for (const f of fields) {
    const v = node.attrs?.[f];
    if (v != null) values[f] = String(v);
  }
  return values;
}

/**
 * 规范化字段与值：
 * - 移除值为空(空串/空白)的字段，使其被视为“任意/忽略该维度”
 * - 返回有效 fields 与 values
 */
export function normalizeFieldsAndValues(fields: string[], values: Record<string,string>): { fields: string[]; values: Record<string,string> } {
  const outValues: Record<string,string> = {};
  const outFields: string[] = [];
  for (const f of fields) {
    const v = values?.[f];
    if (v != null && String(v).trim() !== '') {
      outFields.push(f);
      outValues[f] = String(v).trim();
    }
  }
  return { fields: outFields, values: outValues };
}

/**
 * 规范化不包含条件：
 * - 仅保留已选择字段对应的 excludes
 * - 去除空白项、去重；若某字段无有效项则移除该字段
 */
export function normalizeExcludes(
  excludes: Record<string, string[]>,
  selectedFields: string[]
): Record<string, string[]> {
  const allowed = new Set(selectedFields);
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(excludes || {})) {
    if (!allowed.has(key)) continue;
    const items = (excludes[key] || [])
      .map(s => String(s).trim())
      .filter(s => s.length > 0);
    const uniq = Array.from(new Set(items));
    if (uniq.length > 0) out[key] = uniq;
  }
  return out;
}

export function normalizeIncludes(
  includes: Record<string, string[]>,
  selectedFields: string[]
): Record<string, string[]> {
  const allowed = new Set(selectedFields);
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(includes || {})) {
    if (!allowed.has(key)) continue;
    const items = (includes[key] || [])
      .map(s => String(s).trim())
      .filter(s => s.length > 0);
    const uniq = Array.from(new Set(items));
    if (uniq.length > 0) out[key] = uniq;
  }
  return out;
}

/**
 * 将 UI 策略映射为后端兼容的策略（后端暂不识别 'custom'）。
 * - 对于 'custom'：依据是否存在“有效位置约束”映射为 absolute 或 standard
 */
export function toBackendStrategy(
  strategy: MatchStrategy,
  fields: string[],
  values?: Record<string,string>
): Exclude<MatchStrategy, 'custom'> {
  if (strategy !== 'custom') return strategy;
  return hasPositionConstraint(fields, values) ? 'absolute' : 'standard';
}

// 🆕 增强字段支持函数

/**
 * 获取所有可用字段（包括增强字段）
 */
export function getAllAvailableFields(): string[] {
  return ALL_FIELD_GROUPS.flatMap(group => group.fields.map(field => field.key));
}

/**
 * 根据策略获取推荐的增强字段
 */
export function getEnhancedFieldsForStrategy(strategy: MatchStrategy): string[] {
  const baseFields = PRESET_FIELDS[strategy] || [];
  const recommendedGroups = getRecommendedGroupsForStrategy(strategy);
  
  const enhancedFields = ALL_FIELD_GROUPS
    .filter(group => recommendedGroups.includes(group.id))
    .flatMap(group => group.fields.map(field => field.key))
    .filter(field => !baseFields.includes(field));
  
  return [...baseFields, ...enhancedFields];
}

/**
 * 检查字段是否为增强字段（非基础字段）
 */
export function isEnhancedField(fieldKey: string): boolean {
  const basicFields = ['resource-id', 'text', 'content-desc', 'class', 'package', 'bounds', 'index'];
  return !basicFields.includes(fieldKey);
}

/**
 * 按字段类型分组
 */
export function groupFieldsByType(fields: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    basic: [],
    parent: [],
    child: [],
    interaction: [],
    clickable_ancestor: []
  };
  
  fields.forEach(field => {
    if (field.startsWith('parent_')) {
      groups.parent.push(field);
    } else if (field.startsWith('first_child_') || field === 'descendant_texts') {
      groups.child.push(field);
    } else if (field.startsWith('clickable_ancestor_')) {
      groups.clickable_ancestor.push(field);
    } else if (['clickable', 'checkable', 'checked', 'scrollable', 'enabled', 'password'].includes(field)) {
      groups.interaction.push(field);
    } else {
      groups.basic.push(field);
    }
  });
  
  return groups;
}

/**
 * 智能推荐字段：基于节点属性和策略
 */
export function suggestFieldsForNode(node: UiNode | null, strategy: MatchStrategy): {
  recommended: string[];
  optional: string[];
  reasons: Record<string, string>;
} {
  if (!node) {
    return { recommended: PRESET_FIELDS[strategy] || [], optional: [], reasons: {} };
  }
  
  const attrs = node.attrs || {};
  const recommended: string[] = [];
  const optional: string[] = [];
  const reasons: Record<string, string> = {};
  
  // 基础字段推荐逻辑
  if (attrs['resource-id']) {
    recommended.push('resource-id');
    reasons['resource-id'] = '检测到资源ID，推荐使用（稳定性高）';
  }
  
  if (attrs['text'] && String(attrs['text']).trim()) {
    recommended.push('text');
    reasons['text'] = '检测到文本内容，适合文本匹配';
  }
  
  if (attrs['content-desc']) {
    recommended.push('content-desc');
    reasons['content-desc'] = '检测到内容描述，语义化程度高';
  }
  
  // 类名推荐
  if (attrs['class']) {
    const className = String(attrs['class']);
    if (className.includes('Button') || className.includes('Click')) {
      recommended.push('class');
      reasons['class'] = '检测到按钮类控件，推荐使用类名';
    } else {
      optional.push('class');
      reasons['class'] = '常规控件类名，可选使用';
    }
  }
  
  // 🆕 增强字段智能推荐
  
  // 父节点字段推荐
  if (strategy === 'standard' || strategy === 'positionless') {
    if (!attrs['resource-id'] || !attrs['text']) {
      optional.push('parent_resource_id');
      optional.push('parent_class');
      reasons['parent_resource_id'] = '当前元素信息不足，建议使用父节点资源ID增强';
      reasons['parent_class'] = '父节点类名可提供容器上下文信息';
    }
  }
  
  // 子节点字段推荐
  if (strategy === 'standard') {
    const className = String(attrs['class'] || '');
    if (className.includes('Layout') || className.includes('Container') || !attrs['text']) {
      optional.push('first_child_text');
      optional.push('first_child_resource_id');
      reasons['first_child_text'] = '检测到容器控件，子节点文本可能更具体';
      reasons['first_child_resource_id'] = '子节点可能有更准确的资源ID';
    }
  }
  
  // 交互状态推荐
  if (attrs['clickable'] === 'true') {
    optional.push('clickable');
    reasons['clickable'] = '元素可点击，添加此字段可提高匹配精确度';
  }
  
  if (attrs['checkable'] === 'true') {
    optional.push('checkable');
    optional.push('checked');
    reasons['checkable'] = '检测到可选中控件，建议添加选中状态字段';
    reasons['checked'] = '选中状态可用于状态验证';
  }
  
  return { recommended, optional, reasons };
}

/**
 * 根据已有 values 构建“相似查找”的标准化匹配条件
 * - 默认使用 standard 策略（跨设备稳定），可通过 env 控制使用 relaxed
 * - 仅保留预设字段中的非空值
 * - includes 推断：
 *   - text 存在：includes.text = [text]（简单且稳妥）
 *   - resource-id 存在：提取末尾段作为包含词（如 com.app:id/follow_btn → follow_btn）
 */
export function buildFindSimilarCriteria(values: Record<string, string>): MatchCriteria {
  const useRelaxed = (typeof (import.meta as any) !== 'undefined') && (import.meta as any).env?.VITE_FIND_SIMILAR_RELAXED === '1';
  const strategy: MatchStrategy = (useRelaxed ? 'relaxed' : 'standard') as MatchStrategy;
  const preset = PRESET_FIELDS[strategy] || [];
  const v: Record<string,string> = {};
  for (const f of preset) {
    const val = values?.[f];
    if (val != null && String(val).trim() !== '') v[f] = String(val).trim();
  }

  // includes 推断
  const includes: Record<string,string[]> = {};
  if (v['text']) {
    includes['text'] = [v['text']];
  }
  if (v['resource-id']) {
    const rid = v['resource-id'];
    const last = rid.split(/[\/:]/).filter(Boolean).pop();
    if (last) includes['resource-id'] = [last];
  }

  return {
    strategy,
    fields: Object.keys(v),
    values: v,
    includes,
    excludes: {},
  };
}
