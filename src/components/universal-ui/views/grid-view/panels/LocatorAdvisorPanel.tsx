import React, { useMemo, useState } from 'react';
import styles from "../GridElementView.module.css";
import type { UiNode } from "../types";
import { adviseLocators } from "../locatorAdvisor";

interface LocatorAdvisorPanelProps {
  node: UiNode | null;
  onApply: (xp: string) => void;
  onInsert?: (xp: string) => void;
}

export const LocatorAdvisorPanel: React.FC<LocatorAdvisorPanelProps> = ({ node, onApply, onInsert }) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const items = useMemo(() => adviseLocators(node), [node]);
  if (!node) return null;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>定位建议（评分）</span>
        <button className={styles.btn} onClick={() => setCollapsed(c => !c)}>{collapsed ? '展开' : '收起'}</button>
      </div>
      {!collapsed && (
        <div className={styles.cardBody}>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{it.label} <span className="ml-2 text-[12px] text-neutral-500">评分 {it.score}</span></div>
                  <div className="flex items-center gap-2">
                    {onInsert && <button className={styles.btn} style={{ padding: '2px 6px' }} onClick={() => onInsert(it.xpath)}>仅插入</button>}
                    <button className={styles.btn} style={{ padding: '2px 6px' }} onClick={() => onApply(it.xpath)}>应用</button>
                  </div>
                </div>
                <div className="mt-1 font-mono text-[12px] break-all">{it.xpath}</div>
                {it.reasons?.length > 0 && (
                  <div className="mt-1 text-[12px] text-neutral-500">原因：{it.reasons.join('，')}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocatorAdvisorPanel;
