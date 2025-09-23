import React, { useState } from 'react';
import styles from "../GridElementView.module.css";
import { FIELD_DOCS } from "../fieldDocs";

export const FieldDocPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>字段说明</span>
        <button className={styles.btn} onClick={() => setCollapsed(c => !c)}>{collapsed ? '展开' : '收起'}</button>
      </div>
      {!collapsed && (
        <div className={styles.cardBody}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {FIELD_DOCS.map(item => (
              <div key={item.key} className="flex flex-col">
                <span className="font-medium">{item.label} <span className="ml-1 text-[10px] text-neutral-400">({item.key})</span></span>
                <span className="text-neutral-600 dark:text-neutral-300">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldDocPanel;
