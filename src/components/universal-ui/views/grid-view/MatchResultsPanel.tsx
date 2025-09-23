import React from 'react';
import { UiNode, AdvancedFilter } from './types';
import { nodeLabel } from './utils';
import styles from './GridElementView.module.css';

export interface MatchResultsPanelProps {
  matches: UiNode[];
  matchIndex: number;
  keyword: string;
  onJump: (index: number, node: UiNode) => void;
  advFilter?: AdvancedFilter;
}

const highlight = (text: string, kw: string): React.ReactNode => {
  const k = (kw || '').trim();
  if (!k) return text;
  try {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(esc, 'ig');
    const parts = text.split(re);
    const matches = text.match(re) || [];
    const res: React.ReactNode[] = [];
    parts.forEach((p, i) => {
      res.push(p);
      if (i < matches.length) res.push(<span key={i} className={styles.mark}>{matches[i]}</span>);
    });
    return <>{res}</>;
  } catch {
    return text;
  }
};

export const MatchResultsPanel: React.FC<MatchResultsPanelProps> = ({ matches, matchIndex, keyword, onJump, advFilter }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className="flex items-center justify-between">
          <span>匹配结果（{matches.length}）</span>
          {(advFilter?.enabled && (advFilter.resourceId || advFilter.text || advFilter.className)) ? (
            <span className={styles.badge}>高级过滤</span>
          ) : null}
        </div>
      </div>
      <div className={styles.cardBody} style={{ maxHeight: 240, overflow: 'auto' }}>
        {matches.length === 0 ? (
          <div className="text-sm text-neutral-500">无匹配结果</div>
        ) : (
          <ul className="space-y-1">
            {matches.map((n, i) => (
              <li key={i}>
                <button
                  className={`w-full text-left px-2 py-1 rounded-md border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 ${i === matchIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  onClick={() => onJump(i, n)}
                  title={n.attrs['class'] || n.tag}
                >
                  <div className="text-sm truncate">{highlight(nodeLabel(n), keyword)}</div>
                  <div className="text-xs text-neutral-500 truncate">
                    {(n.attrs['resource-id'] && `id:${n.attrs['resource-id'].split('/').pop()}`) || n.attrs['class'] || n.tag}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
