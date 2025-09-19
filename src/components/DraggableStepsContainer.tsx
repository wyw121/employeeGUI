// 可拖拽的步骤列表容器

import React, { useMemo } from 'react';
import { Card, Typography } from 'antd';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableStepCard, SmartScriptStep } from './DraggableStepCard';

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
  /** 编辑元素名称回调 */
  onEditElementName?: (step: SmartScriptStep) => void;
  /** 测试步骤组件 */
  StepTestButton?: React.ComponentType<any>;
  /** 容器标题 */
  title?: React.ReactNode;
}

export const DraggableStepsContainer: React.FC<DraggableStepsContainerProps> = ({
  steps,
  onStepsChange,
  currentDeviceId,
  devices,
  onEditStep,
  onDeleteStep,
  onToggleStep,
  onEditElementName,
  StepTestButton,
  title = <span>步骤列表</span>
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
              <DraggableStepCard
                key={step.id}
                step={step}
                index={index}
                currentDeviceId={currentDeviceId}
                devices={devices}
                onEdit={onEditStep}
                onDelete={onDeleteStep}
                onToggle={onToggleStep}
                onEditElementName={onEditElementName}
                StepTestButton={StepTestButton}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Card>
  );
};