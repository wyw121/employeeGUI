import { useRef } from 'react';
import { buildAutoName } from '../utils/stepNaming';

/**
 * 管理步骤名称的自动生成与用户重写：
 * - 初始使用自动名
 * - 一旦用户编辑名称，置位 userEdited = true，后续不再自动覆盖
 * - 若需要强制回到自动模式，可显式 reset()
 */
export function useAutoStepName() {
  const userEditedRef = useRef<Record<string, boolean>>({});

  const getName = (step: any) => {
    const edited = userEditedRef.current[step.id];
    if (edited && step.name) return step.name;
    return buildAutoName(step);
  };

  const markEdited = (stepId: string) => {
    userEditedRef.current[stepId] = true;
  };

  const reset = (stepId?: string) => {
    if (stepId) delete userEditedRef.current[stepId];
    else userEditedRef.current = {};
  };

  return { getName, markEdited, reset };
}
