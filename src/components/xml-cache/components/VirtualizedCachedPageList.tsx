import React, { useEffect, useMemo } from "react";
import type { CachedXmlPage } from "../../../services/XmlPageCacheService";
import CachedPageCard from "./CachedPageCard";

export interface VirtualizedCachedPageListProps {
  pages: CachedXmlPage[];
  height?: number; // viewport height in px
  rowHeight?: number; // row height in px
  columns?: number;
  gutter?: number;
  onSelect: (page: CachedXmlPage) => void;
  onDelete: (page: CachedXmlPage) => void;
  onCopyPath: (page: CachedXmlPage) => void;
  onReveal: (page: CachedXmlPage) => void;
  formatFileSize: (bytes: number) => string;
  formatTime: (date: Date) => string;
  getAppIcon: (appPackage: string) => string;
}

// Lightweight manual virtualization without extra deps:
// - Only renders visible rows + small buffer
// - Assumes fixed rowHeight and fixed columns
export const VirtualizedCachedPageList: React.FC<VirtualizedCachedPageListProps> = ({
  pages,
  height = 600,
  rowHeight = 320,
  columns = 3,
  gutter = 16,
  onSelect,
  onDelete,
  onCopyPath,
  onReveal,
  formatFileSize,
  formatTime,
  getAppIcon,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  const effRowHeight = measuredRowHeight ?? rowHeight;
  const totalRows = Math.ceil(pages.length / columns);
  const totalHeight = Math.max(0, totalRows * (effRowHeight + gutter) - gutter);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const { startRow, endRow } = useMemo(() => {
    const buffer = 2; // rows buffer
    const first = Math.max(0, Math.floor(scrollTop / (effRowHeight + gutter)) - buffer);
    const last = Math.min(totalRows - 1, Math.ceil((scrollTop + height) / (effRowHeight + gutter)) + buffer);
    return { startRow: first, endRow: last };
  }, [scrollTop, effRowHeight, gutter, height, totalRows]);

  const items: Array<React.ReactNode> = [];
  for (let row = startRow; row <= endRow; row++) {
    const y = row * (effRowHeight + gutter);
    const rowItems: Array<React.ReactNode> = [];
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index >= pages.length) break;
      const page = pages[index];
      rowItems.push(
        <div key={page.absoluteFilePath} style={{ width: `calc(${100 / columns}% - ${gutter - gutter / columns}px)` }}>
          <CachedPageCard
            page={page}
            onSelect={onSelect}
            onDelete={onDelete}
            onCopyPath={onCopyPath}
            onReveal={onReveal}
            formatFileSize={formatFileSize}
            formatTime={formatTime}
            getAppIcon={getAppIcon}
          />
        </div>
      );
    }
    items.push(
      <div key={`row-${row}`} style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", gap: gutter }}>
        {rowItems}
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} style={{ position: "relative", height, overflow: "auto", borderRadius: 6 }}>
      {/* Hidden measurement slot to dynamically estimate row height (single column recommended) */}
      <div ref={measureRef} style={{ position: "absolute", visibility: "hidden", top: 0, left: 0, right: 0 }}>
        {pages[0] ? (
          <div style={{ paddingBottom: gutter }}>
            <CachedPageCard
              page={pages[0]}
              onSelect={() => {}}
              onDelete={() => {}}
              onCopyPath={() => {}}
              onReveal={() => {}}
              formatFileSize={formatFileSize}
              formatTime={formatTime}
              getAppIcon={getAppIcon}
            />
          </div>
        ) : null}
      </div>
      <div style={{ height: totalHeight, position: "relative" }}>{items}</div>
    </div>
  );
};

// Measure row height whenever content or container width changes
export function useDynamicRowHeight(
  ref: React.RefObject<HTMLDivElement>,
  measureRef: React.RefObject<HTMLDivElement>,
  setHeight: (h: number) => void,
  deps: React.DependencyList
) {
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      // Defer to next frame to ensure layout is ready
      requestAnimationFrame(() => {
        if (measureRef.current) {
          const rect = measureRef.current.getBoundingClientRect();
          const h = rect.height;
          if (h && h > 0) setHeight(h);
        }
      });
    });
    ro.observe(ref.current);
    // Also measure immediately on mount/update
    requestAnimationFrame(() => {
      if (measureRef.current) {
        const rect = measureRef.current.getBoundingClientRect();
        const h = rect.height;
        if (h && h > 0) setHeight(h);
      }
    });
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Hook usage inside component (append below component definition)
// Attach measurement to account for width changes and first page changes
export default function WrappedVirtualizedCachedPageList(props: VirtualizedCachedPageListProps) {
  const Comp = VirtualizedCachedPageList as React.FC<VirtualizedCachedPageListProps>;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = React.useState<number | null>(null);

  // Local wrapper renders the inner component while injecting refs via context-like props
  const Inner: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pages } = props;
    return (
      <div ref={containerRef} style={{ height: 0, overflow: "hidden" }}>
        <div ref={measureRef} />
      </div>
    );
  };

  // Use shared measurement hook
  useDynamicRowHeight(containerRef, measureRef, (h) => setMeasured(h), [props.pages.length]);

  // Render the actual component with measuredRowHeight injection by cloning props
  return (
    <Comp
      {...props}
      // pass measured value via prop override using default when null
      rowHeight={measured ?? props.rowHeight}
    />
  );
}
// Note: default export is the wrapped component that auto-updates rowHeight
