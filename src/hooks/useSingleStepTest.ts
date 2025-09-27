import { useState, useCallback } from 'react';
import { message } from 'antd';
import { isTauri, invoke } from '@tauri-apps/api/core';
import type { SmartScriptStep, SingleStepTestResult } from '../types/smartScript';
import { useAdb } from '../application/hooks/useAdb';
import type { MatchCriteriaDTO } from '../domain/page-analysis/repositories/IUiMatcherRepository';
import { isSmartFindElementType, ensureBoundsNormalized } from './singleStepTest/utils';
import { buildCriteriaFromStep, executeStrategyTestImpl } from './singleStepTest/strategyTest';
import { runBackendLoop } from './singleStepTest/backendLoop';
import { executeActionOnce } from './singleStepTest/singleAction';
import type { StrategyTestResult } from './singleStepTest/types';

/**
 * useSingleStepTest
 * - 单步测试会尊重 step.parameters.inline_loop_count（范围 1-50），顺序执行；
 * - 失败将短路（停止后续执行）并聚合 loopSummary/iterations；
 * - SmartFindElement（智能元素查找）仅走“策略匹配”验证，不执行点击/输入等动作；
 * - 只有动作类步骤（tap/swipe/input/wait/...）才会调用后端 execute_single_step_test。
 */
export const useSingleStepTest = () => {
  const [testingSteps, setTestingSteps] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, SingleStepTestResult>>({});
  const { matchElementByCriteria } = useAdb();

  // 使用提取后的工具函数 isSmartFindElementType, buildCriteriaFromStep 等

  /**
   * 将步骤参数转换为匹配条件
   */
  const convertStepToMatchCriteria = useCallback((step: SmartScriptStep): MatchCriteriaDTO | null => buildCriteriaFromStep(step), []);

  /**
   * 使用策略匹配测试步骤
   */
  const executeStrategyTest = useCallback(async (
    step: SmartScriptStep,
    deviceId: string
  ): Promise<StrategyTestResult> => {
    return executeStrategyTestImpl(step, deviceId, matchElementByCriteria, buildCriteriaFromStep);
  }, [matchElementByCriteria]);

  // 执行单个步骤测试（支持 inline_loop_count 循环展开）
  const executeSingleStep = useCallback(async (
    step: SmartScriptStep,
    deviceId: string
  ): Promise<SingleStepTestResult> => {
    const stepId = step.id;

    console.log(`🧪 开始单步测试: ${step.name} (设备: ${deviceId})`);
    console.log(`🔧 步骤类型: ${step.step_type}`);
    console.log('📋 步骤参数:', step.parameters);

    // 标记为测试中
    setTestingSteps(prev => new Set(prev).add(stepId));

    // 工具: 夹取范围
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const inlineCount = clamp(Number((step.parameters as any)?.inline_loop_count ?? 1) || 1, 1, 50);

    // 单次执行封装（SmartFindElement → 策略匹配；其他 → 调后端执行）
    const runOnce = async (): Promise<SingleStepTestResult> => {
      // 智能元素查找：走策略匹配（不下发到后端执行动作）
      if (isSmartFindElementType(step.step_type)) {
        console.log('🎯 使用策略匹配模式测试元素查找（单次）');
        const strategyResult = await executeStrategyTest(step, deviceId);
        let once: SingleStepTestResult = {
          success: strategyResult.success,
          step_id: stepId,
          step_name: step.name,
          message: strategyResult.output,
          duration_ms: 0,
          timestamp: Date.now(),
          ui_elements: strategyResult.matchResult?.preview ? [strategyResult.matchResult.preview] : [],
          logs: [`策略匹配测试: ${strategyResult.success ? '成功' : '失败'}`],
          error_details: strategyResult.error,
          extracted_data: strategyResult.criteria ? { matchCriteria: strategyResult.criteria } : {}
        };

        // 🆕 可选：在“查找”成功后，根据步骤语义执行一次点击
        // 触发条件：
        // 1) 步骤名称以“点击”开头（例如“点击FrameLayout”）；或
        // 2) 显式开启参数 flags：parameters.test_click_after_match === true
        const shouldClickAfterMatch = strategyResult.success && (
          /^点击/.test(step.name || '') || (step.parameters as any)?.test_click_after_match === true
        );

        if (shouldClickAfterMatch) {
          try {
            // 计算点击坐标：优先使用匹配预览的 bounds；否则回退到步骤参数中的 bounds/locator
            const previewBoundsStr = strategyResult.matchResult?.preview?.bounds;
            const paramsWithBounds = ensureBoundsNormalized({ ...(step.parameters || {}), bounds: previewBoundsStr ?? (step.parameters as any)?.bounds });
            const rect = paramsWithBounds.boundsRect;
            if (rect) {
              const x = Math.floor((rect.left + rect.right) / 2);
              const y = Math.floor((rect.top + rect.bottom) / 2);

              // 构造临时 tap 步骤并执行（不修改原步骤类型）
              const tapStep: SmartScriptStep = {
                ...step,
                id: `${step.id}__test_tap`,
                step_type: 'tap' as any,
                name: step.name ? `${step.name} - 测试点击` : '测试点击',
                parameters: {
                  ...(step.parameters || {}),
                  x,
                  y,
                  hold_duration_ms: 80,
                },
              } as SmartScriptStep;

              console.log(`🖱️ 匹配成功后执行测试点击: (${x}, ${y})`);
              const tapResult = await executeActionOnce(tapStep, deviceId);

              // 合并结果：若点击失败，则整体记为失败并附加日志
              once = {
                ...once,
                success: once.success && tapResult.success,
                duration_ms: (once.duration_ms || 0) + (tapResult.duration_ms || 0),
                message: `${once.message}\n\n➡️ 已根据匹配结果在中心点执行点击(${x},${y})：${tapResult.success ? '成功' : '失败'}\n${tapResult.message || ''}`,
                logs: [...(once.logs || []), `匹配后点击: ${tapResult.success ? '成功' : '失败'}`],
              };
            } else {
              once = {
                ...once,
                success: false,
                message: `${once.message}\n\n⚠️ 已启用“匹配后点击”，但未能解析到元素边界(bounds)，无法计算点击坐标。`,
                logs: [...(once.logs || []), '匹配后点击: 失败（缺少 bounds）'],
                error_details: once.error_details || '匹配后点击失败：缺少 bounds',
              };
            }
          } catch (e) {
            console.warn('匹配后点击执行异常:', e);
            once = {
              ...once,
              success: false,
              message: `${once.message}\n\n❌ 匹配后点击执行异常: ${e}`,
              logs: [...(once.logs || []), `匹配后点击: 异常 ${e}`],
              error_details: String(e),
            };
          }
        }
        return once;
      }

      // 非 SmartFindElement → 执行动作
      return executeActionOnce(step, deviceId);
    };

    try {
      // 说明：单步测试会尊重 parameters.inline_loop_count，并在 1-50 范围内顺序执行；
      // 失败将短路（后续不再继续），并在结果中提供 loopSummary 与 iterations 聚合信息。
      // 若 inline_loop_count > 1：优先采用“后端循环卡片”模式（loop_start/step/loop_end），一次性下发
      if (inlineCount > 1) {
        const isTauriEnvForLoop = await isTauri();
        if (isTauriEnvForLoop) {
          console.log('🧩 后端循环执行模式（loop_start/step/loop_end）');
          const aggregated = await runBackendLoop(step, inlineCount, deviceId);
          setTestResults(prev => ({ ...prev, [stepId]: aggregated }));
          if (aggregated.success) {
            message.success(`✅ ${step.name} - 循环测试通过 (×${inlineCount})`);
          } else {
            message.error(`❌ ${step.name} - 循环测试失败 (×${inlineCount})`);
          }
          return aggregated;
        }

        // 非 Tauri 环境：回退到前端循环（聚合）
        console.log(`🔁 启用单步循环测试: ${inlineCount} 次`);
        const aggregated = await (await import('./singleStepTest/frontendLoop')).runFrontendLoop(step, inlineCount, runOnce);
        setTestResults(prev => ({ ...prev, [stepId]: aggregated }));
        if (aggregated.success) {
          message.success(`✅ ${step.name} - 循环测试通过 (${aggregated.extracted_data?.loopSummary?.successCount}/${inlineCount})`);
        } else {
          message.error(`❌ ${step.name} - 循环测试失败 (${aggregated.extracted_data?.loopSummary?.failureCount}/${inlineCount})`);
        }
        return aggregated;
      }

      // 单次执行
      const single = await runOnce();
      setTestResults(prev => ({ ...prev, [stepId]: single }));
      if (single.success) {
        console.log(`✅ 单步测试成功: ${step.name} (${single.duration_ms}ms)`);
        message.success(`✅ ${step.name} - 测试成功 (${single.duration_ms}ms)`);
      } else {
        console.log(`❌ 单步测试失败: ${step.name}`, single.error_details);
        message.error(`❌ ${step.name} - 测试失败: ${single.message}`);
      }
      return single;
    } catch (error) {
      const errorMessage = `测试执行失败: ${error}`;
      console.error(`❌ 单步测试异常: ${step.name}`, error);
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
      setTestingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  }, [executeStrategyTest]);

  // 创建模拟测试结果
  // 统一使用公共 createMockResult

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
    executeStrategyTest, // 新增：策略匹配测试方法
    convertStepToMatchCriteria, // 新增：参数转换器
    getStepTestResult,
    isStepTesting,
    clearStepResult,
    clearAllResults,
    getAllTestResults,
    testResults,
    testingSteps: Array.from(testingSteps)
  };
};