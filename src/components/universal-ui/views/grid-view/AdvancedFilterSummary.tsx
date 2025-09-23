import React from 'react';
import { AdvancedFilter } from './types';
import styles from './GridElementView.module.css';

export interface AdvancedFilterSummaryProps {
  value: AdvancedFilter;
  onClear: () => void;
}

export const AdvancedFilterSummary: React.FC<AdvancedFilterSummaryProps> = ({ value, onClear }) => {
  if (!value.enabled) return null;
  const chips: string[] = [];
  if (value.resourceId) chips.push(`id~"${value.resourceId}"`);
  if (value.text) chips.push(`text/desc~"${value.text}"`);
  if (value.className) chips.push(`class~"${value.className}"`);
  if (value.packageName) chips.push(`pkg~"${value.packageName}"`);
  if (value.clickable !== null) chips.push(`clickable:${value.clickable}`);
  if (value.nodeEnabled !== null) chips.push(`enabled:${value.nodeEnabled}`);
  if (chips.length === 0) return null;
  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
      <span className="shrink-0">已启用高级过滤（{value.mode}）:</span>
      <div className="flex flex-wrap gap-1">
        {chips.map((c, i) => (
          <span key={i} className={styles.badge}>{c}</span>
        ))}
      </div>
      <button className={styles.btn} onClick={onClear} style={{ padding: '2px 6px' }}>清除</button>
    </div>
  );
};
