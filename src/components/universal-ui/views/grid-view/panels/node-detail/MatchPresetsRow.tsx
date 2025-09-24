import React from 'react';
import { UiNode } from '../../types';
import styles from '../../GridElementView.module.css';
import { MatchCriteria, MatchStrategy } from './types';
import { PRESET_FIELDS, buildCriteriaFromNode } from './helpers';

export interface MatchPresetsRowProps {
  node: UiNode | null;
  onApply: (criteria: MatchCriteria) => void;
  onPreviewFields?: (fields: string[]) => void; // 通知外层更新选中字段显示
  activeStrategy?: MatchStrategy; // 用于高亮当前预设；当为 custom 时显示自定义激活态
}

export const MatchPresetsRow: React.FC<MatchPresetsRowProps> = ({ node, onApply, onPreviewFields, activeStrategy }) => {
  const apply = (strategy: MatchStrategy) => {
    if (!node) return;
    const fields = PRESET_FIELDS[strategy];
    const { values } = buildCriteriaFromNode(node, strategy, fields);
    onPreviewFields?.(fields);
    onApply({ strategy, fields, values });
  };

  const Button: React.FC<{label: string; strategy: MatchStrategy; title?: string}> = ({ label, strategy, title }) => {
    const isActive = activeStrategy === strategy;
    return (
      <button
        className={`${styles.btn} text-xs ${isActive ? 'bg-blue-600 text-white border-blue-700' : ''}`}
        title={title}
        onClick={() => apply(strategy)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">匹配预设：</span>
      <Button label="绝对定位" strategy="absolute" title="勾选所有关键属性（含 bounds/index），尽可能精确" />
      <Button label="严格匹配" strategy="strict" title="勾选 id/text/desc/class/package 等常用稳定字段" />
      <Button label="宽松匹配" strategy="relaxed" title="勾选 id/text/desc/class，忽略 package" />
      <Button label="匹配任意位置" strategy="positionless" title="忽略位置（bounds/index）影响，适用于布局微调" />
      <Button label="标准匹配" strategy="standard" title="跨设备稳定匹配：忽略位置/分辨率差异，仅用语义字段" />
      {/* 自定义占位：用于显示当前为自定义策略时的激活态提示 */}
      <span
        className={`px-2 py-1 rounded text-xs border ${activeStrategy === 'custom' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-neutral-200 text-neutral-500'}`}
        title="当你对下方勾选字段进行任意调整后，将自动进入自定义模式"
      >
        自定义
      </span>
    </div>
  );
};

export default MatchPresetsRow;
