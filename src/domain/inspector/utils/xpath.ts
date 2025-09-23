import type { UiNode } from '../../../components/universal-ui/views/grid-view/types';

export function buildXPath(n: UiNode | null | undefined): string {
  if (!n) return '';
  const parts: string[] = [];
  let cur: UiNode | null | undefined = n;
  while (cur) {
    let idx = 1;
    if (cur.parent) {
      const siblings = cur.parent.children.filter(c => c.tag === cur!.tag);
      const meIndex = siblings.indexOf(cur) + 1;
      idx = meIndex > 0 ? meIndex : 1;
    }
    parts.unshift(`${cur.tag}[${idx}]`);
    cur = cur.parent;
  }
  return '/' + parts.join('/');
}
