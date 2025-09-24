// 统一的 bounds 工具：对象 <-> 字符串

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 将对象格式的 bounds 转为 UIAutomator 常见的字符串格式: "[l,t][r,b]"
export function stringifyBounds(rect?: RectLike | null): string | undefined {
  if (!rect) return undefined;
  const { left, top, right, bottom } = rect;
  if (
    [left, top, right, bottom].some(
      (v) => typeof v !== 'number' || Number.isNaN(v)
    )
  ) {
    return undefined;
  }
  return `[${Math.round(left)},${Math.round(top)}][${Math.round(
    right
  )},${Math.round(bottom)}]`;
}

// 将字符串格式的 bounds 解析为对象
export function parseBounds(str?: string | null): RectLike | undefined {
  if (!str) return undefined;
  const m = str.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return undefined;
  const [, l, t, r, b] = m;
  const left = parseInt(l, 10);
  const top = parseInt(t, 10);
  const right = parseInt(r, 10);
  const bottom = parseInt(b, 10);
  if ([left, top, right, bottom].some((v) => Number.isNaN(v))) return undefined;
  return { left, top, right, bottom };
}
