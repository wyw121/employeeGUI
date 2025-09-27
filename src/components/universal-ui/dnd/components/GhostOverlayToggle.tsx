import React from 'react';
import { Switch, Tooltip } from 'antd';
import { useDnDUIConfig } from '../DnDUIConfigContext';

export interface GhostOverlayToggleProps {
  size?: 'small' | 'default';
  label?: React.ReactNode;
}

export const GhostOverlayToggle: React.FC<GhostOverlayToggleProps> = ({ size = 'small', label = '幽灵模式' }) => {
  const { config, setUseGhostOverlay } = useDnDUIConfig();
  return (
    <Tooltip title={config.useGhostOverlay ? '拖拽时显示简化预览' : '拖拽时不显示预览，仅移动条目'}>
      <span className="inline-flex items-center gap-1">
        <Switch
          size={size}
          checked={config.useGhostOverlay}
          onChange={setUseGhostOverlay}
        />
        <span className="text-xs text-gray-600 select-none">{label}</span>
      </span>
    </Tooltip>
  );
};

export default GhostOverlayToggle;
