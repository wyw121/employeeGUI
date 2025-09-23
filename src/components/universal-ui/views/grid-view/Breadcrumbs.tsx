import React, { useMemo } from 'react';
import { UiNode } from './types';
import styles from './GridElementView.module.css';

export interface BreadcrumbsProps {
  selected: UiNode | null;
  onSelect: (n: UiNode) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ selected, onSelect }) => {
  const chain = useMemo(() => {
    const arr: UiNode[] = [];
    let cur = selected || null;
    while (cur) { arr.unshift(cur); cur = cur.parent || null; }
    return arr;
  }, [selected]);

  if (!selected) return null;

  return (
    <div className="flex items-center flex-wrap gap-1 text-xs">
      {chain.map((n, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-neutral-400">/</span>}
          <button
            className={`${styles.badge} hover:underline`}
            onClick={() => onSelect(n)}
            title={n.attrs['class'] || n.tag}
          >{n.attrs['class']?.split('.').pop() || n.tag}</button>
        </React.Fragment>
      ))}
    </div>
  );
};
