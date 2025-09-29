/**
 * 主题感知的表格单元格基础组件
 * 
 * 为所有表格单元格提供一致的主题适配基础
 * 解决字体颜色在不同主题下的适配问题
 * 
 * @example
 * ```tsx
 * // 基础使用
 * <ThemeAwareCell variant="primary">重要内容</ThemeAwareCell>
 * <ThemeAwareCell variant="secondary">次要内容</ThemeAwareCell>
 * 
 * // 自定义样式
 * <ThemeAwareCell 
 *   variant="primary" 
 *   style={{ fontSize: '14px' }}
 *   className="custom-cell"
 * >
 *   自定义内容
 * </ThemeAwareCell>
 * ```
 */

import React from 'react';
import { useTheme } from '../../../../../../theme';
import { getThemeAwareTextStyles } from '../../themes/styles';

/**
 * 文本样式变体类型
 */
export type TextVariant = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary' 
  | 'emphasized' 
  | 'error' 
  | 'success' 
  | 'warning';

/**
 * ThemeAwareCell组件属性
 */
export interface ThemeAwareCellProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 文本样式变体 */
  variant?: TextVariant;
  /** 额外的CSS样式 */
  style?: React.CSSProperties;
  /** CSS类名 */
  className?: string;
  /** HTML标签类型 */
  as?: keyof React.JSX.IntrinsicElements;
  /** 点击事件处理器 */
  onClick?: (event: React.MouseEvent) => void;
  /** 是否可点击 */
  clickable?: boolean;
}

/**
 * 主题感知的表格单元格基础组件
 * 
 * 功能特性：
 * - ✅ 自动适配暗黑/亮色主题
 * - ✅ 预设文本样式变体
 * - ✅ 支持自定义样式覆盖
 * - ✅ 支持可点击状态
 * - ✅ 可指定HTML标签类型
 */
const ThemeAwareCell: React.FC<ThemeAwareCellProps> = ({
  children,
  variant = 'primary',
  style,
  className,
  as: Component = 'span',
  onClick,
  clickable = false,
}) => {
  const { mode } = useTheme();
  const textStyles = getThemeAwareTextStyles(mode);
  
  // 根据变体选择基础样式
  const baseStyle = textStyles[`${variant}Text` as keyof typeof textStyles] || textStyles.primaryText;
  
  // 合并样式
  const combinedStyle: React.CSSProperties = {
    ...baseStyle,
    ...(clickable && {
      cursor: 'pointer',
      transition: 'opacity 0.2s ease',
    }),
    ...style,
  };

  // 添加悬停效果（如果可点击）
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (clickable && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.7';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (clickable && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  return React.createElement(
    Component as any,
    {
      style: combinedStyle,
      className,
      onClick: clickable ? onClick : undefined,
      onMouseEnter: clickable ? handleMouseEnter : undefined,
      onMouseLeave: clickable ? handleMouseLeave : undefined,
    },
    children
  );
};

export default ThemeAwareCell;

/**
 * 预设的文本变体组件，便于快速使用
 */
export const PrimaryText: React.FC<Omit<ThemeAwareCellProps, 'variant'>> = (props) => (
  <ThemeAwareCell {...props} variant="primary" />
);

export const SecondaryText: React.FC<Omit<ThemeAwareCellProps, 'variant'>> = (props) => (
  <ThemeAwareCell {...props} variant="secondary" />
);

export const TertiaryText: React.FC<Omit<ThemeAwareCellProps, 'variant'>> = (props) => (
  <ThemeAwareCell {...props} variant="tertiary" />
);

export const EmphasizedText: React.FC<Omit<ThemeAwareCellProps, 'variant'>> = (props) => (
  <ThemeAwareCell {...props} variant="emphasized" />
);

export const ErrorText: React.FC<Omit<ThemeAwareCellProps, 'variant'>> = (props) => (
  <ThemeAwareCell {...props} variant="error" />
);

export const SuccessText: React.FC<Omit<ThemeAwareCellProps, 'variant'>> = (props) => (
  <ThemeAwareCell {...props} variant="success" />
);

export const WarningText: React.FC<Omit<ThemeAwareCellProps, 'variant'>> = (props) => (
  <ThemeAwareCell {...props} variant="warning" />
);

/**
 * 使用示例和最佳实践
 * 
 * @example 基础文本显示
 * ```tsx
 * <PrimaryText>这是主要文本</PrimaryText>
 * <SecondaryText>这是次要文本</SecondaryText>
 * <TertiaryText>这是第三级文本</TertiaryText>
 * ```
 * 
 * @example 状态文本
 * ```tsx
 * <SuccessText>操作成功</SuccessText>
 * <ErrorText>操作失败</ErrorText>
 * <WarningText>警告信息</WarningText>
 * ```
 * 
 * @example 可点击文本
 * ```tsx
 * <ThemeAwareCell 
 *   variant="primary" 
 *   clickable 
 *   onClick={() => console.log('点击了')}
 * >
 *   点击我
 * </ThemeAwareCell>
 * ```
 */