// 可拖拽的步骤卡片组件

import React from 'react';
import { Card, Button, Space, Tag, Switch, Typography } from 'antd';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  DragOutlined
} from '@ant-design/icons';

const { Text } = Typography;

// 智能操作配置（从主页面复制）
const SMART_ACTION_CONFIGS = {
  'smart_find_element': { icon: '🎯', name: '智能元素查找', color: 'blue', category: '定位' },
  'smart_click': { icon: '👆', name: '智能点击', color: 'green', category: '交互' },
  'smart_input': { icon: '✏️', name: '智能输入', color: 'orange', category: '输入' },
  'smart_scroll': { icon: '📜', name: '智能滚动', color: 'purple', category: '导航' },
  'smart_wait': { icon: '⏰', name: '智能等待', color: 'cyan', category: '控制' },
  'smart_extract': { icon: '📤', name: '智能提取', color: 'red', category: '数据' },
  'smart_verify': { icon: '✅', name: '智能验证', color: 'geekblue', category: '验证' },
  'loop_start': { icon: '🔄', name: '循环开始', color: 'blue', category: '循环' },
  'loop_end': { icon: '🏁', name: '循环结束', color: 'blue', category: '循环' }
};

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
  /** 编辑步骤回调 */
  onEdit: (step: SmartScriptStep) => void;
  /** 删除步骤回调 */
  onDelete: (stepId: string) => void;
  /** 切换启用状态回调 */
  onToggle: (stepId: string) => void;
  /** 编辑元素名称回调 */
  onEditElementName?: (step: SmartScriptStep) => void;
  /** 测试步骤组件 */
  StepTestButton?: React.ComponentType<any>;
}

export const DraggableStepCard: React.FC<DraggableStepCardProps> = ({
  step,
  index,
  currentDeviceId,
  devices,
  isDragging,
  onEdit,
  onDelete,
  onToggle,
  onEditElementName,
  StepTestButton
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || sortableIsDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const config = SMART_ACTION_CONFIGS[step.step_type] || { 
    icon: '⚙️', 
    name: '未知操作', 
    color: 'default', 
    category: '其他' 
  };

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
              
              <Text 
                className="text-lg" 
                style={{ 
                  color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#1e293b' : undefined 
                }}
              >
                {config.icon}
              </Text>
              <Text 
                strong 
                style={{ 
                  color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#1e293b' : undefined 
                }}
              >
                {step.name}
              </Text>
              <Tag color={config.color}>{config.name}</Tag>
              {!step.enabled && <Tag>已禁用</Tag>}
              {(step as any).parent_loop_id && (
                <Tag color="blue" className="bg-blue-100 text-blue-700 border-blue-300">
                  🔄 循环体内
                </Tag>
              )}
              
              {/* 修改元素名称按钮 - 仅对智能元素查找步骤显示 */}
              {step.step_type === 'smart_find_element' && onEditElementName && (
                <Button
                  size="small"
                  type="link"
                  icon={<SettingOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditElementName(step);
                  }}
                  style={{ padding: '0 4px', fontSize: '12px' }}
                >
                  修改元素名称
                </Button>
              )}
            </div>
            
            <Space>
              {/* 测试按钮 */}
              {StepTestButton && (
                <div onClick={(e) => e.stopPropagation()}>
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
              
              {/* 删除按钮 */}
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(step.id);
                }}
              />
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
          {step.description}
        </div>
        <div 
          className="text-xs"
          style={{ 
            color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#6b7280' : '#9ca3af'
          }}
        >
          步骤 #{index + 1} | 类型: {config.category} | 参数: {Object.keys(step.parameters).length} 个
        </div>
      </Card>
    </div>
  );
};