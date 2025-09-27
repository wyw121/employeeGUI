/**
 * 清洗 XML 文本：
 * - 截取第一个 '<' 到最后一个 '>' 之间的内容，剔除前后非 XML 噪声
 * - 去除 UTF-8 BOM
 * - 去除首尾空白
 */
export function cleanXmlContent(input: string | null | undefined): string {
  let content = String(input ?? '');
  if (!content) return '';
  const firstLt = content.indexOf('<');
  const lastGt = content.lastIndexOf('>');
  if (firstLt > 0 && lastGt > firstLt) {
    content = content.slice(firstLt, lastGt + 1);
  }
  // 去除 UTF-8 BOM
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content.trim();
}

export default cleanXmlContent;