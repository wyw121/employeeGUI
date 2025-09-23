import React, { useMemo } from 'react';
import { UiNode } from './types';
import { parseBounds } from './utils';
import styles from './GridElementView.module.css';

export const ScreenPreview: React.FC<{ root: UiNode | null; selected: UiNode | null; onSelect?: (n: UiNode) => void; }> = ({ root, selected, onSelect }) => {
  const screen = useMemo(() => {
    function findBounds(n?: UiNode | null): ReturnType<typeof parseBounds> {
      if (!n) return null as any;
      const b = parseBounds(n.attrs['bounds']);
      if (b) return b;
      for (const c of n.children) {
        const r = findBounds(c);
        if (r) return r;
      }
      return null as any;
    }
    const fb = findBounds(root) || { x1: 0, y1: 0, x2: 1080, y2: 2400, w: 1080, h: 2400 };
    return { width: fb.w, height: fb.h };
  }, [root]);

  const boxes = useMemo(() => {
    const result: { n: UiNode; b: ReturnType<typeof parseBounds> }[] = [];
    function walk(n?: UiNode | null) {
      if (!n) return;
      const b = parseBounds(n.attrs['bounds']);
      if (b && b.w > 0 && b.h > 0) result.push({ n, b });
      for (const c of n.children) walk(c);
    }
    walk(root);
    return result;
  }, [root]);

  const viewW = 300;
  const scale = screen.width > 0 ? viewW / screen.width : 1;
  const viewH = Math.max(100, Math.round(screen.height * scale));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">屏幕预览</div>
        <div className="text-xs text-neutral-500">{screen.width}×{screen.height}</div>
      </div>
      <div className={`${styles.previewBox} relative`} style={{ width: viewW, height: viewH }}>
        {boxes.map(({ n, b }, i) => {
          const sel = n === selected;
          return (
            <div
              key={i}
              className={`${styles.elementRect} ${sel ? styles.elementRectActive : ''}`}
              style={{
                left: Math.round(b.x1 * scale),
                top: Math.round(b.y1 * scale),
                width: Math.max(1, Math.round(b.w * scale)),
                height: Math.max(1, Math.round(b.h * scale)),
              }}
              title={n.attrs['class'] || n.tag}
              onClick={() => onSelect?.(n)}
            />
          );
        })}
      </div>
      {selected?.attrs['bounds'] && (
        <div className="text-xs text-neutral-600 dark:text-neutral-300">
          选中元素 bounds: <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">{selected.attrs['bounds']}</code>
        </div>
      )}
    </div>
  );
};
