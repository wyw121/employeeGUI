import type { UiNode } from "../../types";
import type { MatchCriteria, MatchStrategy } from "./types";

// 统一维护各策略对应的字段集合，避免重复定义
export const PRESET_FIELDS: Record<MatchStrategy, string[]> = {
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
  const fields = fieldsOverride && fieldsOverride.length > 0 ? fieldsOverride : PRESET_FIELDS[strategy] || [];
  const values: Record<string, string> = {};
  for (const f of fields) {
    const v = node.attrs[f];
    if (v != null) values[f] = String(v);
  }
  return { strategy, fields, values };
}
