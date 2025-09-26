import { useMemo } from 'react';
import { ScriptStep, ScriptValidationResult } from '../types';

// 简单校验：确保必需字段存在，可扩展
export function useScriptValidation(steps: ScriptStep[]): ScriptValidationResult {
  const result = useMemo<ScriptValidationResult>(() => {
    const issues = [] as ScriptValidationResult['issues'];
    steps.forEach(step => {
      if (!step.type) {
        issues.push({ stepId: step.id, level: 'error', message: '缺少执行类型 type' });
      }
      if (!step.parameters) {
        issues.push({ stepId: step.id, level: 'warning', message: '缺少 parameters，可能导致执行失败' });
      }
    });
    return { issues, isValid: issues.filter(i => i.level === 'error').length === 0 };
  }, [steps]);

  return result;
}
