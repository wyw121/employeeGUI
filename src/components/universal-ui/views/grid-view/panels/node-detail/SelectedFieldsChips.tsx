import React from 'react';
import styles from '../../GridElementView.module.css';

export interface SelectedFieldsChipsProps {
  selected: string[];
  onToggle: (field: string) => void;
}

const LABELS: Record<string,string> = {
  'resource-id': 'ID',
  'text': '文本',
  'content-desc': '描述',
  'class': '类名',
  'package': '包名',
  'bounds': '位置',
  'index': '序号',
};

export const SelectedFieldsChips: React.FC<SelectedFieldsChipsProps> = ({ selected, onToggle }) => {
  const all = Object.keys(LABELS);
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">已勾选：</span>
      {all.map(f => {
        const active = selected.includes(f);
        return (
          <button
            key={f}
            className={`${styles.chip} ${active ? styles.chipActive : ''}`}
            onClick={() => onToggle(f)}
            title={f}
          >{LABELS[f] || f}</button>
        );
      })}
    </div>
  );
};

export default SelectedFieldsChips;
