import React from 'react';
import { Space, Switch, Tooltip } from 'antd';
import type { OverlayTheme } from './types';
import { getOverlayClassNames, getPopupOverlayProps } from './helpers';

export function useOverlayTheme(initial: OverlayTheme = 'inherit') {
  const [theme, setTheme] = React.useState<OverlayTheme>(initial);

  const classes = React.useMemo(() => getOverlayClassNames(theme), [theme]);
  const popupProps = React.useMemo(() => getPopupOverlayProps(theme), [theme]);

  return { theme, setTheme, classes, popupProps } as const;
}

interface OverlayThemeSwitchProps {
  value: OverlayTheme;
  onChange: (next: OverlayTheme) => void;
  labels?: Partial<Record<OverlayTheme, string>>;
}

export const OverlayThemeSwitch: React.FC<OverlayThemeSwitchProps> = ({ value, onChange, labels }) => {
  const isIndependent = value !== 'inherit';
  const next = isIndependent ? 'inherit' : 'dark'; // 单击在 继承 与 暗色 之间切换；如需三段式可扩展

  return (
    <Tooltip title={(labels?.[value]) || (isIndependent ? '使用独立配色' : '跟随全局主题')}> 
      <Space size={8}>
        <span style={{ opacity: 0.8 }}>{isIndependent ? '独立配色' : '跟随全局'}</span>
        <Switch size="small" checked={isIndependent} onChange={() => onChange(next)} />
      </Space>
    </Tooltip>
  );
};
