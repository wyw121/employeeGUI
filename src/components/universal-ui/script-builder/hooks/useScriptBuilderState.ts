import { useCallback, useState } from 'react';
import { ScriptStep } from '../types';
import { reorderSteps } from '../utils/reorder';

// 关注点：仅管理步骤集合与当前激活状态；无外部副作用
export function useScriptBuilderState(initialSteps: ScriptStep[] = []) {
  const [steps, setSteps] = useState<ScriptStep[]>(initialSteps);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const addStep = useCallback((step: Omit<ScriptStep, 'order'>) => {
    setSteps(prev => {
      const next: ScriptStep = { ...step, order: prev.length + 1 } as ScriptStep;
      return [...prev, next];
    });
  }, []);

  const updateStep = useCallback((id: string, patch: Partial<ScriptStep>) => {
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })));
    setActiveStepId(prev => (prev === id ? null : prev));
  }, []);

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    setSteps(prev => reorderSteps(prev, fromIndex, toIndex));
  }, []);

  return {
    steps,
    activeStepId,
    setActiveStepId,
    addStep,
    updateStep,
    removeStep,
    moveStep,
    setSteps, // 暴露底层设置以便批量导入
  };
}
