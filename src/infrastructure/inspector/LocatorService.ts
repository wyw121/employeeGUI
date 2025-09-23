import { ILocatorService } from '../../domain/inspector/services/ILocatorService';
import { NodeLocator } from '../../domain/inspector/entities/NodeLocator';
import { findByXPathRoot, findAllByPredicateXPath, findNearestClickableAncestor } from '../../components/universal-ui/views/grid-view/utils';

export class LocatorService implements ILocatorService<any> {
  resolve(root: any, locator: NodeLocator): any {
    if (!root || !locator) return null;
    // 1) absolute xPath
    if (locator.absoluteXPath) {
      const n = findByXPathRoot(root, locator.absoluteXPath);
      if (n) return n;
    }
    // 2) predicate xPath
    if (locator.predicateXPath) {
      const all = findAllByPredicateXPath(root, locator.predicateXPath);
      const picked = this.pickByAttributes(all, locator);
      if (picked) return picked;
    }
    // 3) attributes matching fallback
    const all: any[] = [];
    const stk = root ? [root] : [];
    while (stk.length) {
      const n = stk.pop();
      all.push(n);
      for (let i = n.children.length - 1; i >= 0; i--) stk.push(n.children[i]);
    }
    const picked = this.pickByAttributes(all, locator);
    if (picked) return picked;
    // 4) clickable ancestor
    return findNearestClickableAncestor(picked);
  }

  private pickByAttributes(nodes: any[], locator: NodeLocator) {
    if (!nodes || nodes.length === 0) return null;
    if (!locator.attributes) return nodes[0] ?? null;
    let best: any = null; let bestScore = -1;
    for (const n of nodes) {
      let s = 0;
      const a = n?.attrs || {};
      const L = locator.attributes;
      if (L.resourceId && a['resource-id'] === L.resourceId) s += 3;
      if (L.className && a['class'] === L.className) s += 2;
      if (L.text && (a['text'] || '').includes(L.text)) s += 1;
      if (L.contentDesc && (a['content-desc'] || '').includes(L.contentDesc)) s += 1;
      if (L.packageName && a['package'] === L.packageName) s += 1;
      if (s > bestScore) { bestScore = s; best = n; }
    }
    return best;
  }
}
