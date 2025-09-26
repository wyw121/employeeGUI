// 纯函数：对步骤数组进行重排
import { ScriptStep } from '../types';

export function reorderSteps(steps: ScriptStep[], fromIndex: number, toIndex: number): ScriptStep[] {
  if (fromIndex === toIndex) return steps;
  const next = [...steps];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((s, idx) => ({ ...s, order: idx + 1 }));
}
