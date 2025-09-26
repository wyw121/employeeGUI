/**
 * 智能步骤卡片包装器
 * - 统一使用 DraggableStepCard 作为唯一样式实现（移除增强卡）
 */

import React from "react";
import { DraggableStepCard } from "./DraggableStepCard";
import { SmartScriptStep } from "../types/smartScript"; // 使用统一的类型定义

type DraggableCardProps = React.ComponentProps<typeof DraggableStepCard>;

interface SmartStepCardWrapperProps extends Omit<DraggableCardProps, "step"> {
  step: SmartScriptStep; // 使用统一的SmartScriptStep类型
  onOpenPageAnalyzer?: () => void; // 仅容器层使用，不向下透传
  // 操作回调（与 DraggableStepCard 对齐，必传）
  onEdit: (step: any) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEditStepParams?: (step: any) => void;
  // 更新元信息（名称/描述）
  onUpdateStepMeta?: (stepId: string, meta: { name?: string; description?: string }) => void;
}

export const SmartStepCardWrapper: React.FC<SmartStepCardWrapperProps> = (props) => {
  const { step, onOpenPageAnalyzer, onEdit, onDelete, onToggle, onEditStepParams, onUpdateStepMeta, ...rest } = props;

  // 回退到原始可拖拽卡片（保持旧外观与操作）
  const draggableStep = {
    id: step.id,
    name: step.name,
    step_type: step.step_type,
    description: step.description,
    parameters: step.parameters,
    enabled: step.enabled,
  };
  // 确保必需的处理器传递给 DraggableStepCard
  return (
    <DraggableStepCard
      {...rest}
      step={draggableStep}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggle={onToggle}
      onOpenPageAnalyzer={onOpenPageAnalyzer}
      onUpdateStepMeta={onUpdateStepMeta}
    />
  );
};

export default SmartStepCardWrapper;
