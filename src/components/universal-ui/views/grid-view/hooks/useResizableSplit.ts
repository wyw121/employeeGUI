import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useResizableSplit
 * 抽离 GridElementView 中的左右分栏拖拽逻辑。
 * 保持原有 localStorage key: 'grid.leftWidth' 不变，范围约束 20% - 80%。
 */
export function useResizableSplit(key: string = 'grid.leftWidth', defaultPct = 36) {
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v >= 20 && v <= 80 ? v : defaultPct;
  });
  const draggingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(key, String(leftWidth));
  }, [leftWidth, key]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const container = document.getElementById('grid-split');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const pct = Math.max(20, Math.min(80, (px / rect.width) * 100));
      setLeftWidth(pct);
      e.preventDefault();
    };
    const onUp = () => { draggingRef.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  }, []);

  return { leftWidth, startDrag } as const;
}
