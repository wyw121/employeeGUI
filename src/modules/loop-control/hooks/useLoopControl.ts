// 循环控制Hook

import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { 
  ExtendedSmartScriptStep,
  LoopConfig,
  LoopType,
  LoopExecutionState,
  LoopExecutionResult
} from '../types';
import { 
  createLoopStartStep,
  createLoopEndStep,
  validateLoopConfig,
  extractLoopStructure,
  flattenLoopStructure
} from '../utils/loopUtils';
import LoopExecutionEngine from '../utils/LoopExecutionEngine';

export interface UseLoopControlOptions {
  /** 默认循环配置 */
  defaultConfig?: LoopConfig;
  /** 步骤执行器 */
  stepExecutor?: (step: ExtendedSmartScriptStep, variables: Record<string, any>) => Promise<boolean>;
}

export const useLoopControl = (options: UseLoopControlOptions = {}) => {
  const [loops, setLoops] = useState<Map<string, {
    startStep: ExtendedSmartScriptStep;
    endStep: ExtendedSmartScriptStep | null;
    innerSteps: ExtendedSmartScriptStep[];
    level: number;
  }>>(new Map());
  
  const [executingLoops, setExecutingLoops] = useState<Set<string>>(new Set());
  const [loopExecutionResults, setLoopExecutionResults] = useState<LoopExecutionResult[]>([]);
  
  const executionEngineRef = useRef<LoopExecutionEngine>(new LoopExecutionEngine());

  const defaultStepExecutor = useCallback(async (
    step: ExtendedSmartScriptStep,
    variables: Record<string, any>
  ): Promise<boolean> => {
    if (options.stepExecutor) {
      return options.stepExecutor(step, variables);
    }
    
    // 默认执行器（模拟执行）
    console.log(`🔄 模拟执行步骤: ${step.name}`, { variables });
    await new Promise(resolve => setTimeout(resolve, 500));
    return Math.random() > 0.1; // 90% 成功率
  }, [options.stepExecutor]);

  /**
   * 创建新循环
   */
  const createLoop = useCallback((config: LoopConfig, name?: string) => {
    const validation = validateLoopConfig(config);
    if (!validation.valid) {
      message.error(`循环配置错误: ${validation.errors.join(', ')}`);
      return null;
    }

    const startStep = createLoopStartStep(config, name);
    const endStep = createLoopEndStep(startStep.loopId!, startStep);

    const newLoop = {
      startStep,
      endStep,
      innerSteps: [],
      level: 0
    };

    setLoops(prev => new Map(prev.set(startStep.loopId!, newLoop)));
    
    message.success(`循环创建成功: ${startStep.name}`);
    
    return {
      loopId: startStep.loopId!,
      startStep,
      endStep
    };
  }, []);

  /**
   * 删除循环
   */
  const deleteLoop = useCallback((loopId: string) => {
    if (executingLoops.has(loopId)) {
      message.warning('无法删除正在执行的循环');
      return;
    }

    setLoops(prev => {
      const newLoops = new Map(prev);
      newLoops.delete(loopId);
      return newLoops;
    });
    
    message.success('循环删除成功');
  }, [executingLoops]);

  /**
   * 更新循环配置
   */
  const updateLoopConfig = useCallback((loopId: string, config: LoopConfig) => {
    if (executingLoops.has(loopId)) {
      message.warning('无法修改正在执行的循环配置');
      return;
    }

    const validation = validateLoopConfig(config);
    if (!validation.valid) {
      message.error(`循环配置错误: ${validation.errors.join(', ')}`);
      return;
    }

    setLoops(prev => {
      const newLoops = new Map(prev);
      const loopData = newLoops.get(loopId);
      if (loopData) {
        const updatedStartStep = {
          ...loopData.startStep,
          parameters: { ...loopData.startStep.parameters, config }
        };
        newLoops.set(loopId, { ...loopData, startStep: updatedStartStep });
      }
      return newLoops;
    });

    message.success('循环配置更新成功');
  }, [executingLoops]);

  /**
   * 添加步骤到循环体
   */
  const addStepToLoop = useCallback((loopId: string, step: ExtendedSmartScriptStep, index?: number) => {
    setLoops(prev => {
      const newLoops = new Map(prev);
      const loopData = newLoops.get(loopId);
      if (loopData) {
        const newInnerSteps = [...loopData.innerSteps];
        const insertIndex = index !== undefined ? index : newInnerSteps.length;
        
        const loopStep = {
          ...step,
          inLoop: true,
          parentLoopId: loopId,
          loopLevel: loopData.level + 1
        };
        
        newInnerSteps.splice(insertIndex, 0, loopStep);
        newLoops.set(loopId, { ...loopData, innerSteps: newInnerSteps });
      }
      return newLoops;
    });
  }, []);

  /**
   * 从循环体移除步骤
   */
  const removeStepFromLoop = useCallback((loopId: string, stepId: string) => {
    setLoops(prev => {
      const newLoops = new Map(prev);
      const loopData = newLoops.get(loopId);
      if (loopData) {
        const newInnerSteps = loopData.innerSteps.filter(step => step.id !== stepId);
        newLoops.set(loopId, { ...loopData, innerSteps: newInnerSteps });
      }
      return newLoops;
    });
  }, []);

  /**
   * 执行循环
   */
  const executeLoop = useCallback(async (loopId: string): Promise<LoopExecutionResult | null> => {
    const loopData = loops.get(loopId);
    if (!loopData) {
      message.error('循环不存在');
      return null;
    }

    if (executingLoops.has(loopId)) {
      message.warning('循环已在执行中');
      return null;
    }

    const config = loopData.startStep.parameters?.config as LoopConfig;
    if (!config) {
      message.error('循环配置无效');
      return null;
    }

    setExecutingLoops(prev => new Set(prev.add(loopId)));
    
    try {
      console.log(`🚀 开始执行循环: ${loopId}`);
      
      const result = await executionEngineRef.current.startLoop(
        loopId,
        config,
        loopData.innerSteps,
        defaultStepExecutor
      );
      
      setLoopExecutionResults(prev => [...prev, result]);
      
      if (result.success) {
        message.success(`循环执行成功: ${result.totalIterations} 次迭代`);
      } else {
        message.error(`循环执行失败: ${result.failedIterations} 次失败`);
      }
      
      return result;
    } catch (error) {
      console.error('循环执行异常:', error);
      message.error('循环执行异常');
      return null;
    } finally {
      setExecutingLoops(prev => {
        const newSet = new Set(prev);
        newSet.delete(loopId);
        return newSet;
      });
    }
  }, [loops, executingLoops, defaultStepExecutor]);

  /**
   * 停止循环执行
   */
  const stopLoop = useCallback((loopId: string) => {
    if (!executingLoops.has(loopId)) {
      message.warning('循环未在执行中');
      return;
    }

    executionEngineRef.current.stopLoop(loopId);
    message.info('已发送停止循环请求');
  }, [executingLoops]);

  /**
   * 获取循环执行状态
   */
  const getLoopExecutionState = useCallback((loopId: string): LoopExecutionState | undefined => {
    return executionEngineRef.current.getLoopState(loopId);
  }, []);

  /**
   * 从步骤列表提取循环结构
   */
  const extractLoopsFromSteps = useCallback((steps: ExtendedSmartScriptStep[]) => {
    const { loops: extractedLoops, mainSteps } = extractLoopStructure(steps);
    setLoops(extractedLoops);
    return mainSteps;
  }, []);

  /**
   * 将循环结构转换为步骤列表
   */
  const flattenLoopsToSteps = useCallback((mainSteps: ExtendedSmartScriptStep[]): ExtendedSmartScriptStep[] => {
    return flattenLoopStructure(mainSteps, loops);
  }, [loops]);

  /**
   * 获取所有活动循环状态
   */
  const getActiveLoopStates = useCallback((): LoopExecutionState[] => {
    return executionEngineRef.current.getActiveLoops();
  }, []);

  return {
    // 状态
    loops,
    executingLoops,
    loopExecutionResults,
    
    // 操作方法
    createLoop,
    deleteLoop,
    updateLoopConfig,
    addStepToLoop,
    removeStepFromLoop,
    executeLoop,
    stopLoop,
    
    // 查询方法
    getLoopExecutionState,
    getActiveLoopStates,
    
    // 工具方法
    extractLoopsFromSteps,
    flattenLoopsToSteps,
    
    // 状态查询
    isLoopExecuting: (loopId: string) => executingLoops.has(loopId),
    hasActiveLoops: executingLoops.size > 0,
    getLoopCount: () => loops.size
  };
};

export default useLoopControl;