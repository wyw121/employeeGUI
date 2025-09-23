import React from 'react';
import styles from './GridElementView.module.css';
import { AdvancedFilter } from './types';

export interface FilterBarProps {
  value: AdvancedFilter;
  onChange: (v: AdvancedFilter) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ value, onChange }) => {
  const set = (patch: Partial<AdvancedFilter>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-neutral-500 flex items-center gap-1">
        <input type="checkbox" checked={value.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> 启用多条件过滤
      </label>
      <select
        className={styles.input}
        value={value.mode}
        onChange={(e) => set({ mode: (e.target.value as 'AND' | 'OR') })}
        style={{ width: 88 }}
      >
        <option value="AND">AND</option>
        <option value="OR">OR</option>
      </select>
      <input
        className={styles.input}
        placeholder="resource-id"
        value={value.resourceId}
        onChange={(e) => set({ resourceId: e.target.value })}
        style={{ width: 160 }}
      />
      <input
        className={styles.input}
        placeholder="text/content-desc"
        value={value.text}
        onChange={(e) => set({ text: e.target.value })}
        style={{ width: 200 }}
      />
      <input
        className={styles.input}
        placeholder="class"
        value={value.className}
        onChange={(e) => set({ className: e.target.value })}
        style={{ width: 160 }}
      />
    </div>
  );
};
