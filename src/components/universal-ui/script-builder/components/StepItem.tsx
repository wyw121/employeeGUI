// StepItem 组件（精简版，兼容 DraggableStepCard 传入的全部 props，以便后续逐步恢复功能）
import React from 'react';
import { Card, Tooltip } from 'antd';

export interface StepItemData {
  id: string;
  name: string;
  step_type: string;
  description: string;
  parameters: any; // TODO: 后续细化具体参数类型
  enabled: boolean;
  parent_loop_id?: string;
}

export interface StepItemProps {
  step: StepItemData;
  index: number;
  draggingStyle?: React.CSSProperties;
  onToggle: (id: string) => void;
  // 以下为 DraggableStepCard 目前传入的扩展属性（均设为可选，暂不完全实现交互）
  currentDeviceId?: string;
  devices?: any[];
  onEdit?: (step: StepItemData) => void;
  onDelete?: (id: string) => void;
  onBatchMatch?: (id: string) => void;
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
  StepTestButton?: React.ComponentType<{ step: StepItemData; deviceId?: string; disabled?: boolean }>;
  ENABLE_BATCH_MATCH?: boolean;
  onEditStepParams?: (step: StepItemData) => void;
}

export const StepItem: React.FC<StepItemProps> = (props) => {
  const {
    step,
    draggingStyle,
    onToggle,
    StepTestButton,
    currentDeviceId,
  } = props;

  // 处理拖拽态样式（原实现中存在 opacity < 1 的判断，这里加入类型守卫）
  const isDraggingLike = ((): boolean => {
    if (!draggingStyle) return false;
    const value = draggingStyle.opacity;
    if (typeof value === 'number') return value < 1;
    // 字符串情况（例如 '0.5'），尝试解析
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) return parsed < 1;
    }
    return false;
  })();

  const containerClass = `transition-all duration-200 ${isDraggingLike ? 'shadow-lg rotate-2 scale-105' : 'hover:shadow-md'} cursor-grab hover:cursor-grabbing`;

  return (
    <div style={draggingStyle} className={containerClass}>
      <Card
        size="small"
        title={
          <div className="flex items-center gap-2">
            <span className={step.enabled ? '' : 'line-through opacity-60'}>{step.name}</span>
            {!step.enabled && <span className="text-xs text-gray-400">(已禁用)</span>}
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            {StepTestButton && (
              <StepTestButton step={step} deviceId={currentDeviceId} disabled={!step.enabled} />
            )}
            <button
              type="button"
              onClick={() => onToggle(step.id)}
              className="text-xs px-1 py-0.5 rounded border hover:bg-gray-50"
            >
              {step.enabled ? '禁用' : '启用'}
            </button>
          </div>
        }
        style={{ touchAction: 'none' }}
        bodyStyle={{ padding: 8 }}
      >
        <div className="text-[12px] text-gray-600 leading-snug select-none">
          {step.description ? (
            <span>{step.description}</span>
          ) : (
            <span className="italic text-gray-400">(无描述)</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400">
          <Tooltip title={`类型: ${step.step_type}`}>
            <span className="px-1 py-0.5 bg-gray-100 rounded">{step.step_type}</span>
          </Tooltip>
          {step.parent_loop_id && (
            <Tooltip title="所属循环">
              <span className="px-1 py-0.5 bg-blue-50 text-blue-500 rounded">loop:{step.parent_loop_id}</span>
            </Tooltip>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StepItem;

/* NOTE:
 * 这是一个过渡版本：
 * - 仅保留最基本展示与启用/禁用切换按钮，满足现有调用点的类型需求，消除编译错误。
 * - 复杂逻辑（参数编辑 / 批量匹配 / 设备感知渲染等）将分阶段从旧巨型文件中按职责拆分为 hooks + 子组件再回填。
 * - 后续步骤：
 *   1. 提炼参数编辑面板 -> components/parameters/
 *   2. 批量匹配入口统一到 ActionBar -> components/actions/
 *   3. 交互副作用抽离 useStepItemInteractions.ts
 */
