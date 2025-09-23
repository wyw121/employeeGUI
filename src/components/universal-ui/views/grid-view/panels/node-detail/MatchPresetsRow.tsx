import React from 'react';
import { UiNode } from '../../types';
import styles from '../../GridElementView.module.css';
import { MatchCriteria, MatchStrategy } from './types';

export interface MatchPresetsRowProps {
  node: UiNode | null;
  onApply: (criteria: MatchCriteria) => void;
  onPreviewFields?: (fields: string[]) => void; // 通知外层更新选中字段显示
}

// 预设到字段映射
const PRESET_FIELDS: Record<MatchStrategy, string[]> = {
  absolute: ['resource-id','text','content-desc','class','package','bounds','index'],
  strict: ['resource-id','text','content-desc','class','package'],
  relaxed: ['resource-id','text','content-desc','class'],
  positionless: ['resource-id','text','content-desc','class','package'], // 与 strict 相同，但后端忽略位置
  standard: ['resource-id','text','content-desc','class','package'], // 标准匹配：忽略位置与分辨率差异
};

export const MatchPresetsRow: React.FC<MatchPresetsRowProps> = ({ node, onApply, onPreviewFields }) => {
  const apply = (strategy: MatchStrategy) => {
    if (!node) return;
    const fields = PRESET_FIELDS[strategy];
    const values: Record<string,string> = {};
    for (const f of fields) {
      const v = node.attrs[f];
      if (v != null) values[f] = String(v);
    }
    onPreviewFields?.(fields);
    onApply({ strategy, fields, values });
  };

  const Button: React.FC<{label: string; strategy: MatchStrategy; title?: string}> = ({ label, strategy, title }) => (
    <button className={styles.btn} title={title}
      onClick={() => apply(strategy)}>{label}</button>
  );

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">匹配预设：</span>
      <Button label="绝对定位" strategy="absolute" title="勾选所有关键属性（含 bounds/index），尽可能精确" />
      <Button label="严格匹配" strategy="strict" title="勾选 id/text/desc/class/package 等常用稳定字段" />
      <Button label="宽松匹配" strategy="relaxed" title="勾选 id/text/desc/class，忽略 package" />
      <Button label="匹配任意位置" strategy="positionless" title="忽略位置（bounds/index）影响，适用于布局微调" />
      <Button label="标准匹配" strategy="standard" title="跨设备稳定匹配：忽略位置/分辨率差异，仅用语义字段" />
    </div>
  );
};

export default MatchPresetsRow;
