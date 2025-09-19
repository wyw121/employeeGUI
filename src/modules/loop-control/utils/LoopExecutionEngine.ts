// 循环执行引擎

import { 
  ExtendedSmartScriptStep, 
  LoopConfig, 
  LoopType, 
  LoopConditionType,
  LoopExecutionState,
  LoopExecutionResult,
  ExtendedStepActionType
} from '../types';

export class LoopExecutionEngine {
  private activeLoops: Map<string, LoopExecutionState> = new Map();
  private executionHistory: LoopExecutionResult[] = [];

  /**
   * 开始循环执行
   */
  async startLoop(
    loopId: string,
    config: LoopConfig,
    steps: ExtendedSmartScriptStep[],
    stepExecutor: (step: ExtendedSmartScriptStep, variables: Record<string, any>) => Promise<boolean>
  ): Promise<LoopExecutionResult> {
    const startTime = Date.now();
    
    const executionState: LoopExecutionState = {
      loopId,
      currentIteration: 0,
      config,
      startIndex: 0,
      endIndex: steps.length - 1,
      steps,
      variables: this.initializeLoopVariables(config),
      shouldContinue: true
    };

    this.activeLoops.set(loopId, executionState);

    let successIterations = 0;
    let failedIterations = 0;
    let totalIterations = 0;

    try {
      while (await this.shouldContinueLoop(executionState)) {
        totalIterations++;
        executionState.currentIteration = totalIterations;
        
        // 更新循环变量
        this.updateLoopVariables(executionState, totalIterations);
        
        console.log(`🔄 循环 ${loopId} 第 ${totalIterations} 次迭代开始`);
        
        try {
          // 执行循环体内的所有步骤
          const iterationSuccess = await this.executeLoopIteration(
            executionState,
            stepExecutor
          );
          
          if (iterationSuccess) {
            successIterations++;
            console.log(`✅ 循环 ${loopId} 第 ${totalIterations} 次迭代成功`);
          } else {
            failedIterations++;
            console.log(`❌ 循环 ${loopId} 第 ${totalIterations} 次迭代失败`);
            
            if (!config.continueOnError) {
              console.log(`🛑 循环 ${loopId} 因错误中止`);
              break;
            }
          }
        } catch (error) {
          failedIterations++;
          console.error(`💥 循环 ${loopId} 第 ${totalIterations} 次迭代异常:`, error);
          
          if (!config.continueOnError) {
            break;
          }
        }
        
        // 循环间隔
        if (config.intervalMs && config.intervalMs > 0) {
          await new Promise(resolve => setTimeout(resolve, config.intervalMs));
        }
        
        // 检查最大迭代次数
        if (config.maxIterations && totalIterations >= config.maxIterations) {
          console.log(`🔢 循环 ${loopId} 达到最大迭代次数 ${config.maxIterations}`);
          break;
        }
      }
    } finally {
      this.activeLoops.delete(loopId);
    }

    const executionTime = Date.now() - startTime;
    
    const result: LoopExecutionResult = {
      loopId,
      totalIterations,
      successIterations,
      failedIterations,
      executionTimeMs: executionTime,
      success: failedIterations === 0 && totalIterations > 0
    };

    this.executionHistory.push(result);
    
    console.log(`🏁 循环 ${loopId} 执行完成:`, result);
    
    return result;
  }

  /**
   * 停止循环执行
   */
  stopLoop(loopId: string): void {
    const executionState = this.activeLoops.get(loopId);
    if (executionState) {
      executionState.shouldContinue = false;
      console.log(`⏹️ 循环 ${loopId} 被手动停止`);
    }
  }

  /**
   * 获取循环执行状态
   */
  getLoopState(loopId: string): LoopExecutionState | undefined {
    return this.activeLoops.get(loopId);
  }

  /**
   * 获取所有活动循环
   */
  getActiveLoops(): LoopExecutionState[] {
    return Array.from(this.activeLoops.values());
  }

  /**
   * 初始化循环变量
   */
  private initializeLoopVariables(config: LoopConfig): Record<string, any> {
    const variables: Record<string, any> = {};
    
    if (config.variableName) {
      variables[config.variableName] = 0;
    }
    
    // 默认循环变量
    variables.loopIndex = 0;
    variables.loopIteration = 0;
    
    return variables;
  }

  /**
   * 更新循环变量
   */
  private updateLoopVariables(state: LoopExecutionState, iteration: number): void {
    state.variables.loopIndex = iteration - 1; // 0-based index
    state.variables.loopIteration = iteration; // 1-based iteration
    
    if (state.config.variableName) {
      state.variables[state.config.variableName] = iteration - 1;
    }
  }

  /**
   * 检查是否应该继续循环
   */
  private async shouldContinueLoop(state: LoopExecutionState): Promise<boolean> {
    if (!state.shouldContinue) {
      return false;
    }

    const { config, currentIteration } = state;

    switch (config.type) {
      case LoopType.FOR:
        return currentIteration < (config.count || 1);
        
      case LoopType.WHILE:
        if (!config.condition) {
          return false;
        }
        return await this.evaluateLoopCondition(config.condition, state);
        
      case LoopType.INFINITE:
        return currentIteration < (config.maxIterations || 1000);
        
      default:
        return false;
    }
  }

  /**
   * 评估循环条件
   */
  private async evaluateLoopCondition(
    condition: any,
    state: LoopExecutionState
  ): Promise<boolean> {
    // 这里需要根据具体的条件类型进行评估
    // 暂时返回 true，实际实现需要根据条件类型调用相应的检查函数
    
    switch (condition.type) {
      case LoopConditionType.ELEMENT_EXISTS:
        // 检查元素是否存在
        // 需要调用页面分析服务
        console.log(`🔍 检查元素是否存在: ${condition.elementDescription}`);
        return true; // 临时返回
        
      case LoopConditionType.ELEMENT_NOT_EXISTS:
        // 检查元素是否不存在
        console.log(`🔍 检查元素是否不存在: ${condition.elementDescription}`);
        return true; // 临时返回
        
      case LoopConditionType.PAGE_CHANGED:
        // 检查页面是否变化
        console.log(`📱 检查页面是否变化: ${condition.pageIdentifier}`);
        return true; // 临时返回
        
      case LoopConditionType.CUSTOM:
        // 执行自定义JavaScript表达式
        if (condition.customExpression) {
          try {
            // 创建安全的执行上下文
            const func = new Function('variables', `return ${condition.customExpression}`);
            return func(state.variables);
          } catch (error) {
            console.error('循环条件表达式执行错误:', error);
            return false;
          }
        }
        return false;
        
      default:
        return false;
    }
  }

  /**
   * 执行单次循环迭代
   */
  private async executeLoopIteration(
    state: LoopExecutionState,
    stepExecutor: (step: ExtendedSmartScriptStep, variables: Record<string, any>) => Promise<boolean>
  ): Promise<boolean> {
    let allStepsSuccess = true;

    for (let i = 0; i < state.steps.length; i++) {
      const step = state.steps[i];
      
      // 跳过循环控制步骤
      if (step.step_type === ExtendedStepActionType.LOOP_START || 
          step.step_type === ExtendedStepActionType.LOOP_END) {
        continue;
      }

      console.log(`📝 执行循环步骤: ${step.name} (${step.step_type})`);
      
      try {
        const stepResult = await stepExecutor(step, state.variables);
        
        if (!stepResult) {
          allStepsSuccess = false;
          console.log(`❌ 循环步骤失败: ${step.name}`);
          
          if (!state.config.continueOnError) {
            break;
          }
        } else {
          console.log(`✅ 循环步骤成功: ${step.name}`);
        }
      } catch (error) {
        allStepsSuccess = false;
        console.error(`💥 循环步骤异常: ${step.name}`, error);
        
        if (!state.config.continueOnError) {
          break;
        }
      }
    }

    return allStepsSuccess;
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): LoopExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * 清空执行历史
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }
}

export default LoopExecutionEngine;