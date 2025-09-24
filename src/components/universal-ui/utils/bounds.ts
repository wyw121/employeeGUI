// 统一的 bounds 工具（前端）
// 提供健壮的字符串解析与对象序列化，保持与后端解析规则一致

export interface BoundsRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 解析如 "[l,t][r,b]" 或 "l,t,r,b" 的字符串；容忍空格与全角括号
export function parseBoundsString(input?: string | null): BoundsRect | undefined {
  if (!input || typeof input !== 'string') return undefined;
  let s = input.trim();
  if (!s) return undefined;
  // 全角括号归一
  s = s.replace(/［/g, '[').replace(/］/g, ']');
  // [l,t][r,b]
  const bracket = s.match(/\[(\s*[-\d]+\s*),(\s*[-\d]+\s*)\]\[(\s*[-\d]+\s*),(\s*[-\d]+\s*)\]/);
  if (bracket) {
    const [_, l, t, r, b] = bracket;
    const left = parseInt(l.replace(/\s+/g, ''), 10);
    const top = parseInt(t.replace(/\s+/g, ''), 10);
    const right = parseInt(r.replace(/\s+/g, ''), 10);
    const bottom = parseInt(b.replace(/\s+/g, ''), 10);
    if (Number.isFinite(left) && Number.isFinite(top) && Number.isFinite(right) && Number.isFinite(bottom)) {
      return { left, top, right, bottom };
    }
  }
  // l,t,r,b
  const parts = s.split(',').map(p => p.trim());
  if (parts.length === 4) {
    const [l, t, r, b] = parts;
    const left = parseInt(l, 10);
    const top = parseInt(t, 10);
    const right = parseInt(r, 10);
    const bottom = parseInt(b, 10);
    if (Number.isFinite(left) && Number.isFinite(top) && Number.isFinite(right) && Number.isFinite(bottom)) {
      return { left, top, right, bottom };
    }
  }
  return undefined;
}

export function rectToBoundsString(rect: BoundsRect): string {
  const { left, top, right, bottom } = rect;
  return `[${left},${top}][${right},${bottom}]`;
}

export function toBoundsRect(val: unknown): BoundsRect | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return parseBoundsString(val);
  if (typeof val === 'object') {
    const r = val as any;
    const left = Number(r.left);
    const top = Number(r.top);
    const right = Number(r.right);
    const bottom = Number(r.bottom);
    if ([left, top, right, bottom].every(n => Number.isFinite(n))) {
      return { left, top, right, bottom };
    }
  }
  return undefined;
}
