import React from 'react';
import { Tag, Tooltip } from 'antd';

export type MatchingStrategy = 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard' | string;

export interface MatchingStrategyTagProps {
  strategy?: MatchingStrategy | null;
  small?: boolean;
}

const STRATEGY_META: Record<string, { color: string; label: string; tip: string }> = {
  absolute: { color: 'red', label: '绝对', tip: '绝对定位：依赖精确 XPath/坐标，最稳定但跨设备脆弱' },
  strict: { color: 'blue', label: '严格', tip: '严格匹配：class/resourceId/text 等多字段组合，稳定性高' },
  relaxed: { color: 'green', label: '宽松', tip: '宽松匹配：少数字段或模糊匹配，兼容性更好' },
  positionless: { color: 'purple', label: '无位置', tip: '无位置匹配：忽略 bounds，仅用语义字段匹配' },
  standard: { color: 'cyan', label: '标准', tip: '标准匹配：跨设备稳定，忽略位置/分辨率差异，仅用语义字段' },
};

export const MatchingStrategyTag: React.FC<MatchingStrategyTagProps> = ({ strategy, small }) => {
  if (!strategy) return null;
  const key = String(strategy).toLowerCase();
  const meta = STRATEGY_META[key] || { color: 'default', label: key, tip: `匹配策略：${key}` };
  const tag = (
    <Tag color={meta.color} style={{ marginLeft: 8, height: small ? 20 : undefined, lineHeight: small ? '20px' : undefined }}>
      匹配: {meta.label}
    </Tag>
  );
  return <Tooltip title={meta.tip}>{tag}</Tooltip>;
};

export default MatchingStrategyTag;
