import React from 'react';
import { UiNode } from "../types";
import { ScreenPreview } from "../ScreenPreview";
import styles from "../GridElementView.module.css";
import { ScreenPreviewSetElementButton, type CompleteStepCriteria } from './node-detail';

interface ScreenPreviewPanelProps {
  root: UiNode | null;
  selected: UiNode | null;
  onSelect: (n: UiNode) => void;
  matchedSet: Set<UiNode>;
  highlightNode?: UiNode | null;
  highlightKey?: number;
  enableFlashHighlight?: boolean;
  previewAutoCenter?: boolean;
  // 可选：在“修改参数”模式下，允许直接从预览设置为步骤元素
  onSelectForStep?: (criteria: CompleteStepCriteria) => void;
}

export const ScreenPreviewPanel: React.FC<ScreenPreviewPanelProps> = ({ root, selected, onSelect, matchedSet, highlightNode, highlightKey, enableFlashHighlight, previewAutoCenter, onSelectForStep }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className="flex items-center justify-between">
          <span>屏幕预览</span>
          {onSelectForStep && selected && (
            <ScreenPreviewSetElementButton
              node={selected}
              onApply={(criteria) => onSelectForStep(criteria)}
            />
          )}
        </div>
      </div>
      <div className={styles.cardBody}>
        <ScreenPreview root={root} selected={selected} onSelect={onSelect} matchedSet={matchedSet} highlightNode={highlightNode} highlightKey={highlightKey} enableFlashHighlight={enableFlashHighlight} previewAutoCenter={previewAutoCenter} />
      </div>
    </div>
  );
};

export default ScreenPreviewPanel;
