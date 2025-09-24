import type { XmlSnapshot } from '../../types/selfContainedScript';

export type SnapshotHealthLevel = 'ok' | 'warn' | 'error';

export interface SnapshotHealth {
  level: SnapshotHealthLevel;
  messages: string[];
}

/**
 * 计算 XML 内容的简单哈希（用于去重提示）。
 * 注意：非安全哈希，仅用于 UI 提示去重，不用于安全目的。
 */
export function hashXmlContent(xml: string): string {
  let hash = 0;
  for (let i = 0; i < xml.length; i++) {
    hash = (hash << 5) - hash + xml.charCodeAt(i);
    hash |= 0; // 转 32 位
  }
  return `h${Math.abs(hash)}`;
}

/**
 * 评估 XmlSnapshot 健康度：
 * - 解析失败 → error
 * - 解析成功但存在常见问题 → warn
 * - 无问题 → ok
 */
export function assessSnapshotHealth(snapshot: XmlSnapshot): SnapshotHealth {
  const messages: string[] = [];
  const xml = snapshot.xmlContent || '';

  if (!xml.trim()) {
    return { level: 'error', messages: ['未获取到页面 XML 内容'] };
  }

  // 1) 解析检查
  try {
    // DOMParser 在浏览器环境下可用；在 Tauri/前端 React 环境中同样可用
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const parsererror = doc.getElementsByTagName('parsererror')[0];
    if (parsererror) {
      const text = parsererror.textContent || 'XML 解析失败';
      return { level: 'error', messages: [text] };
    }

    // 2) 轻量启发式检查
    const root = doc.documentElement;
    if (!root || !root.nodeName) {
      messages.push('XML 根节点缺失或无效');
    }
    // 常见 ADB dumpxml 根标签通常为 hierarchy
    if (root && root.nodeName.toLowerCase() !== 'hierarchy') {
      messages.push(`XML 根节点非 hierarchy（实际为 ${root.nodeName}）`);
    }
    // 检查是否包含无效坐标/空元素极端情况
    const allNodes = doc.getElementsByTagName('*');
    if (allNodes.length < 5) {
      messages.push('页面元素数量异常偏少，可能采集不完整');
    }
  } catch (e: any) {
    return { level: 'error', messages: [e?.message || 'XML 解析异常'] };
  }

  if (messages.length === 0) return { level: 'ok', messages };
  return { level: 'warn', messages };
}
