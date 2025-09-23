import { UiNode } from './types';

export function nodeToJson(n: UiNode) {
  return { tag: n.tag, attrs: n.attrs, children: n.children.map(nodeToJson) };
}

export function nodeToXml(n: UiNode, indent = ''): string {
  const attrs = Object.entries(n.attrs)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}` + `"`).join(' ');
  const open = attrs ? `<${n.tag} ${attrs}>` : `<${n.tag}>`;
  if (n.children.length === 0) return `${indent}${open}</${n.tag}>`;
  const inner = n.children.map(c => nodeToXml(c, indent + '  ')).join('\n');
  return `${indent}${open}\n${inner}\n${indent}</${n.tag}>`;
}

export function matchesToXml(nodes: UiNode[]): string {
  const inner = nodes.map(n => nodeToXml(n, '  ')).join('\n');
  return `<matches>\n${inner}\n</matches>`;
}

export function downloadText(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
