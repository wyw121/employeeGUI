import { useEffect, useMemo, useState } from 'react';
import { getBatchIndustryLabel, type BatchIndustryLabel } from '../../services/industry/batchIndustryService';
import type { ImportSessionList } from '../types';

/**
 * 针对会话列表，按批次 ID 获取“分类标签（行业）”。
 * - 内部带缓存；
 * - 仅在 sessions 变化时触发；
 * - UI 可先渲染占位，待 label 异步回填。
 */
export function useBatchIndustry(sessions?: ImportSessionList | null) {
  const [labels, setLabels] = useState<Record<string, BatchIndustryLabel>>({});

  const { batchIds, serverPrefill } = useMemo(() => {
    const items = sessions?.items || [];
    const ids: string[] = [];
    const prefill: Record<string, BatchIndustryLabel> = {};
    for (const s of items) {
      if (s.batch_id && ids.indexOf(s.batch_id) === -1) ids.push(s.batch_id);
      const ind = (s as any).industry as string | undefined | null;
      const label = (ind ?? '').trim();
      if (s.batch_id && label) prefill[s.batch_id] = label as BatchIndustryLabel;
    }
    return { batchIds: ids, serverPrefill: prefill };
  }, [sessions]);

  useEffect(() => {
    let cancelled = false;
    if (!batchIds || batchIds.length === 0) {
      setLabels({});
      return;
    }
    (async () => {
      const acc: Record<string, BatchIndustryLabel> = { ...serverPrefill };
      for (const bid of batchIds) {
        if (acc[bid]) continue; // 仅补齐缺失的
        try {
          acc[bid] = await getBatchIndustryLabel(bid);
        } catch {
          acc[bid] = '未分类';
        }
      }
      if (!cancelled) setLabels(acc);
    })();
    return () => { cancelled = true; };
  }, [batchIds, serverPrefill]);

  return labels; // { [batchId]: '电商' | '医疗' | '未分类' | '多类' }
}
