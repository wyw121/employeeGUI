import React from 'react';
import type { MatchStrategy } from './types';

export interface MatchingStrategySelectorProps {
  value: MatchStrategy;
  onChange: (next: MatchStrategy) => void;
}

const STRATEGY_LIST: Array<{ key: MatchStrategy; label: string; tip: string }> = [
  { key: 'absolute',     label: '绝对定位', tip: '含 bounds/index，最精确但跨设备脆弱' },
  { key: 'strict',       label: '严格匹配', tip: '常用语义字段组合，稳定性高' },
  { key: 'relaxed',      label: '宽松匹配', tip: '少数字段或模糊匹配，兼容性好' },
  { key: 'positionless', label: '匹配任意位置', tip: '忽略位置（bounds/index），适应布局调整' },
  { key: 'standard',     label: '标准匹配', tip: '跨设备稳定，仅用语义字段，忽略分辨率/位置' },
  { key: 'custom',       label: '自定义', tip: '使用下方勾选字段自由组合；与预设不一致时自动切换为自定义' },
];

/**
 * 匹配策略选择器（模块化子组件）
 * - 受控组件：通过 value / onChange 工作
 * - 仅负责策略切换 UI
 */
export const MatchingStrategySelector: React.FC<MatchingStrategySelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">匹配策略：</span>
      {STRATEGY_LIST.map((s) => (
        <button
          key={s.key}
          className={`px-2 py-1 rounded text-xs border transition-colors ${
            value === s.key ? 'bg-blue-600 text-white border-blue-700' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
          }`}
          title={s.tip}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};

export default MatchingStrategySelector;
