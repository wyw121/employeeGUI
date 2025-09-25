export interface ElementBindingSnapshot {
  source: 'file' | 'memory';
  path?: string; // 相对路径，如 debug_xml/xxx.xml
  text?: string; // 备选：直接内嵌的 XML 文本（不推荐大文本，但便于过渡）
  sha1?: string; // 可选：完整性校验
  capturedAt: number;
  deviceId?: string;
}

export interface ElementBindingLocator {
  xpath: string; // 捕获时的绝对 XPath
  bounds?: string; // 捕获时的 bounds
}

export interface ElementBindingIdentity {
  attributes: Record<string, string>; // 元素关键属性快照
  parentAttributes?: Record<string, string>; // 父节点关键属性快照
  childCount?: number;
}

export interface ElementBinding {
  snapshot: ElementBindingSnapshot;
  locator: ElementBindingLocator;
  identity: ElementBindingIdentity;
}

export interface ResolveResult<TNode = any> {
  root: TNode | null;
  node: TNode | null;
  parent: TNode | null;
  children: TNode[];
}
