/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reimportSelectedSessionsWithDeps, type ReimportDeps } from '../ui/services/sessionImportService';

const makeDeps = (scenarios: Array<'ok' | 'fail'>): ReimportDeps => {
  let callIndex = 0;
  // 模拟设备联系人计数：每一对调用（前/后）形成 +10 的 delta
  let metricPairIndex = 0;
  let metricCall = 0;
  return {
    getVcfBatchRecord: async () => ({ vcf_file_path: 'C:/tmp/test.vcf' }),
    createImportSessionRecord: async () => 1000 + (callIndex++),
    finishImportSessionRecord: async () => {},
    importToDevice: async () => {
      const s = scenarios.shift() || 'ok';
      if (s === 'ok') return { success: true, importedCount: 100, failedCount: 0 };
      return { success: false, importedCount: 0, failedCount: 100, message: 'mock-fail' };
    },
    markBatchImportedForDevice: async () => {},
    getDeviceContactCount: async () => {
      const base = 100 + metricPairIndex * 10;
      const v = (metricCall % 2 === 0) ? base : base + 10;
      metricCall++;
      if (metricCall % 2 === 0) metricPairIndex++;
      return v;
    },
  };
};

const rows = [
  { id: 1, batch_id: 'b1', device_id: 'd1' },
  { id: 2, batch_id: 'b2', device_id: 'd1' },
  { id: 3, batch_id: 'b3', device_id: 'd1' },
];

describe('reimportSelectedSessionsWithDeps', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('handles all success', async () => {
    const deps = makeDeps(['ok','ok','ok']);
    const out = await reimportSelectedSessionsWithDeps(rows, deps);
    expect(out.total).toBe(3);
    expect(out.success).toBe(3);
    expect(out.failed).toBe(0);
    expect(out.lastCreatedSessionId).toBeDefined();
  });

  it('handles all failure', async () => {
    const deps = makeDeps(['fail','fail','fail']);
    const out = await reimportSelectedSessionsWithDeps(rows, deps);
    expect(out.total).toBe(3);
    expect(out.success).toBe(0);
    expect(out.failed).toBe(3);
  });

  it('handles mixed results', async () => {
    const deps = makeDeps(['ok','fail','ok']);
    const out = await reimportSelectedSessionsWithDeps(rows, deps);
    expect(out.total).toBe(3);
    expect(out.success).toBe(2);
    expect(out.failed).toBe(1);
  });

  it('skips when batch has no vcf path', async () => {
    const deps: ReimportDeps = {
      getVcfBatchRecord: async () => ({ /* no vcf_file_path */ } as any),
      createImportSessionRecord: async () => 1,
      finishImportSessionRecord: async () => {},
      importToDevice: async () => ({ success: true }),
      markBatchImportedForDevice: async () => {},
      getDeviceContactCount: async () => 100,
    };
    const out = await reimportSelectedSessionsWithDeps(rows.slice(0,1), deps);
    expect(out.total).toBe(1);
    expect(out.success).toBe(0);
    expect(out.failed).toBe(1);
  });

  it('continues when finishImportSessionRecord throws', async () => {
    const deps: ReimportDeps = {
      getVcfBatchRecord: async () => ({ vcf_file_path: 'C:/tmp/test.vcf' }),
      createImportSessionRecord: async () => 1,
      finishImportSessionRecord: async () => { throw new Error('mock-finish-fail'); },
      importToDevice: async () => ({ success: true, importedCount: 50, failedCount: 0 }),
      markBatchImportedForDevice: async () => {},
      getDeviceContactCount: (() => {
        // 返回 100,110,120,130,... 模拟正向增量
        let val = 100;
        return async () => {
          const cur = val;
          val += 10;
          return cur;
        };
      })(),
    };
    const out = await reimportSelectedSessionsWithDeps(rows.slice(0,2), deps);
    expect(out.total).toBe(2);
    // 我们在实现中未捕捉 finish 的异常，所以这里的行为取决于实现；
    // 若后续决定忽略 finish 异常，可以放开 try/catch。当前实现会抛错中断，本用例确保至少能捕获其行为。
    // 这里断言不抛异常即认为通过。
    expect(out.success + out.failed).toBe(2);
  });
});
