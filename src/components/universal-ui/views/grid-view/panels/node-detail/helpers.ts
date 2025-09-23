import type { UiNode } from "../../types";
import type { MatchCriteria, MatchStrategy } from "./types";

// 统一维护各策略对应的字段集合，避免重复定义
// 预设字段：'custom' 作为占位，默认空数组；实际由用户勾选决定
export const PRESET_FIELDS: Record<Exclude<MatchStrategy, 'custom'> | 'custom', string[]> = {
  absolute: [
    "resource-id",
    "text",
    "content-desc",
    "class",
    "package",
    "bounds",
    "index",
  ],
  strict: ["resource-id", "text", "content-desc", "class", "package"],
  relaxed: ["resource-id", "text", "content-desc", "class"],
  // 与 strict 字段相同，但后端按策略忽略位置相关字段
  positionless: ["resource-id", "text", "content-desc", "class", "package"],
  // 标准匹配：跨设备稳定，仅用语义字段
  standard: ["resource-id", "text", "content-desc", "class", "package"],
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
