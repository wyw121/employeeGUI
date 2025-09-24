/**
 * 统一的"设置为步骤元素"按钮组件
 * 
 * 功能：
 * 1. 提供统一的按钮样式和交互
 * 2. 集成完整的回填逻辑
 * 3. 支持不同场景下的参数配置
 * 4. 显示回填条件的详细信息
 */

import React, { useMemo } from 'react';
import type { UiNode } from '../../types';
import styles from '../../GridElementView.module.css';
import { 
  buildCompleteStepCriteria, 
  buildSmartStepCriteria, 
  buildMatchResultCriteria,
  validateStepCriteria,
  formatCriteriaForDebug,
  type CompleteStepCriteria,
  type ElementToStepOptions 
} from './elementToStepHelper';

export interface SetAsStepElementButtonProps {
  // 目标节点
  node: UiNode | null;
  
  // 回调函数 - 当点击设置为步骤元素时调用
  onApply: (criteria: CompleteStepCriteria) => void;
  
  // 按钮文本（可自定义）
  label?: string;
  
  // 按钮样式变体
  variant?: 'primary' | 'secondary' | 'success';
  
  // 按钮大小
  size?: 'small' | 'medium' | 'large';
  
  // 是否禁用
  disabled?: boolean;
  
  // 构建选项配置
  buildMode?: 'smart' | 'current-panel' | 'match-result';
  
  // 当前面板状态（buildMode为current-panel时必需）
  panelState?: {
    strategy?: CompleteStepCriteria['strategy'];
    fields?: string[];
    values?: Record<string, string>;
    includes?: Record<string, string[]>;
    excludes?: Record<string, string[]>;
  };
  
  // 显示详细信息提示
  showDetails?: boolean;
  
  // 自定义CSS类名
  className?: string;
  
  // 是否显示图标
  showIcon?: boolean;

  // 是否在禁用态显示帮助图标
  showDisabledHelpIcon?: boolean;
  // 禁用提示展示模式：tooltip 或 inline
  disabledHintMode?: 'tooltip' | 'inline';
}

export const SetAsStepElementButton: React.FC<SetAsStepElementButtonProps> = ({
  node,
  onApply,
  label = "设置为步骤元素",
  variant = "primary",
  size = "medium",
  disabled = false,
  buildMode = "smart",
  panelState,
  showDetails = true,
  className = "",
  showIcon = true,
  showDisabledHelpIcon = true,
  disabledHintMode = 'tooltip',
}) => {
  // 构建回填条件
  const criteria = useMemo(() => {
    if (!node) return null;
    switch (buildMode) {
      case 'current-panel':
        if (!panelState) {
          console.warn('SetAsStepElementButton: buildMode is current-panel but panelState is not provided');
          return buildSmartStepCriteria(node, 'node-detail');
        }
        return buildCompleteStepCriteria(
          node,
          {
            currentStrategy: panelState.strategy,
            currentFields: panelState.fields,
            currentValues: panelState.values,
            currentIncludes: panelState.includes,
            currentExcludes: panelState.excludes,
          },
          'node-detail'
        );
      case 'match-result':
        return buildMatchResultCriteria(node, panelState?.strategy, panelState?.fields);
      case 'smart':
      default:
        return buildSmartStepCriteria(node, 'screen-preview');
    }
  }, [node, buildMode, panelState]);

  // 验证条件
  const validation = useMemo(() => {
    if (!criteria) return { isValid: false, warnings: ['无法构建回填条件'] };
    return validateStepCriteria(criteria);
  }, [criteria]);

  // 按钮样式
  const buttonClass = useMemo(() => {
    const baseClass = styles.btn;
    const sizeClass = size === 'small' ? 'text-xs px-2 py-1' : size === 'large' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1.5';
    const variantClass =
      variant === 'primary'
        ? 'bg-blue-500 hover:bg-blue-600 text-white'
        : variant === 'success'
        ? 'bg-green-500 hover:bg-green-600 text-white'
        : 'bg-gray-500 hover:bg-gray-600 text-white';
    return `${baseClass} ${sizeClass} ${variantClass} ${className}`;
  }, [variant, size, className]);

  // 构建提示信息（禁用态给出更明确原因）
  const tooltip = useMemo(() => {
    if (!node) return '请先在屏幕预览或节点树中选中一个元素';
    if (!criteria) return '无法构建回填条件，请检查当前面板状态或所选元素';
    if (!validation.isValid) {
      const warn = validation.warnings.length > 0 ? `：${validation.warnings.join(', ')}` : '';
      return `条件校验未通过${warn}`;
    }
    const parts: string[] = [];
    parts.push(`策略: ${criteria.strategy}`);
    parts.push(`字段: ${criteria.fields.length}个`);
    if (criteria.includes && Object.keys(criteria.includes).length > 0) {
      parts.push(`包含条件: ${Object.keys(criteria.includes).length}个`);
    }
    if (criteria.excludes && Object.keys(criteria.excludes).length > 0) {
      parts.push(`不包含条件: ${Object.keys(criteria.excludes).length}个`);
    }
    if (validation.warnings.length > 0) {
      parts.push(`警告: ${validation.warnings.join(', ')}`);
    }
    return parts.join('\n');
  }, [node, criteria, validation]);

  // 处理点击事件
  const handleClick = () => {
    if (!criteria) {
      console.error('SetAsStepElementButton: 无法构建回填条件');
      return;
    }
    console.log('🎯 设置为步骤元素:', formatCriteriaForDebug(criteria));
    onApply(criteria);
  };

  // 渲染详细信息（可选）
  const renderDetails = () => {
    if (!showDetails || !criteria) return null;
    return (
      <div className="text-xs text-gray-500 mt-1">
        {criteria.strategy} · {criteria.fields.length}个字段
        {criteria.metadata?.hasAdvancedConditions && ' · 含高级条件'}
      </div>
    );
  };

  const isDisabled = disabled || !node || !criteria || !validation.isValid;

  // 额外禁用原因提示（内联）
  const inlineDisabledHint = () => {
    if (!isDisabled || disabledHintMode !== 'inline') return null;
    return (
      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
        <span role="img" aria-label="hint">💡</span>
        {tooltip}
      </div>
    );
  };

  return (
    <div className="inline-block">
      <div className="flex items-center gap-2">
        <button
          className={`${buttonClass} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          disabled={isDisabled}
          onClick={handleClick}
          title={disabledHintMode === 'tooltip' ? tooltip : undefined}
          type="button"
        >
          {showIcon && (
            <span className="mr-1" role="img" aria-label="set-element">
              🎯
            </span>
          )}
          {label}
        </button>
        {isDisabled && showDisabledHelpIcon && disabledHintMode === 'tooltip' && (
          <span className="text-gray-400 text-sm" title={tooltip} role="img" aria-label="help">❔</span>
        )}
      </div>

      {renderDetails()}
      {inlineDisabledHint()}

      {process.env.NODE_ENV === 'development' && validation.warnings.length > 0 && (
        <div className="text-xs text-orange-500 mt-1">⚠️ {validation.warnings.join(', ')}</div>
      )}
    </div>
  );
};

/**
 * 快速构建按钮的便捷函数
 */
export const createSetAsStepElementButton = (
  node: UiNode | null,
  onApply: (criteria: CompleteStepCriteria) => void,
  options: Partial<SetAsStepElementButtonProps> = {}
) => {
  return (
    <SetAsStepElementButton
      node={node}
      onApply={onApply}
      {...options}
    />
  );
};

/**
 * 专用于节点详情面板的按钮（使用当前面板状态）
 */
export const NodeDetailSetElementButton: React.FC<{
  node: UiNode | null;
  onApply: (criteria: CompleteStepCriteria) => void;
  strategy?: CompleteStepCriteria['strategy'];
  fields?: string[];
  values?: Record<string, string>;
  includes?: Record<string, string[]>;
  excludes?: Record<string, string[]>;
}> = ({ node, onApply, strategy, fields, values, includes, excludes }) => {
  return (
    <SetAsStepElementButton
      node={node}
      onApply={onApply}
      buildMode="current-panel"
      panelState={{
        strategy,
        fields,
        values,
        includes,
        excludes,
      }}
      variant="success"
      label="应用到步骤"
      showDetails={true}
    />
  );
};

/**
 * 专用于屏幕预览的按钮（智能模式）
 */
export const ScreenPreviewSetElementButton: React.FC<{
  node: UiNode | null;
  onApply: (criteria: CompleteStepCriteria) => void;
}> = ({ node, onApply }) => {
  return (
    <SetAsStepElementButton
      node={node}
      onApply={onApply}
      buildMode="smart"
      variant="primary"
      size="small"
      label="设为步骤元素"
      showDetails={false}
      showIcon={true}
    />
  );
};

/**
 * 专用于匹配结果的按钮（使用当前策略和字段）
 */
export const MatchResultSetElementButton: React.FC<{
  node: UiNode | null;
  onApply: (criteria: CompleteStepCriteria) => void;
  currentStrategy?: CompleteStepCriteria['strategy'];
  currentFields?: string[];
}> = ({ node, onApply, currentStrategy, currentFields }) => {
  return (
    <SetAsStepElementButton
      node={node}
      onApply={onApply}
      buildMode="match-result"
      panelState={{
        strategy: currentStrategy,
        fields: currentFields,
      }}
      variant="primary"
      size="small"
      label="选择为步骤元素"
      showDetails={false}
    />
  );
};

export default SetAsStepElementButton;