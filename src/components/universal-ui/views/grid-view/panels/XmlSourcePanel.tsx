import React, { useState } from 'react';
import styles from '../GridElementView.module.css';

interface XmlSourcePanelProps {
  xmlText: string;
  setXmlText: (v: string) => void;
  onParse: () => void;
}

// 轻量 XML 源码面板：默认精简高度，可展开查看；仅用于粘贴/复制
export const XmlSourcePanel: React.FC<XmlSourcePanelProps> = ({ xmlText, setXmlText, onParse }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className="flex items-center justify-between">
          <span>XML 源码</span>
          <div className="flex items-center gap-2">
            <button className={styles.btn} onClick={onParse}>解析</button>
            <button className={styles.btn} onClick={() => setExpanded(v => !v)}>{expanded ? '收起' : '展开'}</button>
          </div>
        </div>
      </div>
      <div className={styles.cardBody}>
        <textarea
          value={xmlText}
          onChange={(e) => setXmlText(e.target.value)}
          placeholder="粘贴 uiautomator dump 的 XML 内容…"
          className={styles.inputArea}
          style={{ height: expanded ? '20rem' : '6rem' }}
        />
      </div>
    </div>
  );
};

export default XmlSourcePanel;
