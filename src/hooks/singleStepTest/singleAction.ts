import { isTauri, invoke } from '@tauri-apps/api/core';
import type { SingleStepTestResult, SmartScriptStep } from '../../types/smartScript';
import { buildBackendPayloadStep, normalizeStepForExecution, createMockResult } from './utils';

export async function executeActionOnce(step: SmartScriptStep, deviceId: string): Promise<SingleStepTestResult> {
  const isInTauriEnv = await isTauri();
  if (!isInTauriEnv) {
    console.log('🔄 非Tauri环境，使用模拟结果（单次）');
    await new Promise(resolve => setTimeout(resolve, 300));
    return createMockResult(step);
  }

  const normalizedStep = normalizeStepForExecution(step);
  const payloadStep = buildBackendPayloadStep(normalizedStep);

  console.log(`📋 传递参数:`, { deviceId, stepType: payloadStep.step_type, stepName: payloadStep.name, order: payloadStep.order });
  const result = await invoke('execute_single_step_test', {
    deviceId,
    step: payloadStep,
  }) as SingleStepTestResult;
  console.log(`📊 后端测试结果:`, result);
  return result;
}
