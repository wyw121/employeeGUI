import React, { useEffect, useRef, useState } from 'react';
import styles from '../../GridElementView.module.css';

export interface NegativeConditionsEditorProps {
  field: string;
  excludes: string[];
  onChange: (next: string[]) => void;
}

export const NegativeConditionsEditor: React.FC<NegativeConditionsEditorProps> = ({ field, excludes, onChange }) => {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // 聚焦输入框
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (excludes.includes(v)) {
      setDraft('');
      setOpen(false);
      return;
    }
    onChange([...excludes, v]);
    setDraft('');
    setOpen(false);
  };

  const remove = (v: string) => {
    onChange(excludes.filter(x => x !== v));
  };
  return (
    <div className="flex items-start gap-2">
      <button
        className={styles.btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`为 ${field} 添加不包含词`}
      >
        不包含
      </button>
      {open && (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            className={`${styles.input} w-40`}
            value={draft}
            placeholder="输入不包含的词"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
              if (e.key === 'Escape') { setDraft(''); setOpen(false); }
            }}
          />
          <button type="button" className={styles.btn} onClick={add}>添加</button>
          <button type="button" className={`${styles.btn}`} onClick={() => { setDraft(''); setOpen(false); }}>取消</button>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {excludes.map(v => (
          <span key={v} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800">
            不包含：{v}
            <button type="button" className="text-red-500" title="移除" onClick={() => remove(v)}>－</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default NegativeConditionsEditor;
