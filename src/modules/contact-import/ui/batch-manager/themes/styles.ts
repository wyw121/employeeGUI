/**
 * 主题适配样式工具模块
 * 
 * 提供与主题系统集成的样式生成函数和CSS变量映射
 * 解决在暗黑主题下字体颜色看不清的问题
 * 
 * @example
 * ```tsx
 * // 使用主题感知的样式
 * const { mode } = useTheme();
 * const styles = getThemeAwareStyles(mode);
 * 
 * <div style={styles.primaryText}>主要文本</div>
 * <div style={styles.secondaryText}>次要文本</div>
 * ```
 */

import { ThemeMode, cssVars } from '../../../../../theme/tokens';

/**
 * 主题感知的文本样式类型
 */
export interface ThemeTextStyles {
  /** 主要文本样式 - 用于重要内容 */
  primaryText: React.CSSProperties;
  /** 次要文本样式 - 用于辅助信息 */
  secondaryText: React.CSSProperties;
  /** 第三级文本样式 - 用于次要辅助信息 */
  tertiaryText: React.CSSProperties;
  /** 强调文本样式 - 用于需要突出的内容 */
  emphasizedText: React.CSSProperties;
  /** 错误文本样式 */
  errorText: React.CSSProperties;
  /** 成功文本样式 */
  successText: React.CSSProperties;
  /** 警告文本样式 */
  warningText: React.CSSProperties;
}

/**
 * 主题感知的容器样式类型
 */
export interface ThemeContainerStyles {
  /** 主要容器背景 */
  containerBg: React.CSSProperties;
  /** 卡片容器背景 */
  cardBg: React.CSSProperties;
  /** 边框样式 */
  border: React.CSSProperties;
}

/**
 * 获取主题感知的文本样式
 */
export function getThemeAwareTextStyles(mode: ThemeMode): ThemeTextStyles {
  const vars = cssVars[mode];
  
  return {
    primaryText: {
      color: vars['--color-text'],
      fontWeight: 500,
    },
    secondaryText: {
      color: vars['--color-text-secondary'],
      fontWeight: 400,
    },
    tertiaryText: {
      color: vars['--color-text-tertiary'],
      fontWeight: 400,
    },
    emphasizedText: {
      color: vars['--color-text'],
      fontWeight: 600,
    },
    errorText: {
      color: vars['--color-error'],
      fontWeight: 500,
    },
    successText: {
      color: vars['--color-success'],
      fontWeight: 500,
    },
    warningText: {
      color: vars['--color-warning'],
      fontWeight: 500,
    },
  };
}

/**
 * 获取主题感知的容器样式
 */
export function getThemeAwareContainerStyles(mode: ThemeMode): ThemeContainerStyles {
  const vars = cssVars[mode];
  
  return {
    containerBg: {
      backgroundColor: vars['--color-bg-container'],
    },
    cardBg: {
      backgroundColor: vars['--card-glass-bg'],
      border: `1px solid ${vars['--card-glass-border']}`,
    },
    border: {
      borderColor: vars['--color-border'],
    },
  };
}

/**
 * 时间格式化单元格专用样式
 */
export interface TimeFormatterCellStyles {
  /** 日期行样式 */
  dateRow: React.CSSProperties;
  /** 时间行样式 */
  timeRow: React.CSSProperties;
  /** 容器样式 */
  container: React.CSSProperties;
  /** 紧凑模式样式 */
  compact: React.CSSProperties;
}

/**
 * 获取时间格式化单元格的主题感知样式
 */
export function getTimeFormatterCellStyles(mode: ThemeMode): TimeFormatterCellStyles {
  const textStyles = getThemeAwareTextStyles(mode);
  
  return {
    dateRow: {
      ...textStyles.primaryText,
      fontSize: '13px',
      lineHeight: '1.2',
    },
    timeRow: {
      ...textStyles.secondaryText,
      fontSize: '12px',
      lineHeight: '1.2',
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    compact: {
      ...textStyles.primaryText,
      fontSize: '13px',
    },
  };
}

/**
 * 批次ID单元格专用样式
 */
export interface BatchIdCellStyles {
  /** 可点击的批次ID样式 */
  clickable: React.CSSProperties;
  /** 不可点击的批次ID样式 */
  readonly: React.CSSProperties;
  /** 展开状态样式 */
  expanded: React.CSSProperties;
  /** 紧凑状态样式 */
  collapsed: React.CSSProperties;
}

/**
 * 获取批次ID单元格的主题感知样式
 */
export function getBatchIdCellStyles(mode: ThemeMode): BatchIdCellStyles {
  const textStyles = getThemeAwareTextStyles(mode);
  const vars = cssVars[mode];
  
  return {
    clickable: {
      ...textStyles.primaryText,
      color: vars['--color-primary'],
      cursor: 'pointer',
      textDecoration: 'underline',
      fontSize: '13px',
    },
    readonly: {
      ...textStyles.secondaryText,
      fontSize: '13px',
    },
    expanded: {
      maxWidth: 'none',
      wordBreak: 'break-all',
    },
    collapsed: {
      maxWidth: '120px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  };
}

/**
 * 获取所有主题感知样式的便利函数
 */
export function getAllThemeStyles(mode: ThemeMode) {
  return {
    text: getThemeAwareTextStyles(mode),
    container: getThemeAwareContainerStyles(mode),
    timeCell: getTimeFormatterCellStyles(mode),
    batchCell: getBatchIdCellStyles(mode),
  };
}

/**
 * CSS变量名常量，便于直接在CSS中使用
 */
export const CSS_VARS = {
  // 文本颜色
  TEXT_PRIMARY: 'var(--color-text)',
  TEXT_SECONDARY: 'var(--color-text-secondary)',
  TEXT_TERTIARY: 'var(--color-text-tertiary)',
  
  // 背景颜色
  BG_LAYOUT: 'var(--color-bg-layout)',
  BG_CONTAINER: 'var(--color-bg-container)',
  BG_ELEVATED: 'var(--color-bg-elevated)',
  
  // 状态颜色
  PRIMARY: 'var(--color-primary)',
  SUCCESS: 'var(--color-success)',
  WARNING: 'var(--color-warning)',
  ERROR: 'var(--color-error)',
  INFO: 'var(--color-info)',
  
  // 边框和分割线
  BORDER: 'var(--color-border)',
  SPLIT: 'var(--color-split)',
  
  // 玻璃效果
  GLASS_BG: 'var(--card-glass-bg)',
  GLASS_BORDER: 'var(--card-glass-border)',
} as const;