import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UiNode, SearchOptions } from './types';
import { nodeLabel } from './utils';
import styles from './GridElementView.module.css';
import { MatchBadges } from './MatchBadges';
import { ScreenPreviewSetElementButton, type CompleteStepCriteria } from './panels/node-detail';

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className={styles.badge}>{children}</span>
);

export interface TreeRowProps {
  node: UiNode;
  depth: number;
  selected: UiNode | null;
  onSelect: (n: UiNode) => void;
  onHoverNode?: (n: UiNode | null) => void;
  filter: string;
  searchOptions?: Partial<SearchOptions>;
  expandAll: boolean;
  collapseVersion: number;
  expandDepth: number;
  matchedSet: Set<UiNode>;
  selectedAncestors: Set<UiNode>;
  showMatchedOnly: boolean;
  hasActiveFilter?: boolean;
  // 可选：在“修改参数”模式允许树节点直接设为步骤元素
  onSelectForStep?: (criteria: CompleteStepCriteria) => void;
}

export const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  selected,
  onSelect,
  filter,
  searchOptions,
  expandAll,
  collapseVersion,
  expandDepth,
  matchedSet,
  selectedAncestors,
  showMatchedOnly,
  hasActiveFilter = false,
  onHoverNode,
  onSelectForStep,
}) => {
  const [open, setOpen] = useState(depth <= 2);
  useEffect(() => { setOpen(false); }, [collapseVersion]);

  // 关键词高亮渲染
  const highlight = (text: string): React.ReactNode => {
    const kw = (filter || '').trim();
    if (!kw) return text;
    try {
      const caseSensitive = !!searchOptions?.caseSensitive;
      const useRegex = !!searchOptions?.useRegex;
      const re = useRegex
        ? new RegExp(kw, caseSensitive ? 'g' : 'ig')
        : new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'ig');
      const parts = text.split(re);
      const matches = text.match(re) || [];
      const res: React.ReactNode[] = [];
      parts.forEach((p, i) => {
        res.push(p);
        if (i < matches.length) res.push(<span key={i} className={styles.mark}>{matches[i]}</span>);
      });
      return <>{res}</>;
    } catch { return text; }
  };

  const label = nodeLabel(node);
  const hasChildren = node.children.length > 0;
  const matched = matchedSet.has(node);

  const hasDescendantMatch = useMemo(() => {
    const dfs = (n: UiNode): boolean => {
      for (const c of n.children) {
        if (matchedSet.has(c) || dfs(c)) return true;
      }
      return false;
    };
    return dfs(node);
  }, [node, matchedSet]);

  const inSelectedPath = useMemo(() => {
    if (!selected) return false;
    const dfs = (n: UiNode): boolean => {
      if (n === selected) return true;
      for (const c of n.children) if (dfs(c)) return true;
      return false;
    };
    return dfs(node);
  }, [node, selected]);

  const effectiveOpen = (expandAll || inSelectedPath || depth <= expandDepth || (showMatchedOnly && hasDescendantMatch)) ? true : open;

  const isVisible = !showMatchedOnly || matchedSet.has(node) || selectedAncestors.has(node) || hasDescendantMatch;

  const rowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected === node && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [selected, node]);

  return (
    <div className="select-text">
      {isVisible && (
      <div
        ref={rowRef}
        className={`${styles.treeRow} group hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-md ${selected === node ? styles.treeRowActive : ''}`}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => onSelect(node)}
            onMouseEnter={() => onHoverNode?.(node)}
            onMouseLeave={() => onHoverNode?.(null)}
      >
        {hasChildren ? (
          <button
            className={`${styles.toggleBtn} h-5 w-5 shrink-0 flex items-center justify-center`}
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            title={effectiveOpen ? '折叠' : '展开'}
          >
            <svg viewBox="0 0 20 20" className={`h-3 w-3 transition ${effectiveOpen ? 'rotate-90' : ''}`}>
              <path d="M7 5l6 5-6 5V5z" fill="currentColor" />
            </svg>
          </button>
        ) : (<span className="h-5 w-5 shrink-0" />)}
        <div className="flex items-center gap-2 truncate">
          <span className="text-sm font-medium truncate">{highlight(label)}</span>
          <Badge>{highlight(node.attrs['class'] || node.tag)}</Badge>
          {node.attrs['resource-id'] && <Badge>id:{highlight(node.attrs['resource-id'].split('/').pop() || '')}</Badge>}
          {node.attrs['clickable'] === 'true' && <Badge>clickable</Badge>}
          <MatchBadges node={node} keyword={filter} />
          {!matched && hasActiveFilter && <Badge>不匹配(继承可见)</Badge>}
          {onSelectForStep && (
            <span className="ml-2">
              <ScreenPreviewSetElementButton
                node={node}
                onApply={(c) => onSelectForStep(c)}
              />
            </span>
          )}
        </div>
      </div>
      )}
      {isVisible && effectiveOpen && (
        <div>
          {node.children.map((c, i) => (
            <TreeRow
              key={i}
              node={c}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
                   onHoverNode={onHoverNode}
              filter={filter}
              searchOptions={searchOptions}
              expandAll={expandAll}
              collapseVersion={collapseVersion}
              expandDepth={expandDepth}
              matchedSet={matchedSet}
              selectedAncestors={selectedAncestors}
              showMatchedOnly={showMatchedOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};
