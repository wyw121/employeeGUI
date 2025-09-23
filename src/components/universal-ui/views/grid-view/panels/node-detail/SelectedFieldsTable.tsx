import React from 'react';
import styles from '../../GridElementView.module.css';
import type { UiNode } from '../../types';
import { PRESET_FIELDS } from './helpers';
import { NegativeConditionsEditor } from './NegativeConditionsEditor';

export interface SelectedFieldsTableProps {
  node: UiNode | null;
  selected: string[];
  values: Record<string, string>;
  onToggle: (field: string) => void;
  onChangeValue: (field: string, value: string) => void;
  excludes?: Record<string, string[]>;
  onChangeExcludes?: (field: string, next: string[]) => void;
}

const LABELS: Record<string, string> = {
  'resource-id': 'ID',
  'text': '文本',
  'content-desc': '描述',
  'class': '类名',
  'package': '包名',
  'bounds': '位置',
  'index': '序号',
};

const ALL_FIELDS: string[] = PRESET_FIELDS.absolute;

export const SelectedFieldsTable: React.FC<SelectedFieldsTableProps> = ({ node, selected, values, onToggle, onChangeValue, excludes, onChangeExcludes }) => {
  return (
    <div className="mb-2">
      <div className="text-xs text-neutral-500 mb-1">字段选择与编辑：</div>
      <div className="space-y-1.5">
        {ALL_FIELDS.map((f) => {
          const checked = selected.includes(f);
          const placeholderBase = node?.attrs?.[f] ? String(node.attrs[f]) : `请输入${LABELS[f] || f}`;
          const isPosition = f === 'bounds' || f === 'index';
          const placeholder = isPosition ? `${placeholderBase}（留空=任意）` : placeholderBase;
          const title = isPosition ? '该字段留空表示不限制该位置维度（任意）' : undefined;
          return (
            <div key={f} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-neutral-700">
                <input type="checkbox" checked={checked} onChange={() => onToggle(f)} />
                <span>{LABELS[f] || f}</span>
              </label>
              <div className="flex-1 min-w-0">
                <input
                  className={`${styles.input} w-full`}
                  value={values[f] ?? ''}
                  onChange={(e) => onChangeValue(f, e.target.value)}
                  placeholder={placeholder}
                  title={title}
                  disabled={!checked}
                />
              </div>
              </div>
              {checked && (
                <NegativeConditionsEditor
                  field={f}
                  excludes={excludes?.[f] || []}
                  onChange={(next) => onChangeExcludes?.(f, next)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectedFieldsTable;
