import React, { useState } from 'react';
import { Card, Button, Space, Tag, Switch, Typography, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, DragOutlined } from '@ant-design/icons';
import { StrategyControls } from '../../../DraggableStepCard/components/StrategyControls';
import { LoopConfigModal } from '../../../DraggableStepCard/components/LoopConfigModal';
import { BatchMatchToggle } from '../../../DraggableStepCard/components/BatchMatchToggle.tsx';
import { StrategyConfigurator } from '../../views/grid-view/panels/node-detail'; // 仍保持引用以兼容未来扩展（预留）
import type { MatchStrategy } from '../../views/grid-view/panels/node-detail';
import { STRATEGY_ENABLED_TYPES } from '../../../DraggableStepCard/constants';
import { getStepUIExtension, renderStepTag, getStepMeta, renderStepSummary } from '../../../DraggableStepCard/registry/registry';
import { useBoundNode } from '../../../DraggableStepCard/hooks/useBoundNode';

const { Text } = Typography;

// 与旧组件保持兼容的类型
export interface StepItemData {
  id: string;
  name: string;
  step_type: string;
  description: string;
  parameters: any;
  enabled: boolean;
  parent_loop_id?: string;
}

export interface StepItemProps {
  step: StepItemData;
  index: number;
  currentDeviceId?: string;
  devices: any[];
  // 操作回调
  onEdit: (step: StepItemData) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onBatchMatch?: (id: string) => void;
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
  StepTestButton?: React.ComponentType<{ step: StepItemData; deviceId?: string; disabled?: boolean }>;
  ENABLE_BATCH_MATCH?: boolean;
  onEditStepParams?: (step: StepItemData) => void;
  // 拖拽包装器注入的视觉状态
  draggingStyle?: React.CSSProperties;
}

export const StepItem: React.FC<StepItemProps> = ({
  step,
  index,
  currentDeviceId,
  devices,
  onEdit,
  onDelete,
  onToggle,
  onBatchMatch,
  onUpdateStepParameters,
  StepTestButton,
  ENABLE_BATCH_MATCH = false,
  onEditStepParams,
  draggingStyle,
}) => {
  const [isLoopConfigVisible, setIsLoopConfigVisible] = useState(false);
  const [loopCount, setLoopCount] = useState<number>(step.parameters?.loop_count || 3);
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(step.parameters?.is_infinite_loop || false);

  const handleSaveLoopConfig = () => {
    onUpdateStepParameters?.(step.id, {
      ...(step.parameters || {}),
      loop_count: loopCount,
      is_infinite_loop: isInfiniteLoop,
    });
    setIsLoopConfigVisible(false);
  };

  const meta = getStepMeta(step as any);
  const showStrategyControls = STRATEGY_ENABLED_TYPES.has(step.step_type) || !!step.parameters?.matching;
  const boundNode = useBoundNode(step.id, step.parameters, onUpdateStepParameters);
  const ext = getStepUIExtension(step.step_type);

  return (
    <div style={draggingStyle} className="w-full">
      {/** 处理拖拽透明度（可能是 string | number） */}
      {(() => {
        const rawOpacity = draggingStyle?.opacity as unknown;
        let numericOpacity: number | undefined;
        if (typeof rawOpacity === 'number') numericOpacity = rawOpacity;
        else if (typeof rawOpacity === 'string') {
          const parsed = parseFloat(rawOpacity);
            if (!isNaN(parsed)) numericOpacity = parsed;
        }
        const draggingClass = numericOpacity !== undefined && numericOpacity < 1 ? 'shadow-lg rotate-2 scale-105' : 'hover:shadow-md';
        return (
          <Card
            size="small"
            className={`transition-all duration-200 ${draggingClass} cursor-grab hover:cursor-grabbing`}
        style={{
          touchAction: 'none',
          ...(step.step_type === 'loop_start' || step.step_type === 'loop_end'
            ? {
                border: '4px solid #3b82f6',
                background: 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0, #cbd5e1)',
                color: '#1e293b',
              }
            : {
                borderColor: step.enabled ? '#cbd5e1' : '#e5e7eb',
                ...(step.parent_loop_id
                  ? {
                      background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)',
                      borderColor: '#93c5fd',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.2)',
                    }
                  : {}),
              }),
        }}
            title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded">
                <DragOutlined
                  className={
                    step.step_type === 'loop_start' || step.step_type === 'loop_end'
                      ? 'text-blue-700'
                      : step.parent_loop_id
                      ? 'text-blue-500'
                      : 'text-gray-400'
                  }
                />
              </div>
              <Text className="text-lg" style={{ color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#1e293b' : undefined }}>{meta.icon}</Text>
              <Text strong style={{ color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#1e293b' : undefined }}>{step.name}</Text>
              {renderStepTag(step as any)}
              {!step.enabled && <Tag>已禁用</Tag>}
              {step.parent_loop_id && (
                <Tag color="blue" className="bg-blue-100 text-blue-700 border-blue-300">
                  🔄 循环体内
                </Tag>
              )}
              {ext?.renderHeaderExtras?.(step as any, { devices, onUpdateStepParameters })}
              {step.step_type === 'smart_find_element' && onEditStepParams && (
                <Button
                  size="small"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditStepParams(step as any);
                  }}
                  style={{ padding: '0 4px', fontSize: '12px' }}
                >
                  修改参数
                </Button>
              )}
            </div>
            <Space>
              {(step.step_type === 'loop_start' || step.step_type === 'loop_end') && (
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLoopConfigVisible(true);
                  }}
                  style={{ padding: '0 4px', fontSize: '12px', color: step.parameters?.is_infinite_loop ? '#f59e0b' : '#3b82f6' }}
                  title={step.parameters?.is_infinite_loop ? '循环次数: 无限循环 ∞' : `循环次数: ${step.parameters?.loop_count || 3}`}
                >
                  {step.parameters?.is_infinite_loop ? '∞' : `${step.parameters?.loop_count || 3}次`}
                </Button>
              )}
              {StepTestButton && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <StepTestButton
                    step={step as any}
                    deviceId={currentDeviceId}
                    disabled={!currentDeviceId || devices.filter((d) => d.status === 'online').length === 0}
                  />
                </div>
              )}
              <Switch
                size="small"
                checked={step.enabled}
                onChange={(checked, e) => {
                  e?.stopPropagation();
                  onToggle(step.id);
                }}
              />
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(step as any);
                }}
              />
              <Popconfirm
                title="确认删除步骤"
                description="删除后无法恢复，确定要删除这个步骤吗？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  onDelete(step.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="删除"
                cancelText="取消"
                okType="danger"
                placement="topRight"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Popconfirm>
            </Space>
              </div>
            }
          >
        <div className="text-sm mb-2" style={{ color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#374151' : '#4b5563' }}>
          <div className="flex items-center justify-between">
            <span>{step.description}</span>
            {showStrategyControls && (
              <div className="flex items-center gap-1">
                <StrategyControls
                  step={step as any}
                  boundNode={boundNode}
                  onUpdate={(nextParams) => onUpdateStepParameters?.(step.id, nextParams)}
                />
              </div>
            )}
            {showStrategyControls && onBatchMatch && (
              <BatchMatchToggle
                step={step as any}
                ENABLE_BATCH_MATCH={ENABLE_BATCH_MATCH}
                onBatchMatch={onBatchMatch}
                onUpdateStepParameters={onUpdateStepParameters}
              />
            )}
          </div>
          {ext?.renderBodyExtras?.(step as any, { devices, onUpdateStepParameters })}
        </div>
        <div className="text-xs" style={{ color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#6b7280' : '#9ca3af' }}>
          步骤 #{index + 1} | {renderStepSummary(step as any)} | 参数: {Object.keys(step.parameters).length} 个
        </div>
          </Card>
        );
      })()}

      <LoopConfigModal
        open={isLoopConfigVisible}
        stepType={step.step_type}
        loopCount={loopCount}
        isInfiniteLoop={isInfiniteLoop}
        onLoopCountChange={(v) => setLoopCount(v)}
        onIsInfiniteLoopChange={(v) => setIsInfiniteLoop(v)}
        onSave={handleSaveLoopConfig}
        onCancel={() => {
          setIsLoopConfigVisible(false);
          setLoopCount(step.parameters?.loop_count || 3);
          setIsInfiniteLoop(step.parameters?.is_infinite_loop || false);
        }}
      />
    </div>
  );
};

export default StepItem;
