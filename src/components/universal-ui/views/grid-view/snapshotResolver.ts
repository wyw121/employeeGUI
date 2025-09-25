import { useMemo } from 'react';
import type { UiNode } from './types';
import { parseUiAutomatorXml, attachParents, findByXPathRoot } from './utils';

// 轻量类型：避免与 step-card 形成环状依赖，仅使用到的子集
export interface MinimalBindingSnapshot { text?: string }
export interface MinimalBindingLocator { xpath?: string }
export interface MinimalBindingIdentity { attributes?: Record<string, string> }
export interface MinimalElementBinding {
  snapshot?: MinimalBindingSnapshot;
  locator?: MinimalBindingLocator;
  identity?: MinimalBindingIdentity;
}

export interface SnapshotResolveInput {
  // v1: 直接提供 xml 文本 + xpath
  xmlText?: string;
  xpath?: string;
  // v2: 或者提供最小化的 elementBinding（含 snapshot.text 与 locator.xpath）
  elementBinding?: MinimalElementBinding | null;
}

export interface SnapshotResolveResult<TNode = UiNode> {
  root: TNode | null;
  node: TNode | null;
  parent: TNode | null;
  children: TNode[];
}

function restoreRoot(xmlText?: string | null): UiNode | null {
  if (!xmlText || typeof xmlText !== 'string' || xmlText.trim() === '') return null;
  const root = parseUiAutomatorXml(xmlText);
  attachParents(root);
  return root;
}

function scoreApprox(n: UiNode, target: Record<string, string> | undefined): number {
  if (!target) return -1;
  let s = 0;
  if (target['resource-id'] && n.attrs['resource-id'] === target['resource-id']) s += 3;
  if (target['class'] && n.attrs['class'] === target['class']) s += 2;
  if (target['text'] && n.attrs['text'] === target['text']) s += 2;
  if (target['content-desc'] && n.attrs['content-desc'] === target['content-desc']) s += 1;
  if (target['package'] && n.attrs['package'] === target['package']) s += 1;
  if (target['bounds'] && n.attrs['bounds'] === target['bounds']) s += 2;
  return s;
}

function findByApproximation(root: UiNode, target?: Record<string, string>): UiNode | null {
  if (!target) return null;
  let best: { score: number; node: UiNode } | null = null;
  const stack: UiNode[] = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    const s = scoreApprox(cur, target);
    if (s > (best?.score ?? -1)) best = { score: s, node: cur };
    for (const c of cur.children) stack.push(c);
  }
  if (best && best.score >= 1) return best.node;
  return null;
}

export function resolveFromSnapshotAndXPath(xmlText?: string, xpath?: string): SnapshotResolveResult<UiNode> {
  const root = restoreRoot(xmlText);
  if (!root) return { root: null, node: null, parent: null, children: [] };
  const node = xpath ? findByXPathRoot(root, xpath) : null;
  const parent = node?.parent || null;
  const children = node?.children || [];
  return { root, node: node || null, parent, children };
}

export function resolveFromBinding(binding?: MinimalElementBinding | null): SnapshotResolveResult<UiNode> {
  if (!binding) return { root: null, node: null, parent: null, children: [] };
  const xml = binding.snapshot?.text;
  const xp = binding.locator?.xpath;
  const root = restoreRoot(xml);
  if (!root) return { root: null, node: null, parent: null, children: [] };
  let node = xp ? findByXPathRoot(root, xp) : null;
  if (!node) {
    node = findByApproximation(root, binding.identity?.attributes);
  }
  const parent = node?.parent || null;
  const children = node?.children || [];
  return { root, node: node || null, parent, children };
}

export function resolveSnapshot(input: SnapshotResolveInput): SnapshotResolveResult<UiNode> {
  const { elementBinding, xmlText, xpath } = input || {};
  if (elementBinding) return resolveFromBinding(elementBinding);
  return resolveFromSnapshotAndXPath(xmlText, xpath);
}

export function useSnapshotResolver(input: SnapshotResolveInput): SnapshotResolveResult<UiNode> {
  return useMemo(() => resolveSnapshot(input), [
    input?.elementBinding,
    input?.elementBinding?.snapshot?.text,
    input?.elementBinding?.locator?.xpath,
    input?.xmlText,
    input?.xpath,
  ]);
}
