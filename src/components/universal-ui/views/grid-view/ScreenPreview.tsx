import React, { useMemo, useState } from 'react';
import { UiNode } from './types';
import { parseBounds } from './utils';
import styles from './GridElementView.module.css';

type ScaleMode = 'fit' | 'actual' | 'custom';

export const ScreenPreview: React.FC<{ root: UiNode | null; selected: UiNode | null; onSelect?: (n: UiNode) => void; matchedSet?: Set<UiNode>; }> = ({ root, selected, onSelect, matchedSet }) => {
  const [scaleMode, setScaleMode] = useState<ScaleMode>('fit');
  const [zoom, setZoom] = useState<number>(100); // percent for custom
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

  const baseW = 300;
  let scale = screen.width > 0 ? baseW / screen.width : 1;
  if (scaleMode === 'actual') scale = 1;
  if (scaleMode === 'custom') scale = (zoom / 100);
  const viewW = Math.round(screen.width * scale);
  const viewH = Math.max(100, Math.round(screen.height * scale));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-base font-semibold">屏幕预览</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{screen.width}×{screen.height}</span>
          <span>·</span>
          <button className="underline" onClick={() => setScaleMode('fit')} title="适配宽度">适配</button>
          <button className="underline" onClick={() => setScaleMode('actual')} title="实际像素">实际</button>
          <span>
            <label className="mr-1">缩放</label>
            <input
              type="range"
              min={25}
              max={300}
              step={5}
              value={scaleMode === 'custom' ? zoom : Math.round(scale * 100)}
              onChange={(e) => { setScaleMode('custom'); setZoom(parseInt(e.target.value, 10) || 100); }}
            />
            <span className="ml-1">{Math.round(scale * 100)}%</span>
          </span>
        </div>
      </div>
      <div className={`${styles.previewBox} relative`} style={{ width: viewW, height: viewH }}>
        {boxes.map(({ n, b }, i) => {
          const sel = n === selected;
          const matched = matchedSet?.has(n);
          return (
            <div
              key={i}
              className={`${styles.elementRect} ${matched ? styles.elementRectMatched : ''} ${sel ? styles.elementRectActive : ''}`}
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
