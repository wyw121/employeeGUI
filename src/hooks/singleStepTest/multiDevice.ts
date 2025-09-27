import type { SmartScriptStep, SingleStepTestResult } from '../../types/smartScript';

export interface MultiDeviceRunOptions {
  concurrency?: number; // 并发上限，默认 2
  stopOnFirstFailure?: boolean; // 失败是否停止，默认 false
}

export interface MultiDeviceTestSummary {
  total: number;
  successCount: number;
  failureCount: number;
  durationMs: number;
}

export interface MultiDeviceTestResult {
  results: Record<string, SingleStepTestResult>; // deviceId -> result
  summary: MultiDeviceTestSummary;
}

/**
 * 并发限流执行器
 */
async function runWithConcurrency<T>(
  items: string[],
  worker: (id: string) => Promise<T>,
  limit: number,
  stopOnFirstFailure = false
): Promise<{ map: Record<string, T> }>
{
  const queue = items.slice();
  const resultMap: Record<string, T> = {} as any;
  let failed = false;

  async function next(): Promise<void> {
    if (failed && stopOnFirstFailure) return;
    const id = queue.shift();
    if (!id) return;
    try {
      const res = await worker(id);
      resultMap[id] = res as any;
    } catch (e) {
      // 将错误包装成失败结果由上层解释
      // @ts-ignore
      resultMap[id] = e;
      failed = true;
      if (stopOnFirstFailure) return;
    }
    if (queue.length > 0 && !(failed && stopOnFirstFailure)) {
      await next();
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
  return { map: resultMap };
}

/**
 * 在多台设备上执行“单步测试”。
 * 注意：step.parameters.inline_loop_count 仍由内部 runner 处理（尊重后端 loop 模式）。
 */
export async function runSingleStepOnDevices(
  step: SmartScriptStep,
  deviceIds: string[],
  runner: (deviceId: string) => Promise<SingleStepTestResult>,
  options?: MultiDeviceRunOptions
): Promise<MultiDeviceTestResult> {
  const started = Date.now();
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 2, 8));
  const stopOnFirstFailure = options?.stopOnFirstFailure ?? false;

  const { map } = await runWithConcurrency(deviceIds, runner, concurrency, stopOnFirstFailure);

  const values = Object.values(map) as SingleStepTestResult[];
  const successCount = values.filter(v => v?.success).length;
  const failureCount = values.length - successCount;

  return {
    results: map,
    summary: {
      total: values.length,
      successCount,
      failureCount,
      durationMs: Date.now() - started,
    }
  };
}
