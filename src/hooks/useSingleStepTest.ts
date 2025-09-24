import { useState, useCallback } from 'react';
import { message } from 'antd';
import { isTauri, invoke } from '@tauri-apps/api/core';
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
    
    console.log(`🧪 开始单步测试: ${step.name} (设备: ${deviceId})`);
    console.log(`🔧 步骤类型: ${step.step_type}`);
    console.log('📋 步骤参数:', step.parameters);
    
    // 标记为测试中
    setTestingSteps(prev => new Set(prev).add(stepId));

    try {
      // 检查是否在Tauri环境中
      const isInTauri = await isTauri();
      console.log('🔧 Tauri环境检测', { isInTauri, windowExists: typeof window !== 'undefined' });
      
      if (!isInTauri) {
        console.log('🔄 非Tauri环境，使用模拟结果');
        // 开发环境模拟结果
        const mockResult = createMockResult(step);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟延迟
        
        setTestResults(prev => ({ ...prev, [stepId]: mockResult }));
        console.log(`✅ 模拟测试完成: ${step.name}`, mockResult);
        message.success(`步骤测试完成: ${step.name}`);
        return mockResult;
      }

      console.log(`🚀 调用后端单步测试API...`);

      // 在下发前做类型标准化映射：
      // 1) smart_scroll -> swipe（后端不识别 smart_scroll）
      // 2) tap 若缺少坐标则降级为中心点击（保持开发可用）
      const normalizedStep: SmartScriptStep = (() => {
        try {
          if (String(step.step_type) === 'smart_scroll') {
            const p: any = step.parameters || {};
            const direction = p.direction || 'down';
            const distance = Number(p.distance ?? 600);
            const speed = Number(p.speed_ms ?? 300); // 映射到 duration
            const screen = { width: 1080, height: 1920 }; // 兜底屏幕尺寸（后续可从设备信息获取）

            // 依据方向构造 swipe 起止坐标（相对屏幕中线）
            const cx = Math.floor(screen.width / 2);
            const cy = Math.floor(screen.height / 2);
            const delta = Math.max(100, Math.min(distance, Math.floor(screen.height * 0.8)));
            let start_x = cx, start_y = cy, end_x = cx, end_y = cy;
            switch (direction) {
              case 'up':
                start_y = cy - Math.floor(delta / 2);
                end_y = cy + Math.floor(delta / 2);
                break;
              case 'down':
                start_y = cy + Math.floor(delta / 2);
                end_y = cy - Math.floor(delta / 2);
                break;
              case 'left':
                start_x = cx - Math.floor(delta / 2);
                end_x = cx + Math.floor(delta / 2);
                break;
              case 'right':
                start_x = cx + Math.floor(delta / 2);
                end_x = cx - Math.floor(delta / 2);
                break;
              default:
                // 未知方向，默认向下
                start_y = cy + Math.floor(delta / 2);
                end_y = cy - Math.floor(delta / 2);
            }

            return {
              ...step,
              step_type: 'swipe' as any,
              name: step.name || '滑动',
              description: step.description || `标准化滚动映射为滑动(${direction})`,
              parameters: {
                ...p,
                start_x, start_y, end_x, end_y,
                duration: speed > 0 ? speed : 300,
              },
            } as SmartScriptStep;
          }

          if (String(step.step_type) === 'tap') {
            const p: any = step.parameters || {};
            if ((p.x === undefined || p.y === undefined)) {
              // 将中心点击映射为固定中心点（兜底）
              const screen = { width: 1080, height: 1920 };
              return {
                ...step,
                parameters: {
                  ...p,
                  x: p.x ?? Math.floor(screen.width / 2),
                  y: p.y ?? Math.floor(screen.height / 2),
                  hold_duration_ms: p.duration_ms ?? p.hold_duration_ms ?? 100,
                },
              } as SmartScriptStep;
            }
          }
        } catch (e) {
          console.warn('标准化步骤失败，按原样下发:', e);
        }
        return step;
      })();

      // --- 边界参数标准化工具 ---
      const ensureBoundsNormalized = (paramsIn: Record<string, any>) => {
        const params = { ...(paramsIn || {}) } as Record<string, any>;

        // 如果已存在标准对象，补充 boundsRect 并尽量保留原始字符串
        const parseBoundsString = (s: string) => {
          // 支持 "[l,t][r,b]" 或 "l,t,r,b"
          const bracket = /\[(\d+)\s*,\s*(\d+)\]\[(\d+)\s*,\s*(\d+)\]/;
          const plain = /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/;
          let m = s.match(bracket);
          if (!m) m = s.match(plain);
          if (m) {
            const left = Number(m[1]);
            const top = Number(m[2]);
            const right = Number(m[3]);
            const bottom = Number(m[4]);
            return { left, top, right, bottom };
          }
          return null;
        };

        const fromAnyObject = (obj: any) => {
          if (!obj || typeof obj !== 'object') return null;
          const pick = (k: string[]) => k.find((key) => obj[key] !== undefined);
          const lk = pick(['left', 'l', 'x1']);
          const tk = pick(['top', 't', 'y1']);
          const rk = pick(['right', 'r', 'x2']);
          const bk = pick(['bottom', 'b', 'y2']);
          if (lk && tk && rk && bk) {
            const left = Number(obj[lk]);
            const top = Number(obj[tk]);
            const right = Number(obj[rk]);
            const bottom = Number(obj[bk]);
            if ([left, top, right, bottom].every((v) => Number.isFinite(v))) {
              return { left, top, right, bottom };
            }
          }
          return null;
        };

        const fromArray = (arr: any) => {
          if (Array.isArray(arr) && arr.length === 4 && arr.every((v) => Number.isFinite(Number(v)))) {
            const [left, top, right, bottom] = arr.map((v) => Number(v));
            return { left, top, right, bottom };
          }
          return null;
        };

        const candidates = [
          params.bounds,
          params.boundsRect,
          params.element_bounds,
          params.elementBounds,
          params.element_locator?.selectedBounds,
          params.elementLocator?.selectedBounds,
        ];

        let rect: { left: number; top: number; right: number; bottom: number } | null = null;
        for (const c of candidates) {
          if (!c) continue;
          if (typeof c === 'string') {
            rect = parseBoundsString(c);
          } else if (Array.isArray(c)) {
            rect = fromArray(c);
          } else if (typeof c === 'object') {
            rect = fromAnyObject(c);
          }
          if (rect) break;
        }

        // 写回标准结构
        if (rect) {
          // 保留原始 bounds 字段（若是字符串则继续保留）；补充一个对象形式 boundsRect
          if (!params.bounds || typeof params.bounds !== 'string') {
            params.bounds = `[${rect.left},${rect.top}][${rect.right},${rect.bottom}]`;
          }
          params.boundsRect = rect;
        }

        return params;
      };

      // 规范化下发给后端的 step，补齐后端要求的字段（如 order）
      const payloadStep = {
        id: normalizedStep.id,
        step_type: normalizedStep.step_type,
        name: normalizedStep.name,
        description: normalizedStep.description ?? '',
        parameters: ensureBoundsNormalized(normalizedStep.parameters ?? {}),
        enabled: true,
        order: typeof (normalizedStep as any).order === 'number' ? (normalizedStep as any).order : 0,
        // 透传可选的扩展字段（若存在）
        find_condition: (normalizedStep as any).find_condition,
        verification: (normalizedStep as any).verification,
        retry_config: (normalizedStep as any).retry_config,
        fallback_actions: (normalizedStep as any).fallback_actions,
        pre_conditions: (normalizedStep as any).pre_conditions,
        post_conditions: (normalizedStep as any).post_conditions,
      };

      console.log(`📋 传递参数:`, { deviceId, stepType: payloadStep.step_type, stepName: payloadStep.name, order: payloadStep.order });
      // 调用Tauri后端单步测试API  
      const result = await invoke('execute_single_step_test', {
        deviceId: deviceId,  // camelCase 兼容当前后端绑定
        step: payloadStep,
      }) as SingleStepTestResult;

      console.log(`📊 后端测试结果:`, result);

      // 保存测试结果
      setTestResults(prev => ({ ...prev, [stepId]: result }));

      if (result.success) {
        console.log(`✅ 单步测试成功: ${step.name} (${result.duration_ms}ms)`);
        message.success(`✅ ${step.name} - 测试成功 (${result.duration_ms}ms)`);
      } else {
        console.log(`❌ 单步测试失败: ${step.name}`, result.error_details);
        message.error(`❌ ${step.name} - 测试失败: ${result.message}`);
      }

      return result;
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