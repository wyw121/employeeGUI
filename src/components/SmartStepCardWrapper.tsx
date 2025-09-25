/**
 * 智能步骤卡片包装器（简化版）
 * 统一使用原始的可拖拽步骤卡片
 */

import React from "react";
import { DraggableStepCard } from "./DraggableStepCard";
import { SmartScriptStep } from "../types/smartScript"; // 使用统一的类型定义

type DraggableCardProps = React.ComponentProps<typeof DraggableStepCard>;

interface SmartStepCardWrapperProps extends Omit<DraggableCardProps, "step"> {
  step: SmartScriptStep; // 使用统一的SmartScriptStep类型
  onOpenPageAnalyzer?: () => void; // 仅容器层使用，不向下透传
}

export const SmartStepCardWrapper: React.FC<SmartStepCardWrapperProps> = (props) => {
  const { step, onOpenPageAnalyzer, ...rest } = props;

  console.log("🔍 SmartStepCardWrapper 使用传统样式:", {
    stepId: step.id,
    stepName: step.name,
    alwaysUseOriginalStyle: true,
  });

  // 转换步骤类型并使用原有的可拖拽步骤卡片
  const draggableStep = {
    id: step.id,
    name: step.name,
    step_type: step.step_type,
    description: step.description,
    parameters: step.parameters,
    enabled: step.enabled,
  };

  // 不透传 onOpenPageAnalyzer 给 DraggableStepCard，避免类型不匹配
  return <DraggableStepCard {...rest} step={draggableStep} />;
};

export default SmartStepCardWrapper;
