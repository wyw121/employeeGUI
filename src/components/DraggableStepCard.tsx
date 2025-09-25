// 可拖拽的步骤卡片组件

import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, Tag, Switch, Typography, InputNumber, Popconfirm } from 'antd';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
// import { MatchingStrategyTag } from './step-card';
import { StrategyControls } from './DraggableStepCard/components/StrategyControls';
import { LoopConfigModal } from './DraggableStepCard/components/LoopConfigModal';
import { BatchMatchToggle } from './DraggableStepCard/components/BatchMatchToggle.tsx';
// 复用网格检查器里的策略选择器与预设字段映射（通过子模块桶文件导出）
import { StrategyConfigurator } from './universal-ui/views/grid-view/panels/node-detail';
import type { MatchStrategy } from './universal-ui/views/grid-view/panels/node-detail';
import { PRESET_FIELDS, normalizeExcludes, normalizeIncludes, inferStrategyFromFields, buildFindSimilarCriteria } from './universal-ui/views/grid-view/panels/node-detail';
// 绑定解析
import { useBoundNode } from './DraggableStepCard/hooks/useBoundNode';
// 移除独立的正/负条件编辑器，统一由表格承载

const { Text } = Typography;

import { STRATEGY_ENABLED_TYPES } from './DraggableStepCard/constants';
import { getStepUIExtension, renderStepTag, getStepMeta, renderStepSummary } from './DraggableStepCard/registry/registry';

export interface SmartScriptStep {
  id: string;
  name: string;
  step_type: string;
  description: string;
  parameters: any;
  enabled: boolean;
}

export interface DraggableStepCardProps {
  /** 步骤数据 */
  step: SmartScriptStep;
  /** 步骤索引 */
  index: number;
  /** 当前设备ID */
  currentDeviceId?: string;
  /** 设备列表 */
  devices: any[];
  /** 是否正在拖拽 */
  isDragging?: boolean;
}

export const DraggableStepCard: React.FC<
  DraggableStepCardProps & {
    onEdit: (step: SmartScriptStep) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onBatchMatch?: (id: string) => void;
    onUpdateStepParameters?: (id: string, nextParams: any) => void;
    StepTestButton?: React.ComponentType<{ step: SmartScriptStep; deviceId?: string; disabled?: boolean }>;
    ENABLE_BATCH_MATCH?: boolean;
    onEditStepParams?: (step: SmartScriptStep) => void;
  }
> = ({
  step,
  index,
  currentDeviceId,
  devices,
  isDragging,
  onEdit,
  onDelete,
  onToggle,
  onBatchMatch,
  onUpdateStepParameters,
  StepTestButton,
  ENABLE_BATCH_MATCH = false,
  onEditStepParams,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableIsDragging } = useSortable({
    id: step.id,
  });
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

  // 选择文件/设备的交互已迁移到子组件内部，保留主组件瘦身

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || sortableIsDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const meta = getStepMeta(step);

  // 是否展示匹配策略控件：
  // 1) 这些步骤天然依赖元素匹配；2) 或步骤已存在 matching 参数
  const showStrategyControls = STRATEGY_ENABLED_TYPES.has(step.step_type) || !!step.parameters?.matching;

  // 🆕 从 elementBinding 解析出 UiNode，用于策略编辑的“基于节点回填”体验
  // 兼容旧步骤：若缺失 elementBinding，但存在 xmlSnapshot + xpath，则自动补齐并持久化
  const boundNode = useBoundNode(step.id, step.parameters, onUpdateStepParameters);

  // 通过注册表拿到扩展渲染器
  const ext = getStepUIExtension(step.step_type);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="w-full"
    >
      <Card
        size="small"
        className={`
          transition-all duration-200
          ${sortableIsDragging ? 'shadow-lg rotate-2 scale-105' : 'hover:shadow-md'}
          cursor-grab hover:cursor-grabbing
        `}
        style={{ 
          touchAction: 'none',
          // 为循环开始和结束步骤设置特殊的蓝色主题
          ...(step.step_type === 'loop_start' || step.step_type === 'loop_end' ? {
            border: '4px solid #3b82f6',
            background: 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0, #cbd5e1)',
            color: '#1e293b',
            boxShadow: sortableIsDragging ? 
              '0 20px 40px rgba(59, 130, 246, 0.6), 0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.3)' : 
              '0 8px 25px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.2), 0 0 0 4px rgba(59, 130, 246, 0.3)',
            ...(sortableIsDragging ? {
              transform: 'rotate(2deg) scale(1.05)',
              borderColor: '#1d4ed8'
            } : {})
          } : {
            // 普通步骤的样式
            borderColor: step.enabled ? '#cbd5e1' : '#e5e7eb',
            ...((step as any).parent_loop_id ? {
              background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)',
              borderColor: '#93c5fd',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.2)',
            } : {})
          })
        }}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* 拖拽手柄 - 现在作为视觉指示器 */}
              <div className="p-1 rounded">
                <DragOutlined 
                  className={
                    step.step_type === 'loop_start' || step.step_type === 'loop_end' ? 
                      "text-blue-700" : 
                      (step as any).parent_loop_id ? "text-blue-500" : "text-gray-400"
                  } 
                />
              </div>
              
              <Text className="text-lg" style={{ color: (step.step_type === 'loop_start' || step.step_type === 'loop_end') ? '#1e293b' : undefined }}>{meta.icon}</Text>
              <Text 
                strong 
                style={{ 
                  color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#1e293b' : undefined 
                }}
              >
                {step.name}
              </Text>
              {renderStepTag(step)}
              {!step.enabled && <Tag>已禁用</Tag>}
              {(step as any).parent_loop_id && (
                <Tag color="blue" className="bg-blue-100 text-blue-700 border-blue-300">
                  🔄 循环体内
                </Tag>
              )}

              {/* 头部额外区域由注册表扩展提供 */}
              {ext?.renderHeaderExtras?.(step as any, { devices, onUpdateStepParameters })}
              
              {/* 修改参数按钮 - 仅对智能元素查找步骤显示 */}
              {step.step_type === 'smart_find_element' && onEditStepParams && (
                <Button
                  size="small"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditStepParams(step);
                  }}
                  style={{ padding: '0 4px', fontSize: '12px' }}
                >
                  修改参数
                </Button>
              )}
            </div>
            
            <Space>
              {/* 循环次数设置按钮 - 对循环开始和循环结束步骤显示 */}
              {(step.step_type === 'loop_start' || step.step_type === 'loop_end') && (
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLoopConfigVisible(true);
                  }}
                  style={{ 
                    padding: '0 4px', 
                    fontSize: '12px',
                    color: step.parameters?.is_infinite_loop ? '#f59e0b' : '#3b82f6' 
                  }}
                  title={
                    step.parameters?.is_infinite_loop 
                      ? '循环次数: 无限循环 ∞' 
                      : `循环次数: ${step.parameters?.loop_count || 3}`
                  }
                >
                  {step.parameters?.is_infinite_loop 
                    ? '∞' 
                    : `${step.parameters?.loop_count || 3}次`
                  }
                </Button>
              )}

              {/* 测试按钮 */}
              {StepTestButton && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseDownCapture={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchStartCapture={(e) => e.stopPropagation()}
                >
                  <StepTestButton 
                    step={step} 
                    deviceId={currentDeviceId}
                    disabled={!currentDeviceId || devices.filter(d => d.status === 'online').length === 0}
                  />
                </div>
              )}
              
              {/* 启用/禁用开关 */}
              <Switch
                size="small"
                checked={step.enabled}
                onChange={(checked, e) => {
                  e?.stopPropagation();
                  onToggle(step.id);
                }}
              />
              
              {/* 编辑按钮 */}
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(step);
                }}
              />
              
              {/* 删除按钮 - 添加确认对话框 */}
              <Popconfirm
                title="确认删除步骤"
                description="删除后无法恢复，确定要删除这个步骤吗？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  onDelete(step.id);
                }}
                onCancel={(e) => {
                  e?.stopPropagation();
                }}
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
                    // Popconfirm 会处理确认逻辑
                  }}
                />
              </Popconfirm>
            </Space>
          </div>
        }
      >
        <div 
          className="text-sm mb-2"
          style={{ 
            color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#374151' : '#4b5563'
          }}
        >
          <div className="flex items-center justify-between">
            <span>{step.description}</span>
            {/* 显示匹配策略标签 + 快速切换按钮（增强：覆盖更多步骤类型或已有 matching 的步骤） */}
            { showStrategyControls && (
              <div className="flex items-center gap-1">
                <StrategyControls
                  step={step}
                  boundNode={boundNode}
                  onUpdate={(nextParams) => onUpdateStepParameters?.(step.id, nextParams)}
                />
              </div>
            ) }
            
            {/* 批量匹配切换按钮 - 支持双向切换 */}
            {showStrategyControls && onBatchMatch && (
              <BatchMatchToggle
                step={step}
                ENABLE_BATCH_MATCH={ENABLE_BATCH_MATCH}
                onBatchMatch={onBatchMatch}
                onUpdateStepParameters={onUpdateStepParameters}
              />
            )}
          </div>
          
          {/* 卡片正文额外区域由注册表扩展提供 */}
          {ext?.renderBodyExtras?.(step as any, { devices, onUpdateStepParameters })}
        </div>
        <div 
          className="text-xs"
          style={{ color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#6b7280' : '#9ca3af' }}
        >
          步骤 #{index + 1} | {renderStepSummary(step)} | 参数: {Object.keys(step.parameters).length} 个
        </div>
      </Card>

      {/* 循环配置弹窗 */}
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

export default DraggableStepCard;