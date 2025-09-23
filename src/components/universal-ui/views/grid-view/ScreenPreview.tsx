import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UiNode } from './types';
import { parseBounds } from './utils';
import styles from './GridElementView.module.css';

type ScaleMode = 'fit' | 'actual' | 'custom';

export const ScreenPreview: React.FC<{ root: UiNode | null; selected: UiNode | null; onSelect?: (n: UiNode) => void; matchedSet?: Set<UiNode>; highlightNode?: UiNode | null; highlightKey?: number; enableFlashHighlight?: boolean; previewAutoCenter?: boolean; }> = ({ root, selected, onSelect, matchedSet, highlightNode, highlightKey, enableFlashHighlight = true, previewAutoCenter = true }) => {
  const [scaleMode, setScaleMode] = useState<ScaleMode>('fit');
  const [zoom, setZoom] = useState<number>(100); // percent for custom
  const flashRef = useRef<number>(0);
  const rectRefs = useRef<Array<HTMLDivElement | null>>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const centerTimerRef = useRef<number | null>(null);
  const lastUserScrollRef = useRef<number>(0);
  const lastCenteredNodeRef = useRef<UiNode | null>(null);
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
  
  // 监听滚动/滚轮，短时间内判定为用户主动滚动，避免“自动居中”打断用户操作
  useEffect(() => {
    const c = containerRef.current;
    const mark = () => { lastUserScrollRef.current = Date.now(); };
    c?.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('wheel', mark, { passive: true });
    return () => {
      c?.removeEventListener('scroll', mark);
      window.removeEventListener('scroll', mark);
      window.removeEventListener('wheel', mark);
    };
  }, []);

  function isInView(_container: HTMLElement, el: HTMLElement, margin = 12) {
    // 使用窗口视口判断，而不是内部容器（容器本身不滚动）
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const er = el.getBoundingClientRect();
    const fullyAbove = er.bottom < 0 + margin;
    const fullyBelow = er.top > vh - margin;
    const fullyLeft = er.right < 0 + margin;
    const fullyRight = er.left > vw - margin;
    return !(fullyAbove || fullyBelow || fullyLeft || fullyRight);
  }

  function scrollIntoViewSafe(el: HTMLElement) {
    if (typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } catch {
        el.scrollIntoView(true);
      }
    }
  }

  const baseW = 300;
  let scale = screen.width > 0 ? baseW / screen.width : 1;
  if (scaleMode === 'actual') scale = 1;
  if (scaleMode === 'custom') scale = (zoom / 100);
  const viewW = Math.round(screen.width * scale);
  const viewH = Math.max(100, Math.round(screen.height * scale));

  // 触发闪烁：当 highlightKey 变化时，记录一次闪烁计数
  useEffect(() => {
    if (typeof highlightKey === 'number') {
      flashRef.current = (flashRef.current || 0) + 1;
    }
  }, [highlightKey]);

  // 自动滚动/定位：仅在选中元素变化时触发，并带去抖与视口检测，避免“滚动锁死”
  useEffect(() => {
    if (!previewAutoCenter) return;
    if (!selected) return;
    const idx = boxes.findIndex(({ n }) => n === selected);
    if (idx < 0) return;
    const el = rectRefs.current[idx];
    const container = containerRef.current;
    if (!el || !container) return;

    // 距离用户滚动太近则跳过自动定位
    if (Date.now() - lastUserScrollRef.current < 300) return;

    // 已在视口范围内则不再滚动
    if (isInView(container, el, 12)) return;

    // 去抖：短暂延迟合并多次变更
    if (centerTimerRef.current) {
      window.clearTimeout(centerTimerRef.current);
    }
    centerTimerRef.current = window.setTimeout(() => {
      scrollIntoViewSafe(el);
      lastCenteredNodeRef.current = selected;
    }, 120);
  }, [previewAutoCenter, selected, boxes]);

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
      <div ref={containerRef} className={`${styles.previewBox} relative`} style={{ width: viewW, height: viewH }}>
        {boxes.map(({ n, b }, i) => {
          const sel = n === selected;
          const matched = matchedSet?.has(n);
          const isHL = highlightNode === n;
          return (
            <div
              key={i}
              ref={(el) => { rectRefs.current[i] = el; }}
              className={`${styles.elementRect} ${matched ? styles.elementRectMatched : ''} ${sel ? styles.elementRectActive : ''} ${isHL && enableFlashHighlight ? styles.elementRectFlash : ''}`}
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
