import { useState, useCallback } from 'react';
import { message } from 'antd';
import type { SmartScriptStep, SingleStepTestResult } from '../types/smartScript';

export const useSingleStepTest = () => {
  const [testingSteps, setTestingSteps] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, SingleStepTestResult>>({});

  // 执行单个步骤测试
  const executeSingleStep = useCallback(async (
    step: SmartScriptStep,
    deviceId: string
  ): Promise<SingleStepTestResult> => {
    const stepId = step.id;
    
    // 标记为测试中
    setTestingSteps(prev => new Set(prev).add(stepId));

    try {
      // 检查是否在Tauri环境中
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
      
      if (!isTauri) {
        // 开发环境模拟结果
        const mockResult = createMockResult(step);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟延迟
        
        setTestResults(prev => ({ ...prev, [stepId]: mockResult }));
        message.success(`步骤测试完成: ${step.name}`);
        return mockResult;
      }

      // 调用Tauri后端单步测试API  
      const tauriApi = (window as any).__TAURI__;
      const result = await tauriApi.invoke('execute_single_step_test', {
        device_id: deviceId,
        step: {
          ...step,
          // 确保步骤是启用状态
          enabled: true
        }
      }) as SingleStepTestResult;

      // 保存测试结果
      setTestResults(prev => ({ ...prev, [stepId]: result }));

      if (result.success) {
        message.success(`✅ ${step.name} - 测试成功 (${result.duration_ms}ms)`);
      } else {
        message.error(`❌ ${step.name} - 测试失败: ${result.message}`);
      }

      return result;
    } catch (error) {
      const errorMessage = `测试执行失败: ${error}`;
      const failureResult: SingleStepTestResult = {
        success: false,
        step_id: step.id,
        step_name: step.name,
        duration_ms: 0,
        timestamp: Date.now(),
        message: errorMessage,
        logs: [errorMessage],
        ui_elements: [],
        extracted_data: {},
        error_details: String(error)
      };

      setTestResults(prev => ({ ...prev, [stepId]: failureResult }));
      message.error(`❌ ${step.name} - ${errorMessage}`);
      
      return failureResult;
    } finally {
      // 移除测试中标记
      setTestingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  }, []);

  // 创建模拟测试结果
  const createMockResult = (step: SmartScriptStep): SingleStepTestResult => {
    const baseResult = {
      success: Math.random() > 0.2, // 80% 成功率
      step_id: step.id,
      step_name: step.name,
      duration_ms: Math.floor(Math.random() * 2000) + 500,
      timestamp: Date.now(),
      logs: [
        `开始执行步骤: ${step.name}`,
        `参数: ${JSON.stringify(step.parameters)}`,
        `步骤类型: ${step.step_type}`
      ],
      ui_elements: [],
      extracted_data: {}
    };

    if (baseResult.success) {
      return {
        ...baseResult,
        message: `步骤执行成功`,
        page_state: 'Ready'
      };
    } else {
      return {
        ...baseResult,
        message: '模拟测试失败 - 用于开发调试',
        error_details: '这是一个模拟的测试失败，用于演示错误处理'
      };
    }
  };

  // 获取步骤的测试结果
  const getStepTestResult = useCallback((stepId: string) => {
    return testResults[stepId];
  }, [testResults]);

  // 检查步骤是否正在测试
  const isStepTesting = useCallback((stepId: string) => {
    return testingSteps.has(stepId);
  }, [testingSteps]);

  // 清除步骤测试结果
  const clearStepResult = useCallback((stepId: string) => {
    setTestResults(prev => {
      const newResults = { ...prev };
      delete newResults[stepId];
      return newResults;
    });
  }, []);

  // 清除所有测试结果
  const clearAllResults = useCallback(() => {
    setTestResults({});
    setTestingSteps(new Set());
  }, []);

  // 获取所有测试结果
  const getAllTestResults = useCallback(() => {
    return Object.values(testResults);
  }, [testResults]);

  return {
    executeSingleStep,
    getStepTestResult,
    isStepTesting,
    clearStepResult,
    clearAllResults,
    getAllTestResults,
    testResults,
    testingSteps: Array.from(testingSteps)
  };
};