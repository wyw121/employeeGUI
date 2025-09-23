import React from 'react';
import styles from './GridElementView.module.css';

interface MatchCountSummaryProps {
  total: number;
  index: number; // -1 when none
  autoSelectOnParse: boolean;
  onToggleAutoSelect: (v: boolean) => void;
}

export const MatchCountSummary: React.FC<MatchCountSummaryProps> = ({ total, index, autoSelectOnParse, onToggleAutoSelect }) => {
  const current = index >= 0 ? index + 1 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={styles.badge} title="当前匹配/总匹配">{current}/{total}</span>
      <label className="text-xs text-neutral-500 flex items-center gap-1" title="解析 XML 后自动定位到首个匹配">
        <input type="checkbox" checked={autoSelectOnParse} onChange={(e) => onToggleAutoSelect(e.target.checked)} /> 解析后自动定位首个匹配
      </label>
    </div>
  );
};
