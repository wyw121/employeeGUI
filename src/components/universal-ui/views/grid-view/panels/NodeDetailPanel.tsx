import React from 'react';
import { UiNode } from "../types";
import { NodeDetail } from "../NodeDetail";
import styles from "../GridElementView.module.css";

interface NodeDetailPanelProps {
  node: UiNode | null;
  sessionId?: string;
  onCreateStep?: (sessionId: string, node: UiNode) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, sessionId, onCreateStep }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>节点详情</div>
      <div className={styles.cardBody}>
        {sessionId && onCreateStep && node && (
          <div className="mb-2 flex justify-end">
            <button className={styles.btn} onClick={() => onCreateStep(sessionId, node)}>生成步骤卡片</button>
          </div>
        )}
        <NodeDetail node={node} />
      </div>
    </div>
  );
};

export default NodeDetailPanel;
