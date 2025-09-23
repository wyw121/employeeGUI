import React from 'react';
import styles from '../../GridElementView.module.css';
import type { UiNode } from '../../types';

export interface SelectedFieldsEditorProps {
  node: UiNode | null;
  fields: string[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const LABELS: Record<string,string> = {
  'resource-id': 'ID',
  'text': '文本',
  'content-desc': '描述',
  'class': '类名',
  'package': '包名',
  'bounds': '位置',
  'index': '序号',
};

export const SelectedFieldsEditor: React.FC<SelectedFieldsEditorProps> = ({ node, fields, values, onChange }) => {
  const handleInput = (field: string, nextVal: string) => {
    const next = { ...values };
    if (nextVal == null || nextVal === '') {
      delete next[field];
    } else {
      next[field] = nextVal;
    }
    onChange(next);
  };

  return (
    <div className="mb-2 space-y-2">
      <div className="text-xs text-neutral-500">字段与值（可编辑）：</div>
      {fields.length === 0 ? (
        <div className="text-xs text-neutral-400">未选择任何字段</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {fields.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="min-w-[64px] text-xs text-neutral-600">{LABELS[f] || f}</span>
              <input
                className={styles.input}
                value={values[f] ?? ''}
                placeholder={(() => {
                  const base = node?.attrs?.[f] ? String(node.attrs[f]) : `请输入${LABELS[f] || f}`;
                  if (f === 'bounds' || f === 'index') return `${base}（留空=任意）`;
                  return base;
                })()}
                title={f === 'bounds' || f === 'index' ? '该字段留空表示不限制该位置维度（任意）' : undefined}
                onChange={(e) => handleInput(f, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectedFieldsEditor;
