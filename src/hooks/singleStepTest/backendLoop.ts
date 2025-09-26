import { invoke } from '@tauri-apps/api/core';
import type { SmartScriptStep, SingleStepTestResult } from '../../types/smartScript';
import { buildBackendPayloadStep, normalizeStepForExecution } from './utils';

type SmartExecutionResult = {
  success: boolean;
  duration_ms?: number;
  logs?: any[];
  message?: string;
  final_page_state?: string;
  failed_steps?: number;
  executed_steps?: number;
  extracted_data?: Record<string, any>;
};

export async function runBackendLoop(step: SmartScriptStep, inlineCount: number, deviceId: string): Promise<SingleStepTestResult> {
  const normStep = normalizeStepForExecution(step);
  const payloadStep = { ...buildBackendPayloadStep(normStep), order: 1 } as any;
  const loopStart = {
    id: `${step.id}_loop_start`,
    step_type: 'loop_start',
    name: '循环开始',
    description: `内置循环 ×${inlineCount}`,
    parameters: { loop_count: inlineCount, is_infinite_loop: false },
    enabled: true,
    order: 0,
  } as any;
  const loopEnd = {
    id: `${step.id}_loop_end`,
    step_type: 'loop_end',
    name: '循环结束',
    enabled: true,
    order: 2,
  } as any;

  const backendConfig = {
    continue_on_error: false,
    auto_verification_enabled: false,
    smart_recovery_enabled: false,
    detailed_logging: true,
  };

  const execResult = await invoke('execute_smart_automation_script', {
    deviceId,
    steps: [loopStart, payloadStep, loopEnd],
    config: backendConfig,
  }) as SmartExecutionResult;

  const aggregated: SingleStepTestResult = {
    success: !!execResult.success,
    step_id: step.id,
    step_name: step.name,
    message: execResult.message || (execResult.success ? `后端循环执行成功（×${inlineCount}）` : `后端循环执行失败（×${inlineCount}）`),
    duration_ms: execResult.duration_ms || 0,
    timestamp: Date.now(),
    page_state: execResult.final_page_state,
    ui_elements: [],
    logs: Array.isArray(execResult.logs) ? execResult.logs.map((l) => typeof l === 'string' ? l : JSON.stringify(l)) : [],
    error_details: execResult.success ? undefined : '后端循环执行返回失败',
    extracted_data: {
      loopSummary: { requested: inlineCount, executed: inlineCount, successCount: execResult.success ? inlineCount : 0, failureCount: execResult.success ? 0 : inlineCount, totalDuration: execResult.duration_ms || 0 },
      backendScript: true,
      loopMode: 'backend-loop-cards',
      backendResult: execResult,
    },
  };

  return aggregated;
}
