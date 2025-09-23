import React, { useEffect, useRef } from 'react';
import { UiNode, AdvancedFilter, SearchOptions } from './types';
import type { MatchCriteria } from './panels/node-detail/types';
import { buildCriteriaFromNode } from './panels/node-detail/helpers';
import { nodeLabel, buildXPath } from './utils';
import styles from './GridElementView.module.css';
import { MatchBadges } from './MatchBadges';
import { CopyChip } from './CopyChip';
import { matchesToXml, downloadText } from './exporters';

export interface MatchResultsPanelProps {
  matches: UiNode[];
  matchIndex: number;
  keyword: string;
  onJump: (index: number, node: UiNode) => void;
  advFilter?: AdvancedFilter;
  onInsertXPath?: (xpath: string) => void;
  searchOptions?: Partial<SearchOptions>;
  highlightNode?: UiNode | null;
  onHoverNode?: (n: UiNode | null) => void;
  // 当在“修改参数”模式下允许从匹配结果选择一个元素并回填到步骤参数
  onSelectForStep?: (criteria: MatchCriteria) => void;
}

const highlight = (text: string, kw: string, opts?: Partial<SearchOptions>): React.ReactNode => {
  const k = (kw || '').trim();
  if (!k) return text;
  try {
    const caseSensitive = !!opts?.caseSensitive;
    const useRegex = !!opts?.useRegex;
    const re = useRegex
      ? new RegExp(k, caseSensitive ? 'g' : 'ig')
      : new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'ig');
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

export const MatchResultsPanel: React.FC<MatchResultsPanelProps> = ({ matches, matchIndex, keyword, onJump, advFilter, onInsertXPath, searchOptions, highlightNode, onHoverNode, onSelectForStep }) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!listRef.current || !highlightNode) return;
    const idx = matches.indexOf(highlightNode);
    if (idx >= 0) {
      const el = listRef.current.querySelector(`[data-match-item='${idx}']`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightNode, matches]);
  const onExport = () => {
    const data = matches.map(n => ({ tag: n.tag, attrs: n.attrs }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ui-matches.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const onExportXml = () => {
    const xml = matchesToXml(matches);
    downloadText(xml, 'ui-matches.xml', 'application/xml');
  };
  const onCopyAllXPaths = async () => {
    try {
      const lines = matches.map(n => buildXPath(n));
      await navigator.clipboard.writeText(lines.join('\n'));
      // 可选：轻提示，保持组件纯净暂不加入全局通知
    } catch {
      // 忽略
    }
  };
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className="flex items-center justify-between">
          <span>匹配结果（{matches.length}）</span>
          {(advFilter?.enabled && (advFilter.resourceId || advFilter.text || advFilter.className)) ? (
            <span className={styles.badge}>高级过滤</span>
          ) : (
            <div className="flex items-center gap-2">
              <button className={styles.btn} onClick={onExport} style={{ padding: '2px 6px' }}>导出JSON</button>
              <button className={styles.btn} onClick={onExportXml} style={{ padding: '2px 6px' }}>导出XML</button>
              <button className={styles.btn} onClick={onCopyAllXPaths} style={{ padding: '2px 6px' }}>复制全部 XPath</button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.cardBody} style={{ maxHeight: 240, overflow: 'auto' }} ref={listRef}>
        {matches.length === 0 ? (
          <div className="text-sm text-neutral-500">无匹配结果</div>
        ) : (
          <ul className="space-y-1">
            {matches.map((n, i) => (
              <li key={i} data-match-item={i} onMouseEnter={() => onHoverNode?.(n)} onMouseLeave={() => onHoverNode?.(null)}>
                <button
                  className={`w-full text-left px-2 py-1 rounded-md border ${n===highlightNode ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'} ${i === matchIndex ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}
                  onClick={() => onJump(i, n)}
                  title={n.attrs['class'] || n.tag}
                >
                  <div className="text-sm truncate flex items-center gap-2">
                    <span className="truncate">{highlight(nodeLabel(n), keyword, searchOptions)}</span>
                    <MatchBadges node={n} keyword={keyword} advFilter={advFilter} />
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {(n.attrs['resource-id'] && `id:${n.attrs['resource-id'].split('/').pop()}`) || n.attrs['class'] || n.tag}
                  </div>
                </button>
                <div className="mt-1 flex items-center gap-2">
                  <CopyChip text={buildXPath(n)} label="复制 XPath" />
                  {onInsertXPath && (
                    <button className={styles.btn} style={{ padding: '2px 6px' }} onClick={() => onInsertXPath(buildXPath(n))}>仅插入</button>
                  )}
                  {onSelectForStep && (
                    <button
                      className={styles.btn}
                      title="将此元素作为步骤的目标（按当前标准策略构建）"
                      style={{ padding: '2px 6px' }}
                      onClick={() => {
                        // 默认采用标准策略；由上层在写入步骤时可自由覆盖策略/字段
                        const criteria = buildCriteriaFromNode(n, 'standard');
                        onSelectForStep(criteria);
                      }}
                    >选择为步骤元素</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
