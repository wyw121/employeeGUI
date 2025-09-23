// 可拖拽的步骤列表容器

import React, { useMemo } from 'react';
import { Card, Typography, Button } from 'antd';
import { EyeOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SmartStepCardWrapper } from './SmartStepCardWrapper'; // 使用智能步骤卡片包装器
import { SmartScriptStep } from '../types/smartScript'; // 使用统一的类型定义

const { Title } = Typography;

export interface DraggableStepsContainerProps {
  /** 步骤列表 */
  steps: SmartScriptStep[];
  /** 更新步骤列表回调 */
  onStepsChange: (steps: SmartScriptStep[]) => void;
  /** 当前设备ID */
  currentDeviceId?: string;
  /** 设备列表 */
  devices: any[];
  /** 编辑步骤回调 */
  onEditStep: (step: SmartScriptStep) => void;
  /** 删除步骤回调 */
  onDeleteStep: (stepId: string) => void;
  /** 切换步骤启用状态回调 */
  onToggleStep: (stepId: string) => void;
  /** 打开页面分析器回调 */
  onOpenPageAnalyzer?: () => void;
  /** 修改步骤参数回调 */
  onEditStepParams?: (step: SmartScriptStep) => void;
  /** 测试步骤组件 */
  StepTestButton?: React.ComponentType<any>;
  /** 容器标题 */
  title?: React.ReactNode;
  /** 更新步骤参数回调 */
  onUpdateStepParameters?: (stepId: string, parameters: any) => void;
  /** 创建循环回调 */
  onCreateLoop?: () => void;
  /** 创建通讯录导入工作流回调 */
  onCreateContactImport?: () => void;
  /** 批量匹配操作回调 */
  onBatchMatch?: (stepId: string) => void;
}

export const DraggableStepsContainer: React.FC<DraggableStepsContainerProps> = ({
  steps,
  onStepsChange,
  currentDeviceId,
  devices,
  onEditStep,
  onDeleteStep,
  onToggleStep,
  onOpenPageAnalyzer,
  onEditStepParams,
  StepTestButton,
  title = <span>步骤列表</span>,
  onUpdateStepParameters,
  onCreateLoop,
  onCreateContactImport,
  onBatchMatch
}) => {
  // 配置传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8px后才激活拖拽
      },
    })
  );

  // 步骤ID列表（用于SortableContext）
  const stepIds = useMemo(() => steps.map(step => step.id), [steps]);

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = steps.findIndex(step => step.id === active.id);
      const newIndex = steps.findIndex(step => step.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSteps = arrayMove(steps, oldIndex, newIndex);
        onStepsChange(newSteps);
      }
    }
  };

  if (steps.length === 0) {
    return (
      <Card title={title}>
        <div className="text-center p-8">
          <div className="mt-4 text-gray-500">
            还没有添加智能步骤，点击上方按钮开始构建智能脚本
          </div>
        </div>
        
        {/* 智能页面分析器快捷按钮 - 无步骤时也显示 */}
        {onOpenPageAnalyzer && (
          <div className="mt-4 flex gap-2">
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              onClick={onOpenPageAnalyzer}
              style={{ flex: '0 0 20%' }}
            >
              页面分析
            </Button>
            {onCreateLoop && (
              <Button 
                type="default"
                icon={<ReloadOutlined />}
                onClick={onCreateLoop}
                style={{ flex: '0 0 20%' }}
              >
                🔄 创建循环
              </Button>
            )}
            {onCreateContactImport && (
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={onCreateContactImport}
                style={{ flex: '0 0 22%' }}
              >
                📱 通讯录导入
              </Button>
            )}
            {/* 预留空间给后续的其他按钮 */}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title={
      <div className="flex items-center space-x-2">
        <span>{title}</span>
        <span className="text-sm text-gray-500">({steps.length} 个步骤)</span>
      </div>
    }>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <SmartStepCardWrapper
                key={step.id}
                step={step}
                index={index}
                currentDeviceId={currentDeviceId}
                devices={devices}
                onEdit={onEditStep}
                onDelete={onDeleteStep}
                onToggle={onToggleStep}
                onOpenPageAnalyzer={onOpenPageAnalyzer}
                onEditStepParams={onEditStepParams}
                StepTestButton={StepTestButton}
                onUpdateStepParameters={onUpdateStepParameters}
                onBatchMatch={onBatchMatch}
              />
            ))}
            
            {/* 智能页面分析器快捷按钮 */}
            {onOpenPageAnalyzer && (
              <div className="mt-4 flex gap-2">
                <Button 
                  type="primary" 
                  icon={<EyeOutlined />}
                  onClick={onOpenPageAnalyzer}
                  style={{ flex: '0 0 20%' }}
                >
                  页面分析
                </Button>
                {onCreateLoop && (
                  <Button 
                    type="default"
                    icon={<ReloadOutlined />}
                    onClick={onCreateLoop}
                    style={{ flex: '0 0 20%' }}
                  >
                    🔄 创建循环
                  </Button>
                )}
                {onCreateContactImport && (
                  <Button 
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={onCreateContactImport}
                    style={{ flex: '0 0 22%' }}
                  >
                    📱 通讯录导入
                  </Button>
                )}
                {/* 预留空间给后续的其他按钮 */}
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </Card>
  );
};