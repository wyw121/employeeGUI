/**
 * ADB XML检查器工具函数集
 * 提供XML解析、XPath生成、节点匹配等核心功能
 */

import { UiNode, ElementBounds } from './types';

/**
 * 解析 UiAutomator 的 bounds 字符串
 * @param bounds 格式如 "[0,0][1080,2400]"
 * @returns 解析后的坐标对象或null
 */
export function parseBounds(bounds?: string): ElementBounds | null {
  if (!bounds) return null;
  const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return null;
  const [_, x1, y1, x2, y2] = m;
  const ix1 = parseInt(x1, 10), iy1 = parseInt(y1, 10);
  const ix2 = parseInt(x2, 10), iy2 = parseInt(y2, 10);
  return { x1: ix1, y1: iy1, x2: ix2, y2: iy2, w: ix2 - ix1, h: iy2 - iy1 };
}

/**
 * 计算节点的显示标签
 * 优先级：text > resource-id > content-desc > class
 * @param n UI节点
 * @returns 格式化的标签字符串
 */
export function getNodeLabel(n: UiNode): string {
  const text = n.attrs["text"]?.trim();
  if (text) return `"${text}"`;
  
  const resourceId = n.attrs["resource-id"]?.split("/").pop();
  if (resourceId) return `#${resourceId}`;
  
  const contentDesc = n.attrs["content-desc"];
  if (contentDesc) return `desc:${contentDesc}`;
  
  return n.attrs["class"] || n.tag;
}

/**
 * 生成绝对XPath（含索引）
 * @param n UI节点
 * @returns XPath字符串，如 /hierarchy/node[1]/node[3]
 */
export function buildXPath(n: UiNode | null | undefined): string {
  if (!n) return "";
  
  const parts: string[] = [];
  let cur: UiNode | null | undefined = n;
  
  while (cur) {
    let idx = 1;
    if (cur.parent) {
      const siblings = cur.parent.children.filter(c => c.tag === cur!.tag);
      const meIndex = siblings.indexOf(cur) + 1; // 1-based
      idx = meIndex > 0 ? meIndex : 1;
    }
    parts.unshift(`${cur.tag}[${idx}]`);
    cur = cur.parent;
  }
  
  return "/" + parts.join("/");
}

/**
 * 将XML文本解析为UiNode树
 * @param xmlText XML文本内容
 * @returns 解析后的根节点或null
 */
export function parseUiAutomatorXml(xmlText: string): UiNode | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const err = doc.querySelector("parsererror");
    if (err) throw new Error(err.textContent || "XML 解析失败");

    function walk(el: Element, parent: UiNode | null): UiNode {
      const attrs: Record<string, string> = {};
      for (const a of Array.from(el.attributes)) {
        attrs[a.name] = a.value;
      }
      const node: UiNode = {
        tag: el.tagName,
        attrs,
        children: [],
        parent,
      };
      node.children = Array.from(el.children).map(c => walk(c as Element, node));
      return node;
    }

    const rootEl = doc.documentElement; // hierarchy
    return walk(rootEl, null);
  } catch (e) {
    console.error('XML解析失败:', e);
    return null;
  }
}

/**
 * 深度优先给每个节点设置parent指针
 * @param n 根节点
 */
export function attachParents(n: UiNode | null): void {
  if (!n) return;
  const stack: UiNode[] = [n];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of cur.children) {
      c.parent = cur;
      stack.push(c);
    }
  }
}

/**
 * 节点匹配函数（用于搜索）
 * @param n UI节点
 * @param keyword 搜索关键词
 * @returns 是否匹配
 */
export function matchNode(n: UiNode, keyword: string): boolean {
  if (!keyword) return true;
  const lower = keyword.toLowerCase();
  const fields = [
    n.attrs["resource-id"],
    n.attrs["text"],
    n.attrs["content-desc"],
    n.attrs["class"],
    n.tag,
  ]
    .filter(Boolean)
    .map(s => (s as string).toLowerCase());
  return fields.some(s => s.includes(lower));
}

/**
 * 获取示例XML数据
 * @returns 示例XML字符串
 */
export function getDemoXml(): string {
  return `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.ss.android.ugc.aweme" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" visible-to-user="true" bounds="[0,0][1080,2400]">
    <node class="android.view.ViewGroup" bounds="[0,220][1080,2400]">
      <node class="android.widget.TextView" text="推荐" bounds="[80,240][200,300]"/>
      <node class="android.widget.TextView" text="关注" bounds="[220,240][340,300]"/>
      <node class="androidx.recyclerview.widget.RecyclerView" bounds="[0,320][1080,2400]">
        <node class="android.view.ViewGroup" bounds="[0,320][1080,800]">
          <node class="android.widget.TextView" text="用户A" bounds="[24,340][180,390]"/>
          <node class="android.widget.Button" text="关注" resource-id="com.ss.android.ugc.aweme:id/btn_follow" clickable="true" enabled="true" bounds="[900,600][1040,680]"/>
        </node>
        <node class="android.view.ViewGroup" bounds="[0,820][1080,1300]">
          <node class="android.widget.TextView" text="用户B" bounds="[24,840][180,890]"/>
          <node class="android.widget.Button" text="关注" resource-id="com.ss.android.ugc.aweme:id/btn_follow" clickable="true" enabled="true" bounds="[900,1100][1040,1180]"/>
        </node>
      </node>
    </node>
  </node>
</hierarchy>`;
}

/**
 * 计算屏幕尺寸（从根节点bounds推断）
 * @param root 根节点
 * @returns 屏幕尺寸对象
 */
export function inferScreenSize(root: UiNode | null): { width: number; height: number } {
  function findBounds(n?: UiNode | null): ElementBounds | null {
    if (!n) return null;
    const b = parseBounds(n.attrs["bounds"]);
    if (b && b.w > 0 && b.h > 0) return b;
    for (const c of n.children) {
      const r = findBounds(c);
      if (r) return r;
    }
    return null;
  }
  
  const bounds = findBounds(root) || { x1: 0, y1: 0, x2: 1080, y2: 2400, w: 1080, h: 2400 };
  return { width: bounds.w, height: bounds.h };
}

/**
 * 扁平化所有有bounds的节点
 * @param root 根节点
 * @returns 包含节点和bounds信息的数组
 */
export function flattenNodesWithBounds(root: UiNode | null): Array<{ n: UiNode; b: ElementBounds }> {
  const result: Array<{ n: UiNode; b: ElementBounds }> = [];
  
  function walk(n?: UiNode | null) {
    if (!n) return;
    const b = parseBounds(n.attrs["bounds"]);
    if (b && b.w > 0 && b.h > 0) {
      result.push({ n: n, b });
    }
    for (const c of n.children) {
      walk(c);
    }
  }
  
  walk(root);
  return result;
}