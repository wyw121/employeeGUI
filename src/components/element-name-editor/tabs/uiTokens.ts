// 统一的 UI 令牌（仅适用于 element-name-editor 模块下的 tabs）
// 若后续在其它模块通用，可再上移至更高层级 tokens 文件

export const colors = {
  surfaceDark: '#1a1a1a',
  surface: '#2d2d2d',
  surfaceAlt: '#1f1f1f',
  border: '#404040',
  accentBlue: '#1890ff',
  accentOrange: '#faad14',
  accentGreen: '#52c41a',
  accentRed: '#ff4d4f',
  accentWarningBg: '#4a3c00',
  accentInfoBg: '#0f3460',
};

export const cardStyles = {
  darkCard: {
    background: colors.surface,
    border: `1px solid ${colors.border}`
  },
  darkHead: {
    background: colors.surfaceAlt,
    borderBottom: `1px solid ${colors.border}`,
    color: '#fff'
  },
  infoAlert: {
    background: colors.accentInfoBg,
    border: `1px solid ${colors.accentBlue}`
  }
};

export const textStyles = {
  codeValue: {
    color: '#a6e22e'
  },
  subtle: {
    color: '#ccc'
  },
  danger: {
    color: colors.accentRed
  }
};

export const tagStyles = {
  small: { fontSize: '10px' },
  tiny: { fontSize: '9px' }
};

export const layout = {
  radiusSm: '4px',
  radiusMd: '6px'
};
