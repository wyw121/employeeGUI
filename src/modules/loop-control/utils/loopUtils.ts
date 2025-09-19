// 循环控制工具函数

import { ExtendedSmartScriptStep, ExtendedStepActionType, LoopConfig, LoopType } from '../types';

/**
 * 生成循环ID
 */
export const generateLoopId = (): string => {
  return `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 创建循环开始步骤
 */
export const createLoopStartStep = (config: LoopConfig, name?: string): ExtendedSmartScriptStep => {
  const loopId = generateLoopId();
  
  return {
    id: `${loopId}_start`,
    step_type: ExtendedStepActionType.LOOP_START,
    name: name || `循环开始 - ${getLoopTypeText(config.type)}`,
    description: `${getLoopTypeText(config.type)} - ${getLoopDescription(config)}`,
    parameters: {
      config,
      timeout_ms: 1000,
      retry_count: 1,
      screenshot_on_error: false,
      verification_enabled: false
    },
    enabled: true,
    order: 0,
    status: 'active',
    loopId,
    loopLevel: 0,
    inLoop: false
  };
};

/**
 * 创建循环结束步骤
 */
export const createLoopEndStep = (loopId: string, startStep: ExtendedSmartScriptStep): ExtendedSmartScriptStep => {
  const config = startStep.parameters?.config as LoopConfig;
  
  return {
    id: `${loopId}_end`,
    step_type: ExtendedStepActionType.LOOP_END,
    name: `循环结束 - ${getLoopTypeText(config.type)}`,
    description: `结束${getLoopTypeText(config.type)} - ${getLoopDescription(config)}`,
    parameters: {
      loopId,
      config,
      timeout_ms: 1000,
      retry_count: 1,
      screenshot_on_error: false,
      verification_enabled: false
    },
    enabled: true,
    order: 0,
    status: 'active',
    loopId,
    loopLevel: 0,
    inLoop: false
  };
};

/**
 * 获取循环类型显示文本
 */
export const getLoopTypeText = (type: LoopType): string => {
  switch (type) {
    case LoopType.FOR:
      return '固定次数循环';
    case LoopType.WHILE:
      return '条件循环';
    case LoopType.INFINITE:
      return '无限循环';
    default:
      return '循环';
  }
};

/**
 * 获取循环描述
 */
export const getLoopDescription = (config: LoopConfig): string => {
  switch (config.type) {
    case LoopType.FOR:
      return `重复执行 ${config.count || 1} 次`;
    case LoopType.WHILE:
      return `当条件满足时执行`;
    case LoopType.INFINITE:
      return `无限执行（最多 ${config.maxIterations || 100} 次）`;
    default:
      return '执行循环';
  }
};

/**
 * 验证循环配置
 */
export const validateLoopConfig = (config: LoopConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.type) {
    errors.push('循环类型不能为空');
  }
  
  if (config.type === LoopType.FOR && (!config.count || config.count < 1)) {
    errors.push('固定次数循环的次数必须大于0');
  }
  
  if (config.type === LoopType.WHILE && !config.condition) {
    errors.push('条件循环必须设置循环条件');
  }
  
  if (config.maxIterations && config.maxIterations < 1) {
    errors.push('最大循环次数必须大于0');
  }
  
  if (config.intervalMs && config.intervalMs < 0) {
    errors.push('循环间隔不能为负数');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * 检查步骤是否在循环中
 */
export const isStepInLoop = (step: ExtendedSmartScriptStep): boolean => {
  return step.inLoop === true || !!step.parentLoopId;
};

/**
 * 检查步骤是否为循环控制步骤
 */
export const isLoopControlStep = (step: ExtendedSmartScriptStep): boolean => {
  return step.step_type === ExtendedStepActionType.LOOP_START || 
         step.step_type === ExtendedStepActionType.LOOP_END;
};

/**
 * 从步骤列表中提取循环结构
 */
export const extractLoopStructure = (steps: ExtendedSmartScriptStep[]) => {
  const loops = new Map<string, {
    startStep: ExtendedSmartScriptStep;
    endStep: ExtendedSmartScriptStep | null;
    innerSteps: ExtendedSmartScriptStep[];
    level: number;
  }>();
  
  const mainSteps: ExtendedSmartScriptStep[] = [];
  let currentLoopId: string | null = null;
  let loopLevel = 0;
  
  for (const step of steps) {
    if (step.step_type === ExtendedStepActionType.LOOP_START) {
      const loopId = step.loopId!;
      loops.set(loopId, {
        startStep: step,
        endStep: null,
        innerSteps: [],
        level: loopLevel
      });
      currentLoopId = loopId;
      loopLevel++;
      mainSteps.push(step);
    } else if (step.step_type === ExtendedStepActionType.LOOP_END) {
      const loopId = step.loopId!;
      const loopData = loops.get(loopId);
      if (loopData) {
        loopData.endStep = step;
      }
      currentLoopId = null;
      loopLevel = Math.max(0, loopLevel - 1);
      mainSteps.push(step);
    } else {
      if (currentLoopId) {
        const loopData = loops.get(currentLoopId);
        if (loopData) {
          loopData.innerSteps.push({
            ...step,
            inLoop: true,
            parentLoopId: currentLoopId,
            loopLevel
          });
        }
      } else {
        mainSteps.push(step);
      }
    }
  }
  
  return { loops, mainSteps };
};

/**
 * 将循环结构转换回平坦的步骤列表
 */
export const flattenLoopStructure = (
  mainSteps: ExtendedSmartScriptStep[],
  loops: Map<string, { startStep: ExtendedSmartScriptStep; endStep: ExtendedSmartScriptStep | null; innerSteps: ExtendedSmartScriptStep[] }>
): ExtendedSmartScriptStep[] => {
  const result: ExtendedSmartScriptStep[] = [];
  
  for (const step of mainSteps) {
    result.push(step);
    
    if (step.step_type === ExtendedStepActionType.LOOP_START) {
      const loopId = step.loopId!;
      const loopData = loops.get(loopId);
      if (loopData) {
        result.push(...loopData.innerSteps);
        if (loopData.endStep) {
          result.push(loopData.endStep);
        }
      }
    }
  }
  
  return result;
};

export default {
  generateLoopId,
  createLoopStartStep,
  createLoopEndStep,
  getLoopTypeText,
  getLoopDescription,
  validateLoopConfig,
  isStepInLoop,
  isLoopControlStep,
  extractLoopStructure,
  flattenLoopStructure
};