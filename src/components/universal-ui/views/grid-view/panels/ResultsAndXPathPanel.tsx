import React, { useState } from 'react';
import styles from "../GridElementView.module.css";
import { UiNode, AdvancedFilter, SearchOptions } from "../types";
import { MatchResultsPanel } from "../MatchResultsPanel";
import { XPathTestResultsPanel } from "../XPathTestResultsPanel";
import { XPathBuilder } from "../XPathBuilder";

type TabKey = 'results' | 'xpath';

interface ResultsAndXPathPanelProps {
  // Results
  matches: UiNode[];
  matchIndex: number;
  keyword: string;
  advFilter: AdvancedFilter;
  searchOptions: SearchOptions;
  onJump: (idx: number, node: UiNode) => void;
  onInsertXPath: (xp: string) => void;

  // XPath tools
  selected: UiNode | null;
  onApplyXPath: (xp: string) => void;
  onInsertOnly: (xp: string) => void;
  xpathTestNodes: UiNode[];
  onJumpToNode: (n: UiNode) => void;
}

export const ResultsAndXPathPanel: React.FC<ResultsAndXPathPanelProps> = ({
  matches,
  matchIndex,
  keyword,
  advFilter,
  searchOptions,
  onJump,
  onInsertXPath,
  selected,
  onApplyXPath,
  onInsertOnly,
  xpathTestNodes,
  onJumpToNode,
}) => {
  const [active, setActive] = useState<TabKey>('results');
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-2">
          <button className={styles.btn} onClick={() => setCollapsed(c => !c)}>{collapsed ? '展开' : '收起'}</button>
          <div className="flex items-center gap-2">
            <button className={styles.btn} onClick={() => setActive('results')} style={{ background: active==='results' ? 'var(--g-surface-hover)' : undefined }}>匹配结果</button>
            <button className={styles.btn} onClick={() => setActive('xpath')} style={{ background: active==='xpath' ? 'var(--g-surface-hover)' : undefined }}>XPath 工具</button>
          </div>
        </div>
      </div>
      {!collapsed && (
        <div className={styles.cardBody}>
          {active === 'results' ? (
            <MatchResultsPanel
              matches={matches}
              matchIndex={matchIndex}
              keyword={keyword}
              advFilter={advFilter}
              onJump={onJump}
              onInsertXPath={onInsertXPath}
              searchOptions={searchOptions}
            />
          ) : (
            <div className="space-y-4">
              <XPathTestResultsPanel nodes={xpathTestNodes} onJump={onJumpToNode} />
              <XPathBuilder
                node={selected}
                onApply={onApplyXPath}
                onInsert={onInsertOnly}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsAndXPathPanel;
