import { useMemo } from 'react';
import type { BatchExecuteResult } from '../services/batchExecutor';

export interface ReasonGroup {
  reason: string;
  count: number;
}

export function useReasonGroups(result: BatchExecuteResult | null): ReasonGroup[] {
  return useMemo(() => {
    const items = (result?.deviceResults || []).filter(d => !d.success);
    const m = new Map<string, number>();
    for (const it of items) {
      const reason = (it.message || '未知错误').trim();
      m.set(reason, (m.get(reason) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [result]);
}
