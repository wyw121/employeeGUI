import React from 'react';
import { UiNode } from "../types";
import { ScreenPreview } from "../ScreenPreview";
import styles from "../GridElementView.module.css";

interface ScreenPreviewPanelProps {
  root: UiNode | null;
  selected: UiNode | null;
  onSelect: (n: UiNode) => void;
  matchedSet: Set<UiNode>;
  highlightNode?: UiNode | null;
  highlightKey?: number;
  enableFlashHighlight?: boolean;
  previewAutoCenter?: boolean;
}

export const ScreenPreviewPanel: React.FC<ScreenPreviewPanelProps> = ({ root, selected, onSelect, matchedSet, highlightNode, highlightKey, enableFlashHighlight, previewAutoCenter }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>屏幕预览</div>
      <div className={styles.cardBody}>
        <ScreenPreview root={root} selected={selected} onSelect={onSelect} matchedSet={matchedSet} highlightNode={highlightNode} highlightKey={highlightKey} enableFlashHighlight={enableFlashHighlight} previewAutoCenter={previewAutoCenter} />
      </div>
    </div>
  );
};

export default ScreenPreviewPanel;
