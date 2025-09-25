import React from 'react';
import styles from '../../GridElementView.module.css';
import type { UiNode } from '../../types';
import { PRESET_FIELDS } from './helpers';
import { NegativeConditionsEditor } from './NegativeConditionsEditor';
import { PositiveConditionsEditor } from './PositiveConditionsEditor';
import { TextMatchingQuickActions } from './TextMatchingQuickActions';

export interface SelectedFieldsTableProps {
  node: UiNode | null;
  selected: string[];
  values: Record<string, string>;
  onToggle: (field: string) => void;
  onChangeValue: (field: string, value: string) => void;
  excludes?: Record<string, string[]>;
  onChangeExcludes?: (field: string, next: string[]) => void;
  includes?: Record<string, string[]>;
  onChangeIncludes?: (field: string, next: string[]) => void;
  // 是否仅匹配关键词（正则 ^关键词$）
  keywordOnly?: Record<string, boolean>;
  onToggleKeywordOnly?: (field: string, value: boolean) => void;
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

export const SelectedFieldsTable: React.FC<SelectedFieldsTableProps> = ({ node, selected, values, onToggle, onChangeValue, excludes, onChangeExcludes, includes, onChangeIncludes, keywordOnly, onToggleKeywordOnly }) => {
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
          const isTextLike = f === 'text' || f === 'content-desc';
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
                <div className="flex flex-col gap-2">
                  {/* 仅匹配关键词（适用于文本/描述） */}
                  {isTextLike && (
                    <label className="inline-flex items-center gap-2 text-xs text-neutral-700">
                      <input
                        type="checkbox"
                        checked={!!keywordOnly?.[f]}
                        onChange={(e) => onToggleKeywordOnly?.(f, e.target.checked)}
                      />
                      <span>仅匹配关键词（正则精确：^关键词$）</span>
                    </label>
                  )}
                  {/* 文本字段快捷操作 */}
                  <TextMatchingQuickActions
                    field={f}
                    currentValue={values[f] ?? ''}
                    onSetValue={(value) => onChangeValue(f, value)}
                    excludes={excludes?.[f] || []}
                    onChangeExcludes={(next) => onChangeExcludes?.(f, next)}
                  />
                  
                  {/* 包含/排除条件编辑器 */}
                  <div className="flex flex-wrap items-start gap-3">
                    <NegativeConditionsEditor
                      field={f}
                      excludes={excludes?.[f] || []}
                      onChange={(next) => onChangeExcludes?.(f, next)}
                    />
                    <PositiveConditionsEditor
                      field={f}
                      includes={includes?.[f] || []}
                      onChange={(next) => onChangeIncludes?.(f, next)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectedFieldsTable;
