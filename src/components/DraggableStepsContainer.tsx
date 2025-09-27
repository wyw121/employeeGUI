// 可拖拽的步骤列表容器

import React, { useMemo } from 'react';
import { Card, Typography, Button } from 'antd';
import { ActionsToolbar } from './universal-ui/script-builder/components/ActionsToolbar/ActionsToolbar';
import { closestCenter, DragOverlay, useDndMonitor, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { SmartStepCardWrapper } from './SmartStepCardWrapper'; // 使用智能步骤卡片包装器
import { SmartScriptStep } from '../types/smartScript'; // 使用统一的类型定义
import { useDefaultDeviceId } from '../application/hooks/useDefaultDeviceId';
import DragSensorsProvider from './universal-ui/dnd/DragSensorsProvider';
import { SortableList } from './universal-ui/dnd/SortableList';
import { SortableItem } from './universal-ui/dnd/SortableItem';
import { DragOverlayGhost } from './universal-ui/dnd/DragOverlayGhost';
import { DnDUIConfigProvider, useDnDUIConfig, DnDUIConfigPersistence } from './universal-ui/dnd/DnDUIConfigContext';

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
  // 统一 DnD：距离触发（6px），本地实现排序回调
  const stepIds = React.useMemo(() => steps.map(s => s.id), [steps]);
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex(s => s.id === active.id);
    const newIndex = steps.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(steps, oldIndex, newIndex);
    onStepsChange(reordered);
  }, [steps, onStepsChange]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeStep = React.useMemo(() => steps.find(s => s.id === activeId) || null, [activeId, steps]);

  // 兜底：当未传入 currentDeviceId 时，自动选择默认设备（selected → online → first）
  const { defaultDeviceId } = useDefaultDeviceId({ preferSelected: true });
  const effectiveDeviceId = currentDeviceId || defaultDeviceId;

  if (steps.length === 0) {
    return (
      <DnDUIConfigProvider>
        <DnDUIConfigPersistence />
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
      </DnDUIConfigProvider>
    );
  }

  const OverlayRenderer: React.FC = () => {
    const { config } = useDnDUIConfig();
    if (!config.useGhostOverlay) return null;
    return (
      <DragOverlay dropAnimation={null}>
        {activeStep ? (
          <DragOverlayGhost
            title={activeStep.name}
            subtitle={activeStep.description}
            index={steps.findIndex(s => s.id === activeStep.id)}
          />
        ) : null}
      </DragOverlay>
    );
  };

  return (
  <DnDUIConfigProvider>
  <DnDUIConfigPersistence />
    <Card title={
      <div className="flex items-center space-x-2">
        <span>{title}</span>
        <span className="text-sm text-gray-500">({steps.length} 个步骤)</span>
      </div>
    }>
      <DragSensorsProvider activationDistance={6} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* 拖拽监听器：必须在 DndContext 内部 */}
        <DragMonitor onActiveIdChange={setActiveId} />
        <SortableList items={stepIds}>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <SortableItem key={step.id} id={step.id}>
                <SmartStepCardWrapper
                  step={step}
                  index={index}
                  currentDeviceId={effectiveDeviceId}
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
              </SortableItem>
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
        </SortableList>

        {/* 幽灵卡片（按配置开关）：仅绘制最小内容，避免复杂嵌套导致掉帧 */}
        <OverlayRenderer />
      </DragSensorsProvider>
    </Card>
    </DnDUIConfigProvider>
  );
};