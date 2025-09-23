import React, { useEffect, useRef } from 'react';
import { UiNode } from './types';
import styles from './GridElementView.module.css';
import { nodeLabel, buildXPath } from './utils';
import { MatchBadges } from './MatchBadges';
import { CopyChip } from './CopyChip';

export interface XPathTestResultsPanelProps {
  nodes: UiNode[];
  onJump: (node: UiNode) => void;
  highlightNode?: UiNode | null;
  onHoverNode?: (n: UiNode | null) => void;
}

export const XPathTestResultsPanel: React.FC<XPathTestResultsPanelProps> = ({ nodes, onJump, highlightNode, onHoverNode }) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!listRef.current || !highlightNode) return;
    // 尝试找到第一个匹配项并滚动到可视区域
    const idx = nodes.indexOf(highlightNode);
    if (idx >= 0) {
      const el = listRef.current.querySelector(`[data-xpath-item='${idx}']`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightNode, nodes]);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>XPath 测试结果（{nodes.length}）</div>
      <div className={styles.cardBody} style={{ maxHeight: 240, overflow: 'auto' }} ref={listRef}>
        {nodes.length === 0 ? (
          <div className="text-sm text-neutral-500">无命中</div>
        ) : (
          <ul className="space-y-1">
            {nodes.map((n, i) => (
              <li key={i} data-xpath-item={i} onMouseEnter={() => onHoverNode?.(n)} onMouseLeave={() => onHoverNode?.(null)}>
                <button
                  className={`w-full text-left px-2 py-1 rounded-md border ${highlightNode===n ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'}`}
                  onClick={() => onJump(n)}
                  title={n.attrs['class'] || n.tag}
                >
                  <div className="text-sm truncate flex items-center gap-2">
                    <span className="truncate">{nodeLabel(n)}</span>
                    <MatchBadges node={n} keyword={''} />
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {(n.attrs['resource-id'] && `id:${n.attrs['resource-id'].split('/').pop()}`) || n.attrs['class'] || n.tag}
                  </div>
                </button>
                <div className="mt-1 flex items-center gap-2">
                  <CopyChip text={buildXPath(n)} label="复制 XPath" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
