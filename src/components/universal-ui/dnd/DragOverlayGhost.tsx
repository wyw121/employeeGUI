import React from 'react';

export interface DragOverlayGhostProps {
  title: string;
  subtitle?: string;
  index?: number;
}

export const DragOverlayGhost: React.FC<DragOverlayGhostProps> = ({ title, subtitle, index }) => {
  return (
    <div
      style={{
        width: '100%',
        transform: 'translateZ(0)',
        willChange: 'transform',
        pointerEvents: 'none',
      }}
      className="select-none"
    >
      <div className="rounded-lg border bg-white shadow-lg px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">≡</span>
          <span className="font-medium truncate max-w-[260px]" title={title}>{title}</span>
          {typeof index === 'number' && (
            <span className="text-xs text-gray-500">#{index + 1}</span>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-400 mt-1 truncate max-w-[280px]" title={subtitle}>{subtitle}</div>
        )}
      </div>
    </div>
  );
};

export default DragOverlayGhost;
