/**
 * content_desc 清洗工具：
 * - 仅保留真实 XML 的 content-desc
 * - 过滤可视化/分析层面的友好占位描述，避免污染匹配与定位
 */

/** 典型友好描述的正则集合 */
export const friendlyDescriptionPatterns: RegExp[] = [
  /^未知元素(（可点击）|（可滚动）|（可编辑）)?$/,
  /^按钮（可点击）$/,
  /^文本（.*）$/,
];

/**
 * 将任意输入清洗为“真实 content-desc”（来自设备 XML），若命中友好描述则返回空字符串。
 */
export function sanitizeContentDesc(val: unknown): string {
  if (val == null) return '';
  const s = String(val).trim();
  if (!s) return '';
  return friendlyDescriptionPatterns.some((re) => re.test(s)) ? '' : s;
}

export default sanitizeContentDesc;
