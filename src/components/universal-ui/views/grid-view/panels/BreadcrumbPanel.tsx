import React from 'react';
import { UiNode } from "../types";
import { Breadcrumbs } from "../Breadcrumbs";
import styles from "../GridElementView.module.css";

interface BreadcrumbPanelProps {
  selected: UiNode | null;
  onSelect: (n: UiNode) => void;
}

export const BreadcrumbPanel: React.FC<BreadcrumbPanelProps> = ({ selected, onSelect }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>当前位置</div>
      <div className={styles.cardBody}>
        <Breadcrumbs selected={selected} onSelect={onSelect} />
      </div>
    </div>
  );
};

export default BreadcrumbPanel;
