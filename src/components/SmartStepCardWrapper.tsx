/**
 * 智能步骤卡片包装器
 * 能够检测步骤是否包含增强元素信息，并使用相应的卡片组件
 */

import React from "react";
import { DraggableStepCard, DraggableStepCardProps } from "./DraggableStepCard";
import { EnhancedStepCard } from "../modules/enhanced-step-card/EnhancedStepCard";
import { SmartScriptStep } from "../types/smartScript"; // 使用统一的类型定义

interface SmartStepCardWrapperProps
  extends Omit<DraggableStepCardProps, "step"> {
  step: SmartScriptStep; // 使用统一的SmartScriptStep类型
}

export const SmartStepCardWrapper: React.FC<SmartStepCardWrapperProps> = (
  props
) => {
  const { step } = props;

  // 🔍 检查步骤是否**明确要求**使用增强卡片样式
  // 默认使用原有样式，只有明确设置 useEnhancedCard: true 时才使用增强样式
  const hasEnhancedInfo = !!(
    step.parameters?.useEnhancedCard // 明确标识要使用增强卡片
  );

  console.log("🔍 SmartStepCardWrapper 检查步骤:", {
    stepId: step.id,
    stepName: step.name,
    hasEnhancedInfo,
    useEnhancedCard: !!step.parameters?.useEnhancedCard,
    hasIsEnhanced: !!step.parameters?.isEnhanced,
    hasXmlCacheId: !!step.parameters?.xmlCacheId,
    hasElementSummary: !!step.parameters?.elementSummary,
    willUseOriginalStyle: !hasEnhancedInfo,
  });

  // 如果有增强信息，使用增强步骤卡片
  if (hasEnhancedInfo) {
    return (
      <EnhancedStepCard
        step={step}
        onEdit={() => props.onEdit(step)}
        onTest={
          props.StepTestButton
            ? () => {
                // 创建测试按钮组件实例
                const TestButton = props.StepTestButton!;
                // 这里需要根据实际的测试逻辑来处理
                console.log("🧪 触发步骤测试:", step.id);
              }
            : undefined
        }
        onDelete={() => props.onDelete(step.id)}
      />
    );
  }

  // 否则使用原有的可拖拽步骤卡片（需要转换步骤类型）
  const draggableStep = {
    id: step.id,
    name: step.name,
    step_type: step.step_type,
    description: step.description,
    parameters: step.parameters,
    enabled: step.enabled,
  };

  return <DraggableStepCard {...props} step={draggableStep} />;
};

export default SmartStepCardWrapper;
