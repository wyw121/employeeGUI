// 可拖拽的步骤列表容器

import React, { useMemo } from 'react';
import { Card, Typography, Button } from 'antd';
import { ActionsToolbar } from './universal-ui/script-builder/components/ActionsToolbar/ActionsToolbar';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SmartStepCardWrapper } from './SmartStepCardWrapper'; // 使用智能步骤卡片包装器
import { SmartScriptStep } from '../types/smartScript'; // 使用统一的类型定义
import { useStepDragAndDrop } from './universal-ui/script-builder/hooks/useStepDragAndDrop';

const { Title } = Typography;

export interface DraggableStepsContainerProps {
  /** 步骤列表 */
  steps: SmartScriptStep[];
  /** 更新步骤列表回调 */
  onStepsChange: (steps: SmartScriptStep[]) => void;
  /** 更新步骤元信息（名称/描述） */
  onUpdateStepMeta?: (stepId: string, meta: { name?: string; description?: string }) => void;
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
  /** 创建屏幕交互步骤（如滚动/滑动等）回调 */
  onCreateScreenInteraction?: (template: any | any[]) => void;
  /** 创建系统按键步骤回调 */
  onCreateSystemAction?: (template: any) => void;
}

export const DraggableStepsContainer: React.FC<DraggableStepsContainerProps> = ({
  steps,
  onStepsChange,
  onUpdateStepMeta,
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
  onBatchMatch,
  onCreateScreenInteraction,
  onCreateSystemAction,
}) => {
  // 使用抽离的拖拽 Hook（ESM 导入，兼容 Vite/Tauri）
  const { sensors, stepIds, handleDragEnd } = useStepDragAndDrop({ steps, onStepsChange });

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
          <div className="mt-4">
            <ActionsToolbar
              onOpenPageAnalyzer={onOpenPageAnalyzer}
              onCreateLoop={onCreateLoop}
              onCreateContactImport={onCreateContactImport}
              onCreateScreenInteraction={onCreateScreenInteraction}
              onCreateSystemAction={onCreateSystemAction}
            />
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
                onUpdateStepMeta={onUpdateStepMeta}
              />
            ))}
            
            {/* 智能页面分析器快捷按钮 */}
            {onOpenPageAnalyzer && (
              <div className="mt-4">
                <ActionsToolbar
                  onOpenPageAnalyzer={onOpenPageAnalyzer}
                  onCreateLoop={onCreateLoop}
                  onCreateContactImport={onCreateContactImport}
                  onCreateScreenInteraction={onCreateScreenInteraction}
                  onCreateSystemAction={onCreateSystemAction}
                />
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </Card>
  );
};