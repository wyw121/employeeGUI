import type { UiNode } from '../../universal-ui/views/grid-view/types';
import { buildXPath, parseUiAutomatorXml, attachParents, findByXPathRoot } from '../../universal-ui/views/grid-view/utils';
import type { ElementBinding, ElementBindingSnapshot, ResolveResult } from './types';

/**
 * 从 UiNode 创建绑定（包含 xpath/关键属性 + 快照占位，快照文本由调用方提供）
 */
export function createElementBinding(node: UiNode, snapshot: ElementBindingSnapshot): ElementBinding {
  const xpath = buildXPath(node);
  const attrs = node.attrs || {};
  const parentAttrs = node.parent?.attrs ? pickKeyAttrs(node.parent.attrs) : undefined;
  return {
    snapshot,
    locator: { xpath, bounds: attrs['bounds'] },
    identity: {
      attributes: pickKeyAttrs(attrs),
      parentAttributes: parentAttrs,
      childCount: (node.children || []).length,
    },
  };
}

/** 解析存储的快照文本并恢复为树根 */
function restoreRootFromSnapshot(snapshot: ElementBindingSnapshot): UiNode | null {
  const xmlText = snapshot.text; // v1：先支持内嵌文本；后续可补文件读取
  if (!xmlText) return null;
  const root = parseUiAutomatorXml(xmlText);
  attachParents(root);
  return root;
}

/**
 * 根据绑定信息从快照还原节点与上下文
 */
export function resolveBinding(binding: ElementBinding): ResolveResult<UiNode> {
  const root = restoreRootFromSnapshot(binding.snapshot);
  if (!root) return { root: null, node: null, parent: null, children: [] };
  // 1) 先用 XPath 精确定位
  let node = findByXPathRoot(root, binding.locator.xpath);
  // 2) 回退：XPath 失效时，按关键属性在整棵树中近似匹配
  if (!node) {
    node = findByApproximation(root, binding);
  }
  const parent = node?.parent || null;
  const children = node?.children || [];
  return { root, node: node || null, parent, children };
}

/** 关键属性集（用于稳健匹配） */
function pickKeyAttrs(attrs: Record<string, string>): Record<string, string> {
  const keys = ['resource-id', 'text', 'content-desc', 'class', 'package', 'bounds', 'index'];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = attrs[k];
    if (v != null && String(v).trim() !== '') out[k] = String(v);
  }
  return out;
}

function findByApproximation(root: UiNode, binding: ElementBinding): UiNode | null {
  const target = binding.identity.attributes;
  let best: { score: number; node: UiNode } | null = null;
  const stack: UiNode[] = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    const s = scoreNode(cur, target);
    if (s > (best?.score ?? -1)) best = { score: s, node: cur };
    for (const c of cur.children) stack.push(c);
  }
  // 简单阈值：至少匹配到 class 或 resource-id/text 之一
  if (best && best.score >= 1) return best.node;
  return null;
}

function scoreNode(n: UiNode, target: Record<string, string>): number {
  let s = 0;
  if (target['resource-id'] && n.attrs['resource-id'] === target['resource-id']) s += 3;
  if (target['class'] && n.attrs['class'] === target['class']) s += 2;
  if (target['text'] && n.attrs['text'] === target['text']) s += 2;
  if (target['content-desc'] && n.attrs['content-desc'] === target['content-desc']) s += 1;
  if (target['package'] && n.attrs['package'] === target['package']) s += 1;
  // bounds 完全一致加分
  if (target['bounds'] && n.attrs['bounds'] === target['bounds']) s += 2;
  return s;
}

/**
 * 基于“快照 + XPath”直接创建 ElementBinding（无需外部 UiNode）
 * 用于从表单/步骤参数中仅有 xmlSnapshot 与 preview.xpath 的场景
 */
export function createBindingFromSnapshotAndXPath(
  snapshot: ElementBindingSnapshot,
  xpath: string
): ElementBinding | null {
  const root = restoreRootFromSnapshot(snapshot);
  if (!root) return null;
  const node = findByXPathRoot(root, xpath);
  if (!node) return null;
  return createElementBinding(node, snapshot);
}
