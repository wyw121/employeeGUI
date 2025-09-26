// 可拖拽的步骤列表容器

import React, { useMemo } from 'react';
import { Card, Typography, Button } from 'antd';
import { ActionsToolbar } from './universal-ui/script-builder/components/ActionsToolbar/ActionsToolbar';
import { DndContext, closestCenter, DragOverlay, useDndMonitor } from '@dnd-kit/core';
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

// 内部拖拽监听器组件 - 必须在 DndContext 内部使用
const DragMonitor: React.FC<{ onActiveIdChange: (id: string | null) => void }> = ({ onActiveIdChange }) => {
  useDndMonitor({
    onDragStart: (e) => onActiveIdChange(String(e.active.id)),
    onDragCancel: () => onActiveIdChange(null),
    onDragEnd: () => onActiveIdChange(null),
  });
  return null;
};

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
  const { sensors, stepIds, handleDragEnd } = useStepDragAndDrop({ steps, onStepsChange, activationDelayMs: 120, activationTolerance: 6 });
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeStep = React.useMemo(() => steps.find(s => s.id === activeId) || null, [activeId, steps]);

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
        {/* 拖拽监听器：必须在 DndContext 内部 */}
        <DragMonitor onActiveIdChange={setActiveId} />
        
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

        {/* 幽灵卡片：仅绘制最小内容，避免复杂嵌套导致掉帧 */}
        <DragOverlay dropAnimation={null}>
          {activeStep ? (
            <div
              style={{
                width: '100%',
                transform: 'translateZ(0)',
                willChange: 'transform',
                pointerEvents: 'none',
              }}
              className="select-none"
            >
              <div className="rounded-lg border bg-white shadow-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">≡</span>
                  <span className="font-medium truncate max-w-[260px]" title={activeStep.name}>{activeStep.name}</span>
                  <span className="text-xs text-gray-500">#{steps.findIndex(s => s.id === activeStep.id) + 1}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate max-w-[280px]" title={activeStep.description}>{activeStep.description}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Card>
  );
};