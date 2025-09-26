import { useCallback } from 'react';

// 这里使用 any 类型以避免与现有 ExtendedSmartScriptStep 循环导入；后续可统一到 script-builder/types
export interface LoopLikeStep {
  id: string;
  step_type?: string;
  parameters?: Record<string, any>;
  loop_config?: { loopId?: string } | null;
}

/**
 * 查找循环配对步骤：支持 loop_start <-> loop_end
 * 匹配优先级：parameters.loop_id > loop_config.loopId > 最近的相反类型步骤
 */
export function findLoopPairStep(currentStep: LoopLikeStep, allSteps: LoopLikeStep[]) {
  if (currentStep.step_type !== 'loop_start' && currentStep.step_type !== 'loop_end') return null;
  const targetStepType = currentStep.step_type === 'loop_start' ? 'loop_end' : 'loop_start';

  if (currentStep.parameters?.loop_id) {
    return allSteps.find(s => s.step_type === targetStepType && s.parameters?.loop_id === currentStep.parameters?.loop_id) || null;
  }
  if (currentStep.loop_config?.loopId) {
    return allSteps.find(s => s.step_type === targetStepType && s.loop_config?.loopId === currentStep.loop_config?.loopId) || null;
  }

  const idx = allSteps.findIndex(s => s.id === currentStep.id);
  if (idx === -1) return null;
  if (currentStep.step_type === 'loop_start') {
    for (let i = idx + 1; i < allSteps.length; i++) {
      if (allSteps[i].step_type === 'loop_end') return allSteps[i];
    }
  } else {
    for (let i = idx - 1; i >= 0; i--) {
      if (allSteps[i].step_type === 'loop_start') return allSteps[i];
    }
  }
  return null;
}

/**
 * 返回一个同步循环参数的回调，保证循环起止步骤关键参数一致
 */
export function useLoopPairing() {
  const syncLoopParameters = useCallback((stepId: string, parameters: any, steps: LoopLikeStep[]) => {
    const currentStep = steps.find(s => s.id === stepId);
    if (!currentStep) return steps;
    if (currentStep.step_type !== 'loop_start' && currentStep.step_type !== 'loop_end') {
      // 非循环步骤，直接合并参数
      return steps.map(s => s.id === stepId ? { ...s, parameters: { ...s.parameters, ...parameters } } : s);
    }
    const updated = steps.map(s => s.id === stepId ? { ...s, parameters: { ...s.parameters, ...parameters } } : s);
    const pair = findLoopPairStep(currentStep, updated);
    if (!pair) return updated;
    const loopRelated = {
      loop_count: parameters.loop_count,
      is_infinite_loop: parameters.is_infinite_loop,
      loop_id: parameters.loop_id || currentStep.parameters?.loop_id || pair.parameters?.loop_id,
    };
    return updated.map(s => s.id === pair.id ? { ...s, parameters: { ...s.parameters, ...loopRelated } } : s);
  }, []);

  return { syncLoopParameters };
}
