import type { SmartScriptStep, SingleStepTestResult } from '../../types/smartScript';
import { isSmartFindElementType } from './utils';

export async function runFrontendLoop(
  step: SmartScriptStep,
  inlineCount: number,
  runOnce: () => Promise<SingleStepTestResult>
): Promise<SingleStepTestResult> {
  const iterations: Array<{ index: number; success: boolean; duration_ms: number; timestamp: number; message: string }> = [];
  let successCount = 0;
  let failureCount = 0;
  let totalDuration = 0;
  let lastResult: SingleStepTestResult | null = null;

  // 智能元素查找用于“稳定性验证”，默认不短路；动作步骤为“可执行验证”，默认失败短路
  const shouldShortCircuit = !isSmartFindElementType(step.step_type);
  console.log(`🧭 循环短路策略: ${shouldShortCircuit ? '失败即短路' : '不短路（查找类）'}`);

  for (let i = 1; i <= inlineCount; i++) {
    console.log(`🔁 单步循环测试: 第 ${i}/${inlineCount} 次`);
    const r = await runOnce();
    iterations.push({ index: i, success: r.success, duration_ms: r.duration_ms, timestamp: r.timestamp, message: r.message });
    if (r.success) successCount++; else failureCount++;
    totalDuration += (r.duration_ms || 0);
    lastResult = r;
    if (!r.success && shouldShortCircuit) {
      console.warn(`⛔ 循环第 ${i} 次失败，提前结束`);
      break;
    }
  }

  const aggregated: SingleStepTestResult = {
    success: failureCount === 0,
    step_id: step.id,
    step_name: step.name,
    message: `循环测试 ${inlineCount} 次，成功 ${successCount}，失败 ${failureCount}。` + (lastResult ? ` 最后一次: ${lastResult.message}` : ''),
    duration_ms: totalDuration,
    timestamp: Date.now(),
    page_state: lastResult?.page_state,
    ui_elements: lastResult?.ui_elements || [],
    logs: [
      `请求次数: ${inlineCount}`,
      `执行次数: ${successCount + failureCount}`,
      `成功: ${successCount}, 失败: ${failureCount}`,
    ],
    error_details: failureCount > 0 ? (lastResult?.error_details || '循环中出现失败') : undefined,
    extracted_data: {
      loopSummary: {
        requested: inlineCount,
        executed: successCount + failureCount,
        successCount,
        failureCount,
        totalDuration,
      },
      iterations,
    },
  };

  return aggregated;
}
