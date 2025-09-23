import React, { useState } from 'react';
import styles from './GridElementView.module.css';

export interface CopyChipProps {
  text: string;
  label?: string;
  title?: string;
}

export const CopyChip: React.FC<CopyChipProps> = ({ text, label = '复制', title }) => {
  const [ok, setOk] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1000);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      className={styles.btn}
      style={{ padding: '2px 6px' }}
      title={title || text}
      onClick={(e) => { e.stopPropagation(); doCopy(); }}
    >{ok ? '已复制' : label}</button>
  );
};
